const { Pool } = require('pg');
const logger = require('../../utils/logger');
const crypto = require('crypto');

class ABTestingService {
  constructor() {
    this.pool = new Pool({
      host: process.env.TIMESCALEDB_HOST,
      port: process.env.TIMESCALEDB_PORT,
      database: process.env.TIMESCALEDB_DATABASE,
      user: process.env.TIMESCALEDB_USER,
      password: process.env.TIMESCALEDB_PASSWORD
    });

    this.activeTests = new Map();
    this.testMetrics = new Map();
  }

  async initializeTable() {
    const query = `
      CREATE TABLE IF NOT EXISTS ab_tests (
        test_id VARCHAR(64) PRIMARY KEY,
        model_type VARCHAR(50) NOT NULL,
        control_version VARCHAR(50) NOT NULL,
        treatment_version VARCHAR(50) NOT NULL,
        traffic_split NUMERIC(3,2) DEFAULT 0.05,
        status VARCHAR(20) DEFAULT 'running',
        start_time TIMESTAMPTZ DEFAULT NOW(),
        end_time TIMESTAMPTZ,
        winner VARCHAR(50),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS ab_test_results (
        result_id SERIAL PRIMARY KEY,
        test_id VARCHAR(64) REFERENCES ab_tests(test_id),
        variant VARCHAR(20) NOT NULL,
        prediction_id BIGINT,
        actual_value NUMERIC(10,4),
        predicted_value NUMERIC(10,4),
        error NUMERIC(10,4),
        latency_ms INT,
        timestamp TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_ab_test_results_test 
        ON ab_test_results(test_id, variant, timestamp DESC);
    `;

    await this.pool.query(query);
    logger.info('A/B testing tables initialized');
  }

  async startABTest(modelType, treatmentVersion, controlVersion) {
    const testId = crypto.randomBytes(16).toString('hex');

    const query = `
      INSERT INTO ab_tests (
        test_id, model_type, control_version, treatment_version, traffic_split, status
      )
      VALUES ($1, $2, $3, $4, 0.05, 'running')
      RETURNING test_id
    `;

    await this.pool.query(query, [testId, modelType, controlVersion, treatmentVersion]);

    // Initialize metrics tracking
    this.testMetrics.set(testId, {
      control: { predictions: 0, totalError: 0, totalLatency: 0 },
      treatment: { predictions: 0, totalError: 0, totalLatency: 0 }
    });

    this.activeTests.set(modelType, {
      testId,
      controlVersion,
      treatmentVersion,
      trafficSplit: 0.05
    });

    logger.info(`A/B test started: ${testId} for ${modelType}`);
    logger.info(`Control: ${controlVersion}, Treatment: ${treatmentVersion}`);

    // Schedule automatic evaluation after 24 hours
    setTimeout(() => {
      this.evaluateTest(testId).catch(error => {
        logger.error(`Error evaluating test ${testId}:`, error);
      });
    }, 24 * 60 * 60 * 1000);

    return testId;
  }

  selectVariant(modelType, requestId) {
    const test = this.activeTests.get(modelType);

    if (!test) {
      return { variant: 'control', version: null };
    }

    // Use request ID for consistent variant assignment
    const hash = crypto.createHash('md5').update(requestId).digest('hex');
    const hashValue = parseInt(hash.substring(0, 8), 16) / 0xffffffff;

    if (hashValue < test.trafficSplit) {
      return { variant: 'treatment', version: test.treatmentVersion, testId: test.testId };
    } else {
      return { variant: 'control', version: test.controlVersion, testId: test.testId };
    }
  }

