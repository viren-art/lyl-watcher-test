const { Pool } = require('pg');
const logger = require('../../utils/logger');

const pool = new Pool({
  host: process.env.TIMESCALEDB_HOST || 'localhost',
  port: parseInt(process.env.TIMESCALEDB_PORT) || 
5432,
  database: process.env.TIMESCALEDB_DATABASE || 'weather_db',
  user: process.env.TIMESCALEDB_USER || 'postgres',
  password: process.env.TIMESCALEDB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function initializeImpactTable() {
  const client = await pool.connect();
  
  try {
    // Create impact_severity enum
    await client.query(`
      DO $$ BEGIN
        CREATE TYPE impact_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $$;
    `);
    
    // Create grid_impact_predictions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS grid_impact_predictions (
        impact_id VARCHAR(100) PRIMARY KEY,
        grid_region_id INT NOT NULL,
        weather_prediction_id VARCHAR(100),
        timestamp TIMESTAMPTZ NOT NULL,
        predicted_load_mw NUMERIC(10,2) NOT NULL,
        predicted_generation_mw NUMERIC(10,2),
        stress_index INT CHECK (stress_index BETWEEN 0 AND 100),
        outage_probability NUMERIC(3,2) CHECK (outage_probability BETWEEN 0 AND 1),
        impact_severity impact_severity NOT NULL,
        affected_substations JSONB,
        recommendations TEXT[],
        confidence_score NUMERIC(3,2),
        model_version VARCHAR(50) NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_impact_region_time 
      ON grid_impact_predictions(grid_region_id, timestamp DESC)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_impact_severity 
      ON grid_impact_predictions(impact_severity, timestamp DESC)
    `);
    
    logger.info('Grid impact predictions table initialized');
    
  } catch (error) {
    logger.error('Failed to initialize impact table', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
}

async function storeGridImpact(impactData) {
  try {
    await pool.query(
      `INSERT INTO grid_impact_predictions (
        impact_id, grid_region_id, weather_prediction_id, timestamp,
        predicted_load_mw, predicted_generation_mw, stress_index,
        outage_probability, impact_severity, affected_substations,
        recommendations, confidence_score, model_version
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
        impactData.impactId,
        impactData.gridRegionId,
        impactData.weatherPredictionId,
        impactData.timestamp,
        impactData.predictedLoadMw,
        impactData.predictedGenerationMw,
        impactData.stressIndex,
        impactData.outageProbability,
        impactData.impactSeverity,
        JSON.stringify(impactData.affectedSubstations),
        impactData.recommendations,
        impactData.confidenceScore,
        impactData.modelVersion
      ]
    );
    
    logger.debug('Grid impact stored', { impactId: impactData.impactId });
    
  } catch (error) {
    logger.error('Failed to store grid impact', { 
      impactId: impactData.impactId,
      error: error.message 
    });
    throw error;
  }
}

async function getGridImpacts(gridRegionId, limit = 10) {
  try {
    const result = await pool.query(
      `SELECT 
        impact_id,
        grid_region_id,
        weather_prediction_id,
        timestamp,
        predicted_load_mw,
        predicted_generation_mw,
        stress_index,
        outage_probability,
        impact_severity,
        affected_substations,
        recommendations,
        confidence_score,
        model_version,
        created_at
      FROM grid_impact_predictions
      WHERE grid_region_id = $1
      ORDER BY timestamp DESC
      LIMIT $2`,
      [gridRegionId, limit]
    );
    
    return result.rows.map(row => ({
      impactId: row.impact_id,
      gridRegionId: row.grid_region_id,
      weatherPredictionId: row.weather_prediction_id,
      timestamp: row.timestamp.toISOString(),
      predictedLoadMw: parseFloat(row.predicted_load_mw),
      predictedGenerationMw: row.predicted_generation_mw ? parseFloat(row.predicted_generation_mw) : null,
      stressIndex: row.stress_index,
      outageProbability: parseFloat(row.outage_probability),
      impactSeverity: row.impact_severity,
      affectedSubstations: row.affected_substations,
      recommendations: row.recommendations,
      confidenceScore: parseFloat(row.confidence_score),
      modelVersion: row.model_version,
      createdAt: row.created_at.toISOString()
    }));
    
  } catch (error) {
    logger.error('Failed to fetch grid impacts', { 
      gridRegionId,
      error: error.message 
    });
    throw error;
  }
}

async function getImpactsBySeverity(severity, limit = 50) {
  try {
    const result = await pool.query(
      `SELECT 
        impact_id,
        grid_region_id,
        timestamp,
        predicted_load_mw,
        stress_index,
        outage_probability,
        impact_severity,
        affected_substations
      FROM grid_impact_predictions
      WHERE impact_severity = $1
        AND timestamp >= NOW() - INTERVAL '24 hours'
      ORDER BY timestamp DESC
      LIMIT $2`,
      [severity, limit]
    );
    
    return result.rows.map(row => ({
      impactId: row.impact_id,
      gridRegionId: row.grid_region_id,
      timestamp: row.timestamp.toISOString(),
      predictedLoadMw: parseFloat(row.predicted_load_mw),
      stressIndex: row.stress_index,
      outageProbability: parseFloat(row.outage_probability),
      impactSeverity: row.impact_severity,
      affectedSubstations: row.affected_substations
    }));
    
  } catch (error) {
    logger.error('Failed to fetch impacts by severity', { 
      severity,
      error: error.message 
    });
    throw error;
  }
}

module.exports = {
  initializeImpactTable,
  storeGridImpact,
  getGridImpacts,
  getImpactsBySeverity
};