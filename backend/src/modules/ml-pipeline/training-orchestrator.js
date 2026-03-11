const { spawn } = require('child_process');
const path = require('path');
const logger = require('../../utils/logger');
const { getTrainingDataset, getValidationDataset } = require('../../database/timeseries/weather-repository');
const { getGridTrainingData } = require('../../database/grid-data/telemetry-repository');
const ModelRegistry = require('./model-registry');
const ABTestingService = require('../ab-testing/ab-testing-service');

class TrainingOrchestrator {
  constructor() {
    this.pythonPath = process.env.PYTHON_PATH || 'python3';
    this.modelRegistry = new ModelRegistry();
    this.abTestingService = new ABTestingService();
    this.trainingJobs = new Map();
    this.trainingMetrics = {
      totalJobs: 0,
      successfulJobs: 0,
      failedJobs: 0,
      averageTrainingTime: 0
    };
  }

  async checkRetrainingTriggers() {
    try {
      logger.info('Checking retraining triggers...');

      // Check weather model accuracy
      const weatherAccuracy = await this.modelRegistry.getCurrentAccuracy('weather_lstm');
      if (weatherAccuracy < 0.85) {
        logger.warn(`Weather model accuracy ${weatherAccuracy} below threshold 0.85`);
        await this.triggerRetraining('weather_lstm', 'accuracy_degradation');
      }

      // Check grid impact model accuracy
      const gridAccuracy = await this.modelRegistry.getCurrentAccuracy('grid_transformer');
      if (gridAccuracy < 0.80) {
        logger.warn(`Grid impact model accuracy ${gridAccuracy} below threshold 0.80`);
        await this.triggerRetraining('grid_transformer', 'accuracy_degradation');
      }

      // Check data accumulation
      const weatherDataCount = await this.getNewDataCount('weather');
      const gridDataCount = await this.getNewDataCount('grid');

      // Trigger if 10,000+ new weather data points
      if (weatherDataCount >= 10000) {
        logger.info(`${weatherDataCount} new weather data points accumulated`);
        await this.triggerRetraining('weather_lstm', 'data_accumulation');
      }

      // Trigger if 50,000+ new grid telemetry points
      if (gridDataCount >= 50000) {
        logger.info(`${gridDataCount} new grid telemetry points accumulated`);
        await this.triggerRetraining('grid_transformer', 'data_accumulation');
      }

      // Check scheduled retraining (weekly)
      const lastTraining = await this.modelRegistry.getLastTrainingTime('weather_lstm');
      const daysSinceTraining = (Date.now() - lastTraining) / (1000 * 60 * 60 * 24);
      if (daysSinceTraining >= 7) {
        logger.info(`${daysSinceTraining} days since last training, triggering scheduled retraining`);
        await this.triggerRetraining('weather_lstm', 'scheduled');
        await this.triggerRetraining('grid_transformer', 'scheduled');
      }

    } catch (error) {
      logger.error('Error checking retraining triggers:', error);
    }
  }

  async triggerRetraining(modelType, reason) {
    const jobId = `${modelType}_${Date.now()}`;
    
    try {
      logger.info(`Triggering retraining for ${modelType}, reason: ${reason}, jobId: ${jobId}`);

      // Check if already training
      if (this.trainingJobs.has(modelType)) {
        logger.warn(`Training already in progress for ${modelType}`);
        return { status: 'already_running', jobId: this.trainingJobs.get(modelType) };
      }

      // Mark as training
      this.trainingJobs.set(modelType, jobId);

      // Prepare training data
      const trainingData = await this.prepareTrainingData(modelType);
      
      // Start training job
      const trainingPromise = this.executeTraining(modelType, trainingData, jobId);

      // Don't await - let it run in background
      trainingPromise
        .then(async (result) => {
          logger.info(`Training completed for ${modelType}:`, result);
          
          // Start A/B testing
          await this.abTestingService.startABTest(
            modelType,
            result.modelVersion,
            result.currentVersion
          );

          this.trainingJobs.delete(modelType);
          this.trainingMetrics.successfulJobs++;
        })
        .catch((error) => {
          logger.error(`Training failed for ${modelType}:`, error);
          this.trainingJobs.delete(modelType);
          this.trainingMetrics.failedJobs++;
        });

      this.trainingMetrics.totalJobs++;

      return { status: 'started', jobId };

    } catch (error) {
      logger.error(`Error triggering retraining for ${modelType}:`, error);
      this.trainingJobs.delete(modelType);
      throw error;
    }
  }

