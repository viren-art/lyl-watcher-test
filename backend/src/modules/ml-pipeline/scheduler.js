const cron = require('node-cron');
const TrainingOrchestrator = require('./training-orchestrator');
const logger = require('../../utils/logger');

class MLPipelineScheduler {
  constructor() {
    this.orchestrator = new TrainingOrchestrator();
    this.jobs = [];
  }

  start() {
    logger.info('Starting ML pipeline scheduler...');

    // Check retraining triggers every hour
    const hourlyCheck = cron.schedule('0 * * * *', async () => {
      logger.info('Running hourly retraining trigger check');
      try {
        await this.orchestrator.checkRetrainingTriggers();
      } catch (error) {
        logger.error('Error in hourly trigger check:', error);
      }
    });

    this.jobs.push(hourlyCheck);

    // Weekly scheduled retraining (Sunday 2 AM)
    const weeklyRetraining = cron.schedule('0 2 * * 0', async () => {
      logger.info('Running weekly scheduled retraining');
      try {
        await this.orchestrator.triggerRetraining('weather_lstm', 'scheduled_weekly');
        await this.orchestrator.triggerRetraining('grid_transformer', 'scheduled_weekly');
      } catch (error) {
        logger.error('Error in weekly retraining:', error);
      }
    });

    this.jobs.push(weeklyRetraining);

    // Daily accuracy monitoring (every day at 1 AM)
    const dailyMonitoring = cron.schedule('0 1 * * *', async () => {
      logger.info('Running daily accuracy monitoring');
      try {
        const ModelRegistry = require('./model-registry');
        const registry = new ModelRegistry();

        const weatherAccuracy = await registry.getCurrentAccuracy('weather_lstm');
        const gridAccuracy = await registry.getCurrentAccuracy('grid_transformer');

        logger.info(`Current accuracies - Weather: ${weatherAccuracy}, Grid: ${gridAccuracy}`);

        // Alert if below thresholds
        if (weatherAccuracy < 0.85) {
          logger.warn(`⚠️ Weather model accuracy ${weatherAccuracy} below 85% threshold`);
          // TODO: Send alert to ML team
        }

        if (gridAccuracy < 0.80) {
          logger.warn(`⚠️ Grid impact model accuracy ${gridAccuracy} below 80% threshold`);
          // TODO: Send alert to ML team
        }

      } catch (error) {
        logger.error('Error in daily monitoring:', error);
      }
    });

    this.jobs.push(dailyMonitoring);

    logger.info('ML pipeline scheduler started with 3 jobs');
  }

  stop() {
    logger.info('Stopping ML pipeline scheduler...');
    this.jobs.forEach(job => job.stop());
    this.jobs = [];
  }
}

module.exports = MLPipelineScheduler;