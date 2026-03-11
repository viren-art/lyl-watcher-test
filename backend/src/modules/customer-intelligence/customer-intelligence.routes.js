const express = require('express');
const CustomerIntelligenceController = require('./customer-intelligence.controller');
const { authenticateToken } = require('../rbac/auth.middleware');
const { requireRole } = require('../rbac/auth.middleware');
const { validateRequest } = require('../../middleware/validation/request.validator');
const { customerProfileSchema, customerUpdateSchema } = require('./schemas/customer-intelligence.schema');

const router = express.Router();
const customerIntelligenceController = new CustomerIntelligenceController();

/**
 * POST /api/v1/customer-intelligence/profiles
 * Create customer profile (Admin only)
 */
router.post(
  '/profiles',
  authenticateToken,
  requireRole(['ADMIN']),
  validateRequest(customerProfileSchema),
  (req, res, next) => customerIntelligenceController.createProfile(req, res, next)
);

/**
 * PUT /api/v1/customer-intelligence/profiles/:customerId
 * Update customer profile (Admin only)
 */
router.put(
  '/profiles/:customerId',
  authenticateToken,
  requireRole(['ADMIN']),
  validateRequest(customerUpdateSchema),
  (req, res, next) => customerIntelligenceController.updateProfile(req, res, next)
);

/**
 * GET /api/v1/customer-intelligence/profiles/:customerId
 * Get customer profile (Admin or own profile)
 */
router.get(
  '/profiles/:customerId',
  authenticateToken,
  (req, res, next) => customerIntelligenceController.getProfile(req, res, next)
);

/**
 * GET /api/v1/customer-intelligence/qualified-customers
 * Get qualified B2B customers (Admin only)
 */
router.get(
  '/qualified-customers',
  authenticateToken,
  requireRole(['ADMIN']),
  (req, res, next) => customerIntelligenceController.getQualifiedCustomers(req, res, next)
);

/**
 * GET /api/v1/customer-intelligence/upsell-opportunities/:customerId
 * Identify upsell opportunities (Admin only)
 */
router.get(
  '/upsell-opportunities/:customerId',
  authenticateToken,
  requireRole(['ADMIN']),
  (req, res, next) => customerIntelligenceController.getUpsellOpportunities(req, res, next)
);

/**
 * GET /api/v1/customer-intelligence/roi-report/:customerId
 * Generate ROI report (Admin or own report)
 */
router.get(
  '/roi-report/:customerId',
  authenticateToken,
  (req, res, next) => customerIntelligenceController.getRoiReport(req, res, next)
);

/**
 * GET /api/v1/customer-intelligence/market-segmentation
 * Get market segmentation analysis (Admin only)
 */
router.get(
  '/market-segmentation',
  authenticateToken,
  requireRole(['ADMIN']),
  (req, res, next) => customerIntelligenceController.getMarketSegmentation(req, res, next)
);

module.exports = router;