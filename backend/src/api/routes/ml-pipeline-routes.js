const express = require('express');
const TrainingOrchestrator = require('../../modules/ml-pipeline/training-orchestrator');
const ModelRegistry = require('../../modules/ml-pipeline/model-registry');
const ABTestingService = require('../../modules/ab-testing/ab-testing-service');
const logger = require('../../utils/logger');

const router = express.Router();
const trainingOrchestrator = new TrainingOrchestrator();
const modelRegistry = new ModelRegistry();
const abTestingService = new ABTestingService();

// POST /api/v1/ml/trigger-retraining
router.post('/trigger-retraining', async (req, res) => {
  try {
    const { modelType, reason } = req.body;

    if (!modelType) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'modelType is required'
        }
      });
    }

    const result = await trainingOrchestrator.triggerRetraining(modelType, reason || 'manual');

    res.json({
      success: true,
      ...result
    });

  } catch (error) {
    logger.error('Error triggering retraining:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

// GET /api/v1/ml/training-status
router.get('/training-status', async (req, res) => {
  try {
    const metrics = trainingOrchestrator.getMetrics();

    res.json({
      success: true,
      metrics
    });

  } catch (error) {
    logger.error('Error getting training status:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

// GET /api/v1/ml/models/:modelType/history
router.get('/models/:modelType/history', async (req, res) => {
  try {
    const { modelType } = req.params;
    const limit = parseInt(req.query.limit) || 10;

    const history = await trainingOrchestrator.getTrainingHistory(modelType, limit);

    res.json({
      success: true,
      modelType,
      history
    });

  } catch (error) {
    logger.error('Error getting training history:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

// GET /api/v1/ml/models/:modelType/current
router.get('/models/:modelType/current', async (req, res) => {
  try {
    const { modelType } = req.params;

    const model = await modelRegistry.getProductionModel(modelType);

    if (!model) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `No production model found for ${modelType}`
        }
      });
    }

    res.json({
      success: true,
      model
    });

  } catch (error) {
    logger.error('Error getting current model:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

// POST /api/v1/ml/models/:modelId/promote
router.post('/models/:modelId/promote', async (req, res) => {
  try {
    const modelId = parseInt(req.params.modelId);

    await modelRegistry.promoteToProduction(modelId);

    res.json({
      success: true,
      message: `Model ${modelId} promoted to production`
    });

  } catch (error) {
    logger.error('Error promoting model:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

// GET /api/v1/ml/ab-tests
router.get('/ab-tests', async (req, res) => {
  try {
    const tests = await abTestingService.getActiveTests();

    res.json({
      success: true,
      tests
    });

  } catch (error) {
    logger.error('Error getting A/B tests:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

// GET /api/v1/ml/ab-tests/:testId
router.get('/ab-tests/:testId', async (req, res) => {
  try {
    const { testId } = req.params;

    const status = await abTestingService.getTestStatus(testId);

    if (!status) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Test ${testId} not found`
        }
      });
    }

    res.json({
      success: true,
      test: status
    });

  } catch (error) {
    logger.error('Error getting A/B test status:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

// POST /api/v1/ml/ab-tests/:testId/evaluate
router.post('/ab-tests/:testId/evaluate', async (req, res) => {
  try {
    const { testId } = req.params;

    const result = await abTestingService.evaluateTest(testId);

    res.json({
      success: true,
      result
    });

  } catch (error) {
    logger.error('Error evaluating A/B test:', error);
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

module.exports = router;