  async recordResult(testId, variant, predictionId, actualValue, predictedValue, latencyMs) {
    const error = Math.abs(actualValue - predictedValue);

    const query = `
      INSERT INTO ab_test_results (
        test_id, variant, prediction_id, actual_value, predicted_value, error, latency_ms
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await this.pool.query(query, [
      testId,
      variant,
      predictionId,
      actualValue,
      predictedValue,
      error,
      latencyMs
    ]);

    // Update in-memory metrics
    const metrics = this.testMetrics.get(testId);
    if (metrics) {
      metrics[variant].predictions++;
      metrics[variant].totalError += error;
      metrics[variant].totalLatency += latencyMs;
    }
  }

  async evaluateTest(testId) {
    logger.info(`Evaluating A/B test: ${testId}`);

    // Get test info
    const testResult = await this.pool.query(
      'SELECT * FROM ab_tests WHERE test_id = $1',
      [testId]
    );

    if (testResult.rows.length === 0) {
      throw new Error(`Test ${testId} not found`);
    }

    const test = testResult.rows[0];

    // Calculate metrics for both variants
    const controlMetrics = await this.calculateVariantMetrics(testId, 'control');
    const treatmentMetrics = await this.calculateVariantMetrics(testId, 'treatment');

    logger.info('Control metrics:', controlMetrics);
    logger.info('Treatment metrics:', treatmentMetrics);

    // Statistical significance test (simplified t-test)
    const isSignificant = this.performSignificanceTest(controlMetrics, treatmentMetrics);

    let winner = null;
    let shouldPromote = false;

    if (isSignificant) {
      // Treatment must be better by at least 2% to win
      const improvement = (controlMetrics.avgError - treatmentMetrics.avgError) / controlMetrics.avgError;

      if (improvement > 0.02) {
        winner = 'treatment';
        shouldPromote = true;
        logger.info(`Treatment wins with ${(improvement * 100).toFixed(2)}% improvement`);
      } else if (improvement < -0.02) {
        winner = 'control';
        logger.info(`Control wins, treatment performed ${(Math.abs(improvement) * 100).toFixed(2)}% worse`);
      } else {
        winner = 'tie';
        logger.info('No significant difference between variants');
      }
    } else {
      winner = 'inconclusive';
      logger.info('Results not statistically significant');
    }

    // Update test status
    await this.pool.query(
      `UPDATE ab_tests 
       SET status = 'completed', end_time = NOW(), winner = $1
       WHERE test_id = $2`,
      [winner, testId]
    );

    // Remove from active tests
    this.activeTests.delete(test.model_type);
    this.testMetrics.delete(testId);

    // Promote treatment to production if it won
    if (shouldPromote) {
      const ModelRegistry = require('../ml-pipeline/model-registry');
      const registry = new ModelRegistry();

      // Find model ID for treatment version
      const modelResult = await this.pool.query(
        'SELECT model_id FROM ml_model_registry WHERE model_type = $1 AND model_version = $2',
        [test.model_type, test.treatment_version]
      );

      if (modelResult.rows.length > 0) {
        const modelId = modelResult.rows[0].model_id;
        await registry.promoteToProduction(modelId);
        logger.info(`Treatment model ${test.treatment_version} promoted to production`);
      }
    }

    return {
      testId,
      winner,
      controlMetrics,
      treatmentMetrics,
      isSignificant,
      promoted: shouldPromote
    };
  }

  async calculateVariantMetrics(testId, variant) {
    const query = `
      SELECT 
        COUNT(*) as count,
        AVG(error) as avg_error,
        STDDEV(error) as stddev_error,
        AVG(latency_ms) as avg_latency,
        PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY error) as p95_error
      FROM ab_test_results
      WHERE test_id = $1 AND variant = $2
    `;

    const result = await this.pool.query(query, [testId, variant]);

    if (result.rows.length === 0 || result.rows[0].count === '0') {
      return {
        count: 0,
        avgError: 0,
        stddevError: 0,
        avgLatency: 0,
        p95Error: 0
      };
    }

    const row = result.rows[0];

    return {
      count: parseInt(row.count),
      avgError: parseFloat(row.avg_error),
      stddevError: parseFloat(row.stddev_error || 0),
      avgLatency: parseFloat(row.avg_latency),
      p95Error: parseFloat(row.p95_error)
    };
  }

  performSignificanceTest(controlMetrics, treatmentMetrics) {
    // Simplified t-test for independent samples
    // Require at least 100 samples per variant
    if (controlMetrics.count < 100 || treatmentMetrics.count < 100) {
      return false;
    }

    // Calculate pooled standard deviation
    const n1 = controlMetrics.count;
    const n2 = treatmentMetrics.count;
    const s1 = controlMetrics.stddevError;
    const s2 = treatmentMetrics.stddevError;

    const pooledStdDev = Math.sqrt(
      ((n1 - 1) * s1 * s1 + (n2 - 1) * s2 * s2) / (n1 + n2 - 2)
    );

    // Calculate t-statistic
    const tStat = Math.abs(
      (controlMetrics.avgError - treatmentMetrics.avgError) /
      (pooledStdDev * Math.sqrt(1/n1 + 1/n2))
    );

    // Critical value for 95% confidence (approximation)
    const criticalValue = 1.96;

    return tStat > criticalValue;
  }

  async getTestStatus(testId) {
    const query = `
      SELECT * FROM ab_tests WHERE test_id = $1
    `;

    const result = await this.pool.query(query, [testId]);

    if (result.rows.length === 0) {
      return null;
    }

    const test = result.rows[0];

    // Get current metrics
    const controlMetrics = await this.calculateVariantMetrics(testId, 'control');
    const treatmentMetrics = await this.calculateVariantMetrics(testId, 'treatment');

    return {
      ...test,
      controlMetrics,
      treatmentMetrics
    };
  }

  async getActiveTests() {
    const query = `
      SELECT * FROM ab_tests WHERE status = 'running'
      ORDER BY start_time DESC
    `;

    const result = await this.pool.query(query);

    return result.rows;
  }
}

module.exports = ABTestingService;