  async prepareTrainingData(modelType) {
    logger.info(`Preparing training data for ${modelType}`);

    if (modelType === 'weather_lstm') {
      // Get last 90 days of weather data
      const trainingData = await getTrainingDataset(90);
      const validationData = await getValidationDataset(30);

      return {
        training: trainingData,
        validation: validationData,
        features: ['temperature', 'wind_speed', 'precipitation', 'humidity', 'solar_radiation'],
        sequenceLength: 24, // 24 hours
        forecastHorizon: 24
      };

    } else if (modelType === 'grid_transformer') {
      // Get last 60 days of grid + weather data
      const gridData = await getGridTrainingData(60);
      const weatherData = await getTrainingDataset(60);

      return {
        gridData,
        weatherData,
        features: {
          weather: ['temperature', 'wind_speed', 'precipitation'],
          grid: ['load_mw', 'generation_mw', 'voltage_kv', 'frequency_hz']
        },
        sequenceLength: 48, // 48 hours
        forecastHorizon: 24
      };
    }

    throw new Error(`Unknown model type: ${modelType}`);
  }

  async executeTraining(modelType, trainingData, jobId) {
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const scriptPath = path.join(__dirname, 'train_model.py');
      const python = spawn(this.pythonPath, [
        scriptPath,
        '--model-type', modelType,
        '--job-id', jobId,
        '--mlflow-tracking-uri', process.env.MLFLOW_TRACKING_URI || 'http://localhost:5000'
      ]);

      let outputData = '';
      let errorData = '';

      // Send training data via stdin
      python.stdin.write(JSON.stringify(trainingData));
      python.stdin.end();

      python.stdout.on('data', (data) => {
        const output = data.toString();
        outputData += output;
        logger.info(`Training output [${modelType}]:`, output.trim());
      });

      python.stderr.on('data', (data) => {
        const error = data.toString();
        errorData += error;
        logger.error(`Training error [${modelType}]:`, error.trim());
      });

      python.on('close', (code) => {
        const trainingTime = Date.now() - startTime;
        
        // Update average training time
        const totalTime = this.trainingMetrics.averageTrainingTime * this.trainingMetrics.totalJobs;
        this.trainingMetrics.averageTrainingTime = (totalTime + trainingTime) / (this.trainingMetrics.totalJobs + 1);

        if (code === 0) {
          try {
            const result = JSON.parse(outputData);
            resolve({
              ...result,
              trainingTime,
              jobId
            });
          } catch (error) {
            reject(new Error(`Failed to parse training output: ${error.message}`));
          }
        } else {
          reject(new Error(`Training process exited with code ${code}: ${errorData}`));
        }
      });

      // Timeout after 2 hours
      setTimeout(() => {
        python.kill();
        reject(new Error('Training timeout after 2 hours'));
      }, 2 * 60 * 60 * 1000);
    });
  }

  async getNewDataCount(dataType) {
    try {
      if (dataType === 'weather') {
        const lastTraining = await this.modelRegistry.getLastTrainingTime('weather_lstm');
        const { Pool } = require('pg');
        const pool = new Pool({
          host: process.env.TIMESCALEDB_HOST,
          port: process.env.TIMESCALEDB_PORT,
          database: process.env.TIMESCALEDB_DATABASE,
          user: process.env.TIMESCALEDB_USER,
          password: process.env.TIMESCALEDB_PASSWORD
        });

        const result = await pool.query(
          'SELECT COUNT(*) FROM weather_data WHERE timestamp > $1',
          [new Date(lastTraining)]
        );
        
        return parseInt(result.rows[0].count);

      } else if (dataType === 'grid') {
        const lastTraining = await this.modelRegistry.getLastTrainingTime('grid_transformer');
        const { Pool } = require('pg');
        const pool = new Pool({
          host: process.env.TIMESCALEDB_HOST,
          port: process.env.TIMESCALEDB_PORT,
          database: process.env.TIMESCALEDB_DATABASE,
          user: process.env.TIMESCALEDB_USER,
          password: process.env.TIMESCALEDB_PASSWORD
        });

        const result = await pool.query(
          'SELECT COUNT(*) FROM grid_telemetry WHERE timestamp > $1',
          [new Date(lastTraining)]
        );
        
        return parseInt(result.rows[0].count);
      }

      return 0;
    } catch (error) {
      logger.error(`Error getting new data count for ${dataType}:`, error);
      return 0;
    }
  }

  getMetrics() {
    return {
      ...this.trainingMetrics,
      activeJobs: Array.from(this.trainingJobs.entries()).map(([modelType, jobId]) => ({
        modelType,
        jobId
      }))
    };
  }

  async getTrainingHistory(modelType, limit = 10) {
    return await this.modelRegistry.getTrainingHistory(modelType, limit);
  }
}

module.exports = TrainingOrchestrator;