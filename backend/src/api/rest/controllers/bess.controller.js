const BessService = require('../../../modules/bess/bess.service');
const { ApiError } = require('../../../utils/errors');

class BessController {
  constructor() {
    this.bessService = new BessService();
  }

  /**
   * POST /api/v1/bess/optimize-location
   */
  async optimizeLocation(req, res, next) {
    try {
      const startTime = Date.now();
      const { gridRegionId, capacityMwh, budgetUsd, deploymentTimelineMonths, constraints } = req.body;
      const userId = req.user.userId;
      const customerId = req.user.customerId;

      const optimization = await this.bessService.optimizeLocation({
        gridRegionId,
        capacityMwh,
        budgetUsd,
        deploymentTimelineMonths,
        constraints,
        userId,
        customerId
      });

      const responseTime = Date.now() - startTime;

      res.status(201).json({
        ...optimization,
        metadata: {
          responseTimeMs: responseTime
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/bess/recommendations/:regionId
   */
  async getRecommendations(req, res, next) {
    try {
      const startTime = Date.now();
      const regionId = parseInt(req.params.regionId);
      const { status, minOptimizationScore, limit = 100, cursor } = req.query;

      const validLimit = Math.min(parseInt(limit), 500);

      const result = await this.bessService.getRecommendations({
        regionId,
        status,
        minOptimizationScore: minOptimizationScore ? parseFloat(minOptimizationScore) : undefined,
        limit: validLimit,
        cursor
      });

      const responseTime = Date.now() - startTime;

      res.json({
        recommendations: result.recommendations,
        nextCursor: result.nextCursor,
        totalCount: result.totalCount,
        metadata: {
          responseTimeMs: responseTime,
          limit: validLimit,
          hasMore: !!result.nextCursor
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/bess/roi-analysis
   */
  async analyzeRoi(req, res, next) {
    try {
      const startTime = Date.now();
      const { locationId, analysisYears = 20 } = req.body;

      const roiAnalysis = await this.bessService.analyzeRoi({
        locationId,
        analysisYears
      });

      const responseTime = Date.now() - startTime;

      res.json({
        ...roiAnalysis,
        metadata: {
          responseTimeMs: responseTime
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = BessController;