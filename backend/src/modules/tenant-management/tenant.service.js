const TenantModel = require('./tenant.model');
const crypto = require('crypto');
const logger = require('../../utils/logger');

class TenantService {
  constructor() {
    this.tenantCache = new Map();
    this.cacheExpiry = 5 * 60 * 1000; // 5 minutes
  }
  
  async createTenant(tenantData) {
    // Generate API key
    const apiKey = this.generateApiKey();
    const apiKeyHash = this.hashApiKey(apiKey);
    
    // Determine rate limit based on subscription tier
    const rateLimits = {
      BASIC: 100,
      PROFESSIONAL: 500,
      ENTERPRISE: 1000
    };
    
    const rateLimitPerHour = rateLimits[tenantData.subscriptionTier] || 100;
    
    const tenant = await TenantModel.createTenant({
      ...tenantData,
      apiKeyHash,
      rateLimitPerHour
    });
    
    // Assign default regions if provided
    if (tenantData.regionIds && tenantData.regionIds.length > 0) {
      await TenantModel.assignRegionsToTenant(tenant.customer_id, tenantData.regionIds);
    }
    
    logger.info('Tenant service created tenant', {
      customerId: tenant.customer_id,
      tier: tenant.subscription_tier
    });
    
    return {
      tenant,
      apiKey // Return plain API key only once
    };
  }
  
  async getTenantByApiKey(apiKey) {
    const apiKeyHash = this.hashApiKey(apiKey);
    
    // Check cache first
    const cacheKey = `tenant:${apiKeyHash}`;
    const cached = this.tenantCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
      return cached.data;
    }
    
    const tenant = await TenantModel.getTenantByApiKey(apiKeyHash);
    
    if (tenant) {
      // Cache tenant data
      this.tenantCache.set(cacheKey, {
        data: tenant,
        timestamp: Date.now()
      });
    }
    
    return tenant;
  }
  
  async getTenantById(customerId) {
    return await TenantModel.getTenantById(customerId);
  }
  
  async updateSubscription(customerId, subscriptionData) {
    // Validate subscription tier
    const validTiers = ['BASIC', 'PROFESSIONAL', 'ENTERPRISE'];
    if (!validTiers.includes(subscriptionData.subscriptionTier)) {
      throw new Error('Invalid subscription tier');
    }
    
    // Update rate limit based on tier
    const rateLimits = {
      BASIC: 100,
      PROFESSIONAL: 500,
      ENTERPRISE: 1000
    };
    
    subscriptionData.rateLimitPerHour = rateLimits[subscriptionData.subscriptionTier];
    
    const updatedTenant = await TenantModel.updateTenantSubscription(customerId, subscriptionData);
    
    // Clear cache
    this.clearTenantCache(customerId);
    
    logger.info('Subscription updated', {
      customerId,
      newTier: subscriptionData.subscriptionTier
    });
    
    return updatedTenant;
  }
  
  async assignRegions(customerId, regionIds) {
    // Validate region IDs exist
    if (!Array.isArray(regionIds) || regionIds.length === 0) {
      throw new Error('Invalid region IDs');
    }
    
    const result = await TenantModel.assignRegionsToTenant(customerId, regionIds);
    
    // Clear cache
    this.clearTenantCache(customerId);
    
    return result;
  }
  
  async getTenantRegions(customerId) {
    return await TenantModel.getTenantRegions(customerId);
  }
  
  async getAllTenants(filters = {}) {
    return await TenantModel.getAllTenants(filters);
  }
  
  async deactivateTenant(customerId) {
    const result = await TenantModel.deactivateTenant(customerId);
    
    // Clear cache
    this.clearTenantCache(customerId);
    
    return result;
  }
  
  async getTenantUsageStats(customerId, startDate, endDate) {
    return await TenantModel.getTenantUsageStats(customerId, startDate, endDate);
  }
  
  async validateTenantAccess(customerId, gridRegionId) {
    const regions = await this.getTenantRegions(customerId);
    const hasAccess = regions.some(r => r.grid_region_id === gridRegionId);
    
    if (!hasAccess) {
      logger.warn('Tenant access denied to region', {
        customerId,
        gridRegionId
      });
    }
    
    return hasAccess;
  }
  
  generateApiKey() {
    return crypto.randomBytes(32).toString('hex');
  }
  
  hashApiKey(apiKey) {
    return crypto.createHash('sha256').update(apiKey).digest('hex');
  }
  
  clearTenantCache(customerId) {
    // Clear all cache entries for this tenant
    for (const [key, value] of this.tenantCache.entries()) {
      if (value.data && value.data.customer_id === customerId) {
        this.tenantCache.delete(key);
      }
    }
  }
}

module.exports = TenantService;