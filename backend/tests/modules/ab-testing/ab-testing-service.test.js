const ABTestingService = require('../../../src/modules/ab-testing/ab-testing-service');

jest.mock('pg', () => {
  const mClient = {
    query: jest.fn(),
    release: jest.fn()
  };
  const mPool = {
    connect: jest.fn(() => mClient),
    query: jest.fn()
  };
  return { Pool: jest.fn(() => mPool) };
});

describe('ABTestingService', () => {
  let service;

  beforeEach(() => {
    service = new ABTestingService();
  });

  describe('startABTest', () => {
    it('should create new A/B test with 5% traffic split', async () => {
      const testId = await service.startABTest('weather_lstm', 'v2.0', 'v1.0');

      expect(testId).toBeDefined();
      expect(testId).toHaveLength(32);
      expect(service.activeTests.has('weather_lstm')).toBe(true);
    });

    it('should initialize metrics tracking for both variants', async () => {
      const testId = await service.startABTest('weather_lstm', 'v2.0', 'v1.0');

      const metrics = service.testMetrics.get(testId);
      expect(metrics).toHaveProperty('control');
      expect(metrics).toHaveProperty('treatment');
      expect(metrics.control.predictions).toBe(0);
      expect(metrics.treatment.predictions).toBe(0);
    });
  });

  describe('selectVariant', () => {
    beforeEach(async () => {
      await service.startABTest('weather_lstm', 'v2.0', 'v1.0');
    });

    it('should assign variant based on request ID hash', () => {
      const variant1 = service.selectVariant('weather_lstm', 'request-123');
      const variant2 = service.selectVariant('weather_lstm', 'request-123');

      // Same request ID should get same variant
      expect(variant1.variant).toBe(variant2.variant);
    });

    it('should assign approximately 5% to treatment', () => {
      const assignments = { control: 0, treatment: 0 };

      for (let i = 0; i < 1000; i++) {
        const variant = service.selectVariant('weather_lstm', `request-${i}`);
        assignments[variant.variant]++;
      }

      const treatmentPercentage = assignments.treatment / 1000;
      expect(treatmentPercentage).toBeGreaterThan(0.03);
      expect(treatmentPercentage).toBeLessThan(0.07);
    });
  });

  describe('performSignificanceTest', () => {
    it('should return false for insufficient sample size', () => {
      const control = { count: 50, avgError: 0.10, stddevError: 0.02 };
      const treatment = { count: 50, avgError: 0.08, stddevError: 0.02 };

      const isSignificant = service.performSignificanceTest(control, treatment);

      expect(isSignificant).toBe(false);
    });

    it('should return true for significant difference with large samples', () => {
      const control = { count: 500, avgError: 0.10, stddevError: 0.02 };
      const treatment = { count: 500, avgError: 0.05, stddevError: 0.02 };

      const isSignificant = service.performSignificanceTest(control, treatment);

      expect(isSignificant).toBe(true);
    });
  });
});