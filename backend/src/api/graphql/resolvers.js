const PredictionService = require('../../modules/ai-forecasting/prediction-service');
const GridImpactService = require('../../modules/grid-impact/impact-service');
const { getLatestWeatherData, getWeatherHistory } = require('../../database/timeseries/weather-repository');
const { getPredictions } = require('../../database/timeseries/prediction-repository');
const { getGridRegions, getSubstationsByRegion } = require('../../database/grid-data/infrastructure-repository');
const { getGridImpacts, getImpactsBySeverity } = require('../../database/grid-data/impact-repository');
const logger = require('../../utils/logger');

const predictionService = new PredictionService();
const gridImpactService = new GridImpactService();

const resolvers = {
  Query: {
    // Weather queries
    weatherPrediction: async (_, { gridRegionId, forecastHours = 24 }, context) => {
      try {
        // Verify user has access to region
        if (!context.user) {
          throw new Error('Authentication required');
        }

        const forecast = await predictionService.generateForecast(gridRegionId, forecastHours);
        return forecast;
      } catch (error) {
        logger.error('GraphQL weatherPrediction error', { error: error.message, gridRegionId });
        throw error;
      }
    },

    weatherHistory: async (_, { gridRegionId, hours = 24 }, context) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        const history = await getWeatherHistory(gridRegionId, hours);
        return history;
      } catch (error) {
        logger.error('GraphQL weatherHistory error', { error: error.message, gridRegionId });
        throw error;
      }
    },

    currentWeather: async (_, { gridRegionId }, context) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        const current = await getLatestWeatherData(gridRegionId);
        return current;
      } catch (error) {
        logger.error('GraphQL currentWeather error', { error: error.message, gridRegionId });
        throw error;
      }
    },

    // Grid queries
    gridImpact: async (_, { gridRegionId, weatherPredictionId, forecastHours = 24 }, context) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        const impact = await gridImpactService.analyzeGridImpact(
          gridRegionId,
          weatherPredictionId,
          forecastHours
        );
        return impact;
      } catch (error) {
        logger.error('GraphQL gridImpact error', { error: error.message, gridRegionId });
        throw error;
      }
    },

    gridImpacts: async (_, { gridRegionId, severity, limit = 10 }, context) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        let impacts;
        if (severity) {
          impacts = await getImpactsBySeverity(severity, limit);
          impacts = impacts.filter(i => i.gridRegionId === gridRegionId);
        } else {
          impacts = await gridImpactService.getRecentImpacts(gridRegionId, limit);
        }
        return impacts;
      } catch (error) {
        logger.error('GraphQL gridImpacts error', { error: error.message, gridRegionId });
        throw error;
      }
    },

    gridRegions: async (_, __, context) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        const regions = await getGridRegions();
        
        // Filter by user's accessible regions
        if (context.user.regions && context.user.regions.length > 0) {
          return regions.filter(r => context.user.regions.includes(r.gridRegionId));
        }
        
        return regions;
      } catch (error) {
        logger.error('GraphQL gridRegions error', { error: error.message });
        throw error;
      }
    },

    substations: async (_, { gridRegionId }, context) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        const substations = await getSubstationsByRegion(gridRegionId);
        return substations;
      } catch (error) {
        logger.error('GraphQL substations error', { error: error.message, gridRegionId });
        throw error;
      }
    },

    // Multi-region queries
    multiRegionWeather: async (_, { regionIds }, context) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        const summaries = await Promise.all(
          regionIds.map(async (regionId) => {
            const [currentWeather, forecast, gridImpact, regions] = await Promise.all([
              getLatestWeatherData(regionId),
              predictionService.generateForecast(regionId, 24),
              gridImpactService.analyzeGridImpact(regionId, null, 24),
              getGridRegions()
            ]);

            const region = regions.find(r => r.gridRegionId === regionId);

            // Generate alerts based on grid impact
            const alerts = [];
            if (gridImpact.severity === 'CRITICAL' || gridImpact.severity === 'HIGH') {
              alerts.push({
                id: `alert-${regionId}-${Date.now()}`,
                severity: gridImpact.severity,
                title: `${gridImpact.severity} Grid Impact Alert`,
                message: `Predicted outage probability: ${gridImpact.outageProbability}%`,
                timestamp: new Date().toISOString(),
                recommendations: gridImpact.recommendations
              });
            }

            return {
              gridRegionId: regionId,
              regionName: region?.regionName || `Region ${regionId}`,
              currentWeather,
              forecast24h: forecast.predictions,
              gridImpact,
              alerts
            };
          })
        );

        return summaries;
      } catch (error) {
        logger.error('GraphQL multiRegionWeather error', { error: error.message, regionIds });
        throw error;
      }
    },

    multiRegionComparison: async (_, { regionIds }, context) => {
      try {
        if (!context.user) {
          throw new Error('Authentication required');
        }

        const regions = await getGridRegions();
        const selectedRegions = regions.filter(r => regionIds.includes(r.gridRegionId));

        // Fetch current data for all regions
        const regionData = await Promise.all(
          regionIds.map(async (regionId) => {
            const [weather, impact] = await Promise.all([
              getLatestWeatherData(regionId),
              gridImpactService.analyzeGridImpact(regionId, null, 24)
            ]);
            return { regionId, weather, impact };
          })
        );

        // Build comparison metrics
        const metrics = [
          {
            name: 'Temperature',
            unit: '°C',
            values: regionData.map(d => ({
              gridRegionId: d.regionId,
              value: d.weather?.temperature || 0,
              delta: null,
              trend: 'stable'
            }))
          },
          {
            name: 'Wind Speed',
            unit: 'm/s',
            values: regionData.map(d => ({
              gridRegionId: d.regionId,
              value: d.weather?.windSpeed || 0,
              delta: null,
              trend: 'stable'
            }))
          },
          {
            name: 'Precipitation',
            unit: 'mm',
            values: regionData.map(d => ({
              gridRegionId: d.regionId,
              value: d.weather?.precipitation || 0,
              delta: null,
              trend: 'stable'
            }))
          },
          {
            name: 'Grid Stress Index',
            unit: '%',
            values: regionData.map(d => ({
              gridRegionId: d.regionId,
              value: d.impact?.stressIndex || 0,
              delta: null,
              trend: 'stable'
            }))
          },
          {
            name: 'Outage Probability',
            unit: '%',
            values: regionData.map(d => ({
              gridRegionId: d.regionId,
              value: d.impact?.outageProbability || 0,
              delta: null,
              trend: 'stable'
            }))
          }
        ];

        return {
          regions: selectedRegions,
          metrics,
          timestamp: new Date().toISOString()
        };
      } catch (error) {
        logger.error('GraphQL multiRegionComparison error', { error: error.message, regionIds });
        throw error;
      }
    }
  }
};

module.exports = resolvers;