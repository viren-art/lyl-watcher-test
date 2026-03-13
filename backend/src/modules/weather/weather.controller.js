const WeatherService = require('./weather.service');

class WeatherController {
  constructor() {
    this.weatherService = new WeatherService();
  }

  /**
   * POST /api/v1/weather/predict
   * Generate weather forecast for a region
   */
  async generateForecast(req, res) {
    try {
      const { gridRegionId, forecastHours = 24 } = req.body;

      if (!gridRegionId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Grid region ID required',
            timestamp: new Date().toISOString(),
            requestId: req.id
          }
        });
      }

      const result = await this.weatherService.generateForecast(
        gridRegionId,
        forecastHours,
        req.user?.userId
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'FORECAST_GENERATION_FAILED',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }
  }

  /**
   * GET /api/v1/weather/predictions/:regionId
   * Get weather predictions for a region
   */
  async getPredictions(req, res) {
    try {
      const regionId = parseInt(req.params.regionId);
      const { startTime, endTime, limit = 50 } = req.query;

      const result = await this.weatherService.getPredictions(
        regionId,
        startTime ? new Date(startTime) : new Date(),
        endTime ? new Date(endTime) : new Date(Date.now() + 24 * 3600000),
        parseInt(limit)
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'PREDICTION_RETRIEVAL_FAILED',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }
  }

  /**
   * GET /api/v1/weather/accuracy/:predictionId
   * Validate prediction accuracy
   */
  async validateAccuracy(req, res) {
    try {
      const predictionId = req.params.predictionId;

      const result = await this.weatherService.validateAccuracy(predictionId);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'ACCURACY_VALIDATION_FAILED',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }
  }

  /**
   * GET /api/v1/weather/model/performance
   * Get model performance metrics
   */
  async getModelPerformance(req, res) {
    try {
      const { startDate, endDate } = req.query;

      const result = await this.weatherService.getModelPerformance(
        startDate ? new Date(startDate) : new Date(Date.now() - 30 * 24 * 3600000),
        endDate ? new Date(endDate) : new Date()
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'PERFORMANCE_RETRIEVAL_FAILED',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }
  }
}

module.exports = WeatherController;