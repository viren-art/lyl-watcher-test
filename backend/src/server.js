const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const weatherRoutes = require('./api/routes/weather-routes');
const WeatherIngestionService = require('./modules/weather-ingestion/ingestion-service');
const WeatherAPIConnector = require('./modules/weather-ingestion/weather-api-connector');
const { initializeDatabase } = require('./database/timeseries/weather-repository');
const { initializePredictionTable } = require('./database/timeseries/prediction-repository');
const { scheduleKeyRotationCheck } = require('./jobs/key-rotation-job');
const logger = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
    },
  },
}));

// CORS configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3001'],
  credentials: true,
}));

// Body parsing
app.use(express.json());

// Force HTTPS in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

// Routes
app.use('/api/v1/weather', weatherRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    tls: req.secure || req.header('x-forwarded-proto') === 'https',
  });
});

// Initialize services
let ingestionService;
let apiConnector;

async function startServer() {
  try {
    // Validate encryption configuration
    if (!process.env.MASTER_ENCRYPTION_KEY) {
      throw new Error('MASTER_ENCRYPTION_KEY environment variable is required');
    }
    
    // Initialize database with encryption support
    await initializeDatabase();
    await initializePredictionTable();
    
    // Schedule encryption key rotation checks
    scheduleKeyRotationCheck();
    
    // Start ingestion service
    ingestionService = new WeatherIngestionService();
    await ingestionService.start();
    
    // Start API connectors
    apiConnector = new WeatherAPIConnector();
    await apiConnector.start();
    
    // Start HTTP server
    app.listen(PORT, () => {
      logger.info(`Weather Impact System API running on port ${PORT}`, {
        environment: process.env.NODE_ENV,
        tlsEnabled: process.env.NODE_ENV === 'production',
        encryptionEnabled: true,
      });
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