const express = require('express');
const GridController = require('./controllers/grid.controller');
const { authenticateToken } = require('../../modules/rbac/auth.middleware');
const { requirePermission, requireRegionAccess } = require('../../modules/rbac/auth.middleware');
const { validateRequest } = require('../../middleware/validation/request.validator');
const { gridImpactSchema, gridQuerySchema } = require('./schemas/grid.schema');

const router = express.Router();
const gridController = new GridController();

/**
 * POST /api/v1/grid/impact-analysis
 * Generate grid impact analysis
 */
router.post(
  '/impact-analysis',
  authenticateToken,
  requirePermission('grid:analyze'),
  validateRequest(gridImpactSchema),
  requireRegionAccess,
  gridController.createImpactAnalysis.bind(gridController)
);

/**
 * GET /api/v1/grid/impacts/:regionId
 * Retrieve grid impact predictions
 */
router.get(
  '/impacts/:regionId',
  authenticateToken,
  requirePermission('grid:read'),
  validateRequest(gridQuerySchema, 'query'),
  requireRegionAccess,
  gridController.getImpacts.bind(gridController)
);

/**
 * GET /api/v1/grid/impacts/:regionId/latest
 * Get latest grid impact for region
 */
router.get(
  '/impacts/:regionId/latest',
  authenticateToken,
  requirePermission('grid:read'),
  requireRegionAccess,
  gridController.getLatestImpact.bind(gridController)
);

/**
 * POST /api/v1/grid/alerts/subscribe
 * Subscribe to grid impact alerts
 */
router.post(
  '/alerts/subscribe',
  authenticateToken,
  requirePermission('grid:alerts'),
  requireRegionAccess,
  gridController.subscribeAlerts.bind(gridController)
);

/**
 * GET /api/v1/grid/regions
 * Get accessible grid regions
 */
router.get(
  '/regions',
  authenticateToken,
  requirePermission('grid:read'),
  gridController.getRegions.bind(gridController)
);

/**
 * GET /api/v1/grid/regions/:regionId/substations
 * Get substations in region
 */
router.get(
  '/regions/:regionId/substations',
  authenticateToken,
  requirePermission('grid:read'),
  requireRegionAccess,
  gridController.getSubstations.bind(gridController)
);

module.exports = router;