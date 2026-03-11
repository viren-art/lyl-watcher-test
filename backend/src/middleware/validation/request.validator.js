const { validationResult } = require('express-validator');
const { ApiError } = require('../../utils/errors');

/**
 * Middleware to validate request using express-validator schemas
 */
const validateRequest = (validationSchema, source = 'body') => {
  return async (req, res, next) => {
    // Run validation
    await Promise.all(validationSchema.map(validation => validation.run(req)));

    // Check for validation errors
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
      const errorDetails = errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }));

      throw new ApiError(
        'VALIDATION_ERROR',
        'Request validation failed',
        400,
        errorDetails
      );
    }

    next();
  };
};

module.exports = {
  validateRequest
};