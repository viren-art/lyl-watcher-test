const RateLimiter = require('../../../src/middleware/rate-limiting/rate-limiter');
const Redis = require('ioredis-mock');

jest.mock('ioredis', () => require('ioredis-mock'));

describe('RateLimiter', () => {
  let rateLimiter;

  beforeEach(() => {
    rateLimiter = new RateLimiter();
  });

  afterEach(async () => {
    await rateLimiter.close();
  });

  describe('checkRateLimit', () => {
    it('should allow requests within limit', async () => {
      const customerId = 1;
      const limit = 100;

      for (let i = 0; i < 50; i++) {
        const allowed = await rateLimiter.checkRateLimit(customerId, limit);
        expect(allowed).toBe(true);
      }
    });

    it('should block requests exceeding limit', async () => {
      const customerId = 2;
      const limit = 10;

      // Make 10 requests (should all succeed)
      for (let i = 0; i < 10; i++) {
        const allowed = await rateLimiter.checkRateLimit(customerId, limit);
        expect(allowed).toBe(true);
      }

      // 11th request should be blocked
      const blocked = await rateLimiter.checkRateLimit(customerId, limit);
      expect(blocked).toBe(false);
    });

    it('should track usage correctly', async () => {
      const customerId = 3;
      const limit = 100;

      // Make 25 requests
      for (let i = 0; i < 25; i++) {
        await rateLimiter.checkRateLimit(customerId, limit);
      }

      const usage = await rateLimiter.getCurrentUsage(customerId);
      expect(usage).toBe(25);
    });
  });

  describe('getRateLimitStats', () => {
    it('should return correct stats', async () => {
      const customerId = 4;
      const tier = 'PROFESSIONAL';

      // Make 50 requests
      for (let i = 0; i < 50; i++) {
        await rateLimiter.checkRateLimit(customerId, 500);
      }

      const stats = await rateLimiter.getRateLimitStats(customerId, tier);

      expect(stats.limit).toBe(500);
      expect(stats.usage).toBe(50);
      expect(stats.remaining).toBe(450);
      expect(stats.tier).toBe('PROFESSIONAL');
    });
  });

  describe('resetRateLimit', () => {
    it('should reset customer rate limit', async () => {
      const customerId = 5;

      // Make some requests
      for (let i = 0; i < 10; i++) {
        await rateLimiter.checkRateLimit(customerId, 100);
      }

      // Reset
      await rateLimiter.resetRateLimit(customerId);

      // Usage should be 0
      const usage = await rateLimiter.getCurrentUsage(customerId);
      expect(usage).toBe(0);
    });
  });
});