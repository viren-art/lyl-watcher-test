const express = require('express');
const GridImpactService = require('../../modules/grid-impact/impact-service');
const TelemetryIngestionService = require('../../modules/grid-telemetry/telemetry-ingestion');
const { getSubstationsByRegion, getGridRegions } = require('../../database/grid-data/infrastructure-repository');
const { getLatestTelemetry } = require('../../database/grid-data/telemetry-repository');
const { getImpactsBySeverity } = require('../../database/grid-data/impact-repository');
const logger = require('../../utils/logger');

const router = express.Router();
const gridImpactService = new GridImpactService();

// POST /api/v1/grid/impact-analysis
router.post('/impact-analysis', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { gridRegionId, weatherPredictionId, forecastHours = 24 } = req.body;
    
    if (!gridRegionId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'gridRegionId is required',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    const impact = await gridImpactService.analyzeGridImpact(
      gridRegionId,
      weatherPredictionId,
      forecastHours
    );
    
    const latency = Date.now() - startTime;
    
    res.json({
      ...impact,
      metadata: {
        latency,
        cached: latency < 100
      }
    });
    
  } catch (error) {
    logger.error('Grid impact analysis request failed', { error: error.message });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to analyze grid impact',
        details: error.message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

// GET /api/v1/grid/impacts/:regionId
router.get('/impacts/:regionId', async (req, res) => {
  try {
    const gridRegionId = parseInt(req.params.regionId);
    const limit = parseInt(req.query.limit) || 10;
    
    const impacts = await gridImpactService.getRecentImpacts(gridRegionId, limit);
    
    res.json({
      impacts,
      totalCount: impacts.length
    });
    
  } catch (error) {
    logger.error('Failed to fetch grid impacts', { error: error.message });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch grid impacts',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// GET /api/v1/grid/impacts/severity/:severity
router.get('/impacts/severity/:severity', async (req, res) => {
  try {
    const severity = req.params.severity.toUpperCase();
    const limit = parseInt(req.query.limit) || 50;
    
    if (!['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].includes(severity)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid severity level',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    const impacts = await getImpactsBySeverity(severity, limit);
    
    res.json({
      severity,
      impacts,
      totalCount: impacts.length
    });
    
  } catch (error) {
    logger.error('Failed to fetch impacts by severity', { error: error.message });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch impacts',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// GET /api/v1/grid/regions
router.get('/regions', async (req, res) => {
  try {
    const regions = await getGridRegions();
    
    res.json({
      regions
    });
    
  } catch (error) {
    logger.error('Failed to fetch grid regions', { error: error.message });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch grid regions',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// GET /api/v1/grid/substations/:regionId
router.get('/substations/:regionId', async (req, res) => {
  try {
    const gridRegionId = parseInt(req.params.regionId);
    
    const substations = await getSubstationsByRegion(gridRegionId);
    
    res.json({
      gridRegionId,
      substations,
      totalCount: substations.length
    });
    
  } catch (error) {
    logger.error('Failed to fetch substations', { error: error.message });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch substations',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// GET /api/v1/grid/telemetry/:substationId
router.get('/telemetry/:substationId', async (req, res) => {
  try {
    const substationId = parseInt(req.params.substationId);
    
    const telemetry = await getLatestTelemetry(substationId);
    
    if (!telemetry) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'No telemetry data available',
          timestamp: new Date().toISOString()
        }
      });
    }
    
    res.json(telemetry);
    
  } catch (error) {
    logger.error('Failed to fetch telemetry', { error: error.message });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch telemetry',
        timestamp: new Date().toISOString()
      }
    });
  }
});

// GET /api/v1/grid/metrics
router.get('/metrics', async (req, res) => {
  try {
    const impactMetrics = gridImpactService.getMetrics();
    
    res.json({
      gridImpact: impactMetrics,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Failed to fetch metrics', { error: error.message });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch metrics',
        timestamp: new Date().toISOString()
      }
    });
  }
});

module.exports = router;