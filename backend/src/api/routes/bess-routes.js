const express = require('express');
const BESSOptimizationService = require('../../modules/bess-optimization/optimization-service');
const { getBESSRecommendations, getBESSLocationById, updateBESSStatus } = require('../../database/bess-locations/bess-repository');
const logger = require('../../utils/logger');

const router = express.Router();
const bessOptimizationService = new BESSOptimizationService();

// POST /api/v1/bess/optimize-location
router.post('/optimize-location', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { 
      gridRegionId, 
      capacityMwh = 100,
      budgetUsd = 30000000,
      deploymentTimelineMonths = 24,
      constraints = {}
    } = req.body;
    
    if (!gridRegionId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'gridRegionId is required',
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }
    
    logger.info(`BESS optimization request for region ${gridRegionId}`);
    
    const result = await bessOptimizationService.optimizeLocations(gridRegionId, {
      capacityMwh,
      budgetUsd,
      deploymentTimelineMonths,
      constraints
    });
    
    const latency = Date.now() - startTime;
    
    res.json({
      ...result,
      processingTimeMs: latency
    });
    
  } catch (error) {
    logger.error('Error in BESS optimization:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'BESS optimization failed',
        details: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  }
});

// GET /api/v1/bess/recommendations/:regionId
router.get('/recommendations/:regionId', async (req, res) => {
  try {
    const gridRegionId = parseInt(req.params.regionId);
    const limit = parseInt(req.query.limit) || 10;
    const minOptimizationScore = parseFloat(req.query.minOptimizationScore) || 0;
    
    if (isNaN(gridRegionId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid regionId',
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }
    
    let recommendations = await getBESSRecommendations(gridRegionId, limit);
    
    // Filter by minimum optimization score
    if (minOptimizationScore > 0) {
      recommendations = recommendations.filter(
        r => r.optimizationScore >= minOptimizationScore
      );
    }
    
    res.json({
      recommendations,
      totalCount: recommendations.length
    });
    
  } catch (error) {
    logger.error('Error getting BESS recommendations:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve BESS recommendations',
        details: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  }
});

// GET /api/v1/bess/location/:locationId
router.get('/location/:locationId', async (req, res) => {
  try {
    const locationId = parseInt(req.params.locationId);
    
    if (isNaN(locationId)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid locationId',
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }
    
    const location = await getBESSLocationById(locationId);
    
    if (!location) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `BESS location ${locationId} not found`,
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }
    
    res.json(location);
    
  } catch (error) {
    logger.error('Error getting BESS location:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve BESS location',
        details: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  }
});

// PUT /api/v1/bess/location/:locationId/status
router.put('/location/:locationId/status', async (req, res) => {
  try {
    const locationId = parseInt(req.params.locationId);
    const { status } = req.body;
    
    const validStatuses = ['PROPOSED', 'APPROVED', 'UNDER_CONSTRUCTION', 'DEPLOYED', 'DECOMMISSIONED'];
    
    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }
    
    await updateBESSStatus(locationId, status);
    
    res.json({
      success: true,
      locationId,
      status,
      updatedAt: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error updating BESS status:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to update BESS status',
        details: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  }
});

// GET /api/v1/bess/metrics
router.get('/metrics', async (req, res) => {
  try {
    const metrics = bessOptimizationService.getMetrics();
    
    res.json({
      metrics,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    logger.error('Error getting BESS metrics:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to retrieve metrics',
        details: error.message,
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  }
});

module.exports = router;