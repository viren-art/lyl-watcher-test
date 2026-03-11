const { Pool } = require('pg');
const logger = require('../../utils/logger');
const axios = require('axios');

class ModelRegistry {
  constructor() {
    this.pool = new Pool({
      host: process.env.TIMESCALEDB_HOST,
      port: process.env.TIMESCALEDB_PORT,
      database: process.env.TIMESCALEDB_DATABASE,
      user: process.env.TIMESCALEDB_USER,
      password: process.env.TIMESCALEDB_PASSWORD
    });

    this.mlflowUri = process.env.MLFLOW_TRACKING_URI || 'http://localhost:5000';
  }

  async initializeTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS ml_model_registry (
        model_id SERIAL PRIMARY KEY,
        model_type VARCHAR(50) NOT NULL,
        model_version VARCHAR(50) NOT NULL,
        mlflow_run_id VARCHAR(64) UNIQUE,
        accuracy NUMERIC(5,4),
        val_loss NUMERIC(10,6),
        val_mae NUMERIC(10,6),
        training_time_ms BIGINT,
        status VARCHAR(20) DEFAULT 'training',
        is_production BOOLEAN DEFAULT false,
        ab_test_id VARCHAR(64),
        deployed_at TIMESTAMPTZ,
        deprecated_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(model_type, model_version)
      );

      CREATE INDEX IF NOT EXISTS idx_model_type_status 
        ON ml_model_registry(model_type, status);
      
      CREATE INDEX IF NOT EXISTS idx_model_production 
        ON ml_model_registry(model_type, is_production) 
        WHERE is_production = true;

      CREATE TABLE IF NOT EXISTS model_training_history (
        history_id SERIAL PRIMARY KEY,
        model_id INT REFERENCES ml_model_registry(model_id),
        event_type VARCHAR(50) NOT NULL,
        event_data JSONB,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_training_history_model 
        ON model_training_history(model_id, created_at DESC);
    `;

    await this.pool.query(query);
    logger.info('Model registry tables initialized');
  }

  async registerModel(modelData) {
    const {
      modelType,
      modelVersion,
      mlflowRunId,
      accuracy,
      valLoss,
      valMae,
      trainingTime
    } = modelData;

    const query = `
      INSERT INTO ml_model_registry (
        model_type, model_version, mlflow_run_id, accuracy, 
        val_loss, val_mae, training_time_ms, status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 'trained')
      RETURNING model_id
    `;

    const result = await this.pool.query(query, [
      modelType,
      modelVersion,
      mlflowRunId,
      accuracy,
      valLoss,
      valMae,
      trainingTime
    ]);

    const modelId = result.rows[0].model_id;

    // Log training event
    await this.logTrainingEvent(modelId, 'model_trained', {
      accuracy,
      valLoss,
      valMae,
      trainingTime
    });

    logger.info(`Model registered: ${modelType} ${modelVersion}, id: ${modelId}`);

    return modelId;
  }

  async getCurrentAccuracy(modelType) {
    const query = `
      SELECT accuracy
      FROM ml_model_registry
      WHERE model_type = $1 AND is_production = true
      ORDER BY deployed_at DESC
      LIMIT 1
    `;

    const result = await this.pool.query(query, [modelType]);

    if (result.rows.length === 0) {
      logger.warn(`No production model found for ${modelType}`);
      return 0;
    }

    return parseFloat(result.rows[0].accuracy);
  }

  async getLastTrainingTime(modelType) {
    const query = `
      SELECT created_at
      FROM ml_model_registry
      WHERE model_type = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await this.pool.query(query, [modelType]);

    if (result.rows.length === 0) {
      // Return epoch if never trained
      return 0;
    }

    return new Date(result.rows[0].created_at).getTime();
  }

  async getProductionModel(modelType) {
    const query = `
      SELECT *
      FROM ml_model_registry
      WHERE model_type = $1 AND is_production = true
      ORDER BY deployed_at DESC
      LIMIT 1
    `;

    const result = await this.pool.query(query, [modelType]);

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];
  }

  async promoteToProduction(modelId) {
    const client = await this.pool.connect();

    try {
      await client.query('BEGIN');

      // Get model info
      const modelResult = await client.query(
        'SELECT model_type FROM ml_model_registry WHERE model_id = $1',
        [modelId]
      );

      if (modelResult.rows.length === 0) {
        throw new Error(`Model ${modelId} not found`);
      }

      const modelType = modelResult.rows[0].model_type;

      // Deprecate current production model
      await client.query(
        `UPDATE ml_model_registry 
         SET is_production = false, deprecated_at = NOW()
         WHERE model_type = $1 AND is_production = true`,
        [modelType]
      );

      // Promote new model
      await client.query(
        `UPDATE ml_model_registry 
         SET is_production = true, deployed_at = NOW(), status = 'production'
         WHERE model_id = $1`,
        [modelId]
      );

      await client.query('COMMIT');

      // Log promotion event
      await this.logTrainingEvent(modelId, 'promoted_to_production', {
        modelType,
        timestamp: new Date().toISOString()
      });

      logger.info(`Model ${modelId} promoted to production for ${modelType}`);

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async logTrainingEvent(modelId, eventType, eventData) {
    const query = `
      INSERT INTO model_training_history (model_id, event_type, event_data)
      VALUES ($1, $2, $3)
    `;

    await this.pool.query(query, [modelId, eventType, eventData]);
  }

  async getTrainingHistory(modelType, limit = 10) {
    const query = `
      SELECT 
        mr.model_id,
        mr.model_version,
        mr.accuracy,
        mr.status,
        mr.is_production,
        mr.created_at,
        mr.deployed_at,
        json_agg(
          json_build_object(
            'event_type', mth.event_type,
            'event_data', mth.event_data,
            'created_at', mth.created_at
          ) ORDER BY mth.created_at DESC
        ) as events
      FROM ml_model_registry mr
      LEFT JOIN model_training_history mth ON mr.model_id = mth.model_id
      WHERE mr.model_type = $1
      GROUP BY mr.model_id
      ORDER BY mr.created_at DESC
      LIMIT $2
    `;

    const result = await this.pool.query(query, [modelType, limit]);

    return result.rows;
  }

  async getModelMetrics(modelId) {
    try {
      const modelResult = await this.pool.query(
        'SELECT mlflow_run_id FROM ml_model_registry WHERE model_id = $1',
        [modelId]
      );

      if (modelResult.rows.length === 0) {
        return null;
      }

      const runId = modelResult.rows[0].mlflow_run_id;

      // Fetch from MLflow
      const response = await axios.get(
        `${this.mlflowUri}/api/2.0/mlflow/runs/get`,
        { params: { run_id: runId } }
      );

      return response.data.run.data.metrics;

    } catch (error) {
      logger.error(`Error fetching model metrics for ${modelId}:`, error);
      return null;
    }
  }
}

module.exports = ModelRegistry;