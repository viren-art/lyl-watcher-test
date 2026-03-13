const express = require('express');
const WeatherController = require('./weather.controller');
const { authenticateToken, requirePermission, requireRegionAccess } = require('../rbac/auth.middleware');

const router = express.Router();
const weatherController = new WeatherController();

// Protected routes - require authentication and permissions
router.post(
  '/predict',
  authenticateToken,
  requirePermission('weather:read'),
  requireRegionAccess,
  (req, res) => weatherController.generateForecast(req, res)
);

router.get(
  '/predictions/:regionId',
  authenticateToken,
  requirePermission('weather:read'),
  requireRegionAccess,
  (req, res) => weatherController.getPredictions(req, res)
);

router.get(
  '/accuracy/:predictionId',
  authenticateToken,
  requirePermission('weather:read'),
  (req, res) => weatherController.validateAccuracy(req, res)
);

router.get(
  '/model/performance',
  authenticateToken,
  requirePermission('weather:read'),
  (req, res) => weatherController.getModelPerformance(req, res)
);

module.exports = router;