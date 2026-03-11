const TenantService = require('../../../src/modules/tenant-management/tenant.service');
const TenantModel = require('../../../src/modules/tenant-management/tenant.model');

jest.mock('../../../src/modules/tenant-management/tenant.model');
jest.mock('../../../src/utils/logger');

describe('TenantService', () => {
  let tenantService;
  
  beforeEach(() => {
    tenantService = new TenantService();
    jest.clearAllMocks();
  });
  
  describe('createTenant', () => {
    it('should create tenant with generated API key', async () => {
      const mockTenant = {
        customer_id: 1,
        company_name: 'Test Corp',
        subscription_tier: 'BASIC'
      };
      
      TenantModel.createTenant.mockResolvedValue(mockTenant);
      TenantModel.assignRegionsToTenant.mockResolvedValue({});
      
      const result = await tenantService.createTenant({
        companyName: 'Test Corp',
        subscriptionTier: 'BASIC',
        regionIds: [1, 2]
      });
      
      expect(result.tenant).toEqual(mockTenant);
      expect(result.apiKey).toBeDefined();
      expect(result.apiKey.length).toBe(64);
      expect(TenantModel.createTenant).toHaveBeenCalledWith(
        expect.objectContaining({
          companyName: 'Test Corp',
          subscriptionTier: 'BASIC',
          rateLimitPerHour: 100
        })
      );
    });
    
    it('should set correct rate limits for ENTERPRISE tier', async () => {
      const mockTenant = {
        customer_id: 2,
        company_name: 'Enterprise Corp',
        subscription_tier: 'ENTERPRISE'
      };
      
      TenantModel.createTenant.mockResolvedValue(mockTenant);
      
      await tenantService.createTenant({
        companyName: 'Enterprise Corp',
        subscriptionTier: 'ENTERPRISE'
      });
      
      expect(TenantModel.createTenant).toHaveBeenCalledWith(
        expect.objectContaining({
          rateLimitPerHour: 1000
        })
      );
    });
  });
  
  describe('validateTenantAccess', () => {
    it('should return true when tenant has access to region', async () => {
      TenantModel.getTenantRegions.mockResolvedValue([
        { grid_region_id: 1 },
        { grid_region_id: 2 }
      ]);
      
      const hasAccess = await tenantService.validateTenantAccess(1, 1);
      
      expect(hasAccess).toBe(true);
    });
    
    it('should return false when tenant does not have access to region', async () => {
      TenantModel.getTenantRegions.mockResolvedValue([
        { grid_region_id: 1 },
        { grid_region_id: 2 }
      ]);
      
      const hasAccess = await tenantService.validateTenantAccess(1, 3);
      
      expect(hasAccess).toBe(false);
    });
  });
  
  describe('updateSubscription', () => {
    it('should update subscription tier and rate limit', async () => {
      const mockUpdated = {
        customer_id: 1,
        subscription_tier: 'PROFESSIONAL',
        rate_limit_per_hour: 500
      };
      
      TenantModel.updateTenantSubscription.mockResolvedValue(mockUpdated);
      
      const result = await tenantService.updateSubscription(1, {
        subscriptionTier: 'PROFESSIONAL'
      });
      
      expect(result).toEqual(mockUpdated);
      expect(TenantModel.updateTenantSubscription).toHaveBeenCalledWith(1, {
        subscriptionTier: 'PROFESSIONAL',
        rateLimitPerHour: 500
      });
    });
    
    it('should throw error for invalid subscription tier', async () => {
      await expect(
        tenantService.updateSubscription(1, {
          subscriptionTier: 'INVALID'
        })
      ).rejects.toThrow('Invalid subscription tier');
    });
  });
});