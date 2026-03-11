const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const UserRepository = require('../../database/users/user.repository');
const SecurityAuditRepository = require('../../database/users/security-audit.repository');
const EmailService = require('../../services/email/email.service');

class AuthService {
  constructor() {
    this.userRepository = new UserRepository();
    this.securityAuditRepository = new SecurityAuditRepository();
    this.emailService = new EmailService();
    this.jwtSecret = process.env.JWT_SECRET;
    this.jwtRefreshSecret = process.env.JWT_REFRESH_SECRET;
    this.accessTokenExpiry = '1h';
    this.refreshTokenExpiry = '30d';
  }

  /**
   * Register new B2B customer organization with admin user
   * Triggers admin approval workflow
   */
  async registerCustomer(registrationData, ipAddress, userAgent) {
    const {
      companyName,
      industry,
      contactEmail,
      adminName,
      adminEmail,
      adminPassword,
      phone
    } = registrationData;

    try {
      // Validate email format
      if (!this._isValidEmail(adminEmail) || !this._isValidEmail(contactEmail)) {
        throw new Error('Invalid email format');
      }

      // Check if customer already exists
      const existingCustomer = await this.userRepository.findCustomerByEmail(contactEmail);
      if (existingCustomer) {
        throw new Error('Customer organization already registered');
      }

      // Hash admin password
      const passwordHash = await bcrypt.hash(adminPassword, 12);

      // Generate API key for customer
      const apiKey = this._generateApiKey();
      const apiKeyHash = await bcrypt.hash(apiKey, 10);

      // Create customer organization (pending approval)
      const customer = await this.userRepository.createCustomer({
        companyName,
        industry,
        subscriptionTier: 'BASIC',
        apiKeyHash,
        rateLimitPerHour: 100,
        active: false // Requires admin approval
      });

      // Create admin user
      const adminUser = await this.userRepository.createUser({
        customerId: customer.customer_id,
        email: adminEmail,
        passwordHash,
        fullName: adminName,
        role: 'ADMIN',
        mfaEnabled: false // Will be enabled on first login
      });

      // Log registration event
      await this.securityAuditRepository.logEvent({
        userId: adminUser.user_id,
        eventType: 'customer_registration',
        resourceAccessed: `customer:${customer.customer_id}`,
        ipAddress,
        userAgent,
        success: true
      });

      // Send approval notification to platform admins
      await this.emailService.sendCustomerApprovalRequest({
        companyName,
        contactEmail,
        adminName,
        adminEmail,
        customerId: customer.customer_id
      });

      // Send pending approval notification to customer
      await this.emailService.sendRegistrationPending({
        to: adminEmail,
        companyName,
        adminName
      });

      return {
        customerId: customer.customer_id,
        status: 'pending_approval',
        message: 'Registration submitted. Awaiting admin approval.',
        apiKey // Return once for customer to store securely
      };
    } catch (error) {
      // Log failed registration
      await this.securityAuditRepository.logEvent({
        userId: null,
        eventType: 'customer_registration_failed',
        resourceAccessed: contactEmail,
        ipAddress,
        userAgent,
        success: false
      });
      throw error;
    }
  }

