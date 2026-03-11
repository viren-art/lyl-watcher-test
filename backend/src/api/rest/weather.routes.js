const express = require('express');
const WeatherController = require('./controllers/weather.controller');
const { authenticateToken } = require('../../modules/rbac/auth.middleware');
const { requirePermission, requireRegionAccess } = require('../../modules/rbac/auth.middleware');
const { validateRequest } = require('../../middleware/validation/request.validator');
const { weatherPredictionSchema, weatherQuerySchema } = require('./schemas/weather.schema');

const router = express.Router();
const weatherController = new WeatherController();

/**
 * POST /api/v1/weather/predict
 * Generate weather predictions for a specific region
 */
router.post(
  '/predict',
  authenticateToken,
  requirePermission('weather:predict'),
  validateRequest(weatherPredictionSchema),
  requireRegionAccess,
  weatherController.createPrediction.bind(weatherController)
);

/**
 * GET /api/v1/weather/predictions/:regionId
 * Retrieve weather predictions for a region
 */
router.get(
  '/predictions/:regionId',
  authenticateToken,
  requirePermission('weather:read'),
  validateRequest(weatherQuerySchema, 'query'),
  requireRegionAccess,
  weatherController.getPredictions.bind(weatherController)
);

/**
 * GET /api/v1/weather/predictions/:regionId/latest
 * Get latest weather prediction for a region
 */
router.get(
  '/predictions/:regionId/latest',
  authenticateToken,
  requirePermission('weather:read'),
  requireRegionAccess,
  weatherController.getLatestPrediction.bind(weatherController)
);

/**
 * GET /api/v1/weather/predictions/:predictionId
 * Get specific prediction by ID
 */
router.get(
  '/prediction/:predictionId',
  authenticateToken,
  requirePermission('weather:read'),
  weatherController.getPredictionById.bind(weatherController)
);

module.exports = router;