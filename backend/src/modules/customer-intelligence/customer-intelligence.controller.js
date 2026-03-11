const CustomerIntelligenceService = require('./customer-intelligence.service');
const { ApiError } = require('../../utils/errors');

class CustomerIntelligenceController {
  constructor() {
    this.customerIntelligenceService = new CustomerIntelligenceService();
  }

  /**
   * POST /api/v1/customer-intelligence/profiles
   * Create customer profile
   */
  async createProfile(req, res, next) {
    try {
      const data = req.body;
      const profile = await this.customerIntelligenceService.createCustomerProfile(data);

      res.status(201).json({
        success: true,
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * PUT /api/v1/customer-intelligence/profiles/:customerId
   * Update customer profile
   */
  async updateProfile(req, res, next) {
    try {
      const customerId = parseInt(req.params.customerId);
      const updates = req.body;

      const profile = await this.customerIntelligenceService.updateCustomerProfile(customerId, updates);

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/customer-intelligence/profiles/:customerId
   * Get customer profile
   */
  async getProfile(req, res, next) {
    try {
      const customerId = parseInt(req.params.customerId);
      const profile = await this.customerIntelligenceService.getCustomerProfile(customerId);

      res.json({
        success: true,
        data: profile
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/customer-intelligence/qualified-customers
   * Get qualified B2B customers
   */
  async getQualifiedCustomers(req, res, next) {
    try {
      const filters = {
        minLeadScore: parseInt(req.query.minLeadScore) || 70,
        marketSegment: req.query.marketSegment,
        industry: req.query.industry,
        subscriptionTier: req.query.subscriptionTier,
        limit: parseInt(req.query.limit) || 100,
        offset: parseInt(req.query.offset) || 0
      };

      const customers = await this.customerIntelligenceService.getQualifiedCustomers(filters);

      res.json({
        success: true,
        data: customers,
        count: customers.length
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/customer-intelligence/upsell-opportunities/:customerId
   * Identify upsell opportunities
   */
  async getUpsellOpportunities(req, res, next) {
    try {
      const customerId = parseInt(req.params.customerId);
      const opportunities = await this.customerIntelligenceService.identifyUpsellOpportunities(customerId);

      res.json({
        success: true,
        data: opportunities
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/customer-intelligence/roi-report/:customerId
   * Generate ROI report
   */
  async getRoiReport(req, res, next) {
    try {
      const customerId = parseInt(req.params.customerId);
      const periodMonths = parseInt(req.query.periodMonths) || 12;

      const report = await this.customerIntelligenceService.generateRoiReport(customerId, periodMonths);

      res.json({
        success: true,
        data: report
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/customer-intelligence/market-segmentation
   * Get market segmentation analysis
   */
  async getMarketSegmentation(req, res, next) {
    try {
      const analysis = await this.customerIntelligenceService.getMarketSegmentation();

      res.json({
        success: true,
        data: analysis
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = CustomerIntelligenceController;