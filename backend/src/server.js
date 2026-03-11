const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const weatherRoutes = require('./api/routes/weather-routes');
const gridRoutes = require('./api/routes/grid-routes');
const bessRoutes = require('./api/routes/bess-routes');
const WeatherIngestionService = require('./modules/weather-ingestion/ingestion-service');
const WeatherAPIConnector = require('./modules/weather-ingestion/weather-api-connector');
const TelemetryIngestionService = require('./modules/grid-telemetry/telemetry-ingestion');
const { initializeDatabase } = require('./database/timeseries/weather-repository');
const { initializePredictionTable } = require('./database/timeseries/prediction-repository');
const { initializeInfrastructureTable } = require('./database/grid-data/infrastructure-repository');
const { initializeTelemetryTable } = require('./database/grid-data/telemetry-repository');
const { initializeImpactTable } = require('./database/grid-data/impact-repository');
const { initializeBESSTable } = require('./database/bess-locations/bess-repository');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request ID middleware
app.use((req, res, next) => {
  req.id = `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  next();
});

// Routes
app.use('/api/v1/weather', weatherRoutes);
app.use('/api/v1/grid', gridRoutes);
app.use('/api/v1/bess', bessRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    features: ['weather-forecasting', 'grid-impact', 'bess-optimization']
  });
});

// Initialize services
async function initializeServices() {
  try {
    logger.info('Initializing database tables...');
    await initializeDatabase();
    await initializePredictionTable();
    await initializeInfrastructureTable();
    await initializeTelemetryTable();
    await initializeImpactTable();
    await initializeBESSTable();
    
    logger.info('Starting weather ingestion service...');
    const weatherIngestion = new WeatherIngestionService();
    await weatherIngestion.start();
    
    logger.info('Starting weather API connector...');
    const weatherConnector = new WeatherAPIConnector();
    weatherConnector.startPolling();
    
    logger.info('Starting grid telemetry ingestion...');
    const telemetryIngestion = new TelemetryIngestionService();
    await telemetryIngestion.start();
    
    logger.info('All services initialized successfully');
    
  } catch (error) {
    logger.error('Error initializing services:', error);
    process.exit(1);
  }
}

// Start server
app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  await initializeServices();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully...');
  process.exit(0);
});