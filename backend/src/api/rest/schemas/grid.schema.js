const { body, query, param } = require('express-validator');

const gridImpactSchema = [
  body('gridRegionId')
    .isInt({ min: 1 })
    .withMessage('gridRegionId must be a positive integer'),
  body('weatherPredictionId')
    .optional()
    .isString()
    .withMessage('weatherPredictionId must be a string'),
  body('forecastHours')
    .optional()
    .isInt({ min: 1, max: 168 })
    .withMessage('forecastHours must be between 1 and 168')
];

const gridQuerySchema = [
  param('regionId')
    .isInt({ min: 1 })
    .withMessage('regionId must be a positive integer'),
  query('severity')
    .optional()
    .isIn(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'])
    .withMessage('severity must be LOW, MEDIUM, HIGH, or CRITICAL'),
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
    .withMessage('limit must be between 1 and 500')
];

module.exports = {
  gridImpactSchema,
  gridQuerySchema
};