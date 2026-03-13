const express = require('express');
const BessService = require('./bess.service');
const { authenticateToken, requireRole } = require('../auth/auth.middleware');
const { validateTenantAccess } = require('../tenant-management/tenant.middleware');
const logger = require('../../utils/logger');

const router = express.Router();
const bessService = new BessService();

// POST /api/v1/bess/optimize-location
router.post('/optimize-location', authenticateToken, validateTenantAccess, async (req, res) => {
  try {
    const { gridRegionId, capacityMwh, budgetUsd, deploymentTimelineMonths, constraints } = req.body;
    
    if (!gridRegionId || !capacityMwh) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'gridRegionId and capacityMwh are required'
        }
      });
    }
    
    if (capacityMwh <= 0 || capacityMwh > 10000) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'capacityMwh must be between 0 and 10000'
        }
      });
    }
    
    const result = await bessService.optimizeLocations(
      gridRegionId,
      capacityMwh,
      budgetUsd,
      constraints
    );
    
    logger.info('BESS optimization requested', {
      userId: req.user.userId,
      customerId: req.user.customerId,
      gridRegionId,
      capacityMwh
    });
    
    res.json(result);
  } catch (error) {
    logger.error('BESS optimization failed', { error: error.message });
    res.status(500).json({
      error: {
        code: 'OPTIMIZATION_FAILED',
        message: 'Failed to optimize BESS locations',
        details: error.message
      }
    });
  }
});

// GET /api/v1/bess/recommendations/:regionId
router.get('/recommendations/:regionId', authenticateToken, validateTenantAccess, async (req, res) => {
  try {
    const regionId = parseInt(req.params.regionId);
    const filters = {
      status: req.query.status,
      minOptimizationScore: req.query.minOptimizationScore ? parseFloat(req.query.minOptimizationScore) : undefined,
      limit: req.query.limit ? parseInt(req.query.limit) : 50
    };
    
    const recommendations = await bessService.getRecommendations(regionId, filters);
    
    res.json({
      recommendations,
      count: recommendations.length
    });
  } catch (error) {
    logger.error('Failed to fetch BESS recommendations', { error: error.message });
    res.status(500).json({
      error: {
        code: 'FETCH_FAILED',
        message: 'Failed to fetch recommendations'
      }
    });
  }
});

// GET /api/v1/bess/roi-analysis/:locationId
router.get('/roi-analysis/:locationId', authenticateToken, async (req, res) => {
  try {
    const locationId = parseInt(req.params.locationId);
    const analysisYears = req.query.analysisYears ? parseInt(req.query.analysisYears) : 10;
    
    if (analysisYears < 1 || analysisYears > 30) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'analysisYears must be between 1 and 30'
        }
      });
    }
    
    const roiAnalysis = await bessService.getRoiAnalysis(locationId, analysisYears);
    
    res.json(roiAnalysis);
  } catch (error) {
    logger.error('Failed to generate ROI analysis', { error: error.message });
    res.status(500).json({
      error: {
        code: 'ANALYSIS_FAILED',
        message: error.message
      }
    });
  }
});

module.exports = router;