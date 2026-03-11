const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const weatherRoutes = require('./api/routes/weather-routes');
const gridRoutes = require('./api/routes/grid-routes');
const authRoutes = require('./modules/auth/auth.routes');
const { createApolloServer } = require('./api/graphql');
const WeatherIngestionService = require('./modules/weather-ingestion/ingestion-service');
const WeatherAPIConnector = require('./modules/weather-ingestion/weather-api-connector');
const TelemetryIngestionService = require('./modules/grid-telemetry/telemetry-ingestion');
const { initializeDatabase } = require('./database/timeseries/weather-repository');
const { initializePredictionTable } = require('./database/timeseries/prediction-repository');
const { initializeGridDatabase } = require('./database/grid-data/infrastructure-repository');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
  contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false
}));
app.use(cors());
app.use(express.json());

// REST API Routes
app.use('/api/v1/weather', weatherRoutes);
app.use('/api/v1/grid', gridRoutes);
app.use('/api/v1/auth', authRoutes);

// GraphQL Server
const apolloServer = createApolloServer();
apolloServer.start().then(() => {
  apolloServer.applyMiddleware({ app, path: '/api/v1/graphql' });
  logger.info('GraphQL server started', { path: '/api/v1/graphql' });
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Initialize services
async function initializeServices() {
  try {
    // Initialize databases
    await initializeDatabase();
    await initializePredictionTable();
    await initializeGridDatabase();
    logger.info('Databases initialized');

    // Start weather ingestion
    const weatherIngestion = new WeatherIngestionService();
    await weatherIngestion.start();
    logger.info('Weather ingestion service started');

    // Start weather API polling
    const weatherConnector = new WeatherAPIConnector();
    await weatherConnector.startPolling();
    logger.info('Weather API connector started');

    // Start grid telemetry ingestion
    const telemetryIngestion = new TelemetryIngestionService();
    await telemetryIngestion.start();
    logger.info('Grid telemetry ingestion started');

    // Start server
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`GraphQL endpoint: http://localhost:${PORT}/api/v1/graphql`);
    });
  } catch (error) {
    logger.error('Failed to initialize services', { error: error.message });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  process.exit(0);
});

initializeServices();