const UsageAnalyticsService = require('../modules/usage-analytics/usage-analytics.service');

const usageAnalyticsService = new UsageAnalyticsService();

/**
 * Middleware to track API calls for usage analytics
 */
const trackApiUsage = async (req, res, next) => {
  const startTime = Date.now();

  // Capture original res.json to track response
  const originalJson = res.json.bind(res);
  
  res.json = function(data) {
    const responseTime = Date.now() - startTime;

    // Track API call asynchronously (don't block response)
    if (req.user && req.user.customerId) {
      usageAnalyticsService.trackApiCall({
        customerId: req.user.customerId,
        userId: req.user.userId,
        endpoint: req.path,
        method: req.method,
        statusCode: res.statusCode,
        responseTimeMs: responseTime,
        regionId: req.params.regionId || req.query.regionId || req.body.gridRegionId || null
      }).catch(err => {
        console.error('Failed to track API usage:', err);
      });
    }

    return originalJson(data);
  };

  next();
};

module.exports = { trackApiUsage };