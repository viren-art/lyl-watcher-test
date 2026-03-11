const express = require('express');
const TenantService = require('./tenant.service');
const { authenticateToken, requireRole } = require('../auth/auth.middleware');
const logger = require('../../utils/logger');

const router = express.Router();
const tenantService = new TenantService();

// POST /api/v1/tenants - Create new tenant (admin only)
router.post('/', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const { companyName, industry, subscriptionTier, regionIds } = req.body;
    
    if (!companyName) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Company name is required'
        }
      });
    }
    
    const result = await tenantService.createTenant({
      companyName,
      industry,
      subscriptionTier: subscriptionTier || 'BASIC',
      regionIds: regionIds || []
    });
    
    logger.info('Tenant created via API', {
      userId: req.user.userId,
      customerId: result.tenant.customer_id
    });
    
    res.status(201).json({
      tenant: result.tenant,
      apiKey: result.apiKey // Only returned once
    });
  } catch (error) {
    logger.error('Failed to create tenant', { error: error.message });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to create tenant'
      }
    });
  }
});

// GET /api/v1/tenants - Get all tenants (admin only)
router.get('/', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const filters = {
      active: req.query.active === 'true' ? true : req.query.active === 'false' ? false : undefined,
      subscriptionTier: req.query.tier,
      limit: parseInt(req.query.limit) || 100
    };
    
    const tenants = await tenantService.getAllTenants(filters);
    
    res.json({
      tenants,
      count: tenants.length
    });
  } catch (error) {
    logger.error('Failed to fetch tenants', { error: error.message });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch tenants'
      }
    });
  }
});

// GET /api/v1/tenants/:customerId - Get tenant by ID
router.get('/:customerId', authenticateToken, async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId);
    
    // Users can only view their own tenant unless admin
    if (req.user.customerId !== customerId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied'
        }
      });
    }
    
    const tenant = await tenantService.getTenantById(customerId);
    
    if (!tenant) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: 'Tenant not found'
        }
      });
    }
    
    res.json({ tenant });
  } catch (error) {
    logger.error('Failed to fetch tenant', { error: error.message });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch tenant'
      }
    });
  }
});

// PUT /api/v1/tenants/:customerId/subscription - Update subscription
router.put('/:customerId/subscription', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId);
    const { subscriptionTier } = req.body;
    
    if (!subscriptionTier) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Subscription tier is required'
        }
      });
    }
    
    const updatedTenant = await tenantService.updateSubscription(customerId, {
      subscriptionTier
    });
    
    logger.info('Subscription updated via API', {
      userId: req.user.userId,
      customerId,
      newTier: subscriptionTier
    });
    
    res.json({ tenant: updatedTenant });
  } catch (error) {
    logger.error('Failed to update subscription', { error: error.message });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

// POST /api/v1/tenants/:customerId/regions - Assign regions
router.post('/:customerId/regions', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId);
    const { regionIds } = req.body;
    
    if (!Array.isArray(regionIds) || regionIds.length === 0) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Region IDs array is required'
        }
      });
    }
    
    const result = await tenantService.assignRegions(customerId, regionIds);
    
    logger.info('Regions assigned via API', {
      userId: req.user.userId,
      customerId,
      regionCount: regionIds.length
    });
    
    res.json(result);
  } catch (error) {
    logger.error('Failed to assign regions', { error: error.message });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: error.message
      }
    });
  }
});

// GET /api/v1/tenants/:customerId/regions - Get tenant regions
router.get('/:customerId/regions', authenticateToken, async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId);
    
    // Users can only view their own regions unless admin
    if (req.user.customerId !== customerId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied'
        }
      });
    }
    
    const regions = await tenantService.getTenantRegions(customerId);
    
    res.json({
      regions,
      count: regions.length
    });
  } catch (error) {
    logger.error('Failed to fetch tenant regions', { error: error.message });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch regions'
      }
    });
  }
});

// GET /api/v1/tenants/:customerId/usage - Get usage statistics
router.get('/:customerId/usage', authenticateToken, async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId);
    
    // Users can only view their own usage unless admin
    if (req.user.customerId !== customerId && req.user.role !== 'ADMIN') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied'
        }
      });
    }
    
    const startDate = req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = req.query.endDate || new Date().toISOString();
    
    const stats = await tenantService.getTenantUsageStats(customerId, startDate, endDate);
    
    res.json({
      customerId,
      period: { startDate, endDate },
      usage: stats
    });
  } catch (error) {
    logger.error('Failed to fetch usage stats', { error: error.message });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to fetch usage statistics'
      }
    });
  }
});

// DELETE /api/v1/tenants/:customerId - Deactivate tenant
router.delete('/:customerId', authenticateToken, requireRole('ADMIN'), async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId);
    
    const result = await tenantService.deactivateTenant(customerId);
    
    logger.warn('Tenant deactivated via API', {
      userId: req.user.userId,
      customerId
    });
    
    res.json(result);
  } catch (error) {
    logger.error('Failed to deactivate tenant', { error: error.message });
    res.status(500).json({
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Failed to deactivate tenant'
      }
    });
  }
});

module.exports = router;