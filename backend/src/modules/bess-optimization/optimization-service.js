const { spawn } = require('child_process');
const path = require('path');
const logger = require('../../utils/logger');
const H3GeospatialAnalyzer = require('../geospatial/h3-analyzer');
const PostGISService = require('../geospatial/postgis-service');
const { getWeatherHistory } = require('../../database/timeseries/weather-repository');
const { getGridImpacts } = require('../../database/grid-data/impact-repository');
const { getSubstationsByRegion } = require('../../database/grid-data/infrastructure-repository');
const { storeBESSRecommendations, getBESSRecommendations } = require('../../database/bess-locations/bess-repository');

class BESSOptimizationService {
  constructor() {
    this.h3Analyzer = new H3GeospatialAnalyzer();
    this.postgisService = new PostGISService();
    this.pythonPath = process.env.PYTHON_PATH || 'python3';
    
    // Cache for optimization results
    this.optimizationCache = new Map();
    
    // Metrics
    this.metrics = {
      totalOptimizations: 0,
      averageLatencyMs: 0,
      cacheHits: 0,
      cacheMisses: 0
    };
    
    logger.info('BESS Optimization Service initialized');
  }

  /**
   * Optimize BESS locations for a grid region
   */
  async optimizeLocations(gridRegionId, options = {}) {
    const startTime = Date.now();
    
    try {
      const {
        capacityMwh = 100,
        budgetUsd = 30000000,
        deploymentTimelineMonths = 24,
        constraints = {}
      } = options;
      
      logger.info(`Starting BESS optimization for region ${gridRegionId}`);
      
      // Check cache
      const cacheKey = `${gridRegionId}-${capacityMwh}-${budgetUsd}`;
      const cached = this.optimizationCache.get(cacheKey);
      
      if (cached && (Date.now() - cached.timestamp < 3600000)) { // 1 hour cache
        this.metrics.cacheHits++;
        logger.info('Returning cached optimization result');
        return cached.result;
      }
      
      this.metrics.cacheMisses++;
      
      // Step 1: Gather grid region data
      const gridData = await this._gatherGridData(gridRegionId);
      
      // Step 2: Gather weather vulnerability data
      const weatherData = await this._gatherWeatherData(gridRegionId);
      
      // Step 3: Gather grid impact predictions
      const gridImpacts = await this._gatherGridImpacts(gridRegionId);
      
      // Step 4: Get existing BESS locations
      const existingBESS = await this.postgisService.getExistingBESSInRegion(gridRegionId);
      
      // Step 5: Generate candidate locations using H3 hexagons
      const candidateLocations = await this._generateCandidateLocations(
        gridRegionId,
        gridData,
        weatherData,
        existingBESS,
        constraints
      );
      
      logger.info(`Generated ${candidateLocations.length} candidate locations`);
      
      // Step 6: Enrich candidates with detailed analysis
      const enrichedCandidates = await this._enrichCandidates(
        candidateLocations,
        gridData,
        weatherData,
        gridImpacts,
        capacityMwh,
        budgetUsd
      );
      
      // Step 7: Run RL optimization
      const optimizedLocations = await this._runRLOptimization(
        gridData,
        enrichedCandidates
      );
      
      // Step 8: Store recommendations
      await storeBESSRecommendations(gridRegionId, optimizedLocations);
      
      // Update metrics
      const latency = Date.now() - startTime;
      this.metrics.totalOptimizations++;
      this.metrics.averageLatencyMs = 
        (this.metrics.averageLatencyMs * (this.metrics.totalOptimizations - 1) + latency) / 
        this.metrics.totalOptimizations;
      
      logger.info(`BESS optimization completed in ${latency}ms`);
      logger.info(`Top location ROI improvement: ${optimizedLocations[0]?.roi_improvement}%`);
      
      const result = {
        optimizationId: `opt-${Date.now()}-${gridRegionId}`,
        gridRegionId,
        locations: optimizedLocations,
        generatedAt: new Date().toISOString(),
        processingTimeMs: latency
      };
      
      // Cache result
      this.optimizationCache.set(cacheKey, {
        result,
        timestamp: Date.now()
      });
      
      return result;
      
    } catch (error) {
      logger.error('Error in BESS optimization:', error);
      throw error;
    }
  }

