/**
 * OpenAPI 3.0 Documentation for Grid AI Platform API
 */
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Grid AI Platform API',
      version: '1.0.0',
      description: 'B2B API for weather predictions, grid impact analysis, and BESS optimization',
      contact: {
        name: 'API Support',
        email: 'api-support@gridai.platform'
      }
    },
    servers: [
      {
        url: 'https://api.gridai.platform/v1',
        description: 'Production server'
      },
      {
        url: 'https://staging-api.gridai.platform/v1',
        description: 'Staging server'
      },
      {
        url: 'http://localhost:3000/api/v1',
        description: 'Development server'
      }
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
          description: 'JWT token obtained from /auth/login endpoint'
        }
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            error: {
              type: 'object',
              properties: {
                code: {
                  type: 'string',
                  example: 'VALIDATION_ERROR'
                },
                message: {
                  type: 'string',
                  example: 'Request validation failed'
                },
                details: {
                  type: 'object'
                },
                timestamp: {
                  type: 'string',
                  format: 'date-time'
                }
              }
            }
          }
        },
        WeatherPrediction: {
          type: 'object',
          properties: {
            predictionId: {
              type: 'string',
              format: 'uuid'
            },
            gridRegionId: {
              type: 'integer'
            },
            generatedAt: {
              type: 'string',
              format: 'date-time'
            },
            predictions: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  timestamp: {
                    type: 'string',
                    format: 'date-time'
                  },
                  temperature: {
                    type: 'number',
                    description: 'Temperature in Celsius'
                  },
                  windSpeed: {
                    type: 'number',
                    description: 'Wind speed in m/s'
                  },
                  precipitation: {
                    type: 'number',
                    description: 'Precipitation in mm'
                  },
                  humidity: {
                    type: 'number',
                    description: 'Humidity percentage'
                  },
                  solarRadiation: {
                    type: 'number',
                    description: 'Solar radiation in W/m²'
                  },
                  confidenceScore: {
                    type: 'number',
                    minimum: 0,
                    maximum: 1
                  }
                }
              }
            },
            modelVersion: {
              type: 'string'
            }
          }
        }
      }
    },
    security: [
      {
        bearerAuth: []
      }
    ]
  },
  apis: ['./src/api/rest/*.routes.js']
};

const specs = swaggerJsdoc(options);

module.exports = specs;