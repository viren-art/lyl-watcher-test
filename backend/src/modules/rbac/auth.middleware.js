const jwt = require('jsonwebtoken');
const RbacService = require('./rbac.service');

const rbacService = new RbacService();

/**
 * Middleware to authenticate JWT token
 */
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Access token required',
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Invalid or expired token',
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }

    req.user = decoded;
    next();
  });
};

/**
 * Middleware to check if user has required permission
 */
const requirePermission = (permission) => {
  return async (req, res, next) => {
    try {
      const hasPermission = await rbacService.hasPermission(
        req.user.userId,
        permission
      );

      if (!hasPermission) {
        const ipAddress = req.ip || req.connection.remoteAddress;
        const userAgent = req.get('user-agent');

        await rbacService.logAccessDenied(
          req.user.userId,
          req.originalUrl,
          permission,
          ipAddress,
          userAgent
        );

        return res.status(403).json({
          success: false,
          error: {
            code: 'FORBIDDEN',
            message: 'Access denied: insufficient permissions',
            timestamp: new Date().toISOString(),
            requestId: req.id
          }
        });
      }

      next();
    } catch (error) {
      res.status(500).json({
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Permission check failed',
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }
  };
};

/**
 * Middleware to check if user has required role
 */
const requireRole = (roles) => {
  const roleArray = Array.isArray(roles) ? roles : [roles];
  
  return (req, res, next) => {
    if (!roleArray.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied: insufficient role',
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }
    next();
  };
};

/**
 * Middleware to validate region access
 */
const requireRegionAccess = async (req, res, next) => {
  try {
    const regionId = parseInt(req.params.regionId || req.query.regionId || req.body.regionId);

    if (!regionId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Region ID required',
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }

    const hasAccess = await rbacService.hasRegionAccess(
      req.user.customerId,
      regionId
    );

    if (!hasAccess) {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      await rbacService.logAccessDenied(
        req.user.userId,
        `region:${regionId}`,
        'region_access',
        ipAddress,
        userAgent
      );

      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied: region not subscribed',
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }

    next();
  } catch (error) {
    res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Region access check failed',
        timestamp: new Date().toISOString(),
        requestId: req.id
      }
    });
  }
};

module.exports = {
  authenticateToken,
  requirePermission,
  requireRole,
  requireRegionAccess
};