const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const weatherRoutes = require('./api/routes/weather-routes');
const WeatherIngestionService = require('./modules/weather-ingestion/ingestion-service');
const WeatherAPIConnector = require('./modules/weather-ingestion/weather-api-connector');
const { initializeDatabase } = require('./database/timeseries/weather-repository');
const { initializePredictionTable } = require('./database/timeseries/prediction-repository');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/v1/weather', weatherRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Initialize services
let ingestionService;
let apiConnector;

async function startServer() {
  try {
    // Initialize database
    await initializeDatabase();
    await initializePredictionTable();
    
    // Start ingestion service
    ingestionService = new WeatherIngestionService();
    await ingestionService.start();
    
    // Start API connectors
    apiConnector = new WeatherAPIConnector();
    await apiConnector.start();
    
    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`Weather Impact System API running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server', { error: error.message });
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  
  if (ingestionService) {
    await ingestionService.stop();
  }
  
  if (apiConnector) {
    apiConnector.stop();
  }
  
  process.exit(0);
});

startServer();

module.exports = app;