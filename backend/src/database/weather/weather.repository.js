const { Pool } = require('pg');

class WeatherRepository {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
  }

  async storePrediction({ predictionId, gridRegionId, predictions, modelVersion }) {
    // Mock implementation - in production, stores in TimescaleDB
    return { predictionId, stored: true };
  }

  async getPredictions({ regionId, startTime, endTime, limit, cursor }) {
    // Mock implementation
    return {
      predictions: [],
      nextCursor: null,
      totalCount: 0
    };
  }

  async getLatestPrediction(regionId) {
    // Mock implementation
    return null;
  }

  async getPredictionById(predictionId) {
    // Mock implementation
    return null;
  }
}

module.exports = WeatherRepository;