const { gql } = require('apollo-server-express');

const typeDefs = gql`
  type Query {
    # Weather queries
    weatherPrediction(gridRegionId: Int!, forecastHours: Int): WeatherPrediction
    weatherHistory(gridRegionId: Int!, hours: Int): [WeatherData!]!
    currentWeather(gridRegionId: Int!): WeatherData
    
    # Grid queries
    gridImpact(gridRegionId: Int!, weatherPredictionId: String, forecastHours: Int): GridImpact
    gridImpacts(gridRegionId: Int!, severity: Severity, limit: Int): [GridImpact!]!
    gridRegions: [GridRegion!]!
    substations(gridRegionId: Int!): [Substation!]!
    
    # Multi-region queries
    multiRegionWeather(regionIds: [Int!]!): [RegionWeatherSummary!]!
    multiRegionComparison(regionIds: [Int!]!): RegionComparison!
  }

  type WeatherPrediction {
    predictionId: String!
    gridRegionId: Int!
    generatedAt: String!
    predictions: [HourlyPrediction!]!
    modelVersion: String!
    confidenceScore: Float!
  }

  type HourlyPrediction {
    timestamp: String!
    temperature: Float
    windSpeed: Float
    precipitation: Float
    humidity: Float
    solarRadiation: Float
    confidenceScore: Float!
    condition: String
  }

  type WeatherData {
    timestamp: String!
    gridRegionId: Int!
    temperature: Float
    windSpeed: Float
    precipitation: Float
    humidity: Float
    solarRadiation: Float
    location: Location!
  }

  type Location {
    lat: Float!
    lon: Float!
  }

  type GridImpact {
    impactId: String!
    gridRegionId: Int!
    timestamp: String!
    predictedLoad: Float!
    predictedGeneration: Float
    stressIndex: Int!
    outageProbability: Float!
    severity: Severity!
    affectedSubstations: [AffectedSubstation!]!
    recommendations: [String!]!
    modelVersion: String!
  }

  type AffectedSubstation {
    substationId: Int!
    substationName: String!
    riskLevel: Severity!
    predictedLoad: Float
    capacity: Float
  }

  type GridRegion {
    gridRegionId: Int!
    regionName: String!
    utilityProvider: String
    currentCapacity: Float!
    peakDemand: Float!
    renewablePercentage: Float
    boundaryPolygon: String
  }

  type Substation {
    substationId: Int!
    substationName: String!
    location: Location!
    capacity: Float!
    voltage: Float!
    status: String!
  }

  type RegionWeatherSummary {
    gridRegionId: Int!
    regionName: String!
    currentWeather: WeatherData
    forecast24h: [HourlyPrediction!]!
    gridImpact: GridImpact
    alerts: [Alert!]!
  }

  type RegionComparison {
    regions: [GridRegion!]!
    metrics: [ComparisonMetric!]!
    timestamp: String!
  }

  type ComparisonMetric {
    name: String!
    unit: String
    values: [RegionMetricValue!]!
  }

  type RegionMetricValue {
    gridRegionId: Int!
    value: Float!
    delta: Float
    trend: String
  }

  type Alert {
    id: String!
    severity: Severity!
    title: String!
    message: String!
    timestamp: String!
    recommendations: [String!]
  }

  enum Severity {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }
`;

module.exports = typeDefs;