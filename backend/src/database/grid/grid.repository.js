const { Pool } = require('pg');

class GridRepository {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
  }

  async storeImpact(impact) {
    // Mock implementation - in production, stores in TimescaleDB
    return { impactId: impact.impactId, stored: true };
  }

  async getImpacts({ regionId, severity, startTime, endTime, limit, cursor }) {
    // Mock implementation
    return {
      impacts: [],
      nextCursor: null,
      totalCount: 0
    };
  }

  async getLatestImpact(regionId) {
    // Mock implementation
    return null;
  }

  async getImpactById(impactId) {
    // Mock implementation
    return null;
  }

  async createAlertSubscription({ subscriptionId, customerId, gridRegionId, severityThreshold, webhookUrl, email }) {
    // Mock implementation
    return { subscriptionId, created: true };
  }

  async getRegions(customerId, subscriptionOnly) {
    // Mock implementation
    return [];
  }

  async getSubstations(regionId) {
    // Mock implementation
    return [];
  }
}

module.exports = GridRepository;