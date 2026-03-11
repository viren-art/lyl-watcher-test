const { Pool } = require('pg');
const logger = require('../../utils/logger');

const pool = new Pool({
  host: process.env.TIMESCALEDB_HOST || 'localhost',
  port: process.env.TIMESCALEDB_PORT || 5432,
  database: process.env.TIMESCALEDB_DATABASE || 'weather_db',
  user: process.env.TIMESCALEDB_USER || 'postgres',
  password: process.env.TIMESCALEDB_PASSWORD,
  max: 20,
  ssl: process.env.TIMESCALEDB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

async function initializePredictionTable() {
  const client = await pool.connect();
  
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS weather_predictions (
        prediction_id VARCHAR(50) PRIMARY KEY,
        grid_region_id INTEGER NOT NULL,
        generated_at TIMESTAMPTZ NOT NULL,
        forecast_hours INTEGER NOT NULL,
        model_version VARCHAR(20) NOT NULL,
        confidence_score NUMERIC(3,2),
        processing_time_ms INTEGER,
        predictions JSONB NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW()
      )
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_predictions_region_time 
      ON weather_predictions (grid_region_id, generated_at DESC)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_predictions_confidence 
      ON weather_predictions (confidence_score DESC)
    `);
    
    logger.info('Prediction table initialized');
  } catch (error) {
    logger.error('Failed to initialize prediction table', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
}

async function storePrediction(forecast) {
  const client = await pool.connect();
  
  try {
    const query = `
      INSERT INTO weather_predictions (
        prediction_id, grid_region_id, generated_at, forecast_hours,
        model_version, confidence_score, processing_time_ms, predictions
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      ON
      ON CONFLICT (prediction_id) DO UPDATE SET
        confidence_score = EXCLUDED.confidence_score,
        predictions = EXCLUDED.predictions
    `;
    
    await client.query(query, [
      forecast.predictionId,
      forecast.gridRegionId,
      forecast.generatedAt,
      forecast.forecastHours,
      forecast.modelVersion,
      forecast.confidenceScore,
      forecast.processingTimeMs,
      JSON.stringify(forecast.predictions),
    ]);
    
    logger.debug('Stored prediction', { predictionId: forecast.predictionId });
  } catch (error) {
    logger.error('Failed to store prediction', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
}

async function getPredictions(gridRegionId, limit = 10) {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT 
        prediction_id,
        grid_region_id,
        generated_at,
        forecast_hours,
        model_version,
        confidence_score,
        processing_time_ms,
        predictions
      FROM weather_predictions
      WHERE grid_region_id = $1
      ORDER BY generated_at DESC
      LIMIT $2
    `;
    
    const result = await client.query(query, [gridRegionId, limit]);
    
    return result.rows.map(row => ({
      predictionId: row.prediction_id,
      gridRegionId: row.grid_region_id,
      generatedAt: row.generated_at,
      forecastHours: row.forecast_hours,
      modelVersion: row.model_version,
      confidenceScore: parseFloat(row.confidence_score),
      processingTimeMs: row.processing_time_ms,
      predictions: row.predictions,
    }));
  } finally {
    client.release();
  }
}

module.exports = {
  initializePredictionTable,
  storePrediction,
  getPredictions,
};