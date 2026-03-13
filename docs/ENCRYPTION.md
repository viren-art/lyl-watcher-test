# Encryption Implementation Guide

## Overview
The Weather Impact System implements AES-256-GCM encryption with PBKDF2 key derivation for all sensitive weather and grid data at rest, and TLS 1.3 for data in transit.

## Encryption at Rest

### Algorithm
- **Cipher:** AES-256-GCM (Galois/Counter Mode)
- **Key Derivation:** PBKDF2 with SHA-256
- **Iterations:** 100,000
- **Salt Length:** 32 bytes (randomly generated per encryption)
- **IV Length:** 16 bytes (randomly generated per encryption)
- **Authentication Tag:** 16 bytes (GCM mode)

### Key Management
- **Master Key:** Stored in environment variable `MASTER_ENCRYPTION_KEY` (minimum 32 characters)
- **Key Derivation:** Each encryption operation derives a unique key from the master key using PBKDF2
- **Key Rotation:** 90-day rotation policy enforced via automated checks
- **Version Tracking:** Each encrypted record stores the key version used for encryption

### Encrypted Data Structure
{
  encrypted: "base64_encrypted_data",
  iv: "base64_initialization_vector",
  authTag: "base64_authentication_tag",
  salt: "base64_salt",
  keyVersion: 1,
  algorithm: "aes-256-gcm"
}

### Database Schema
Weather data is stored with encryption metadata:
sql
CREATE TABLE weather_data (
  id BIGSERIAL,
  timestamp TIMESTAMPTZ NOT NULL,
  grid_region_id INTEGER NOT NULL,
  location GEOMETRY(POINT, 4326) NOT NULL,
  source VARCHAR(50) NOT NULL,
  encrypted_data TEXT NOT NULL,
  encryption_iv TEXT NOT NULL,
  encryption_auth_tag TEXT NOT NULL,
  encryption_salt TEXT NOT NULL,
  encryption_key_version INTEGER NOT NULL,
  encryption_algorithm VARCHAR(20) NOT NULL DEFAULT 'aes-256-gcm',
  validated_at TIMESTAMPTZ,
  validator_version VARCHAR(20),
  PRIMARY KEY (timestamp, id)
);

## Encryption in Transit

### TLS 1.3 Configuration

#### PostgreSQL/TimescaleDB
const pool = new Pool({
  ssl: {
    rejectUnauthorized: true,
    ca: process.env.TIMESCALEDB_SSL_CA_CERT,
    cert: process.env.TIMESCALEDB_SSL_CLIENT_CERT,
    key: process.env.TIMESCALEDB_SSL_CLIENT_KEY,
  }
});

#### Kafka
const kafka = new Kafka({
  ssl: {
    rejectUnauthorized: true,
    ca: [process.env.KAFKA_SSL_CA_CERT],
    cert: process.env.KAFKA_SSL_CLIENT_CERT,
    key: process.env.KAFKA_SSL_CLIENT_KEY,
  }
});

#### HTTP Server
app.use(helmet({
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  }
}));

// Force HTTPS redirect in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    if (req.header('x-forwarded-proto') !== 'https') {
      return res.redirect(`https://${req.header('host')}${req.url}`);
    }
    next();
  });
}

## Key Rotation

### Automated Rotation Checks
- **Schedule:** Daily at 2 AM (configurable via cron)
- **Policy:** Rotation required every 90 days
- **Alerts:** Automated alerts sent when rotation is due

### Manual Rotation Process
1. Generate new master key (minimum 32 characters)
2. Call `triggerManualKeyRotation(newMasterKey)`
3. Previous key stored as `MASTER_ENCRYPTION_KEY_V{version}` for decryption of old data
4. New key version incremented
5. Background job scheduled to re-encrypt old data (optional)

### Rotation Example
const { triggerManualKeyRotation } = require('./jobs/key-rotation-job');

// Generate new key (in production, retrieve from HashiCorp Vault)
const newKey = crypto.randomBytes(32).toString('hex');

// Trigger rotation
await triggerManualKeyRotation(newKey);

## Security Best Practices

### Environment Variables
- Never commit encryption keys to version control
- Use HashiCorp Vault or AWS Secrets Manager in production
- Rotate keys every 90 days
- Store previous key versions for decryption of historical data

### Certificate Management
- Use valid TLS certificates from trusted CA
- Rotate certificates before expiration
- Store certificates securely (not in code repository)
- Use separate certificates for each environment

### Monitoring
- Log all encryption/decryption operations (without exposing keys)
- Monitor key rotation compliance
- Alert on decryption failures
- Track key version usage

## Compliance

### SOC 2 Type II
- AES-256 encryption meets SOC 2 requirements
- Key rotation policy documented and enforced
- Audit logs track all encryption operations

### NERC CIP
- Critical infrastructure data encrypted at rest
- TLS 1.3 for data in transit
- Key management procedures documented

### GDPR/CCPA
- Personal data encrypted with industry-standard algorithms
- Key rotation ensures data protection over time
- Decryption only by authorized services

## Testing

### Encryption Validation
bash
npm test -- encryption.test.js

### TLS Verification
bash
# Test PostgreSQL TLS
openssl s_client -connect localhost:5432 -starttls postgres

# Test Kafka TLS
openssl s_client -connect localhost:9092

# Test HTTPS
curl -v https://localhost:3000/health

## Troubleshooting

### Common Issues

**Decryption Failure**
- Verify key version matches encrypted data
- Check that previous key versions are available in environment
- Validate salt and IV are correctly stored

**TLS Connection Failure**
- Verify certificate paths are correct
- Check certificate validity dates
- Ensure CA certificate is trusted

**Key Rotation Alert**
- Review rotation schedule in cron configuration
- Verify `KEY_ROTATION_DATE` environment variable
- Check logs for rotation check execution