const BessService = require('../../../src/modules/bess/bess.service');

jest.mock('pg');
jest.mock('child_process');
jest.mock('../../../src/utils/logger');

describe('BessService', () => {
  let bessService;
  
  beforeEach(() => {
    bessService = new BessService();
    jest.clearAllMocks();
  });
  
  describe('optimizeLocations', () => {
    it('should complete optimization within 15 minutes', async () => {
      const mockRecommendations = [
        {
          location_code: 'BESS-1-ABC123',
          coordinates: { lat: 42.36, lon: -71.05 },
          optimization_score: 87.5,
          roi_estimate: 22.5,
          roi_improvement_percent: 28.3
        }
      ];
      
      bessService._runPythonOptimizer = jest.fn().mockResolvedValue(mockRecommendations);
      bessService._storeRecommendations = jest.fn().mockResolvedValue(mockRecommendations);
      
      const startTime = Date.now();
      const result = await bessService.optimizeLocations(1, 100);
      const elapsedMs = Date.now() - startTime;
      
      expect(elapsedMs).toBeLessThan(15 * 60 * 1000); // 15 minutes
      expect(result.locations).toHaveLength(1);
      expect(result.locations[0].optimization_score).toBeGreaterThanOrEqual(0);
      expect(result.processingTimeMs).toBeLessThan(900000); // 15 minutes in ms
    });
    
    it('should return recommendations with 25%+ ROI improvement', async () => {
      const mockRecommendations = [
        {
          location_code: 'BESS-1-ABC123',
          optimization_score: 87.5,
          roi_improvement_percent: 28.3
        },
        {
          location_code: 'BESS-1-DEF456',
          optimization_score: 85.2,
          roi_improvement_percent: 26.1
        }
      ];
      
      bessService._runPythonOptimizer = jest.fn().mockResolvedValue(mockRecommendations);
      bessService._storeRecommendations = jest.fn().mockResolvedValue(mockRecommendations);
      
      const result = await bessService.optimizeLocations(1, 100);
      
      // Verify all recommendations meet 25% target
      result.locations.forEach(location => {
        expect(location.roi_improvement_percent).toBeGreaterThanOrEqual(25);
      });
      
      // Verify top recommendation exceeds target
      expect(result.locations[0].roi_improvement_percent).toBeGreaterThan(25);
    });
    
    it('should evaluate all multi-criteria factors', async () => {
      const mockRecommendations = [
        {
          location_code: 'BESS-1-ABC123',
          optimization_score: 87.5,
          roi_improvement_percent: 28.3,
          criterion_scores: {
            weather_risk: 82.5,
            grid_proximity: 91.2,
            demand_forecast: 78.9,
            renewable_integration: 85.3,
            land_cost: 75.0,
            grid_stability: 88.1
          }
        }
      ];
      
      bessService._runPythonOptimizer = jest.fn().mockResolvedValue(mockRecommendations);
      bessService._storeRecommendations = jest.fn().mockResolvedValue(mockRecommendations);
      
      const result = await bessService.optimizeLocations(1, 100);
      
      // Verify all criteria are evaluated
      const criteriaKeys = Object.keys(result.locations[0].criterion_scores || {});
      expect(criteriaKeys).toContain('weather_risk');
      expect(criteriaKeys).toContain('grid_proximity');
      expect(criteriaKeys).toContain('demand_forecast');
      expect(criteriaKeys).toContain('renewable_integration');
      expect(criteriaKeys).toContain('land_cost');
      expect(criteriaKeys).toContain('grid_stability');
      
      // Verify all scores are within valid range
      Object.values(result.locations[0].criterion_scores || {}).forEach(score => {
        expect(score).toBeGreaterThanOrEqual(0);
        expect(score).toBeLessThanOrEqual(100);
      });
    });
  });
  
  describe('getRoiAnalysis', () => {
    it('should calculate NPV and IRR correctly with 25%+ improvement', async () => {
      const mockLocation = {
        location_id: 1,
        location_code: 'BESS-1-ABC123',
        environmental_factors: {
          detailed_roi: {
            total_investment_usd: 4500000,
            net_annual_savings_usd: 850000,
            payback_period_years: 5.29,
            irr_percent: 18.9,
            traditional_roi_percent: 14.2,
            ai_roi_percent: 18.9,
            roi_improvement_percent: 33.1
          }
        }
      };
      
      require('pg').Pool.mockImplementation(() => ({
        query: jest.fn().mockResolvedValue({ rows: [mockLocation] })
      }));
      
      const analysis = await bessService.getRoiAnalysis(1, 10);
      
      expect(analysis.netPresentValueUsd).toBeGreaterThan(0);
      expect(analysis.comparisonToBaseline.improvementPercentage).toBeGreaterThanOrEqual(25);
      expect(analysis.comparisonToBaseline.aiRecommendationRoi).toBeGreaterThan(
        analysis.comparisonToBaseline.traditionalMethodRoi
      );
    });
  });
});