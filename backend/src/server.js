const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const weatherRoutes = require('./api/routes/weather-routes');
const gridRoutes = require('./api/routes/grid-routes');
const bessRoutes = require('./api/routes/bess-routes');
const reportRoutes = require('./api/routes/report-routes');
const WeatherIngestionService = require('./modules/weather-ingestion/ingestion-service');
const WeatherAPIConnector = require('./modules/weather-ingestion/weather-api-connector');
const TelemetryIngestionService = require('./modules/grid-telemetry/telemetry-ingestion');
const { initializeDatabase } = require('./database/timeseries/weather-repository');
const { initializePredictionTable } = require('./database/timeseries/prediction-repository');
const { initializeInfrastructureTable } = require('./database/grid-data/infrastructure-repository');
const { initializeTelemetryTable } = require('./database/grid-data/telemetry-repository');
const { initializeImpactTable } = require('./database/grid-data/impact-repository');
const { initializeBESSTable } = require('./database/bess-locations/bess-repository');
const { initializeAuditTable } = require('./database/audit-logs/audit-repository');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Request ID middleware
app.use((req, res, next) => {
  req.id = req.headers['x-request-id'] || `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Routes
app.use('/api/v1/weather', weatherRoutes);
app.use('/api/v1/grid', gridRoutes);
app.use('/api/v1/bess', bessRoutes);
app.use('/api/v1/reports', reportRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Initialize services
let weatherIngestion;
let telemetryIngestion;

async function initializeServices() {
  try {
    // Initialize databases
    await initializeDatabase();
    await initializePredictionTable();
    await initializeInfrastructureTable();
    await initializeTelemetryTable();
    await initializeImpactTable();
    await initializeBESSTable();
    await initializeAuditTable();
    
    logger.info('All databases initialized');

    // Start weather ingestion
    const weatherConnector = new WeatherAPIConnector();
    weatherIngestion = new WeatherIngestionService(weatherConnector);
    await weatherIngestion.start();

    // Start telemetry ingestion
    telemetryIngestion = new TelemetryIngestionService();
    await telemetryIngestion.start();

    logger.info('All services started successfully');
  } catch (error) {
    logger.error('Failed to initialize services', { error: error.message });
    process.exit(1);
  }
}

// Start server
app.listen(PORT, async () => {
  logger.info(`Server running on port ${PORT}`);
  await initializeServices();
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  if (weatherIngestion) await weatherIngestion.stop();
  if (telemetryIngestion) await telemetryIngestion.stop();
  
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  
  if (weatherIngestion) await weatherIngestion.stop();
  if (telemetryIngestion) await telemetryIngestion.stop();
  
  process.exit(0);
});

module.exports = app;