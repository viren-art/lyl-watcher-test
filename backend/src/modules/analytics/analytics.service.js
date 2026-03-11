const AnalyticsRepository = require('../../database/analytics/analytics.repository');

class AnalyticsService {
  constructor() {
    this.analyticsRepository = new AnalyticsRepository();
  }

  async getPredictionAccuracy({ modelType, startDate, endDate, regionId }) {
    return await this.analyticsRepository.getPredictionAccuracy({
      modelType,
      startDate,
      endDate,
      regionId
    });
  }

  async getCustomerUsage({ customerId, startDate, endDate }) {
    return await this.analyticsRepository.getCustomerUsage({
      customerId,
      startDate,
      endDate
    });
  }
}

module.exports = AnalyticsService;