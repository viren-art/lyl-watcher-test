const UsageAnalyticsRepository = require('../../database/customer-data/usage-analytics.repository');
const { ApiError } = require('../../utils/errors');

class UsageAnalyticsService {
  constructor() {
    this.usageAnalyticsRepository = new UsageAnalyticsRepository();
  }

  /**
   * Track API call
   */
  async trackApiCall(data) {
    const {
      customerId,
      userId,
      endpoint,
      method,
      statusCode,
      responseTimeMs,
      regionId
    } = data;

    await this.usageAnalyticsRepository.logApiCall({
      customerId,
      userId,
      endpoint,
      method,
      statusCode,
      responseTimeMs,
      regionId,
      timestamp: new Date()
    });
  }

  /**
   * Track dashboard view
   */
  async trackDashboardView(customerId, userId, dashboardType, regionId = null) {
    await this.usageAnalyticsRepository.logDashboardView({
      customerId,
      userId,
      dashboardType,
      regionId,
      timestamp: new Date()
    });
  }

  /**
   * Track prediction request
   */
  async trackPredictionRequest(data) {
    const {
      customerId,
      userId,
      predictionType,
      regionId,
      accuracy
    } = data;

    await this.usageAnalyticsRepository.logPredictionRequest({
      customerId,
      userId,
      predictionType,
      regionId,
      accuracy,
      timestamp: new Date()
    });
  }

  /**
   * Track BESS analysis
   */
  async trackBessAnalysis(customerId, userId, regionId, optimizationScore) {
    await this.usageAnalyticsRepository.logBessAnalysis({
      customerId,
      userId,
      regionId,
      optimizationScore,
      timestamp: new Date()
    });
  }

  /**
   * Get customer usage statistics
   */
  async getCustomerUsageStats(customerId, startDate = null, endDate = null) {
    const stats = await this.usageAnalyticsRepository.getCustomerUsageStats(customerId, startDate, endDate);
    return stats;
  }

  /**
   * Get usage analytics for all customers (admin)
   */
  async getAllCustomersUsage(filters = {}) {
    const {
      startDate,
      endDate,
      subscriptionTier,
      minApiCalls,
      limit = 100,
      offset = 0
    } = filters;

    const usage = await this.usageAnalyticsRepository.getAllCustomersUsage({
      startDate,
      endDate,
      subscriptionTier,
      minApiCalls,
      limit,
      offset
    });

    return usage;
  }

  /**
   * Get feature adoption metrics
   */
  async getFeatureAdoption(customerId = null) {
    const adoption = await this.usageAnalyticsRepository.getFeatureAdoption(customerId);

    return {
      weatherForecasting: {
        totalRequests: adoption.weatherRequests || 0,
        uniqueCustomers: adoption.weatherCustomers || 0,
        averageAccuracy: adoption.weatherAccuracy || 0
      },
      gridImpact: {
        totalAnalyses: adoption.gridAnalyses || 0,
        uniqueCustomers: adoption.gridCustomers || 0,
        averageAccuracy: adoption.gridAccuracy || 0
      },
      bessOptimization: {
        totalAnalyses: adoption.bessAnalyses || 0,
        uniqueCustomers: adoption.bessCustomers || 0,
        averageOptimizationScore: adoption.bessScore || 0
      },
      dashboards: {
        totalViews: adoption.dashboardViews || 0,
        uniqueCustomers: adoption.dashboardCustomers || 0
      }
    };
  }

  /**
   * Get usage trends over time
   */
  async getUsageTrends(customerId, periodDays = 30) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    const trends = await this.usageAnalyticsRepository.getUsageTrends(customerId, startDate, endDate);

    return trends.map(day => ({
      date: day.date,
      apiCalls: day.api_calls || 0,
      predictionRequests: day.prediction_requests || 0,
      dashboardViews: day.dashboard_views || 0,
      bessAnalyses: day.bess_analyses || 0
    }));
  }

  /**
   * Get regional usage breakdown
   */
  async getRegionalUsage(customerId) {
    const regionalData = await this.usageAnalyticsRepository.getRegionalUsage(customerId);

    return regionalData.map(region => ({
      regionId: region.region_id,
      regionName: region.region_name,
      apiCalls: region.api_calls || 0,
      predictionRequests: region.prediction_requests || 0,
      dashboardViews: region.dashboard_views || 0,
      averageAccuracy: region.average_accuracy || 0
    }));
  }

  /**
   * Get endpoint usage breakdown
   */
  async getEndpointUsage(customerId, startDate = null, endDate = null) {
    const endpointData = await this.usageAnalyticsRepository.getEndpointUsage(customerId, startDate, endDate);

    return endpointData.map(endpoint => ({
      endpoint: endpoint.endpoint,
      method: endpoint.method,
      callCount: endpoint.call_count || 0,
      averageResponseTime: endpoint.avg_response_time || 0,
      errorRate: endpoint.error_rate || 0
    }));
  }

  /**
   * Generate usage summary report
   */
  async generateUsageSummary(customerId, periodMonths = 1) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - periodMonths);

    const stats = await this.usageAnalyticsRepository.getCustomerUsageStats(customerId, startDate, endDate);
    const trends = await this.getUsageTrends(customerId, periodMonths * 30);
    const regionalUsage = await this.getRegionalUsage(customerId);
    const endpointUsage = await this.getEndpointUsage(customerId, startDate, endDate);

    return {
      customerId,
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        months: periodMonths
      },
      summary: stats,
      trends,
      regionalBreakdown: regionalUsage,
      endpointBreakdown: endpointUsage,
      generatedAt: new Date().toISOString()
    };
  }
}

module.exports = UsageAnalyticsService;