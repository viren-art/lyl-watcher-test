const UsageAnalyticsService = require('../../../src/modules/usage-analytics/usage-analytics.service');
const UsageAnalyticsRepository = require('../../../src/database/customer-data/usage-analytics.repository');

jest.mock('../../../src/database/customer-data/usage-analytics.repository');

describe('UsageAnalyticsService', () => {
  let service;
  let mockRepo;

  beforeEach(() => {
    mockRepo = new UsageAnalyticsRepository();
    service = new UsageAnalyticsService();
    service.usageAnalyticsRepository = mockRepo;
  });

  describe('trackApiCall', () => {
    it('should log API call with all parameters', async () => {
      const callData = {
        customerId: 1,
        userId: 10,
        endpoint: '/api/v1/weather/predict',
        method: 'POST',
        statusCode: 200,
        responseTimeMs: 250,
        regionId: 1
      };

      mockRepo.logApiCall.mockResolvedValue();

      await service.trackApiCall(callData);

      expect(mockRepo.logApiCall).toHaveBeenCalledWith(
        expect.objectContaining({
          customerId: 1,
          endpoint: '/api/v1/weather/predict',
          statusCode: 200
        })
      );
    });
  });

  describe('getCustomerUsageStats', () => {
    it('should return comprehensive usage statistics', async () => {
      const mockStats = {
        api_calls_total: 5000,
        api_calls_this_month: 1200,
        avg_response_time_ms: 300,
        dashboard_views_this_month: 150,
        prediction_requests_this_month: 800,
        average_prediction_accuracy: 86.5,
        bess_analysis_runs: 25,
        unique_regions_queried: 3
      };

      mockRepo.getCustomerUsageStats.mockResolvedValue(mockStats);

      const stats = await service.getCustomerUsageStats(1);

      expect(stats.api_calls_this_month).toBe(1200);
      expect(stats.average_prediction_accuracy).toBe(86.5);
    });
  });

  describe('getUsageTrends', () => {
    it('should return daily usage trends', async () => {
      const mockTrends = [
        { date: '2024-01-01', api_calls: 100, prediction_requests: 50 },
        { date: '2024-01-02', api_calls: 120, prediction_requests: 60 }
      ];

      mockRepo.getUsageTrends.mockResolvedValue(mockTrends);

      const trends = await service.getUsageTrends(1, 30);

      expect(trends.length).toBe(2);
      expect(trends[0].apiCalls).toBe(100);
    });
  });

  describe('generateUsageSummary', () => {
    it('should generate comprehensive usage summary', async () => {
      mockRepo.getCustomerUsageStats.mockResolvedValue({
        api_calls_this_month: 1000,
        prediction_requests_this_month: 500
      });

      mockRepo.getUsageTrends.mockResolvedValue([]);
      mockRepo.getRegionalUsage.mockResolvedValue([]);
      mockRepo.getEndpointUsage.mockResolvedValue([]);

      const summary = await service.generateUsageSummary(1, 1);

      expect(summary.customerId).toBe(1);
      expect(summary.period.months).toBe(1);
      expect(summary.summary).toBeDefined();
      expect(summary.generatedAt).toBeDefined();
    });
  });
});