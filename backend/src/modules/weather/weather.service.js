const { v4: uuidv4 } = require('uuid');
const WeatherRepository = require('../../database/weather/weather.repository');
const PredictionAuditRepository = require('../../database/audit/prediction-audit.repository');

class WeatherService {
  constructor() {
    this.weatherRepository = new WeatherRepository();
    this.auditRepository = new PredictionAuditRepository();
  }

  async generatePrediction({ gridRegionId, forecastHours, parameters, userId, customerId }) {
    const predictionId = uuidv4();
    const generatedAt = new Date().toISOString();

    // Mock AI prediction generation (in production, this calls ML model)
    const predictions = this._generateMockPredictions(forecastHours, parameters);

    // Store prediction
    await this.weatherRepository.storePrediction({
      predictionId,
      gridRegionId,
      predictions,
      modelVersion: 'lstm-v2.1.0'
    });

    // Audit log
    await this.auditRepository.logPrediction({
      userId,
      customerId,
      requestType: 'weather_prediction',
      requestParams: { gridRegionId, forecastHours, parameters },
      responseSummary: { predictionId, dataPoints: predictions.length }
    });

    return {
      predictionId,
      gridRegionId,
      generatedAt,
      predictions,
      modelVersion: 'lstm-v2.1.0'
    };
  }

  async getPredictions({ regionId, startTime, endTime, limit, cursor }) {
    return await this.weatherRepository.getPredictions({
      regionId,
      startTime,
      endTime,
      limit,
      cursor
    });
  }

  async getLatestPrediction(regionId) {
    return await this.weatherRepository.getLatestPrediction(regionId);
  }

  async getPredictionById(predictionId) {
    return await this.weatherRepository.getPredictionById(predictionId);
  }

  _generateMockPredictions(hours, parameters) {
    const predictions = [];
    const now = new Date();

    for (let i = 0; i < hours; i++) {
      const timestamp = new Date(now.getTime() + i * 3600000).toISOString();
      const dataPoint = { timestamp, confidenceScore: 0.85 + Math.random() * 0.1 };

      if (!parameters || parameters.includes('temperature')) {
        dataPoint.temperature = 20 + Math.random() * 15;
      }
      if (!parameters || parameters.includes('wind_speed')) {
        dataPoint.windSpeed = 5 + Math.random() * 10;
      }
      if (!parameters || parameters.includes('precipitation')) {
        dataPoint.precipitation = Math.random() * 5;
      }
      if (!parameters || parameters.includes('humidity')) {
        dataPoint.humidity = 40 + Math.random() * 40;
      }
      if (!parameters || parameters.includes('solar_radiation')) {
        dataPoint.solarRadiation = Math.random() * 1000;
      }

      predictions.push(dataPoint);
    }

    return predictions;
  }
}

module.exports = WeatherService;