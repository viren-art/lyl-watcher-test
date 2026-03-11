const { spawn } = require('child_process');
const path = require('path');
const logger = require('../../utils/logger');
const { getWeatherHistory } = require('../../database/timeseries/weather-repository');
const { storePrediction } = require('../../database/timeseries/prediction-repository');
const { producer, TOPICS } = require('../weather-ingestion/kafka-config');

class PredictionService {
  constructor() {
    this.modelPath = process.env.MODEL_PATH || 'models/weather_lstm_best.h5';
    this.pythonPath = process.env.PYTHON_PATH || 'python3';
    this.predictionCache = new Map();
    this.cacheTimeout = 900000; // 15 minutes
  }

  async generateForecast(gridRegionId, forecastHours = 24) {
    const startTime = Date.now();
    
    try {
      // Check cache
      const cacheKey = `${gridRegionId}-${forecastHours}`;
      const cached = this.predictionCache.get(cacheKey);
      
      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        logger.debug('Returning cached prediction', { gridRegionId, forecastHours });
        return cached.data;
      }
      
      // Fetch historical data (last 24 hours)
      const historicalData = await getWeatherHistory(gridRegionId, 24);
      
      if (historicalData.length < 24) {
        throw new Error(`Insufficient historical data: ${historicalData.length} hours`);
      }
      
      // Prepare input features
      const inputFeatures = this.prepareInputFeatures(historicalData);
      
      // Call Python prediction service
      const prediction = await this.callPythonPredictor(inputFeatures, forecastHours);
      
      // Calculate confidence score
      const confidenceScore = this.calculateConfidenceScore(prediction);
      
      // Format response
      const forecast = {
        predictionId: this.generatePredictionId(),
        gridRegionId,
        generatedAt: new Date().toISOString(),
        forecastHours,
        predictions: this.formatPredictions(prediction, historicalData[0].location),
        modelVersion: prediction.modelVersion || '1.0.0',
        confidenceScore,
        processingTimeMs: Date.now() - startTime,
      };
      
      // Store prediction
      await storePrediction(forecast);
      
      // Publish to Kafka
      await this.publishPrediction(forecast);
      
      // Cache result
      this.predictionCache.set(cacheKey, {
        data: forecast,
        timestamp: Date.now(),
      });
      
      logger.info('Generated weather forecast', {
        gridRegionId,
        forecastHours,
        confidenceScore,
        processingTimeMs: forecast.processingTimeMs,
      });
      
      return forecast;
    } catch (error) {
      logger.error('Failed to generate forecast', {
        gridRegionId,
        forecastHours,
        error: error.message,
      });
      throw error;
    }
  }

  prepareInputFeatures(historicalData) {
    // Extract features in order: temp, wind, precip, humidity, solar, pressure
    return historicalData.map(record => [
      record.temperature || 0,
      record.windSpeed || 0,
      record.precipitation || 0,
      record.humidity || 0,
      record.solarRadiation || 0,
      record.pressure || 0,
    ]);
  }

  async callPythonPredictor(inputFeatures, forecastHours) {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, 'predict.py');
      const python = spawn(this.pythonPath, [
        pythonScript,
        '--model-path', this.modelPath,
        '--forecast-hours', forecastHours.toString(),
      ]);
      
      let outputData = '';
      let errorData = '';
      
      // Send input data via stdin
      python.stdin.write(JSON.stringify({ features: inputFeatures }));
      python.stdin.end();
      
      python.stdout.on('data', (data) => {
        outputData += data.toString();
      });
      
      python.stderr.on('data', (data) => {
        errorData += data.toString();
      });
      
      python.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`Python predictor failed: ${errorData}`));
        } else {
          try {
            const result = JSON.parse(outputData);
            resolve(result);
          } catch (error) {
            reject(new Error(`Failed to parse prediction output: ${error.message}`));
          }
        }
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        python.kill();
        reject(new Error('Prediction timeout'));
      }, 5000);
    });
  }

  formatPredictions(prediction, baseLocation) {
    const predictions = prediction.predictions;
    const confidenceIntervals = prediction.confidence_intervals;
    const uncertainty = prediction.uncertainty;
    
    return predictions.map((values, index) => {
      const timestamp = new Date(Date.now() + (index + 1) * 3600000).toISOString();
      
      return {
        timestamp,
        location: baseLocation,
        temperature: values[0],
        windSpeed: values[1],
        precipitation: values[2],
        humidity: values[3],
        solarRadiation: values[4],
        pressure: values[5],
        confidenceIntervals: {
          temperature: {
            lower: confidenceIntervals.lower[index][0],
            upper: confidenceIntervals.upper[index][0],
          },
          windSpeed: {
            lower: confidenceIntervals.lower[index][1],
            upper: confidenceIntervals.upper[index][1],
          },
          precipitation: {
            lower: confidenceIntervals.lower[index][2],
            upper: confidenceIntervals.upper[index][2],
          },
        },
        uncertainty: {
          temperature: uncertainty[index][0],
          windSpeed: uncertainty[index][1],
          precipitation: uncertainty[index][2],
        },
      };
    });
  }

  calculateConfidenceScore(prediction) {
    // Calculate average confidence based on uncertainty
    const avgUncertainty = prediction.uncertainty.reduce((sum, values) => {
      return sum + values.reduce((s, v) => s + v, 0) / values.length;
    }, 0) / prediction.uncertainty.length;
    
    // Convert to confidence score (0-1)
    const confidenceScore = Math.max(0, Math.min(1, 1 - avgUncertainty / 10));
    return parseFloat(confidenceScore.toFixed(3));
  }

  generatePredictionId() {
    return `pred_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  async publishPrediction(forecast) {
    await producer.send({
      topic: TOPICS.PREDICTIONS,
      messages: [
        {
          key: `${forecast.gridRegionId}`,
          value: JSON.stringify(forecast),
          timestamp: Date.now().toString(),
        },
      ],
    });
  }

  clearCache() {
    this.predictionCache.clear();
    logger.info('Prediction cache cleared');
  }
}

module.exports = PredictionService;