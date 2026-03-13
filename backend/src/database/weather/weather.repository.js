const { Pool } = require('pg');

class WeatherRepository {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async getRegionById(regionId) {
    const query = `
      SELECT 
        grid_region_id,
        region_name,
        ST_Y(ST_Centroid(boundary_polygon)) as center_lat,
        ST_X(ST_Centroid(boundary_polygon)) as center_lon
      FROM grid_regions
      WHERE grid_region_id = $1
    `;
    const result = await this.pool.query(query, [regionId]);
    return result.rows[0];
  }

  async getHistoricalWeather(regionId, hours = 24) {
    const query = `
      SELECT 
        temperature,
        humidity,
        pressure,
        wind_speed,
        cloud_cover,
        timestamp
      FROM weather_observations
      WHERE grid_region_id = $1
        AND timestamp > now() - interval '${hours} hours'
      ORDER BY timestamp DESC
      LIMIT ${hours}
    `;
    const result = await this.pool.query(query, [regionId]);
    return result.rows;
  }

  async storePredictions(regionId, predictions, modelVersion) {
    const predictionId = `pred_${Date.now()}_${regionId}`;

    const query = `
      INSERT INTO weather_predictions (
        prediction_id,
        grid_region_id,
        forecast_start,
        forecast_end,
        data,
        model_version,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, now())
      RETURNING prediction_id
    `;

    const forecastStart = new Date(predictions[0].timestamp);
    const forecastEnd = new Date(predictions[predictions.length - 1].timestamp);

    const values = [
      predictionId,
      regionId,
      forecastStart,
      forecastEnd,
      JSON.stringify(predictions),
      modelVersion
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0].prediction_id;
  }

  async getPredictions(regionId, startTime, endTime, limit) {
    const query = `
      SELECT 
        prediction_id,
        grid_region_id,
        forecast_start,
        forecast_end,
        data,
        model_version,
        created_at
      FROM weather_predictions
      WHERE grid_region_id = $1
        AND forecast_start >= $2
        AND forecast_end <= $3
      ORDER BY created_at DESC
      LIMIT $4
    `;

    const result = await this.pool.query(query, [regionId, startTime, endTime, limit]);
    return result.rows.map(row => ({
      ...row,
      data: JSON.parse(row.data)
    }));
  }

  async getPredictionById(predictionId) {
    const query = `
      SELECT * FROM weather_predictions
      WHERE prediction_id = $1
    `;
    const result = await this.pool.query(query, [predictionId]);
    if (result.rows[0]) {
      result.rows[0].data = JSON.parse(result.rows[0].data);
    }
    return result.rows[0];
  }

  async getActualWeather(regionId, startTime, endTime) {
    const query = `
      SELECT 
        temperature,
        precipitation,
        wind_speed,
        timestamp
      FROM weather_observations
      WHERE grid_region_id = $1
        AND timestamp >= $2
        AND timestamp <= $3
      ORDER BY timestamp ASC
    `;
    const result = await this.pool.query(query, [regionId, startTime, endTime]);
    return result.rows;
  }

  async storeAccuracyMetrics(predictionId, accuracy) {
    const query = `
      INSERT INTO prediction_accuracy (
        prediction_id,
        overall_accuracy,
        temperature_accuracy,
        precipitation_accuracy,
        wind_speed_accuracy,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, now())
      RETURNING *
    `;

    const values = [
      predictionId,
      accuracy.overall,
      accuracy.temperature,
      accuracy.precipitation,
      accuracy.windSpeed
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getAccuracyMetrics(modelVersion, startDate, endDate) {
    const query = `
      SELECT 
        pa.*,
        wp.model_version
      FROM prediction_accuracy pa
      JOIN weather_predictions wp ON pa.prediction_id = wp.prediction_id
      WHERE wp.model_version = $1
        AND pa.created_at >= $2
        AND pa.created_at <= $3
      ORDER BY pa.created_at DESC
    `;

    const result = await this.pool.query(query, [modelVersion, startDate, endDate]);
    return result.rows;
  }
}

module.exports = WeatherRepository;