const { spawn } = require('child_process');
const path = require('path');
const logger = require('../../utils/logger');
const { getWeatherHistory } = require('../../database/timeseries/weather-repository');
const { getGridTelemetryHistory } = require('../../database/grid-data/telemetry-repository');
const { storeGridImpact, getGridImpacts } = require('../../database/grid-data/impact-repository');
const { producer, TOPICS } = require('../weather-ingestion/kafka-config');

class GridImpactService {
  constructor() {
    this.pythonPath = process.env.PYTHON_PATH || 'python3';
    this.modelPath = process.env.GRID_IMPACT_MODEL_PATH || 'models/grid_impact_transformer.pth';
    this.impactCache = new Map();
    this.cacheTTL = 15 * 60 * 1000; // 15 minutes
    this.processingQueue = new Map();
    
    // Performance metrics
    this.metrics = {
      totalPredictions: 0,
      averageLatency: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
  }

  async analyzeGridImpact(gridRegionId, weatherPredictionId = null, forecastHours = 24) {
    const startTime = Date.now();
    
    try {
      // Check cache
      const cacheKey = `${gridRegionId}-${weatherPredictionId || 'latest'}-${forecastHours}`;
      const cached = this.impactCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
        this.metrics.cacheHits++;
        logger.info('Grid impact cache hit', { gridRegionId, cacheKey });
        return cached.data;
      }
      
      this.metrics.cacheMisses++;
      
      // Check if already processing
      if (this.processingQueue.has(cacheKey)) {
        logger.info('Grid impact analysis already in progress', { gridRegionId });
        return await this.processingQueue.get(cacheKey);
      }
      
      // Create processing promise
      const processingPromise = this._performAnalysis(
        gridRegionId,
        weatherPredictionId,
        forecastHours
      );
      
      this.processingQueue.set(cacheKey, processingPromise);
      
      try {
        const result = await processingPromise;
        
        // Cache result
        this.impactCache.set(cacheKey, {
          data: result,
          timestamp: Date.now()
        });
        
        // Update metrics
        const latency = Date.now() - startTime;
        this.metrics.totalPredictions++;
        this.metrics.averageLatency = 
          (this.metrics.averageLatency * (this.metrics.totalPredictions - 1) + latency) / 
          this.metrics.totalPredictions;
        
        logger.info('Grid impact analysis completed', {
          gridRegionId,
          latency,
          severity: result.impactSeverity
        });
        
        return result;
      } finally {
        this.processingQueue.delete(cacheKey);
      }
      
    } catch (error) {
      logger.error('Grid impact analysis failed', {
        gridRegionId,
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  async _performAnalysis(gridRegionId, weatherPredictionId, forecastHours) {
    // Fetch weather data (historical + predictions)
    const weatherData = await this._fetchWeatherData(gridRegionId, forecastHours);
    
    // Fetch grid telemetry data
    const gridData = await this._fetchGridData(gridRegionId, forecastHours);
    
    if (!weatherData || !gridData) {
      throw new Error('Insufficient data for grid impact analysis');
    }
    
    // Prepare input features
    const inputFeatures = this._prepareInputFeatures(weatherData, gridData);
    
    // Call Python prediction service
    const prediction = await this._callPythonPredictor(inputFeatures);
    
    // Calculate stress index
    const stressIndex = this._calculateStressIndex(prediction);
    
    // Identify affected substations
    const affectedSubstations = await this._identifyAffectedSubstations(
      gridRegionId,
      prediction,
      gridData
    );
    
    // Generate recommendations
    const recommendations = this._generateRecommendations(prediction, affectedSubstations);
    
    // Format response
    const impact = {
      impactId: `impact_${Date.now()}_${gridRegionId}`,
      gridRegionId,
      weatherPredictionId,
      timestamp: new Date().toISOString(),
      predictedLoadMw: prediction.predicted_load_mw,
      predictedGenerationMw: this._estimateGeneration(weatherData),
      stressIndex,
      outageProbability: prediction.impact_probability,
      impactSeverity: prediction.severity,
      affectedSubstations,
      recommendations,
      confidenceScore: prediction.confidence_score,
      modelVersion: prediction.model_version
    };
    
    // Store in database
    await storeGridImpact(impact);
    
    // Publish to Kafka for alerting
    if (impact.impactSeverity === 'HIGH' || impact.impactSeverity === 'CRITICAL') {
      await this._publishAlert(impact);
    }
    
    return impact;
  }

  async _fetchWeatherData(gridRegionId, hours) {
    try {
      const weatherHistory = await getWeatherHistory(gridRegionId, hours);
      
      if (!weatherHistory || weatherHistory.length === 0) {
        logger.warn('No weather data available', { gridRegionId });
        return null;
      }
      
      return weatherHistory;
    } catch (error) {
      logger.error('Failed to fetch weather data', { gridRegionId, error: error.message });
      throw error;
    }
  }

  async _fetchGridData(gridRegionId, hours) {
    try {
      const telemetryData = await getGridTelemetryHistory(gridRegionId, hours);
      
      if (!telemetryData || telemetryData.length === 0) {
        logger.warn('No grid telemetry data available', { gridRegionId });
        return null;
      }
      
      return telemetryData;
    } catch (error) {
      logger.error('Failed to fetch grid data', { gridRegionId, error: error.message });
      throw error;
    }
  }

  _prepareInputFeatures(weatherData, gridData) {
    // Align weather and grid data by timestamp
    const alignedData = this._alignTimeSeries(weatherData, gridData);
    
    // Extract weather features
    const weatherFeatures = alignedData.map(point => [
      point.weather.temperature || 0,
      point.weather.windSpeed || 0,
      point.weather.precipitation || 0,
      point.weather.humidity || 0,
      point.weather.solarRadiation || 0,
      point.weather.pressure || 0,
      point.weather.cloudCover || 0,
      point.weather.visibility || 0,
      this._getHourOfDay(point.timestamp),
      this._getDayOfWeek(point.timestamp)
    ]);
    
    // Extract grid features
    const gridFeatures = alignedData.map(point => [
      point.grid.loadMw || 0,
      point.grid.generationMw || 0,
      point.grid.voltageKv || 0,
      point.grid.frequencyHz || 0,
      point.grid.temperature || 0,
      point.grid.status === 'normal' ? 1 : 0,
      point.grid.capacityUtilization || 0,
      point.grid.renewablePercentage || 0
    ]);
    
    return {
      weather: weatherFeatures,
      grid: gridFeatures,
      timestamps: alignedData.map(p => p.timestamp)
    };
  }

  _alignTimeSeries(weatherData, gridData) {
    const aligned = [];
    const weatherMap = new Map(weatherData.map(w => [w.timestamp, w]));
    
    for (const gridPoint of gridData) {
      const weatherPoint = weatherMap.get(gridPoint.timestamp);
      if (weatherPoint) {
        aligned.push({
          timestamp: gridPoint.timestamp,
          weather: weatherPoint,
          grid: gridPoint
        });
      }
    }
    
    return aligned;
  }

  _getHourOfDay(timestamp) {
    return new Date(timestamp).getHours() / 24;
  }

  _getDayOfWeek(timestamp) {
    return new Date(timestamp).getDay() / 7;
  }

  async _callPythonPredictor(inputFeatures) {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, 'predict_impact.py');
      const python = spawn(this.pythonPath, [
        pythonScript,
        '--model-path', this.modelPath
      ]);
      
      let outputData = '';
      let errorData = '';
      
      // Send input data via stdin
      python.stdin.write(JSON.stringify(inputFeatures));
      python.stdin.end();
      
      python.stdout.on('data', (data) => {
        outputData += data.toString();
      });
      
      python.stderr.on('data', (data) => {
        errorData += data.toString();
      });
      
      python.on('close', (code) => {
        if (code !== 0) {
          logger.error('Python predictor failed', { code, error: errorData });
          reject(new Error(`Python process exited with code ${code}: ${errorData}`));
        } else {
          try {
            const result = JSON.parse(outputData);
            resolve(result);
          } catch (error) {
            logger.error('Failed to parse prediction output', { output: outputData });
            reject(new Error('Invalid prediction output'));
          }
        }
      });
      
      // Timeout after 5 seconds
      setTimeout(() => {
        python.kill();
        reject(new Error('Prediction timeout'));
      }, 5000);
    });
  }

  _calculateStressIndex(prediction) {
    const impactWeight = 0.4;
    const severityWeight = 0.4;
    const loadWeight = 0.2;
    
    const severityScores = {
      'LOW': 25,
      'MEDIUM': 50,
      'HIGH': 75,
      'CRITICAL': 100
    };
    
    const stressIndex = Math.round(
      prediction.impact_probability * 100 * impactWeight +
      severityScores[prediction.severity] * severityWeight +
      Math.min(prediction.predicted_load_mw / 1000, 1.0) * 100 * loadWeight
    );
    
    return Math.max(0, Math.min(100, stressIndex));
  }

  async _identifyAffectedSubstations(gridRegionId, prediction, gridData) {
    const { getSubstationsByRegion } = require('../../database/grid-data/infrastructure-repository');
    
    const substations = await getSubstationsByRegion(gridRegionId);
    const affected = [];
    
    // Calculate risk level for each substation based on recent telemetry
    for (const substation of substations) {
      const recentTelemetry = gridData
        .filter(d => d.substationId === substation.substationId)
        .slice(-24); // Last 24 hours
      
      if (recentTelemetry.length === 0) continue;
      
      const avgLoad = recentTelemetry.reduce((sum, t) => sum + t.loadMw, 0) / recentTelemetry.length;
      const capacityUtilization = avgLoad / substation.capacityMw;
      
      let riskLevel = 'LOW';
      if (prediction.severity === 'CRITICAL' && capacityUtilization > 0.85) {
        riskLevel = 'CRITICAL';
      } else if (prediction.severity === 'HIGH' && capacityUtilization > 0.75) {
        riskLevel = 'HIGH';
      } else if (prediction.severity === 'MEDIUM' && capacityUtilization > 0.65) {
        riskLevel = 'MEDIUM';
      }
      
      if (riskLevel !== 'LOW') {
        affected.push({
          substationId: substation.substationId,
          substationName: substation.substationName,
          riskLevel,
          capacityUtilization: Math.round(capacityUtilization * 100),
          currentLoadMw: Math.round(avgLoad)
        });
      }
    }
    
    return affected.sort((a, b) => {
      const riskOrder = { 'CRITICAL': 4, 'HIGH': 3, 'MEDIUM': 2, 'LOW': 1 };
      return riskOrder[b.riskLevel] - riskOrder[a.riskLevel];
    });
  }

  _generateRecommendations(prediction, affectedSubstations) {
    const recommendations = [];
    
    if (prediction.severity === 'CRITICAL') {
      recommendations.push('Activate emergency load shedding protocols');
      recommendations.push('Deploy mobile generation units to high-risk substations');
      recommendations.push('Notify grid operators for manual intervention');
    }
    
    if (prediction.severity === 'HIGH' || prediction.severity === 'CRITICAL') {
      recommendations.push('Increase spinning reserves by 20%');
      recommendations.push('Defer non-critical maintenance activities');
    }
    
    if (affectedSubstations.length > 0) {
      const criticalCount = affectedSubstations.filter(s => s.riskLevel === 'CRITICAL').length;
      if (criticalCount > 0) {
        recommendations.push(`Monitor ${criticalCount} critical substations closely`);
      }
    }
    
    if (prediction.predicted_load_mw > 5000) {
      recommendations.push('Consider demand response program activation');
    }
    
    return recommendations;
  }

  _estimateGeneration(weatherData) {
    // Simple estimation based on solar radiation and wind speed
    const latest = weatherData[weatherData.length - 1];
    const solarGen = (latest.solarRadiation || 0) * 0.5; // Simplified
    const windGen = (latest.windSpeed || 0) * 100; // Simplified
    return Math.round(solarGen + windGen);
  }

  async _publishAlert(impact) {
    try {
      await producer.send({
        topic: TOPICS.GRID_ALERTS,
        messages: [{
          key: `alert_${impact.gridRegionId}`,
          value: JSON.stringify({
            type: 'GRID_IMPACT_ALERT',
            severity: impact.impactSeverity,
            gridRegionId: impact.gridRegionId,
            stressIndex: impact.stressIndex,
            outageProbability: impact.outageProbability,
            affectedSubstations: impact.affectedSubstations.length,
            recommendations: impact.recommendations,
            timestamp: impact.timestamp
          })
        }]
      });
      
      logger.info('Grid impact alert published', {
        gridRegionId: impact.gridRegionId,
        severity: impact.impactSeverity
      });
    } catch (error) {
      logger.error('Failed to publish grid alert', { error: error.message });
    }
  }

  async getRecentImpacts(gridRegionId, limit = 10) {
    try {
      return await getGridImpacts(gridRegionId, limit);
    } catch (error) {
      logger.error('Failed to fetch recent impacts', { gridRegionId, error: error.message });
      throw error;
    }
  }

  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.impactCache.size,
      cacheHitRate: this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses) || 0
    };
  }
}

module.exports = GridImpactService;