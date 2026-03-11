const WeatherService = require('../../modules/weather/weather.service');
const GridService = require('../../modules/grid/grid.service');
const BessService = require('../../modules/bess/bess.service');
const AnalyticsService = require('../../modules/analytics/analytics.service');
const { GraphQLError } = require('graphql');

const weatherService = new WeatherService();
const gridService = new GridService();
const bessService = new BessService();
const analyticsService = new AnalyticsService();

const resolvers = {
  Query: {
    // Weather queries
    weatherPrediction: async (_, { predictionId }, context) => {
      if (!context.user) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
      }
      return await weatherService.getPredictionById(predictionId);
    },

    weatherPredictions: async (_, { regionId, startTime, endTime, limit, cursor }, context) => {
      if (!context.user) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
      }
      return await weatherService.getPredictions({
        regionId,
        startTime,
        endTime,
        limit: limit || 100,
        cursor
      });
    },

    latestWeatherPrediction: async (_, { regionId }, context) => {
      if (!context.user) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
      }
      return await weatherService.getLatestPrediction(regionId);
    },

    // Grid queries
    gridImpact: async (_, { impactId }, context) => {
      if (!context.user) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
      }
      return await gridService.getImpactById(impactId);
    },

    gridImpacts: async (_, { regionId, severity, startTime, endTime, limit, cursor }, context) => {
      if (!context.user) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
      }
      return await gridService.getImpacts({
        regionId,
        severity,
        startTime,
        endTime,
        limit: limit || 100,
        cursor
      });
    },

    latestGridImpact: async (_, { regionId }, context) => {
      if (!context.user) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
      }
      return await gridService.getLatestImpact(regionId);
    },

    gridRegions: async (_, { subscriptionOnly }, context) => {
      if (!context.user) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
      }
      const regions = await gridService.getRegions(context.user.customerId, subscriptionOnly);
      return regions;
    },

    substations: async (_, { regionId }, context) => {
      if (!context.user) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
      }
      return await gridService.getSubstations(regionId);
    },

    // BESS queries
    bessRecommendations: async (_, { regionId, status, minOptimizationScore, limit, cursor }, context) => {
      if (!context.user) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
      }
      return await bessService.getRecommendations({
        regionId,
        status,
        minOptimizationScore,
        limit: limit || 100,
        cursor
      });
    },

    bessRoiAnalysis: async (_, { locationId }, context) => {
      if (!context.user) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
      }
      return await bessService.analyzeRoi({ locationId, analysisYears: 20 });
    },

    // Analytics queries
    predictionAccuracy: async (_, { modelType, startDate, endDate, regionId }, context) => {
      if (!context.user) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
      }
      return await analyticsService.getPredictionAccuracy({
        modelType,
        startDate,
        endDate,
        regionId
      });
    },

    customerUsage: async (_, { customerId, startDate, endDate }, context) => {
      if (!context.user) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
      }
      // Only admins can query other customers
      const targetCustomerId = customerId || context.user.customerId;
      if (customerId && context.user.role !== 'ADMIN') {
        throw new GraphQLError('Forbidden', { extensions: { code: 'FORBIDDEN' } });
      }
      return await analyticsService.getCustomerUsage({
        customerId: targetCustomerId,
        startDate,
        endDate
      });
    }
  },

  Mutation: {
    // Weather mutations
    createWeatherPrediction: async (_, { input }, context) => {
      if (!context.user) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
      }
      return await weatherService.generatePrediction({
        ...input,
        userId: context.user.userId,
        customerId: context.user.customerId
      });
    },

    // Grid mutations
    createGridImpactAnalysis: async (_, { input }, context) => {
      if (!context.user) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
      }
      return await gridService.generateImpactAnalysis({
        ...input,
        userId: context.user.userId,
        customerId: context.user.customerId
      });
    },

    subscribeGridAlerts: async (_, { input }, context) => {
      if (!context.user) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
      }
      return await gridService.subscribeAlerts({
        ...input,
        customerId: context.user.customerId
      });
    },

    // BESS mutations
    optimizeBessLocation: async (_, { input }, context) => {
      if (!context.user) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
      }
      return await bessService.optimizeLocation({
        ...input,
        userId: context.user.userId,
        customerId: context.user.customerId
      });
    },

    analyzeBessRoi: async (_, { input }, context) => {
      if (!context.user) {
        throw new GraphQLError('Unauthorized', { extensions: { code: 'UNAUTHORIZED' } });
      }
      return await bessService.analyzeRoi(input);
    }
  }
};

module.exports = resolvers;