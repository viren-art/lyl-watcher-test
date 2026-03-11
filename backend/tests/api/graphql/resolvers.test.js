const resolvers = require('../../../src/api/graphql/resolvers');
const PredictionService = require('../../../src/modules/ai-forecasting/prediction-service');
const GridImpactService = require('../../../src/modules/grid-impact/impact-service');

jest.mock('../../../src/modules/ai-forecasting/prediction-service');
jest.mock('../../../src/modules/grid-impact/impact-service');
jest.mock('../../../src/database/timeseries/weather-repository');
jest.mock('../../../src/database/grid-data/infrastructure-repository');

describe('GraphQL Resolvers', () => {
  let mockContext;

  beforeEach(() => {
    mockContext = {
      user: {
        userId: 1,
        customerId: 1,
        role: 'GRID_ANALYST',
        regions: [1, 2, 3]
      }
    };
  });

  describe('weatherPrediction', () => {
    it('should return weather forecast for authenticated user', async () => {
      const mockForecast = {
        predictionId: 'pred-123',
        gridRegionId: 1,
        generatedAt: new Date().toISOString(),
        predictions: [
          {
            timestamp: new Date().toISOString(),
            temperature: 22.5,
            windSpeed: 5.2,
            precipitation: 0,
            humidity: 65,
            confidenceScore: 0.92
          }
        ],
        modelVersion: 'v1.0',
        confidenceScore: 0.92
      };

      PredictionService.prototype.generateForecast = jest.fn().mockResolvedValue(mockForecast);

      const result = await resolvers.Query.weatherPrediction(
        null,
        { gridRegionId: 1, forecastHours: 24 },
        mockContext
      );

      expect(result).toEqual(mockForecast);
      expect(PredictionService.prototype.generateForecast).toHaveBeenCalledWith(1, 24);
    });

    it('should throw error for unauthenticated user', async () => {
      await expect(
        resolvers.Query.weatherPrediction(
          null,
          { gridRegionId: 1 },
          { user: null }
        )
      ).rejects.toThrow('Authentication required');
    });
  });

  describe('multiRegionWeather', () => {
    it('should return weather data for multiple regions', async () => {
      const mockWeather = {
        timestamp: new Date().toISOString(),
        gridRegionId: 1,
        temperature: 22.5,
        windSpeed: 5.2,
        precipitation: 0,
        humidity: 65,
        location: { lat: 40.7128, lon: -74.0060 }
      };

      const mockForecast = {
        predictionId: 'pred-123',
        predictions: [
          {
            timestamp: new Date().toISOString(),
            temperature: 23.0,
            windSpeed: 5.5,
            precipitation: 0,
            humidity: 63,
            confidenceScore: 0.91
          }
        ]
      };

      const mockImpact = {
        impactId: 'impact-123',
        gridRegionId: 1,
        severity: 'LOW',
        stressIndex: 25,
        outageProbability: 0.05,
        affectedSubstations: [],
        recommendations: []
      };

      require('../../../src/database/timeseries/weather-repository').getLatestWeatherData = jest.fn().mockResolvedValue(mockWeather);
      PredictionService.prototype.generateForecast = jest.fn().mockResolvedValue(mockForecast);
      GridImpactService.prototype.analyzeGridImpact = jest.fn().mockResolvedValue(mockImpact);
      require('../../../src/database/grid-data/infrastructure-repository').getGridRegions = jest.fn().mockResolvedValue([
        { gridRegionId: 1, regionName: 'Northeast' }
      ]);

      const result = await resolvers.Query.multiRegionWeather(
        null,
        { regionIds: [1] },
        mockContext
      );

      expect(result).toHaveLength(1);
      expect(result[0].gridRegionId).toBe(1);
      expect(result[0].regionName).toBe('Northeast');
      expect(result[0].currentWeather).toEqual(mockWeather);
    });
  });
});