const AuthService = require('../../../src/modules/auth/auth.service');
const UserRepository = require('../../../src/database/users/user.repository');
const SecurityAuditRepository = require('../../../src/database/users/security-audit.repository');

jest.mock('../../../src/database/users/user.repository');
jest.mock('../../../src/database/users/security-audit.repository');
jest.mock('../../../src/services/email/email.service');

describe('AuthService', () => {
  let authService;
  let mockUserRepository;
  let mockSecurityAuditRepository;

  beforeEach(() => {
    authService = new AuthService();
    mockUserRepository = new UserRepository();
    mockSecurityAuditRepository = new SecurityAuditRepository();
    
    // Reset mocks
    jest.clearAllMocks();
  });

  describe('registerCustomer', () => {
    it('should successfully register a new customer with valid data', async () => {
      const registrationData = {
        companyName: 'Test Energy Corp',
        industry: 'Utilities',
        contactEmail: 'contact@testenergy.com',
        adminName: 'John Admin',
        adminEmail: 'admin@testenergy.com',
        adminPassword: 'SecurePass123!',
        phone: '+1-555-0100'
      };

      mockUserRepository.findCustomerByEmail.mockResolvedValue(null);
      mockUserRepository.createCustomer.mockResolvedValue({
        customer_id: 1,
        company_name: 'Test Energy Corp',
        active: false
      });
      mockUserRepository.createUser.mockResolvedValue({
        user_id: 1,
        customer_id: 1,
        email: 'admin@testenergy.com',
        role: 'ADMIN'
      });

      const result = await authService.registerCustomer(
        registrationData,
        '127.0.0.1',
        'test-agent'
      );

      expect(result.status).toBe('pending_approval');
      expect(result.customerId).toBe(1);
      expect(result.apiKey).toBeDefined();
      expect(mockUserRepository.createCustomer).toHaveBeenCalled();
      expect(mockUserRepository.createUser).toHaveBeenCalled();
    });

    it('should reject registration with invalid email format', async () => {
      const registrationData = {
        companyName: 'Test Energy Corp',
        contactEmail: 'invalid-email',
        adminEmail: 'admin@testenergy.com',
        adminPassword: 'SecurePass123!'
      };

      await expect(
        authService.registerCustomer(registrationData, '127.0.0.1', 'test-agent')
      ).rejects.toThrow('Invalid email format');
    });

    it('should reject duplicate customer registration', async () => {
      const registrationData = {
        companyName: 'Test Energy Corp',
        contactEmail: 'contact@testenergy.com',
        adminEmail: 'admin@testenergy.com',
        adminPassword: 'SecurePass123!'
      };

      mockUserRepository.findCustomerByEmail.mockResolvedValue({
        customer_id: 1
      });

      await expect(
        authService.registerCustomer(registrationData, '127.0.0.1', 'test-agent')
      ).rejects.toThrow('Customer organization already registered');
    });
  });

  describe('login', () => {
    it('should return MFA challenge for user with MFA enabled', async () => {
      const mockUser = {
        user_id: 1,
        customer_id: 1,
        email: 'user@test.com',
        password_hash: '$2b$12$hashedpassword',
        mfa_enabled: true,
        last_login: new Date()
      };

      mockUserRepository.findUserByEmail.mockResolvedValue(mockUser);
      mockUserRepository.findCustomerById.mockResolvedValue({
        customer_id: 1,
        active: true
      });

      // Mock bcrypt compare
      const bcrypt = require('bcrypt');
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      const result = await authService.login(
        'user@test.com',
        'password123',
        '127.0.0.1',
        'test-agent'
      );

      expect(result.requiresMfa).toBe(true);
      expect(result.userId).toBe(1);
    });

    it('should require MFA setup for first-time login', async () => {
      const mockUser = {
        user_id: 1,
        customer_id: 1,
        email: 'user@test.com',
        password_hash: '$2b$12$hashedpassword',
        mfa_enabled: false,
        last_login: null
      };

      mockUserRepository.findUserByEmail.mockResolvedValue(mockUser);
      mockUserRepository.findCustomerById.mockResolvedValue({
        customer_id: 1,
        active: true
      });

      const bcrypt = require('bcrypt');
      bcrypt.compare = jest.fn().mockResolvedValue(true);

      const result = await authService.login(
        'user@test.com',
        'password123',
        '127.0.0.1',
        'test-agent'
      );

      expect(result.requiresMfaSetup).toBe(true);
      expect(result.userId).toBe(1);
    });

    it('should reject login with invalid credentials', async () => {
      mockUserRepository.findUserByEmail.mockResolvedValue(null);

      await expect(
        authService.login('user@test.com', 'wrongpass', '127.0.0.1', 'test-agent')
      ).rejects.toThrow('Invalid credentials');
    });

    it('should reject login for inactive customer', async () => {
      const mockUser = {
        user_id: 1,
        customer_id: 1,
        email: 'user@test.com',
        password_hash: '$2b$12$hashedpassword'
      };

      mockUserRepository.findUserByEmail.mockResolvedValue(mockUser);
      mockUserRepository.findCustomerById.mockResolvedValue({
        customer_id: 1,
        active: false
      });

      await expect(
        authService.login('user@test.com', 'password123', '127.0.0.1', 'test-agent')
      ).rejects.toThrow('Account pending approval or inactive');
    });
  });

  describe('setupMfa', () => {
    it('should generate QR code and secret for MFA setup', async () => {
      const mockUser = {
        user_id: 1,
        email: 'user@test.com',
        mfa_enabled: false
      };

      mockUserRepository.findUserById.mockResolvedValue(mockUser);
      mockUserRepository.updateMfaSecret.mockResolvedValue({ user_id: 1 });

      const result = await authService.setupMfa(1);

      expect(result.qrCodeDataUrl).toBeDefined();
      expect(result.secret).toBeDefined();
      expect(mockUserRepository.updateMfaSecret).toHaveBeenCalled();
    });

    it('should reject MFA setup if already enabled', async () => {
      const mockUser = {
        user_id: 1,
        email: 'user@test.com',
        mfa_enabled: true
      };

      mockUserRepository.findUserById.mockResolvedValue(mockUser);

      await expect(authService.setupMfa(1)).rejects.toThrow('MFA already enabled');
    });
  });

  describe('verifyMfa', () => {
    it('should enable MFA and return tokens with valid code', async () => {
      const mockUser = {
        user_id: 1,
        customer_id: 1,
        email: 'user@test.com',
        role: 'ADMIN',
        mfa_enabled: false,
        mfa_secret: JSON.stringify({
          encrypted: 'encrypted_secret',
          iv: 'iv_hex',
          authTag: 'auth_tag_hex'
        })
      };

      mockUserRepository.findUserById.mockResolvedValue(mockUser);
      mockUserRepository.enableMfa.mockResolvedValue({ user_id: 1 });
      mockUserRepository.updateLastLogin.mockResolvedValue({ user_id: 1 });
      mockUserRepository.getUserRegions.mockResolvedValue([]);
      mockUserRepository.findCustomerById.mockResolvedValue({
        customer_id: 1,
        subscription_tier: 'BASIC'
      });

      // Mock speakeasy verification
      const speakeasy = require('speakeasy');
      speakeasy.totp = {
        verify: jest.fn().mockReturnValue(true)
      };

      const result = await authService.verifyMfa(
        1,
        '123456',
        '127.0.0.1',
        'test-agent'
      );

      expect(result.success).toBe(true);
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(mockUserRepository.enableMfa).toHaveBeenCalled();
    });

    it('should reject invalid verification code', async () => {
      const mockUser = {
        user_id: 1,
        mfa_secret: JSON.stringify({
          encrypted: 'encrypted_secret',
          iv: 'iv_hex',
          authTag: 'auth_tag_hex'
        })
      };

      mockUserRepository.findUserById.mockResolvedValue(mockUser);

      const speakeasy = require('speakeasy');
      spe
akeasy.totp = {
        verify: jest.fn().mockReturnValue(false)
      };

      await expect(
        authService.verifyMfa(1, '000000', '127.0.0.1', 'test-agent')
      ).rejects.toThrow('Invalid verification code');

      expect(mockSecurityAuditRepository.logEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          eventType: 'mfa_verification_failed',
          success: false
        })
      );
    });
  });
});