const TrainingOrchestrator = require('../../../src/modules/ml-pipeline/training-orchestrator');
const ModelRegistry = require('../../../src/modules/ml-pipeline/model-registry');

jest.mock('../../../src/modules/ml-pipeline/model-registry');
jest.mock('../../../src/database/timeseries/weather-repository');
jest.mock('../../../src/database/grid-data/telemetry-repository');

describe('TrainingOrchestrator', () => {
  let orchestrator;
  let mockRegistry;

  beforeEach(() => {
    orchestrator = new TrainingOrchestrator();
    mockRegistry = new ModelRegistry();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('checkRetrainingTriggers', () => {
    it('should trigger retraining when weather accuracy below 85%', async () => {
      mockRegistry.getCurrentAccuracy.mockResolvedValue(0.82);
      
      const triggerSpy = jest.spyOn(orchestrator, 'triggerRetraining').mockResolvedValue({
        status: 'started',
        jobId: 'test-job-123'
      });

      await orchestrator.checkRetrainingTriggers();

      expect(triggerSpy).toHaveBeenCalledWith('weather_lstm', 'accuracy_degradation');
    });

    it('should trigger retraining when grid accuracy below 80%', async () => {
      mockRegistry.getCurrentAccuracy.mockImplementation((modelType) => {
        if (modelType === 'weather_lstm') return 0.90;
        if (modelType === 'grid_transformer') return 0.75;
      });

      const triggerSpy = jest.spyOn(orchestrator, 'triggerRetraining').mockResolvedValue({
        status: 'started',
        jobId: 'test-job-456'
      });

      await orchestrator.checkRetrainingTriggers();

      expect(triggerSpy).toHaveBeenCalledWith('grid_transformer', 'accuracy_degradation');
    });

    it('should not trigger retraining when accuracies are above thresholds', async () => {
      mockRegistry.getCurrentAccuracy.mockImplementation((modelType) => {
        if (modelType === 'weather_lstm') return 0.90;
        if (modelType === 'grid_transformer') return 0.85;
      });

      const triggerSpy = jest.spyOn(orchestrator, 'triggerRetraining');

      await orchestrator.checkRetrainingTriggers();

      expect(triggerSpy).not.toHaveBeenCalled();
    });
  });

  describe('triggerRetraining', () => {
    it('should start training job and return job ID', async () => {
      const result = await orchestrator.triggerRetraining('weather_lstm', 'manual');

      expect(result).toHaveProperty('status', 'started');
      expect(result).toHaveProperty('jobId');
      expect(result.jobId).toMatch(/^weather_lstm_\d+$/);
    });

    it('should prevent duplicate training jobs for same model', async () => {
      orchestrator.trainingJobs.set('weather_lstm', 'existing-job-123');

      const result = await orchestrator.triggerRetraining('weather_lstm', 'manual');

      expect(result).toHaveProperty('status', 'already_running');
      expect(result.jobId).toBe('existing-job-123');
    });
  });

  describe('getMetrics', () => {
    it('should return training metrics', () => {
      orchestrator.trainingMetrics = {
        totalJobs: 10,
        successfulJobs: 8,
        failedJobs: 2,
        averageTrainingTime: 3600000
      };

      const metrics = orchestrator.getMetrics();

      expect(metrics.totalJobs).toBe(10);
      expect(metrics.successfulJobs).toBe(8);
      expect(metrics.failedJobs).toBe(2);
      expect(metrics.averageTrainingTime).toBe(3600000);
    });
  });
});