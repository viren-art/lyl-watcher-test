const { Pool } = require('pg');
const { spawn } = require('child_process');
const path = require('path');
const logger = require('../../utils/logger');
const { Gauge, Counter } = require('prom-client');

const pool = new Pool({
  host: process.env.TIMESCALEDB_HOST,
  port: process.env.TIMESCALEDB_PORT || 5432,
  database: process.env.TIMESCALEDB_DATABASE,
  user: process.env.TIMESCALEDB_USER,
  password: process.env.TIMESCALEDB_PASSWORD,
  ssl: process.env.TIMESCALEDB_SSL === 'true',
});

// Prometheus metrics
const optimizationDuration = new Gauge({
  name: 'bess_optimization_duration_seconds',
  help: 'Time to complete BESS location optimization',
  labelNames: ['grid_region_id']
});

const roiImprovement = new Gauge({
  name: 'bess_roi_improvement_percent',
  help: 'ROI improvement percentage over traditional methods',
  labelNames: ['grid_region_id']
});

const optimizationScore = new Gauge({
  name: 'bess_optimization_score',
  help: 'Top location optimization score',
  labelNames: ['grid_region_id']
});

const optimizationFailures = new Counter({
  name: 'bess_optimization_failures_total',
  help: 'Total number of optimization failures',
  labelNames: ['grid_region_id', 'error_type']
});

class BessService {
  constructor() {
    this.pythonPath = process.env.PYTHON_PATH || 'python3';
    this.optimizerScript = path.join(__dirname, '../../../ml/models/bess/bess_optimizer.py');
    this.slaThresholdSeconds = 900; // 15 minutes
    this.roiImprovementTarget = 20; // 20% minimum
  }
  
  async optimizeLocations(gridRegionId, capacityMwh, budgetUsd = null, constraints = null) {
    const startTime = Date.now();
    
    logger.info('Starting BESS location optimization', {
      gridRegionId,
      capacityMwh,
      budgetUsd
    });
    
    try {
      // Call Python optimizer
      const recommendations = await this._runPythonOptimizer(
        gridRegionId,
        capacityMwh,
        budgetUsd,
        constraints
      );
      
      // Validate ROI improvement target
      const topRoiImprovement = recommendations[0]?.roi_improvement_percent || 0;
      if (topRoiImprovement < this.roiImprovementTarget) {
        logger.warn('BESS optimization below ROI improvement target', {
          gridRegionId,
          topRoiImprovement,
          target: this.roiImprovementTarget
        });
      }
      
      // Store recommendations in database
      const storedRecommendations = await this._storeRecommendations(
        gridRegionId,
        recommendations
      );
      
      const elapsedMs = Date.now() - startTime;
      const elapsedSeconds = elapsedMs / 1000;
      
      // Update Prometheus metrics
      optimizationDuration.labels({ grid_region_id: gridRegionId.toString() }).set(elapsedSeconds);
      if (storedRecommendations.length > 0) {
        optimizationScore.labels({ grid_region_id: gridRegionId.toString() })
          .set(storedRecommendations[0].optimization_score);
        roiImprovement.labels({ grid_region_id: gridRegionId.toString() })
          .set(storedRecommendations[0].roi_improvement_percent || 0);
      }
      
      logger.info('BESS optimization completed', {
        gridRegionId,
        locationCount: storedRecommendations.length,
        elapsedSeconds: elapsedSeconds.toFixed(2),
        topScore: storedRecommendations[0]?.optimization_score,
        topRoiImprovement: storedRecommendations[0]?.roi_improvement_percent
      });
      
      // Verify 15-minute SLA
      if (elapsedSeconds > this.slaThresholdSeconds) {
        logger.error('BESS optimization exceeded 15-minute SLA', {
          gridRegionId,
          elapsedSeconds: elapsedSeconds.toFixed(2),
          slaThreshold: this.slaThresholdSeconds
        });
      }
      
      return {
        optimizationId: `OPT-${gridRegionId}-${Date.now()}`,
        gridRegionId,
        requestedCapacityMwh: capacityMwh,
        locations: storedRecommendations,
        generatedAt: new Date().toISOString(),
        processingTimeMs: elapsedMs
      };
    } catch (error) {
      optimizationFailures.labels({
        grid_region_id: gridRegionId.toString(),
        error_type: error.name || 'UnknownError'
      }).inc();
      
      logger.error('BESS optimization failed', {
        error: error.message,
        gridRegionId,
        stack: error.stack
      });
      throw error;
    }
  }
  
