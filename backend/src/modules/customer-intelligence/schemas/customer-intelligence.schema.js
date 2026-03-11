const { body, query, param } = require('express-validator');

const customerProfileSchema = [
  body('customerId').isInt().withMessage('Customer ID must be an integer'),
  body('companyName').notEmpty().withMessage('Company name is required'),
  body('industry').isIn(['UTILITY', 'ENERGY', 'MANUFACTURING', 'TECHNOLOGY', 'GOVERNMENT', 'OTHER']).withMessage('Invalid industry'),
  body('companySize').isIn(['SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE']).withMessage('Invalid company size'),
  body('annualRevenue').isFloat({ min: 0 }).withMessage('Annual revenue must be a positive number'),
  body('gridRegions').isArray({ min: 1 }).withMessage('At least one grid region is required'),
  body('primaryUseCase').isIn(['WEATHER_FORECASTING', 'GRID_IMPACT', 'BESS_OPTIMIZATION', 'INTEGRATED']).withMessage('Invalid primary use case'),
  body('technicalMaturity').isIn(['NONE', 'BASIC', 'INTERMEDIATE', 'ADVANCED']).withMessage('Invalid technical maturity'),
  body('decisionMakers').isArray().withMessage('Decision makers must be an array')
];

const customerUpdateSchema = [
  body('companySize').optional().isIn(['SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE']).withMessage('Invalid company size'),
  body('annualRevenue').optional().isFloat({ min: 0 }).withMessage('Annual revenue must be a positive number'),
  body('industry').optional().isIn(['UTILITY', 'ENERGY', 'MANUFACTURING', 'TECHNOLOGY', 'GOVERNMENT', 'OTHER']).withMessage('Invalid industry'),
  body('primaryUseCase').optional().isIn(['WEATHER_FORECASTING', 'GRID_IMPACT', 'BESS_OPTIMIZATION', 'INTEGRATED']).withMessage('Invalid primary use case'),
  body('technicalMaturity').optional().isIn(['NONE', 'BASIC', 'INTERMEDIATE', 'ADVANCED']).withMessage('Invalid technical maturity')
];

module.exports = {
  customerProfileSchema,
  customerUpdateSchema
};