const { body, query, param } = require('express-validator');

const weatherPredictionSchema = [
  body('gridRegionId')
    .isInt({ min: 1 })
    .withMessage('gridRegionId must be a positive integer'),
  body('forecastHours')
    .isInt({ min: 1, max: 168 })
    .withMessage('forecastHours must be between 1 and 168'),
  body('parameters')
    .optional()
    .isArray()
    .withMessage('parameters must be an array')
    .custom((value) => {
      const validParams = ['temperature', 'wind_speed', 'precipitation', 'humidity', 'solar_radiation'];
      return value.every(p => validParams.includes(p));
    })
    .withMessage('Invalid parameter specified')
];

const weatherQuerySchema = [
  param('regionId')
    .isInt({ min: 1 })
    .withMessage('regionId must be a positive integer'),
  query('startTime')
    .optional()
    .isISO8601()
    .withMessage('startTime must be ISO 8601 format'),
  query('endTime')
    .optional()
    .isISO8601()
    .withMessage('endTime must be ISO 8601 format'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('limit must be between 1 and 500'),
  query('cursor')
    .optional()
    .isString()
];

module.exports = {
  weatherPredictionSchema,
  weatherQuerySchema
};