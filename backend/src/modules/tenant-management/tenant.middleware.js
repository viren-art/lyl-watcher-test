const TenantService = require('./tenant.service');
const logger = require('../../utils/logger');

const tenantService = new TenantService();

const validateTenantAccess = async (req, res, next) => {
  try {
    const customerId = req.user.customerId;
    const gridRegionId = parseInt(req.params.regionId || req.body.gridRegionId);
    
    if (!gridRegionId) {
      return next();
    }
    
    const hasAccess = await tenantService.validateTenantAccess(customerId, gridRegionId);
    
    if (!hasAccess) {
      logger.warn('Tenant access denied', {
        customerId,
        gridRegionId,
        userId: req.user.userId
      });
      
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to this region'
        }
      });
    }
    
    next();
  } catch (error) {
    logger.error('Tenant access validation failed', { error: error.message });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to validate access'
      }
    });
  }
};

const enrichRequestWithTenant = async (req, res, next) => {
  try {
    if (req.user && req.user.customerId) {
      const tenant = await tenantService.getTenantById(req.user.customerId);
      req.tenant = tenant;
    }
    next();
  } catch (error) {
    logger.error('Failed to enrich request with tenant', { error: error.message });
    next();
  }
};

module.exports = {
  validateTenantAccess,
  enrichRequestWithTenant
};