  /**
   * Gather grid infrastructure data
   */
  async _gatherGridData(gridRegionId) {
    const [region, substations] = await Promise.all([
      this.postgisService.getGridRegionBoundary(gridRegionId),
      getSubstationsByRegion(gridRegionId)
    ]);
    
    return {
      region_id: gridRegionId,
      region_name: region.regionName,
      boundary: region.boundary,
      current_capacity_mw: region.currentCapacityMw,
      peak_demand_mw: region.peakDemandMw,
      renewable_percentage: region.renewablePercentage,
      substations: substations.map(s => ({
        substation_id: s.substationId,
        location: s.location,
        capacity_mw: s.capacityMw,
        voltage_kv: s.voltageKv
      })),
      telemetry: [], // Would be populated from real-time telemetry
      loadData: [] // Would be populated from load forecasts
    };
  }

  /**
   * Gather weather vulnerability data
   */
  async _gatherWeatherData(gridRegionId) {
    const weatherHistory = await getWeatherHistory(gridRegionId, 168); // 7 days
    
    return weatherHistory.map(w => ({
      location: w.location,
      timestamp: w.timestamp,
      temperature_c: w.temperature_c,
      wind_speed_ms: w.wind_speed_ms,
      precipitation_mm: w.precipitation_mm,
      severity_score: this._calculateWeatherSeverity(w)
    }));
  }

  /**
   * Gather grid impact predictions
   */
  async _gatherGridImpacts(gridRegionId) {
    const impacts = await getGridImpacts(gridRegionId, 50);
    
    return impacts.map(i => ({
      timestamp: i.timestamp,
      stress_index: i.stress_index,
      outage_probability: i.outage_probability,
      impact_severity: i.impact_severity,
      affected_substations: i.affected_substations
    }));
  }

  /**
   * Generate candidate BESS locations using H3 hexagons
   */
  async _generateCandidateLocations(gridRegionId, gridData, weatherData, existingBESS, constraints) {
    const candidates = [];
    
    // Get region center
    const regionCenter = this._calculateRegionCenter(gridData.boundary);
    
    // Generate hexagon grid covering region (radius ~50km)
    const hexagons = this.h3Analyzer.getHexagonsInRadius(
      regionCenter.lat,
      regionCenter.lon,
      50
    );
    
    logger.info(`Analyzing ${hexagons.length} hexagons for candidate locations`);
    
    for (const h3Index of hexagons) {
      const center = this.h3Analyzer.h3ToCoordinates(h3Index);
      
      // Check if within region boundary
      const isWithin = await this.postgisService.isWithinGridRegion(
        center.lat,
        center.lon,
        gridRegionId
      );
      
      if (!isWithin) continue;
      
      // Score hexagon
      const score = this.h3Analyzer.scoreHexagon(
        h3Index,
        gridData,
        weatherData,
        existingBESS
      );
      
      // Filter by constraints
      if (constraints.minDistanceFromSubstationKm && 
          score.nearestSubstationKm < constraints.minDistanceFromSubstationKm) {
        continue;
      }
      
      if (constraints.maxDistanceFromSubstationKm && 
          score.nearestSubstationKm > constraints.maxDistanceFromSubstationKm) {
        continue;
      }
      
      // Only keep high-scoring candidates
      if (score.overallScore >= 50) {
        candidates.push({
          location_id: candidates.length + 1,
          coordinates: center,
          h3_index: h3Index,
          geospatial_score: score.overallScore,
          nearest_substation_km: score.nearestSubstationKm,
          grid_stress_score: score.gridStressScore,
          weather_vulnerability_score: score.weatherVulnerabilityScore,
          bess_proximity_score: score.bessProximityScore,
          load_density_score: score.loadDensityScore
        });
      }
    }
    
    // Sort by geospatial score and take top 100
    candidates.sort((a, b) => b.geospatial_score - a.geospatial_score);
    
    return candidates.slice(0, 100);
  }

