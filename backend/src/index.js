const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const swaggerUi = require('swagger-ui-express');

const authRoutes = require('./modules/auth/auth.routes');
const apiRoutes = require('./api/rest');
const createApolloServer = require('./api/graphql/server');
const RateLimiter = require('./middleware/rate-limiting/rate-limiter');
const swaggerSpecs = require('./config/api-documentation');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());

// Request ID middleware
app.use((req, res, next) => {
  req.id = uuidv4();
  res.setHeader('X-Request-ID', req.id);
  next();
});

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const rateLimiter = new RateLimiter();
app.use('/api/v1', rateLimiter.middleware());

// API Documentation
if (process.env.SWAGGER_ENABLED === 'true') {
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs));
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: process.env.API_VERSION || 'v1'
  });
});

// API routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1', apiRoutes);

// GraphQL endpoint
const apolloServer = createApolloServer();
apolloServer.start().then(() => {
  apolloServer.applyMiddleware({ app, path: '/api/v1/graphql' });
  console.log(`🚀 GraphQL endpoint: http://localhost:${PORT}/api/v1/graphql`);
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Endpoint not found',
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);

  const statusCode = err.statusCode || 500;
  const errorResponse = {
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: err.message || 'An unexpected error occurred',
      details: err.details || null,
      timestamp: new Date().toISOString(),
      requestId: req.id
    }
  };

  res.status(statusCode).json(errorResponse);
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api-docs`);
  console.log(`🏥 Health check: http://localhost:${PORT}/health`);
});

module.exports = app;