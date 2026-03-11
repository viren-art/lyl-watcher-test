const { gql } = require('apollo-server-express');

const typeDefs = gql`
  scalar DateTime
  scalar JSON

  type Query {
    # Weather queries
    weatherPrediction(predictionId: ID!): WeatherPrediction
    weatherPredictions(
      regionId: Int!
      startTime: DateTime
      endTime: DateTime
      limit: Int
      cursor: String
    ): WeatherPredictionConnection!
    latestWeatherPrediction(regionId: Int!): WeatherPrediction

    # Grid queries
    gridImpact(impactId: ID!): GridImpact
    gridImpacts(
      regionId: Int!
      severity: ImpactSeverity
      startTime: DateTime
      endTime: DateTime
      limit: Int
      cursor: String
    ): GridImpactConnection!
    latestGridImpact(regionId: Int!): GridImpact
    gridRegions(subscriptionOnly: Boolean): [GridRegion!]!
    substations(regionId: Int!): [Substation!]!

    # BESS queries
    bessRecommendations(
      regionId: Int!
      status: BessStatus
      minOptimizationScore: Float
      limit: Int
      cursor: String
    ): BessRecommendationConnection!
    bessRoiAnalysis(locationId: Int!): BessRoiAnalysis

    # Analytics queries
    predictionAccuracy(
      modelType: ModelType!
      startDate: DateTime!
      endDate: DateTime!
      regionId: Int
    ): PredictionAccuracy!
    customerUsage(
      customerId: Int
      startDate: DateTime!
      endDate: DateTime!
    ): CustomerUsage!
  }

  type Mutation {
    # Weather mutations
    createWeatherPrediction(input: WeatherPredictionInput!): WeatherPrediction!

    # Grid mutations
    createGridImpactAnalysis(input: GridImpactInput!): GridImpact!
    subscribeGridAlerts(input: GridAlertSubscriptionInput!): GridAlertSubscription!

    # BESS mutations
    optimizeBessLocation(input: BessOptimizationInput!): BessOptimization!
    analyzeBessRoi(input: BessRoiInput!): BessRoiAnalysis!
  }

  # Weather types
  type WeatherPrediction {
    predictionId: ID!
    gridRegionId: Int!
    generatedAt: DateTime!
    predictions: [WeatherDataPoint!]!
    modelVersion: String!
  }

  type WeatherDataPoint {
    timestamp: DateTime!
    temperature: Float
    windSpeed: Float
    precipitation: Float
    humidity: Float
    solarRadiation: Float
    confidenceScore: Float!
  }

  type WeatherPredictionConnection {
    predictions: [WeatherPrediction!]!
    nextCursor: String
    totalCount: Int!
  }

  input WeatherPredictionInput {
    gridRegionId: Int!
    forecastHours: Int!
    parameters: [String!]
  }

  # Grid types
  type GridImpact {
    impactId: ID!
    gridRegionId: Int!
    timestamp: DateTime!
    predictedLoadMw: Float!
    predictedGenerationMw: Float
    stressIndex: Int!
    outageProbability: Float!
    impactSeverity: ImpactSeverity!
    affectedSubstations: [AffectedSubstation!]!
    recommendations: [String!]!
    modelVersion: String!
  }

  type AffectedSubstation {
    substationId: Int!
    substationName: String!
    riskLevel: ImpactSeverity!
  }

  type GridImpactConnection {
    impacts: [GridImpact!]!
    nextCursor: String
    totalCount: Int!
  }

  type GridRegion {
    gridRegionId: Int!
    regionName: String!
    utilityProvider: String
    currentCapacityMw: Float!
    peakDemandMw: Float!
    renewablePercentage: Float
    boundaryPolygon: JSON
  }

  type Substation {
    substationId: Int!
    substationName: String!
    location: Location!
    capacityMw: Float!
    voltageKv: Float!
    status: String!
  }

  type Location {
    lat: Float!
    lon: Float!
  }

  type GridAlertSubscription {
    subscriptionId: ID!
    active: Boolean!
  }

  input GridImpactInput {
    gridRegionId: Int!
    weatherPredictionId: ID
    forecastHours: Int
  }

  input GridAlertSubscriptionInput {
    gridRegionId: Int!
    severityThreshold: ImpactSeverity!
    webhookUrl: String!
    email: String
  }

  enum ImpactSeverity {
    LOW
    MEDIUM
    HIGH
    CRITICAL
  }

  # BESS types
  type BessOptimization {
    optimizationId: ID!
    gridRegionId: Int!
    locations: [BessLocation!]!
    generatedAt: DateTime!
  }

  type BessLocation {
    locationId: Int!
    locationName: String
    coordinates: Location!
    h3Index: String!
    recommendedCapacityMwh: Float!
    recommendedPowerMw: Float!
    optimizationScore: Float!
    roiEstimate: Float
    gridConnectionCostUsd: Float
    deploymentPriority: Int!
    justification: String!
  }

  type BessRecommendationConnection {
    recommendations: [BessLocation!]!
    nextCursor: String
    totalCount: Int!
  }

  type BessRoiAnalysis {
    locationId: Int!
    implementationCostUsd: Float!
    annualEnergySavingsUsd: Float!
    annualGridStabilityValueUsd: Float!
    totalRoi: Float!
    paybackYears: Float!
    npv: Float!
    irr: Float!
    comparisonToTraditionalMethod: TraditionalComparison!
  }

  type TraditionalComparison {
    traditionalRoi: Float!
    improvementPercentage: Float!
  }

  input BessOptimizationInput {
    gridRegionId: Int!
    capacityMwh: Float!
    budgetUsd: Float
    deploymentTimelineMonths: Int
    constraints: JSON
  }

  input BessRoiInput {
    locationId: Int!
    analysisYears: Int
  }

  enum BessStatus {
    PROPOSED
    APPROVED
    UNDER_CONSTRUCTION
    DEPLOYED
    DECOMMISSIONED
  }

  # Analytics types
  type PredictionAccuracy {
    modelType: ModelType!
    overallAccuracy: Float!
    accuracyByRegion: [RegionAccuracy!]!
    accuracyTrend: [AccuracyTrendPoint!]!
  }

  type RegionAccuracy {
    gridRegionId: Int!
    regionName: String!
    accuracy: Float!
  }

  type AccuracyTrendPoint {
    date: DateTime!
    accuracy: Float!
  }

  type CustomerUsage {
    customerId: Int!
    companyName: String!
    subscriptionTier: SubscriptionTier!
    apiCallsTotal: Int!
    apiCallsByEndpoint: JSON!
    rateLimitExceeded: Int!
    averageResponseTimeMs: Float!
    topRegionsQueried: [RegionQueryStats!]!
  }

  type RegionQueryStats {
    gridRegionId: Int!
    regionName: String!
    queryCount: Int!
  }

  enum ModelType {
    WEATHER_LSTM
    GRID_TRANSFORMER
    BESS_RL
  }

  enum SubscriptionTier {
    BASIC
    PROFESSIONAL
    ENTERPRISE
  }
`;

module.exports = typeDefs;