  async _runPythonOptimizer(gridRegionId, capacityMwh, budgetUsd, constraints) {
    return new Promise((resolve, reject) => {
      const args = [
        this.optimizerScript,
        '--grid-region-id', gridRegionId.toString(),
        '--capacity-mwh', capacityMwh.toString(),
        '--db-host', process.env.TIMESCALEDB_HOST,
        '--db-port', process.env.TIMESCALEDB_PORT || '5432',
        '--db-name', process.env.TIMESCALEDB_DATABASE,
        '--db-user', process.env.TIMESCALEDB_USER,
        '--db-password', process.env.TIMESCALEDB_PASSWORD
      ];
      
      if (budgetUsd) {
        args.push('--budget-usd', budgetUsd.toString());
      }
      
      if (constraints) {
        args.push('--constraints', JSON.stringify(constraints));
      }
      
      const pythonProcess = spawn(this.pythonPath, args);
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code !== 0) {
          logger.error('Python optimizer failed', {
            code,
            stderr
          });
          reject(new Error(`Optimizer failed with code ${code}: ${stderr}`));
        } else {
          try {
            const recommendations = JSON.parse(stdout);
            resolve(recommendations);
          } catch (error) {
            reject(new Error(`Failed to parse optimizer output: ${error.message}`));
          }
        }
      });
    });
  }
  
  async _storeRecommendations(gridRegionId, recommendations) {
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const storedRecommendations = [];
      
      for (const rec of recommendations) {
        const result = await client.query(
          `INSERT INTO bess_locations (
            grid_region_id,
            location_code,
            coordinates,
            recommended_capacity_mwh,
            recommended_power_mw,
            optimization_score,
            roi_estimate,
            grid_connection_cost_usd,
            deployment_priority,
            status,
            environmental_factors
          ) VALUES (
            $1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326),
            $5, $6, $7, $8, $9, $10, 'PROPOSED', $11
          )
          RETURNING location_id, location_code, ST_X(coordinates) as lon, ST_Y(coordinates) as lat,
                    recommended_capacity_mwh, recommended_power_mw, optimization_score,
                    roi_estimate, deployment_priority`,
          [
            gridRegionId,
            rec.location_code,
            rec.coordinates.lon,
            rec.coordinates.lat,
            rec.recommended_capacity_mwh,
            rec.recommended_power_mw,
            rec.optimization_score,
            rec.roi_estimate,
            rec.grid_connection_cost_usd,
            rec.deployment_priority,
            JSON.stringify({
              h3_id: rec.h3_id,
              criterion_scores: rec.criterion_scores,
              risk_assessment: rec.risk_assessment,
              implementation_timeline_months: rec.implementation_timeline_months,
              weather_impact_mitigation: rec.weather_impact_mitigation,
              detailed_roi: rec.detailed_roi
            })
          ]
        );
        
        const stored = result.rows[0];
        storedRecommendations.push({
          ...stored,
          coordinates: {
            lat: parseFloat(stored.lat),
            lon: parseFloat(stored.lon)
          },
          justification: rec.justification,
          roi_improvement_percent: rec.roi_improvement_percent
        });
      }
      
      await client.query('COMMIT');
      
      return storedRecommendations;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
  
  async getRecommendations(gridRegionId, filters = {}) {
    let query = `
      SELECT 
        location_id,
        location_code,
        ST_X(coordinates) as lon,
        ST_Y(coordinates) as lat,
        recommended_capacity_mwh,
        recommended_power_mw,
        optimization_score,
        roi_estimate,
        grid_connection_cost_usd,
        deployment_priority,
        status,
        environmental_factors,
        created_at
      FROM bess_locations
      WHERE grid_region_id = $1
    `;
    
    const params = [gridRegionId];
    let paramIndex = 2;
    
    if (filters.status) {
      query += ` AND status = $${paramIndex}`;
      params.push(filters.status);
      paramIndex++;
    }
    
    if (filters.minOptimizationScore) {
      query += ` AND optimization_score >= $${paramIndex}`;
      params.push(filters.minOptimizationScore);
      paramIndex++;
    }
    
    query += ' ORDER BY deployment_priority ASC';
    
    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
    }
    
    const result = await pool.query(query, params);
    
    return result.rows.map(row => ({
      ...row,
      coordinates: {
        lat: parseFloat(row.lat),
        lon: parseFloat(row.lon)
      },
      environmental_factors: row.environmental_factors
    }));
  }
  
  async getRoiAnalysis(locationId, analysisYears = 10) {
    const result = await pool.query(
      `SELECT 
        location_id,
        location_code,
        recommended_capacity_mwh,
        roi_estimate,
        grid_connection_cost_usd,
        environmental_factors
       FROM bess_locations
       WHERE location_id = $1`,
      [locationId]
    );
    
    if (result.rows.length === 0) {
      throw new Error('Location not found');
    }
    
    const location = result.rows[0];
    const detailedRoi = location.environmental_factors?.detailed_roi || {};
    
    // Calculate extended analysis
    const discountRate = 0.05;
    let cumulativeNpv = 0;
    const yearlyBreakdown = [];
    
    for (let year = 1; year <= analysisYears; year++) {
      const discountedSavings = detailedRoi.net_annual_savings_usd / Math.pow(1 + discountRate, year);
      cumulativeNpv += discountedSavings;
      
      yearlyBreakdown.push({
        year,
        savings: detailedRoi.net_annual_savings_usd,
        discounted_savings: discountedSavings,
        cumulative_npv: cumulativeNpv - detailedRoi.total_investment_usd
      });
    }
    
    return {
      locationId: location.location_id,
      locationCode: location.location_code,
      analysisYears,
      totalInvestmentUsd: detailedRoi.total_investment_usd || 0,
      annualSavingsUsd: detailedRoi.annual_savings_usd || 0,
      paybackPeriodYears: detailedRoi.payback_period_years || 0,
      netPresentValueUsd: cumulativeNpv - (detailedRoi.total_investment_usd || 0),
      internalRateOfReturn: detailedRoi.irr_percent || 0,
      breakdown: detailedRoi.breakdown || {},
      comparisonToBaseline: {
        traditionalMethodRoi: detailedRoi.traditional_roi_percent || 15,
        aiRecommendationRoi: detailedRoi.ai_roi_percent || 0,
        improvementPercentage: detailedRoi.roi_improvement_percent || 0
      },
      yearlyBreakdown
    };
  }
}

module.exports = BessService;