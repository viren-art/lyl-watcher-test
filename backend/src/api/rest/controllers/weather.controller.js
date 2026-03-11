const WeatherService = require('../../../modules/weather/weather.service');
const { ApiError } = require('../../../utils/errors');

class WeatherController {
  constructor() {
    this.weatherService = new WeatherService();
  }

  /**
   * POST /api/v1/weather/predict
   */
  async createPrediction(req, res, next) {
    try {
      const startTime = Date.now();
      const { gridRegionId, forecastHours, parameters } = req.body;
      const userId = req.user.userId;
      const customerId = req.user.customerId;

      // Validate forecast hours range (1-168)
      if (forecastHours < 1 || forecastHours > 168) {
        throw new ApiError('VALIDATION_ERROR', 'forecastHours must be between 1 and 168', 400);
      }

      // Generate prediction
      const prediction = await this.weatherService.generatePrediction({
        gridRegionId,
        forecastHours,
        parameters: parameters || ['temperature', 'wind_speed', 'precipitation', 'humidity', 'solar_radiation'],
        userId,
        customerId
      });

      const responseTime = Date.now() - startTime;

      res.status(201).json({
        predictionId: prediction.predictionId,
        gridRegionId: prediction.gridRegionId,
        generatedAt: prediction.generatedAt,
        predictions: prediction.predictions,
        modelVersion: prediction.modelVersion,
        metadata: {
          responseTimeMs: responseTime,
          forecastHours,
          parametersIncluded: prediction.predictions[0] ? Object.keys(prediction.predictions[0]).filter(k => k !== 'timestamp' && k !== 'confidenceScore') : []
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/weather/predictions/:regionId
   */
  async getPredictions(req, res, next) {
    try {
      const startTime = Date.now();
      const regionId = parseInt(req.params.regionId);
      const { startTime: queryStartTime, endTime: queryEndTime, limit = 100, cursor } = req.query;

      // Validate limit
      const validLimit = Math.min(parseInt(limit), 500);

      const result = await this.weatherService.getPredictions({
        regionId,
        startTime: queryStartTime,
        endTime: queryEndTime,
        limit: validLimit,
        cursor
      });

      const responseTime = Date.now() - startTime;

      res.json({
        predictions: result.predictions,
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
   * GET /api/v1/weather/predictions/:regionId/latest
   */
  async getLatestPrediction(req, res, next) {
    try {
      const startTime = Date.now();
      const regionId = parseInt(req.params.regionId);

      const prediction = await this.weatherService.getLatestPrediction(regionId);

      if (!prediction) {
        throw new ApiError('NOT_FOUND', 'No predictions found for this region', 404);
      }

      const responseTime = Date.now() - startTime;

      res.json({
        ...prediction,
        metadata: {
          responseTimeMs: responseTime
        }
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * GET /api/v1/weather/prediction/:predictionId
   */
  async getPredictionById(req, res, next) {
    try {
      const startTime = Date.now();
      const predictionId = req.params.predictionId;

      const prediction = await this.weatherService.getPredictionById(predictionId);

      if (!prediction) {
        throw new ApiError('NOT_FOUND', 'Prediction not found', 404);
      }

      const responseTime = Date.now() - startTime;

      res.json({
        ...prediction,
        metadata: {
          responseTimeMs: responseTime
        }
      });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = WeatherController;