const UserRepository = require('../../database/users/user.repository');
const SecurityAuditRepository = require('../../database/users/security-audit.repository');

class RbacService {
  constructor() {
    this.userRepository = new UserRepository();
    this.securityAuditRepository = new SecurityAuditRepository();
    
    // Permission definitions
    this.permissions = {
      ADMIN: [
        'weather:read',
        'weather:write',
        'grid:read',
        'grid:write',
        'bess:read',
        'bess:write',
        'users:read',
        'users:write',
        'regions:read',
        'regions:write',
        'reports:read',
        'reports:write'
      ],
      GRID_ANALYST: [
        'weather:read',
        'grid:read',
        'grid:write',
        'bess:read',
        'reports:read'
      ],
      BESS_PLANNER: [
        'weather:read',
        'grid:read',
        'bess:read',
        'bess:write',
        'reports:read',
        'reports:write'
      ],
      VIEWER: [
        'weather:read',
        'grid:read',
        'bess:read',
        'reports:read'
      ]
    };
  }

  /**
   * Check if user has required permission
   */
  async hasPermission(userId, permission) {
    try {
      const user = await this.userRepository.findUserById(userId);
      if (!user) {
        return false;
      }

      const rolePermissions = this.permissions[user.role] || [];
      return rolePermissions.includes(permission);
    } catch (error) {
      console.error('Permission check error:', error);
      return false;
    }
  }

  /**
   * Check if user has access to specific region
   */
  async hasRegionAccess(customerId, regionId) {
    try {
      const regions = await this.userRepository.getUserRegions(customerId);
      return regions.some(r => r.grid_region_id === regionId);
    } catch (error) {
      console.error('Region access check error:', error);
      return false;
    }
  }

  /**
   * Get all permissions for a role
   */
  getRolePermissions(role) {
    return this.permissions[role] || [];
  }

  /**
   * Get user's accessible regions
   */
  async getUserRegions(customerId) {
    try {
      return await this.userRepository.getUserRegions(customerId);
    } catch (error) {
      console.error('Get user regions error:', error);
      return [];
    }
  }

  /**
   * Log access denied event
   */
  async logAccessDenied(userId, resource, permission, ipAddress, userAgent) {
    await this.securityAuditRepository.logEvent({
      userId,
      eventType: 'access_denied',
      resourceAccessed: resource,
      ipAddress,
      userAgent,
      success: false,
      metadata: { permission }
    });
  }

  /**
   * Validate user can access resource with permission
   */
  async validateAccess(userId, customerId, resource, permission, regionId = null) {
    // Check permission
    const hasPermission = await this.hasPermission(userId, permission);
    if (!hasPermission) {
      return {
        allowed: false,
        reason: 'insufficient_permissions'
      };
    }

    // Check region access if regionId provided
    if (regionId !== null) {
      const hasRegion = await this.hasRegionAccess(customerId, regionId);
      if (!hasRegion) {
        return {
          allowed: false,
          reason: 'region_not_subscribed'
        };
      }
    }

    return { allowed: true };
  }
}

module.exports = RbacService;