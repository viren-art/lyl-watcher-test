const express = require('express');
const BessController = require('./controllers/bess.controller');
const { authenticateToken } = require('../../modules/rbac/auth.middleware');
const { requirePermission, requireRegionAccess } = require('../../modules/rbac/auth.middleware');
const { validateRequest } = require('../../middleware/validation/request.validator');
const { bessOptimizationSchema, bessQuerySchema, bessRoiSchema } = require('./schemas/bess.schema');

const router = express.Router();
const bessController = new BessController();

/**
 * POST /api/v1/bess/optimize-location
 * Generate BESS location optimization
 */
router.post(
  '/optimize-location',
  authenticateToken,
  requirePermission('bess:optimize'),
  validateRequest(bessOptimizationSchema),
  requireRegionAccess,
  bessController.optimizeLocation.bind(bessController)
);

/**
 * GET /api/v1/bess/recommendations/:regionId
 * Get BESS recommendations for region
 */
router.get(
  '/recommendations/:regionId',
  authenticateToken,
  requirePermission('bess:read'),
  validateRequest(bessQuerySchema, 'query'),
  requireRegionAccess,
  bessController.getRecommendations.bind(bessController)
);

/**
 * POST /api/v1/bess/roi-analysis
 * Generate ROI analysis for BESS location
 */
router.post(
  '/roi-analysis',
  authenticateToken,
  requirePermission('bess:analyze'),
  validateRequest(bessRoiSchema),
  bessController.analyzeRoi.bind(bessController)
);

module.exports = router;