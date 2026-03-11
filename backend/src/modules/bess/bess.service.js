const { v4: uuidv4 } = require('uuid');
const BessRepository = require('../../database/bess/bess.repository');
const PredictionAuditRepository = require('../../database/audit/prediction-audit.repository');

class BessService {
  constructor() {
    this.bessRepository = new BessRepository();
    this.auditRepository = new PredictionAuditRepository();
  }

  async optimizeLocation({ gridRegionId, capacityMwh, budgetUsd, deploymentTimelineMonths, constraints, userId, customerId }) {
    const optimizationId = uuidv4();
    const generatedAt = new Date().toISOString();

    // Mock BESS optimization (in production, calls RL model)
    const locations = this._generateOptimizedLocations(gridRegionId, capacityMwh, budgetUsd);

    // Store recommendations
    for (const location of locations) {
      await this.bessRepository.storeRecommendation(location);
    }

    // Audit log
    await this.auditRepository.logPrediction({
      userId,
      customerId,
      requestType: 'bess_optimization',
      requestParams: { gridRegionId, capacityMwh, budgetUsd },
      responseSummary: { optimizationId, locationsFound: locations.length }
    });

    return {
      optimizationId,
      gridRegionId,
      locations,
      generatedAt
    };
  }

  async getRecommendations({ regionId, status, minOptimizationScore, limit, cursor }) {
    return await this.bessRepository.getRecommendations({
      regionId,
      status,
      minOptimizationScore,
      limit,
      cursor
    });
  }

  async analyzeRoi({ locationId, analysisYears }) {
    const location = await this.bessRepository.getLocationById(locationId);
    
    if (!location) {
      throw new Error('Location not found');
    }

    // Mock ROI calculation
    const implementationCostUsd = location.recommendedCapacityMwh * 500000;
    const annualEnergySavingsUsd = location.recommendedCapacityMwh * 50000;
    const annualGridStabilityValueUsd = location.recommendedCapacityMwh * 30000;
    const totalAnnualValue = annualEnergySavingsUsd + annualGridStabilityValueUsd;
    const totalRoi = ((totalAnnualValue * analysisYears - implementationCostUsd) / implementationCostUsd) * 100;
    const paybackYears = implementationCostUsd / totalAnnualValue;
    const traditionalRoi = totalRoi * 0.75; // 25% worse than AI method

    return {
      locationId,
      implementationCostUsd,
      annualEnergySavingsUsd,
      annualGridStabilityValueUsd,
      totalRoi,
      paybackYears,
      npv: totalAnnualValue * analysisYears - implementationCostUsd,
      irr: 12.5,
      comparisonToTraditionalMethod: {
        traditionalRoi,
        improvementPercentage: ((totalRoi - traditionalRoi) / traditionalRoi) * 100
      }
    };
  }

  _generateOptimizedLocations(regionId, capacityMwh, budgetUsd) {
    const count = Math.min(5, Math.floor(Math.random() * 3) + 3);
    const locations = [];

    for (let i = 0; i < count; i++) {
      locations.push({
        locationId: null, // Will be assigned by DB
        locationName: `BESS Site ${i + 1}`,
        coordinates: {
          lat: 40.7 + Math.random() * 0.5,
          lon: -74.0 + Math.random() * 0.5
        },
        h3Index: `8928308280fffff`,
        recommendedCapacityMwh: capacityMwh,
        recommendedPowerMw: capacityMwh * 0.25,
        optimizationScore: 70 + Math.random() * 30,
        roiEstimate: 15 + Math.random() * 10,
        gridConnectionCostUsd: 500000 + Math.random() * 500000,
        deploymentPriority: i + 1,
        justification: `Optimal location based on grid stress patterns and weather impact analysis`
      });
    }

    return locations.sort((a, b) => b.optimizationScore - a.optimizationScore);
  }
}

module.exports = BessService;