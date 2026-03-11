const CustomerIntelligenceService = require('../../../src/modules/customer-intelligence/customer-intelligence.service');
const CustomerDataRepository = require('../../../src/database/customer-data/customer-data.repository');
const UsageAnalyticsRepository = require('../../../src/database/customer-data/usage-analytics.repository');

jest.mock('../../../src/database/customer-data/customer-data.repository');
jest.mock('../../../src/database/customer-data/usage-analytics.repository');

describe('CustomerIntelligenceService', () => {
  let service;
  let mockCustomerDataRepo;
  let mockUsageAnalyticsRepo;

  beforeEach(() => {
    mockCustomerDataRepo = new CustomerDataRepository();
    mockUsageAnalyticsRepo = new UsageAnalyticsRepository();
    service = new CustomerIntelligenceService();
    service.customerDataRepository = mockCustomerDataRepo;
    service.usageAnalyticsRepository = mockUsageAnalyticsRepo;
  });

  describe('createCustomerProfile', () => {
    it('should create profile with calculated lead score and market segment', async () => {
      const profileData = {
        customerId: 1,
        companyName: 'Test Utility Co',
        industry: 'UTILITY',
        companySize: 'LARGE',
        annualRevenue: 50000000,
        gridRegions: [1, 2, 3],
        primaryUseCase: 'INTEGRATED',
        technicalMaturity: 'ADVANCED',
        decisionMakers: [{ name: 'John Doe', role: 'CTO' }]
      };

      mockCustomerDataRepo.createProfile.mockResolvedValue({
        customer_id: 1,
        lead_score: 88,
        market_segment: 'STRATEGIC'
      });

      const result = await service.createCustomerProfile(profileData);

      expect(result.lead_score).toBeGreaterThanOrEqual(70);
      expect(result.market_segment).toBe('STRATEGIC');
      expect(mockCustomerDataRepo.createProfile).toHaveBeenCalled();
    });
  });

  describe('identifyUpsellOpportunities', () => {
    it('should identify rate limit upgrade opportunity', async () => {
      mockCustomerDataRepo.getProfile.mockResolvedValue({
        customer_id: 1,
        company_name: 'Test Co',
        lead_score: 85
      });

      mockCustomerDataRepo.getSubscription.mockResolvedValue({
        subscription_tier: 'BASIC',
        rate_limit_per_hour: 100
      });

      mockUsageAnalyticsRepo.getCustomerUsageStats.mockResolvedValue({
        apiCallsThisMonth: 60000, // 82% of monthly quota
        bessAnalysisRuns: 0,
        dashboardViewsThisMonth: 50,
        predictionRequestsThisMonth: 200
      });

      mockCustomerDataRepo.getRegionInterests.mockResolvedValue([{ grid_region_id: 1 }]);

      const opportunities = await service.identifyUpsellOpportunities(1);

      expect(opportunities.opportunities.length).toBeGreaterThan(0);
      expect(opportunities.opportunities[0].type).toBe('RATE_LIMIT_UPGRADE');
      expect(opportunities.opportunities[0].priority).toBe('HIGH');
    });
  });

  describe('generateRoiReport', () => {
    it('should calculate ROI based on usage and accuracy', async () => {
      mockCustomerDataRepo.getProfile.mockResolvedValue({
        customer_id: 1,
        company_name: 'Test Co'
      });

      mockCustomerDataRepo.getSubscription.mockResolvedValue({
        subscription_tier: 'PROFESSIONAL'
      });

      mockUsageAnalyticsRepo.getCustomerUsageStats.mockResolvedValue({
        predictionRequestsThisMonth: 500,
        gridImpactAnalysisRuns: 50,
        bessAnalysisRuns: 10,
        averagePredictionAccuracy: 87
      });

      const report = await service.generateRoiReport(1, 12);

      expect(report.roi).toBeGreaterThan(0);
      expect(report.valueDelivered.total).toBeGreaterThan(report.costs.subscriptionCost);
      expect(report.usageMetrics.averageAccuracy).toBe(87);
    });
  });

  describe('getQualifiedCustomers', () => {
    it('should return customers with lead score >= 70', async () => {
      const mockCustomers = [
        { customer_id: 1, lead_score: 85, company_name: 'High Score Co' },
        { customer_id: 2, lead_score: 75, company_name: 'Medium Score Co' }
      ];

      mockCustomerDataRepo.getQualifiedCustomers.mockResolvedValue(mockCustomers);
      mockUsageAnalyticsRepo.getCustomerUsageStats.mockResolvedValue({
        apiCallsThisMonth: 1000
      });

      const result = await service.getQualifiedCustomers({ minLeadScore: 70 });

      expect(result.length).toBe(2);
      expect(result[0].lead_score).toBeGreaterThanOrEqual(70);
    });
  });
});