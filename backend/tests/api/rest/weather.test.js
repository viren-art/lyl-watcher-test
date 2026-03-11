const request = require('supertest');
const express = require('express');
const weatherRoutes = require('../../../src/api/rest/weather.routes');
const jwt = require('jsonwebtoken');

const app = express();
app.use(express.json());
app.use('/api/v1/weather', weatherRoutes);

// Mock JWT token
const generateToken = (customerId = 1, tier = 'PROFESSIONAL') => {
  return jwt.sign(
    { userId: 1, customerId, tier, role: 'GRID_ANALYST', regions: [1, 2] },
    process.env.JWT_SECRET || 'test-secret',
    { expiresIn: '1h' }
  );
};

describe('Weather API Endpoints', () => {
  describe('POST /api/v1/weather/predict', () => {
    it('should generate weather prediction with valid data', async () => {
      const token = generateToken();
      const response = await request(app)
        .post('/api/v1/weather/predict')
        .set('Authorization', `Bearer ${token}`)
        .send({
          gridRegionId: 1,
          forecastHours: 24,
          parameters: ['temperature', 'wind_speed']
        });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('predictionId');
      expect(response.body.predictions).toHaveLength(24);
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/weather/predict')
        .send({
          gridRegionId: 1,
          forecastHours: 24
        });

      expect(response.status).toBe(401);
    });

    it('should validate forecastHours range', async () => {
      const token = generateToken();
      const response = await request(app)
        .post('/api/v1/weather/predict')
        .set('Authorization', `Bearer ${token}`)
        .send({
          gridRegionId: 1,
          forecastHours: 200 // Invalid: exceeds 168
        });

      expect(response.status).toBe(400);
      expect(response.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/v1/weather/predictions/:regionId', () => {
    it('should retrieve predictions for region', async () => {
      const token = generateToken();
      const response = await request(app)
        .get('/api/v1/weather/predictions/1')
        .set('Authorization', `Bearer ${token}`)
        .query({ limit: 50 });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('predictions');
      expect(response.body).toHaveProperty('totalCount');
    });
  });
});