  /**
   * Enrich candidates with detailed financial and technical analysis
   */
  async _enrichCandidates(candidates, gridData, weatherData, gridImpacts, capacityMwh, budgetUsd) {
    const enriched = [];
    
    for (const candidate of candidates) {
      // Calculate connection cost
      const connectionCost = await this.postgisService.calculateConnectionCost(
        candidate.coordinates.lat,
        candidate.coordinates.lon
      );
      
      // Check environmental constraints
      const envConstraints = await this.postgisService.checkEnvironmentalConstraints(
        candidate.coordinates.lat,
        candidate.coordinates.lon
      );
      
      // Calculate recommended capacity based on local grid stress
      const recommendedCapacity = this._calculateRecommendedCapacity(
        candidate,
        gridData,
        capacityMwh
      );
      
      // Calculate costs
      const costs = this._calculateCosts(
        recommendedCapacity,
        connectionCost.connectionCostUsd,
        envConstraints
      );
      
      // Skip if over budget
      if (costs.total_cost_usd > budgetUsd) {
        continue;
      }
      
      // Calculate ROI
      const roi = this._calculateROI(
        recommendedCapacity,
        costs,
        gridData,
        candidate
      );
      
      // Calculate traditional method ROI for comparison
      const traditionalROI = roi.projected_roi * 0.75; // Assume 25% less efficient
      const roiImprovement = ((roi.projected_roi - traditionalROI) / traditionalROI) * 100;
      
      enriched.push({
        ...candidate,
        recommended_capacity_mwh: recommendedCapacity.capacity_mwh,
        recommended_power_mw: recommendedCapacity.power_mw,
        connection_cost_usd: connectionCost.connectionCostUsd,
        distance_to_substation_km: connectionCost.distanceKm,
        land_cost_per_acre: costs.land_cost,
        equipment_cost_usd: costs.equipment_cost,
        installation_cost_usd: costs.installation_cost,
        total_cost_usd: costs.total_cost_usd,
        projected_roi: roi.projected_roi,
        roi_improvement: roiImprovement,
        payback_years: roi.payback_years,
        annual_savings_usd: roi.annual_savings,
        grid_impact_mitigation: candidate.grid_stress_score,
        weather_risk_mitigation: candidate.weather_vulnerability_score,
        implementation_feasibility: this._calculateFeasibility(costs, envConstraints),
        environmental_constraints: envConstraints.constraints.length > 0,
        land_available: true, // Would be verified through land registry APIs
        historical_outages: Math.floor(Math.random() * 20), // Mock data
        population_density: Math.floor(Math.random() * 5000), // Mock data
        terrain_difficulty: Math.random() * 0.6,
        existing_bess_proximity_km: candidate.bess_proximity_score / 2,
        peak_load_reduction: recommendedCapacity.capacity_mwh * 0.8,
        peak_demand: gridData.peak_demand_mw,
        outage_prevention_score: Math.min(1.0, candidate.grid_stress_score / 100)
      });
    }
    
    return enriched;
  }

  /**
   * Run RL optimization using Python service
   */
  async _runRLOptimization(gridData, candidates) {
    return new Promise((resolve, reject) => {
      const pythonScript = path.join(__dirname, 'optimize.py');
      const python = spawn(this.pythonPath, [
        pythonScript,
        '--num_recommendations', '10'
      ]);
      
      let outputData = '';
      let errorData = '';
      
      // Send input data via stdin
      python.stdin.write(JSON.stringify({
        grid_region_data: gridData,
        candidate_locations: candidates
      }));
      python.stdin.end();
      
      python.stdout.on('data', (data) => {
        outputData += data.toString();
      });
      
      python.stderr.on('data', (data) => {
        errorData += data.toString();
      });
      
      python.on('close', (code) => {
        if (code !== 0) {
          logger.error('Python RL optimization failed:', errorData);
          reject(new Error(`RL optimization failed with code ${code}`));
          return;
        }
        
        try {
          const result = JSON.parse(outputData);
          resolve(result.recommendations);
        } catch (error) {
          logger.error('Error parsing RL optimization output:', error);
          reject(error);
        }
      });
      
      // Timeout after 15 minutes
      setTimeout(() => {
        python.kill();
        reject(new Error('RL optimization timeout'));
      }, 900000);
    });
  }

  /**
   * Calculate weather severity score
   */
  _calculateWeatherSeverity(weather) {
    let severity = 0;
    
    if (weather.wind_speed_ms > 20) severity += 40;
    else if (weather.wind_speed_ms > 15) severity += 25;
    
    if (weather.precipitation_mm > 75) severity += 35;
    else if (weather.precipitation_mm > 50) severity += 20;
    
    if (weather.temperature_c < -15 || weather.temperature_c > 45) severity += 25;
    else if (weather.temperature_c < -10 || weather.temperature_c > 40) severity += 15;
    
    return Math.min(100, severity);
  }

  /**
   * Calculate region center from boundary polygon
   */
  _calculateRegionCenter(boundary) {
    const coords = boundary.coordinates[0];
    let latSum = 0;
    let lonSum = 0;
    
    for (const [lon, lat] of coords) {
      latSum += lat;
      lonSum += lon;
    }
    
    return {
      lat: latSum / coords.length,
      lon: lonSum / coords.length
    };
  }

