const UsageAnalyticsService = require('./usage-analytics.service');
const { ApiError } = require('../../utils/errors');

class UsageAnalyticsController {
  constructor() {
    this.usageAnalyticsService = new UsageAnalyticsService();
  }

  /**
   * GET /api/v1/usage-analytics/stats/:customerId
   * Get customer usage statistics
   */
  async getUsageStats(req, res, next) {
    try {
      const customerId = parseInt(req.params.customerId);
      const { startDate, endDate } = req.query;

      // Validate customer access
      if (req.user.role !== 'ADMIN' && req.user.customerId !== customerId) {
        throw new ApiError(403, 'FORBIDDEN', 'Access denied to customer usage data');
      }

      const stats = await this.usageAnalyticsService.getCustomerUsageStats(
        customerId,
        startDate ? new Date(startDate) : null,
        endDate ? new Date(endDate) : null
      );

      res.json({
        success: true,
        data: stats
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/usage-analytics/all-customers
   * Get usage analytics for all customers (Admin only)
   */
  async getAllCustomersUsage(req, res, next) {
    try {
      const filters = {
        startDate: req.query.startDate ? new Date(req.query.startDate) : null,
        endDate: req.query.endDate ? new Date(req.query.endDate) : null,
        subscriptionTier: req.query.subscriptionTier,
        minApiCalls: req.query.minApiCalls ? parseInt(req.query.minApiCalls) : null,
        limit: parseInt(req.query.limit) || 100,
        offset: parseInt(req.query.offset) || 0
      };

      const usage = await this.usageAnalyticsService.getAllCustomersUsage(filters);

      res.json({
        success: true,
        data: usage,
        count: usage.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/usage-analytics/feature-adoption
   * Get feature adoption metrics
   */
  async getFeatureAdoption(req, res, next) {
    try {
      const customerId = req.query.customerId ? parseInt(req.query.customerId) : null;

      // Validate customer access
      if (customerId && req.user.role !== 'ADMIN' && req.user.customerId !== customerId) {
        throw new ApiError(403, 'FORBIDDEN', 'Access denied to customer usage data');
      }

      const adoption = await this.usageAnalyticsService.getFeatureAdoption(customerId);

      res.json({
        success: true,
        data: adoption
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/usage-analytics/trends/:customerId
   * Get usage trends over time
   */
  async getUsageTrends(req, res, next) {
    try {
      const customerId = parseInt(req.params.customerId);
      const periodDays = parseInt(req.query.periodDays) || 30;

      // Validate customer access
      if (req.user.role !== 'ADMIN' && req.user.customerId !== customerId) {
        throw new ApiError(403, 'FORBIDDEN', 'Access denied to customer usage data');
      }

      const trends = await this.usageAnalyticsService.getUsageTrends(customerId, periodDays);

      res.json({
        success: true,
        data: trends
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/usage-analytics/regional/:customerId
   * Get regional usage breakdown
   */
  async getRegionalUsage(req, res, next) {
    try {
      const customerId = parseInt(req.params.customerId);

      // Validate customer access
      if (req.user.role !== 'ADMIN' && req.user.customerId !== customerId) {
        throw new ApiError(403, 'FORBIDDEN', 'Access denied to customer usage data');
      }

      const regionalUsage = await this.usageAnalyticsService.getRegionalUsage(customerId);

      res.json({
        success: true,
        data: regionalUsage
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/usage-analytics/endpoints/:customerId
   * Get endpoint usage breakdown
   */
  async getEndpointUsage(req, res, next) {
    try {
      const customerId = parseInt(req.params.customerId);
      const { startDate, endDate } = req.query;

      // Validate customer access
      if (req.user.role !== 'ADMIN' && req.user.customerId !== customerId) {
        throw new ApiError(403, 'FORBIDDEN', 'Access denied to customer usage data');
      }

      const endpointUsage = await this.usageAnalyticsService.getEndpointUsage(
        customerId,
        startDate ? new Date(startDate) : null,
        endDate ? new Date(endDate) : null
      );

      res.json({
        success: true,
        data: endpointUsage
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/usage-analytics/summary/:customerId
   * Generate usage summary report
   */
  async getUsageSummary(req, res, next) {
    try {
      const customerId = parseInt(req.params.customerId);
      const periodMonths = parseInt(req.query.periodMonths) || 1;

      // Validate customer access
      if (req.user.role !== 'ADMIN' && req.user.customerId !== customerId) {
        throw new ApiError(403, 'FORBIDDEN', 'Access denied to customer usage data');
      }

      const summary = await this.usageAnalyticsService.generateUsageSummary(customerId, periodMonths);

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = UsageAnalyticsController;