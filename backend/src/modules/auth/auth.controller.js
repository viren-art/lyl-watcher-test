const AuthService = require('./auth.service');

class AuthController {
  constructor() {
    this.authService = new AuthService();
  }

  /**
   * POST /api/v1/auth/register
   */
  async register(req, res) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      const result = await this.authService.registerCustomer(
        req.body,
        ipAddress,
        userAgent
      );

      res.status(201).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'REGISTRATION_FAILED',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }
  }

  /**
   * POST /api/v1/auth/login
   */
  async login(req, res) {
    try {
      const { email, password } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Email and password required',
            timestamp: new Date().toISOString(),
            requestId: req.id
          }
        });
      }

      const result = await this.authService.login(
        email,
        password,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }
  }

  /**
   * POST /api/v1/auth/mfa/setup
   */
  async setupMfa(req, res) {
    try {
      const { userId } = req.body;

      if (!userId) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'User ID required',
            timestamp: new Date().toISOString(),
            requestId: req.id
          }
        });
      }

      const result = await this.authService.setupMfa(userId);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MFA_SETUP_FAILED',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }
  }

  /**
   * POST /api/v1/auth/mfa/verify
   */
  async verifyMfa(req, res) {
    try {
      const { userId, code } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      if (!userId || !code) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'User ID and verification code required',
            timestamp: new Date().toISOString(),
            requestId: req.id
          }
        });
      }

      const result = await this.authService.verifyMfa(
        userId,
        code,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'MFA_VERIFICATION_FAILED',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }
  }

  /**
   * POST /api/v1/auth/mfa/verify-login
   */
  async verifyMfaLogin(req, res) {
    try {
      const { userId, code } = req.body;
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      if (!userId || !code) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'User ID and verification code required',
            timestamp: new Date().toISOString(),
            requestId: req.id
          }
        });
      }

      const result = await this.authService.verifyMfaLogin(
        userId,
        code,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }
  }

  /**
   * POST /api/v1/auth/refresh
   */
  async refreshToken(req, res) {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Refresh token required',
            timestamp: new Date().toISOString(),
            requestId: req.id
          }
        });
      }

      const result = await this.authService.refreshToken(refreshToken);

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(401).json({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }
  }

  /**
   * POST /api/v1/auth/logout
   */
  async logout(req, res) {
    try {
      const ipAddress = req.ip || req.connection.remoteAddress;
      const userAgent = req.get('user-agent');

      const result = await this.authService.logout(
        req.user.userId,
        ipAddress,
        userAgent
      );

      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: {
          code: 'LOGOUT_FAILED',
          message: error.message,
          timestamp: new Date().toISOString(),
          requestId: req.id
        }
      });
    }
  }
}

module.exports = AuthController;