  /**
   * Calculate recommended BESS capacity
   */
  _calculateRecommendedCapacity(candidate, gridData, baseCapacityMwh) {
    // Scale capacity based on grid stress and load density
    const stressFactor = candidate.grid_stress_score / 100;
    const loadFactor = candidate.load_density_score / 100;
    
    const capacityMultiplier = 0.5 + (stressFactor * 0.3) + (loadFactor * 0.2);
    const capacity_mwh = baseCapacityMwh * capacityMultiplier;
    
    // Power rating typically 0.5-1.0 of capacity for 1-2 hour discharge
    const power_mw = capacity_mwh * 0.75;
    
    return {
      capacity_mwh: Math.round(capacity_mwh),
      power_mw: Math.round(power_mw)
    };
  }

  /**
   * Calculate total costs
   */
  _calculateCosts(capacity, connectionCost, envConstraints) {
    // Equipment cost: ~$300-400/kWh for lithium-ion BESS
    const equipmentCostPerKwh = 350;
    const equipment_cost = capacity.capacity_mwh * 1000 * equipmentCostPerKwh;
    
    // Installation cost: ~20% of equipment cost
    const installation_cost = equipment_cost * 0.20;
    
    // Land cost: ~$100k-500k per acre (need ~2-5 acres for 100 MWh)
    const acresNeeded = capacity.capacity_mwh / 20;
    const land_cost = acresNeeded * 200000;
    
    // Environmental mitigation costs
    const env_cost = envConstraints.constraints.length * 500000;
    
    const total_cost_usd = equipment_cost + installation_cost + connectionCost + land_cost + env_cost;
    
    return {
      equipment_cost,
      installation_cost,
      land_cost,
      connection_cost: connectionCost,
      environmental_cost: env_cost,
      total_cost_usd
    };
  }

  /**
   * Calculate ROI
   */
  _calculateROI(capacity, costs, gridData, candidate) {
    // Annual revenue streams:
    // 1. Energy arbitrage (buy low, sell high)
    // 2. Frequency regulation services
    // 3. Capacity payments
    // 4. Avoided outage costs
    
    const energyArbitrageRevenue = capacity.capacity_mwh * 365 * 50; // $50/MWh spread
    const frequencyRegulationRevenue = capacity.power_mw * 365 * 24 * 15; // $15/MW-hour
    const capacityPayments = capacity.power_mw * 365 * 100; // $100/MW-day
    const avoidedOutageCosts = (candidate.grid_stress_score / 100) * 2000000; // Up to $2M/year
    
    const annual_savings = energyArbitrageRevenue + frequencyRegulationRevenue + 
                          capacityPayments + avoidedOutageCosts;
    
    // Annual O&M costs (~2% of capital cost)
    const annual_costs = costs.total_cost_usd * 0.02;
    
    const net_annual_savings = annual_savings - annual_costs;
    
    const payback_years = costs.total_cost_usd / net_annual_savings;
    
    // 20-year NPV calculation (5% discount rate)
    const discount_rate = 0.05;
    let npv = -costs.total_cost_usd;
    for (let year = 1; year <= 20; year++) {
      npv += net_annual_savings / Math.pow(1 + discount_rate, year);
    }
    
    const projected_roi = (npv / costs.total_cost_usd) * 100;
    
    return {
      projected_roi,
      payback_years,
      annual_savings: net_annual_savings,
      npv
    };
  }

  /**
   * Calculate implementation feasibility score
   */
  _calculateFeasibility(costs, envConstraints) {
    let score = 100;
    
    // Cost feasibility
    if (costs.total_cost_usd > 40000000) score -= 20;
    
    else if (costs.total_cost_usd > 30000000) score -= 10;
    
    // Environmental feasibility
    score -= envConstraints.constraints.length * 10;
    
    // Connection feasibility
    if (costs.connection_cost > 5000000) score -= 15;
    else if (costs.connection_cost > 3000000) score -= 8;
    
    return Math.max(0, score);
  }

  /**
   * Get recent BESS recommendations
   */
  async getRecentRecommendations(gridRegionId, limit = 10) {
    return await getBESSRecommendations(gridRegionId, limit);
  }

  /**
   * Get optimization metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      cacheSize: this.optimizationCache.size
    };
  }

  /**
   * Clear optimization cache
   */
  clearCache() {
    this.optimizationCache.clear();
    this.h3Analyzer.clearCache();
    logger.info('BESS optimization cache cleared');
  }
}

module.exports = BESSOptimizationService;