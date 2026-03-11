const { v4: uuidv4 } = require('uuid');
const GridRepository = require('../../database/grid/grid.repository');
const PredictionAuditRepository = require('../../database/audit/prediction-audit.repository');

class GridService {
  constructor() {
    this.gridRepository = new GridRepository();
    this.auditRepository = new PredictionAuditRepository();
  }

  async generateImpactAnalysis({ gridRegionId, weatherPredictionId, forecastHours, userId, customerId }) {
    const impactId = uuidv4();
    const timestamp = new Date().toISOString();

    // Mock grid impact analysis (in production, calls Transformer model)
    const impact = {
      impactId,
      gridRegionId,
      timestamp,
      predictedLoadMw: 1200 + Math.random() * 300,
      predictedGenerationMw: 1100 + Math.random() * 200,
      stressIndex: Math.floor(Math.random() * 100),
      outageProbability: Math.random() * 0.3,
      impactSeverity: this._calculateSeverity(Math.random() * 100),
      affectedSubstations: this._generateAffectedSubstations(),
      recommendations: ['Increase reserve capacity', 'Monitor transmission lines'],
      modelVersion: 'transformer-v1.5.0'
    };

    // Store impact prediction
    await this.gridRepository.storeImpact(impact);

    // Audit log
    await this.auditRepository.logPrediction({
      userId,
      customerId,
      requestType: 'grid_impact',
      requestParams: { gridRegionId, weatherPredictionId, forecastHours },
      responseSummary: { impactId, severity: impact.impactSeverity }
    });

    return impact;
  }

  async getImpacts({ regionId, severity, startTime, endTime, limit, cursor }) {
    return await this.gridRepository.getImpacts({
      regionId,
      severity,
      startTime,
      endTime,
      limit,
      cursor
    });
  }

  async getLatestImpact(regionId) {
    return await this.gridRepository.getLatestImpact(regionId);
  }

  async getImpactById(impactId) {
    return await this.gridRepository.getImpactById(impactId);
  }

  async subscribeAlerts({ customerId, gridRegionId, severityThreshold, webhookUrl, email }) {
    const subscriptionId = uuidv4();
    
    await this.gridRepository.createAlertSubscription({
      subscriptionId,
      customerId,
      gridRegionId,
      severityThreshold,
      webhookUrl,
      email
    });

    return {
      subscriptionId,
      active: true
    };
  }

  async getRegions(customerId, subscriptionOnly) {
    return await this.gridRepository.getRegions(customerId, subscriptionOnly);
  }

  async getSubstations(regionId) {
    return await this.gridRepository.getSubstations(regionId);
  }

  _calculateSeverity(stressIndex) {
    if (stressIndex >= 80) return 'CRITICAL';
    if (stressIndex >= 60) return 'HIGH';
    if (stressIndex >= 40) return 'MEDIUM';
    return 'LOW';
  }

  _generateAffectedSubstations() {
    const count = Math.floor(Math.random() * 5) + 1;
    const substations = [];
    
    for (let i = 0; i < count; i++) {
      substations.push({
        substationId: i + 1,
        substationName: `Substation ${i + 1}`,
        riskLevel: this._calculateSeverity(Math.random() * 100)
      });
    }
    
    return substations;
  }
}

module.exports = GridService;