const express = require('express');
const PredictionService = require('../../modules/ai-forecasting/prediction-service');
const { getLatestWeatherData, getWeatherHistory } = require('../../database/timeseries/weather-repository');
const { getPredictions } = require('../../database/timeseries/prediction-repository');
const logger = require('../../utils/logger');

const router = express.Router();
const predictionService = new PredictionService();

// POST /api/v1/weather/predict
router.post('/predict', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const { gridRegionId, forecastHours = 24 } = req.body;
    
    if (!gridRegionId) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'gridRegionId is required',
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    if (forecastHours < 1 || forecastHours > 168) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'forecastHours must be between 1 and 168',
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    const forecast = await predictionService.generateForecast(gridRegionId, forecastHours);
    
    res.json(forecast);
    
    logger.info('Weather prediction API request', {
      gridRegionId,
      forecastHours,
      responseTimeMs: Date.now() - startTime,
    });
  } catch (error) {
    logger.error('Weather prediction API error', { error: error.message });
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to generate weather prediction',
        details: error.message,
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// GET /api/v1/weather/current/:regionId
router.get('/current/:regionId', async (req, res) => {
  try {
    const gridRegionId = parseInt(req.params.regionId);
    
    const currentWeather = await getLatestWeatherData(gridRegionId);
    
    if (!currentWeather) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'No weather data found for region',
          timestamp: new Date().toISOString(),
        },
      });
    }
    
    res.json(currentWeather);
  } catch (error) {
    logger.error('Current weather API error', { error: error.message });
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch current weather',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// GET /api/v1/weather/history/:regionId
router.get('/history/:regionId', async (req, res) => {
  try {
    const gridRegionId = parseInt(req.params.regionId);
    const hours = parseInt(req.query.hours) || 24;
    
    const history = await getWeatherHistory(gridRegionId, hours);
    
    res.json({
      gridRegionId,
      hours,
      data: history,
      count: history.length,
    });
  } catch (error) {
    logger.error('Weather history API error', { error: error.message });
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch weather history',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

// GET /api/v1/weather/predictions/:regionId
router.get('/predictions/:regionId', async (req, res) => {
  try {
    const gridRegionId = parseInt(req.params.regionId);
    const limit = parseInt(req.query.limit) || 10;
    
    const predictions = await getPredictions(gridRegionId, limit);
    
    res.json({
      gridRegionId,
      predictions,
      count: predictions.length,
    });
  } catch (error) {
    logger.error('Predictions API error', { error: error.message });
    
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch predictions',
        timestamp: new Date().toISOString(),
      },
    });
  }
});

module.exports = router;