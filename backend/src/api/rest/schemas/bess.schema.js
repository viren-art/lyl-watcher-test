const { body, query, param } = require('express-validator');

const bessOptimizationSchema = [
  body('gridRegionId')
    .isInt({ min: 1 })
    .withMessage('gridRegionId must be a positive integer'),
  body('capacityMwh')
    .isFloat({ min: 0.1 })
    .withMessage('capacityMwh must be a positive number'),
  body('budgetUsd')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('budgetUsd must be a positive number'),
  body('deploymentTimelineMonths')
    .optional()
    .isInt({ min: 1 })
    .withMessage('deploymentTimelineMonths must be a positive integer'),
  body('constraints')
    .optional()
    .isObject()
    .withMessage('constraints must be an object')
];

const bessQuerySchema = [
  param('regionId')
    .isInt({ min: 1 })
    .withMessage('regionId must be a positive integer'),
  query('status')
    .optional()
    .isIn(['PROPOSED', 'APPROVED', 'UNDER_CONSTRUCTION', 'DEPLOYED', 'DECOMMISSIONED'])
    .withMessage('Invalid status'),
  query('minOptimizationScore')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('minOptimizationScore must be between 0 and 100'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 500 })
    .withMessage('limit must be between 1 and 500')
];

const bessRoiSchema = [
  body('locationId')
    .isInt({ min: 1 })
    .withMessage('locationId must be a positive integer'),
  body('analysisYears')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('analysisYears must be between 1 and 50')
];

module.exports = {
  bessOptimizationSchema,
  bessQuerySchema,
  bessRoiSchema
};