  /**
   * Authenticate user with email and password
   * Returns tokens if MFA not required, or MFA challenge if enabled
   */
  async login(email, password, ipAddress, userAgent) {
    try {
      // Find user by email
      const user = await this.userRepository.findUserByEmail(email);
      if (!user) {
        await this._logFailedLogin(null, email, ipAddress, userAgent, 'user_not_found');
        throw new Error('Invalid credentials');
      }

      // Check if customer is active
      const customer = await this.userRepository.findCustomerById(user.customer_id);
      if (!customer || !customer.active) {
        await this._logFailedLogin(user.user_id, email, ipAddress, userAgent, 'customer_inactive');
        throw new Error('Account pending approval or inactive');
      }

      // Verify password
      const passwordValid = await bcrypt.compare(password, user.password_hash);
      if (!passwordValid) {
        await this._logFailedLogin(user.user_id, email, ipAddress, userAgent, 'invalid_password');
        throw new Error('Invalid credentials');
      }

      // Check if MFA is enabled
      if (user.mfa_enabled) {
        // Return MFA challenge
        await this.securityAuditRepository.logEvent({
          userId: user.user_id,
          eventType: 'login_mfa_required',
          resourceAccessed: 'auth',
          ipAddress,
          userAgent,
          success: true
        });

        return {
          requiresMfa: true,
          userId: user.user_id,
          message: 'MFA verification required'
        };
      }

      // First-time login - require MFA setup
      if (!user.mfa_enabled && !user.last_login) {
        await this.securityAuditRepository.logEvent({
          userId: user.user_id,
          eventType: 'login_mfa_setup_required',
          resourceAccessed: 'auth',
          ipAddress,
          userAgent,
          success: true
        });

        return {
          requiresMfaSetup: true,
          userId: user.user_id,
          message: 'MFA setup required for first login'
        };
      }

      // Generate tokens
      const tokens = await this._generateTokens(user);

      // Update last login
      await this.userRepository.updateLastLogin(user.user_id);

      // Log successful login
      await this.securityAuditRepository.logEvent({
        userId: user.user_id,
        eventType: 'login',
        resourceAccessed: 'auth',
        ipAddress,
        userAgent,
        success: true
      });

      return {
        ...tokens,
        user: this._sanitizeUser(user)
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Setup MFA for user - generates secret and QR code
   */
  async setupMfa(userId) {
    try {
      const user = await this.userRepository.findUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (user.mfa_enabled) {
        throw new Error('MFA already enabled');
      }

      // Generate TOTP secret
      const secret = speakeasy.generateSecret({
        name: `Grid AI Platform (${user.email})`,
        issuer: 'Grid AI Platform'
      });

      // Encrypt and store secret (temporarily until verified)
      const encryptedSecret = this._encryptMfaSecret(secret.base32);
      await this.userRepository.updateMfaSecret(userId, encryptedSecret);

      // Generate QR code
      const qrCodeDataUrl = await QRCode.toDataURL(secret.otpauth_url);

      return {
        qrCodeDataUrl,
        secret: secret.base32,
        message: 'Scan QR code with authenticator app'
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify MFA code and enable MFA for user
   */
  async verifyMfa(userId, code, ipAddress, userAgent) {
    try {
      const user = await this.userRepository.findUserById(userId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.mfa_secret) {
        throw new Error('MFA not set up');
      }

      // Decrypt secret
      const secret = this._decryptMfaSecret(user.mfa_secret);

      // Verify TOTP code
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: 2 // Allow 2 time steps before/after for clock drift
      });

      if (!verified) {
        await this.securityAuditRepository.logEvent({
          userId: user.user_id,
          eventType: 'mfa_verification_failed',
          resourceAccessed: 'auth',
          ipAddress,
          userAgent,
          success: false
        });
        throw new Error('Invalid verification code');
      }

      // Enable MFA
      await this.userRepository.enableMfa(userId);

      // Log successful MFA setup
      await this.securityAuditRepository.logEvent({
        userId: user.user_id,
        eventType: 'mfa_setup',
        resourceAccessed: 'auth',
        ipAddress,
        userAgent,
        success: true
      });

      // Generate tokens for first login
      const tokens = await this._generateTokens(user);

      // Update last login
      await this.userRepository.updateLastLogin(user.user_id);

      return {
        success: true,
        message: 'MFA enabled successfully',
        ...tokens,
        user: this._sanitizeUser(user)
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Verify MFA code during login
   */
  async verifyMfaLogin(userId, code, ipAddress, userAgent) {
    try {
      const user = await this.userRepository.findUserById(userId);
      if (!user || !user.mfa_enabled) {
        throw new Error('Invalid MFA verification request');
      }

      // Decrypt secret
      const secret = this._decryptMfaSecret(user.mfa_secret);

      // Verify TOTP code
      const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token: code,
        window: 2
      });

      if (!verified) {
        await this.securityAuditRepository.logEvent({
          userId: user.user_id,
          eventType: 'login_mfa_failed',
          resourceAccessed: 'auth',
          ipAddress,
          userAgent,
          success: false
        });
        throw new Error('Invalid verification code');
      }

      // Generate tokens
      const tokens = await this._generateTokens(user);

      // Update last login
      await this.userRepository.updateLastLogin(user.user_id);

      // Log successful login
      await this.securityAuditRepository.logEvent({
        userId: user.user_id,
        eventType: 'login',
        resourceAccessed: 'auth',
        ipAddress,
        userAgent,
        success: true
      });

      return {
        ...tokens,
        user: this._sanitizeUser(user)
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(refreshToken) {
    try {
      // Verify refresh token
      const decoded = jwt.verify(refreshToken, this.jwtRefreshSecret);

      // Check if user still exists and is active
      const user = await this.userRepository.findUserById(decoded.userId);
      if (!user) {
        throw new Error('User not found');
      }

      const customer = await this.userRepository.findCustomerById(user.customer_id);
      if (!customer || !customer.active) {
        throw new Error('Customer inactive');
      }

      // Generate new tokens
      const tokens = await this._generateTokens(user);

      return tokens;
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new Error('Refresh token expired');
      }
      throw error;
    }
  }

  /**
   * Logout user (client-side token invalidation)
   */
  async logout(userId, ipAddress, userAgent) {
    await this.securityAuditRepository.logEvent({
      userId,
      eventType: 'logout',
      resourceAccessed: 'auth',
      ipAddress,
      userAgent,
      success: true
    });

    return { success: true, message: 'Logged out successfully' };
  }

  // Private helper methods

  async _generateTokens(user) {
    // Get user's regions for token claims
    const regions = await this.userRepository.getUserRegions(user.customer_id);
    const customer = await this.userRepository.findCustomerById(user.customer_id);

    const payload = {
      userId: user.user_id,
      customerId: user.customer_id,
      email: user.email,
      role: user.role,
      subscriptionTier: customer.subscription_tier,
      regions: regions.map(r => r.grid_region_id)
    };

    const accessToken = jwt.sign(payload, this.jwtSecret, {
      expiresIn: this.accessTokenExpiry
    });

    const refreshToken = jwt.sign(
      { userId: user.user_id },
      this.jwtRefreshSecret,
      { expiresIn: this.refreshTokenExpiry }
    );

    return { accessToken, refreshToken };
  }

  _sanitizeUser(user) {
    return {
      userId: user.user_id,
      email: user.email,
      fullName: user.full_name,
      role: user.role,
      mfaEnabled: user.mfa_enabled
    };
  }

  async _logFailedLogin(userId, email, ipAddress, userAgent, reason) {
    await this.securityAuditRepository.logEvent({
      userId,
      eventType: 'login_failed',
      resourceAccessed: email,
      ipAddress,
      userAgent,
      success: false,
      metadata: { reason }
    });
  }

  _isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  _generateApiKey() {
    return `gai_${uuidv4().replace(/-/g, '')}`;
  }

  _encryptMfaSecret(secret) {
    // In production, use proper encryption (AES-256-GCM)
    // For now, using base64 encoding as placeholder
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.MFA_ENCRYPTION_KEY, 'hex');
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(secret, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const authTag = cipher.getAuthTag();
    
    return JSON.stringify({
      encrypted,
      iv: iv.toString('hex'),
      authTag: authTag.toString('hex')
    });
  }

  _decryptMfaSecret(encryptedData) {
    const crypto = require('crypto');
    const algorithm = 'aes-256-gcm';
    const key = Buffer.from(process.env.MFA_ENCRYPTION_KEY, 'hex');
    
    const data = JSON.parse(encryptedData);
    const decipher = crypto.createDecipheriv(
      algorithm,
      key,
      Buffer.from(data.iv, 'hex')
    );
    
    decipher.setAuthTag(Buffer.from(data.authTag, 'hex'));
    
    let decrypted = decipher.update(data.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  }
}

module.exports = AuthService;