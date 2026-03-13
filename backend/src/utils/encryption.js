const crypto = require('crypto');
const logger = require('./logger');

// Encryption configuration
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const KEY_DERIVATION_ITERATIONS = 100000;
const KEY_LENGTH = 32; // 256 bits
const SALT_LENGTH = 32;
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

// Master key from environment (should be rotated via Vault)
const MASTER_KEY = process.env.MASTER_ENCRYPTION_KEY;
if (!MASTER_KEY || MASTER_KEY.length < 32) {
  throw new Error('MASTER_ENCRYPTION_KEY must be at least 32 characters');
}

// Key rotation tracking
let currentKeyVersion = parseInt(process.env.ENCRYPTION_KEY_VERSION || '1', 10);
const keyRotationDate = new Date(process.env.KEY_ROTATION_DATE || Date.now());

/**
 * Derives encryption key from master key using PBKDF2
 * @param {string} masterKey - Master key from environment
 * @param {Buffer} salt - Salt for key derivation
 * @returns {Buffer} Derived encryption key
 */
function deriveKey(masterKey, salt) {
  return crypto.pbkdf2Sync(
    masterKey,
    salt,
    KEY_DERIVATION_ITERATIONS,
    KEY_LENGTH,
    'sha256'
  );
}

/**
 * Encrypts data using AES-256-GCM with key derivation
 * @param {Object|string} data - Data to encrypt
 * @returns {Object} Encrypted data with metadata
 */
function encryptData(data) {
  try {
    // Generate random salt and IV
    const salt = crypto.randomBytes(SALT_LENGTH);
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Derive encryption key from master key
    const derivedKey = deriveKey(MASTER_KEY, salt);
    
    // Create cipher
    const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, derivedKey, iv);
    
    // Encrypt data
    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
    const encrypted = Buffer.concat([
      cipher.update(plaintext, 'utf8'),
      cipher.final(),
    ]);
    
    // Get authentication tag
    const authTag = cipher.getAuthTag();
    
    // Return encrypted data with metadata
    return {
      encrypted: encrypted.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
      salt: salt.toString('base64'),
      keyVersion: currentKeyVersion,
      algorithm: ENCRYPTION_ALGORITHM,
    };
  } catch (error) {
    logger.error('Encryption failed', { error: error.message });
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypts data using AES-256-GCM with key derivation
 * @param {Object} encryptedData - Encrypted data object
 * @returns {Object|string} Decrypted data
 */
function decryptData(encryptedData) {
  try {
    // Extract components
    const encrypted = Buffer.from(encryptedData.encrypted, 'base64');
    const iv = Buffer.from(encryptedData.iv, 'base64');
    const authTag = Buffer.from(encryptedData.authTag, 'base64');
    const salt = Buffer.from(encryptedData.salt, 'base64');
    
    // Handle key rotation - use appropriate master key version
    const masterKey = getMasterKeyForVersion(encryptedData.keyVersion);
    
    // Derive decryption key
    const derivedKey = deriveKey(masterKey, salt);
    
    // Create decipher
    const decipher = crypto.createDecipheriv(ENCRYPTION_ALGORITHM, derivedKey, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt data
    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);
    
    const plaintext = decrypted.toString('utf8');
    
    // Try to parse as JSON, return string if fails
    try {
      return JSON.parse(plaintext);
    } catch {
      return plaintext;
    }
  } catch (error) {
    logger.error('Decryption failed', { 
      error: error.message,
      keyVersion: encryptedData.keyVersion 
    });
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Gets master key for specific version (supports key rotation)
 * @param {number} version - Key version
 * @returns {string} Master key
 */
function getMasterKeyForVersion(version) {
  // In production, retrieve from HashiCorp Vault based on version
  // For now, use current master key (version 1)
  if (version === currentKeyVersion) {
    return MASTER_KEY;
  }
  
  // Check for rotated keys in environment
  const rotatedKey = process.env[`MASTER_ENCRYPTION_KEY_V${version}`];
  if (rotatedKey) {
    return rotatedKey;
  }
  
  logger.warn('Requested key version not found, using current', { 
    requestedVersion: version,
    currentVersion: currentKeyVersion 
  });
  return MASTER_KEY;
}

/**
 * Rotates encryption key version
 * @param {string} newMasterKey - New master key
 */
function rotateEncryptionKey(newMasterKey) {
  if (!newMasterKey || newMasterKey.length < 32) {
    throw new Error('New master key must be at least 32 characters');
  }
  
  const previousVersion = currentKeyVersion;
  currentKeyVersion += 1;
  
  // Store previous key for decryption of old data
  process.env[`MASTER_ENCRYPTION_KEY_V${previousVersion}`] = MASTER_KEY;
  process.env.MASTER_ENCRYPTION_KEY = newMasterKey;
  process.env.ENCRYPTION_KEY_VERSION = currentKeyVersion.toString();
  process.env.KEY_ROTATION_DATE = new Date().toISOString();
  
  logger.info('Encryption key rotated', {
    previousVersion,
    newVersion: currentKeyVersion,
    rotationDate: new Date().toISOString(),
  });
}

/**
 * Checks if key rotation is due (90-day policy)
 * @returns {boolean} True if rotation is needed
 */
function isKeyRotationDue() {
  const daysSinceRotation = (Date.now() - keyRotationDate.getTime()) / (1000 * 60 * 60 * 24);
  return daysSinceRotation >= 90;
}

/**
 * Re-encrypts data with current key version
 * @param {Object} encryptedData - Data encrypted with old key
 * @returns {Object} Data encrypted with current key
 */
function reencryptData(encryptedData) {
  if (encryptedData.keyVersion === currentKeyVersion) {
    return encryptedData; // Already using current key
  }
  
  // Decrypt with old key, encrypt with new key
  const decrypted = decryptData(encryptedData);
  return encryptData(decrypted);
}

module.exports = {
  encryptData,
  decryptData,
  rotateEncryptionKey,
  isKeyRotationDue,
  reencryptData,
  getCurrentKeyVersion: () => currentKeyVersion,
  getKeyRotationDate: () => keyRotationDate,
};