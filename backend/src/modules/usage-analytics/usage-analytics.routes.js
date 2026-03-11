const express = require('express');
const UsageAnalyticsController = require('./usage-analytics.controller');
const { authenticateToken } = require('../rbac/auth.middleware');
const { requireRole } = require('../rbac/auth.middleware');

const router = express.Router();
const usageAnalyticsController = new UsageAnalyticsController();

/**
 * GET /api/v1/usage-analytics/stats/:customerId
 * Get customer usage statistics
 */
router.get(
  '/stats/:customerId',
  authenticateToken,
  (req, res, next) => usageAnalyticsController.getUsageStats(req, res, next)
);

/**
 * GET /api/v1/usage-analytics/all-customers
 * Get usage analytics for all customers (Admin only)
 */
router.get(
  '/all-customers',
  authenticateToken,
  requireRole(['ADMIN']),
  (req, res, next) => usageAnalyticsController.getAllCustomersUsage(req, res, next)
);

/**
 * GET /api/v1/usage-analytics/feature-adoption
 * Get feature adoption metrics
 */
router.get(
  '/feature-adoption',
  authenticateToken,
  (req, res, next) => usageAnalyticsController.getFeatureAdoption(req, res, next)
);

/**
 * GET /api/v1/usage-analytics/trends/:customerId
 * Get usage trends over time
 */
router.get(
  '/trends/:customerId',
  authenticateToken,
  (req, res, next) => usageAnalyticsController.getUsageTrends(req, res, next)
);

/**
 * GET /api/v1/usage-analytics/regional/:customerId
 * Get regional usage breakdown
 */
router.get(
  '/regional/:customerId',
  authenticateToken,
  (req, res, next) => usageAnalyticsController.getRegionalUsage(req, res, next)
);

/**
 * GET /api/v1/usage-analytics/endpoints/:customerId
 * Get endpoint usage breakdown
 */
router.get(
  '/endpoints/:customerId',
  authenticateToken,
  (req, res, next) => usageAnalyticsController.getEndpointUsage(req, res, next)
);

/**
 * GET /api/v1/usage-analytics/summary/:customerId
 * Generate usage summary report
 */
router.get(
  '/summary/:customerId',
  authenticateToken,
  (req, res, next) => usageAnalyticsController.getUsageSummary(req, res, next)
);

module.exports = router;