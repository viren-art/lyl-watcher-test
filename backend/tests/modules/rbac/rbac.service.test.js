const RbacService = require('../../../src/modules/rbac/rbac.service');
const UserRepository = require('../../../src/database/users/user.repository');

jest.mock('../../../src/database/users/user.repository');

describe('RbacService', () => {
  let rbacService;
  let mockUserRepository;

  beforeEach(() => {
    rbacService = new RbacService();
    mockUserRepository = new UserRepository();
    jest.clearAllMocks();
  });

  describe('hasPermission', () => {
    it('should return true for ADMIN with weather:write permission', async () => {
      mockUserRepository.findUserById.mockResolvedValue({
        user_id: 1,
        role: 'ADMIN'
      });

      const result = await rbacService.hasPermission(1, 'weather:write');
      expect(result).toBe(true);
    });

    it('should return false for VIEWER with grid:write permission', async () => {
      mockUserRepository.findUserById.mockResolvedValue({
        user_id: 2,
        role: 'VIEWER'
      });

      const result = await rbacService.hasPermission(2, 'grid:write');
      expect(result).toBe(false);
    });

    it('should return true for GRID_ANALYST with grid:read permission', async () => {
      mockUserRepository.findUserById.mockResolvedValue({
        user_id: 3,
        role: 'GRID_ANALYST'
      });

      const result = await rbacService.hasPermission(3, 'grid:read');
      expect(result).toBe(true);
    });

    it('should return false for non-existent user', async () => {
      mockUserRepository.findUserById.mockResolvedValue(null);

      const result = await rbacService.hasPermission(999, 'weather:read');
      expect(result).toBe(false);
    });
  });

  describe('hasRegionAccess', () => {
    it('should return true for subscribed region', async () => {
      mockUserRepository.getUserRegions.mockResolvedValue([
        { grid_region_id: 1, region_name: 'Northeast' },
        { grid_region_id: 2, region_name: 'Midwest' }
      ]);

      const result = await rbacService.hasRegionAccess(1, 1);
      expect(result).toBe(true);
    });

    it('should return false for non-subscribed region', async () => {
      mockUserRepository.getUserRegions.mockResolvedValue([
        { grid_region_id: 1, region_name: 'Northeast' }
      ]);

      const result = await rbacService.hasRegionAccess(1, 5);
      expect(result).toBe(false);
    });
  });

  describe('validateAccess', () => {
    it('should allow access with valid permission and region', async () => {
      mockUserRepository.findUserById.mockResolvedValue({
        user_id: 1,
        role: 'GRID_ANALYST'
      });
      mockUserRepository.getUserRegions.mockResolvedValue([
        { grid_region_id: 1, region_name: 'Northeast' }
      ]);

      const result = await rbacService.validateAccess(1, 1, 'grid:read', 'grid:read', 1);
      expect(result.allowed).toBe(true);
    });

    it('should deny access with insufficient permissions', async () => {
      mockUserRepository.findUserById.mockResolvedValue({
        user_id: 2,
        role: 'VIEWER'
      });

      const result = await rbacService.validateAccess(2, 1, 'grid:write', 'grid:write', null);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('insufficient_permissions');
    });

    it('should deny access to non-subscribed region', async () => {
      mockUserRepository.findUserById.mockResolvedValue({
        user_id: 1,
        role: 'ADMIN'
      });
      mockUserRepository.getUserRegions.mockResolvedValue([
        { grid_region_id: 1, region_name: 'Northeast' }
      ]);

      const result = await rbacService.validateAccess(1, 1, 'grid:read', 'grid:read', 5);
      expect(result.allowed).toBe(false);
      expect(result.reason).toBe('region_not_subscribed');
    });
  });
});