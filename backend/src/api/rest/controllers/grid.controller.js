const GridService = require('../../../modules/grid/grid.service');
const { ApiError } = require('../../../utils/errors');

class GridController {
  constructor() {
    this.gridService = new GridService();
  }

  /**
   * POST /api/v1/grid/impact-analysis
   */
  async createImpactAnalysis(req, res, next) {
    try {
      const startTime = Date.now();
      const { gridRegionId, weatherPredictionId, forecastHours = 24 } = req.body;
      const userId = req.user.userId;
      const customerId = req.user.customerId;

      const impact = await this.gridService.generateImpactAnalysis({
        gridRegionId,
        weatherPredictionId,
        forecastHours,
        userId,
        customerId
      });

      const responseTime = Date.now() - startTime;

      res.status(201).json({
        ...impact,
        metadata: {
          responseTimeMs: responseTime
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/grid/impacts/:regionId
   */
  async getImpacts(req, res, next) {
    try {
      const startTime = Date.now();
      const regionId = parseInt(req.params.regionId);
      const { severity, startTime: queryStartTime, endTime: queryEndTime, limit = 100, cursor } = req.query;

      const validLimit = Math.min(parseInt(limit), 500);

      const result = await this.gridService.getImpacts({
        regionId,
        severity,
        startTime: queryStartTime,
        endTime: queryEndTime,
        limit: validLimit,
        cursor
      });

      const responseTime = Date.now() - startTime;

      res.json({
        impacts: result.impacts,
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
   * GET /api/v1/grid/impacts/:regionId/latest
   */
  async getLatestImpact(req, res, next) {
    try {
      const startTime = Date.now();
      const regionId = parseInt(req.params.regionId);

      const impact = await this.gridService.getLatestImpact(regionId);

      if (!impact) {
        throw new ApiError('NOT_FOUND', 'No impact predictions found for this region', 404);
      }

      const responseTime = Date.now() - startTime;

      res.json({
        ...impact,
        metadata: {
          responseTimeMs: responseTime
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/v1/grid/alerts/subscribe
   */
  async subscribeAlerts(req, res, next) {
    try {
      const { gridRegionId, severityThreshold, webhookUrl, email } = req.body;
      const customerId = req.user.customerId;

      const subscription = await this.gridService.subscribeAlerts({
        customerId,
        gridRegionId,
        severityThreshold,
        webhookUrl,
        email
      });

      res.status(201).json(subscription);
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/grid/regions
   */
  async getRegions(req, res, next) {
    try {
      const customerId = req.user.customerId;
      const subscriptionOnly = req.query.subscriptionOnly === 'true';

      const regions = await this.gridService.getRegions(customerId, subscriptionOnly);

      res.json({
        regions
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/grid/regions/:regionId/substations
   */
  async getSubstations(req, res, next) {
    try {
      const regionId = parseInt(req.params.regionId);

      const substations = await this.gridService.getSubstations(regionId);

      res.json({
        substations
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = GridController;