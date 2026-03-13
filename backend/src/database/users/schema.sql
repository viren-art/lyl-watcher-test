-- ============================================================================
-- B2B CUSTOMERS & AUTHENTICATION SCHEMA
-- ============================================================================

-- Subscription tier enum
CREATE TYPE subscription_tier AS ENUM ('BASIC', 'PROFESSIONAL', 'ENTERPRISE');

-- User role enum
CREATE TYPE user_role AS ENUM ('ADMIN', 'GRID_ANALYST', 'BESS_PLANNER', 'VIEWER');

-- B2B customer organizations table
CREATE TABLE b2b_customers (
  customer_id       SERIAL PRIMARY KEY,
  company_name      VARCHAR(255) NOT NULL,
  industry          VARCHAR(100),
  subscription_tier subscription_tier NOT NULL DEFAULT 'BASIC',
  api_key_hash      VARCHAR(128) UNIQUE NOT NULL,
  rate_limit_per_hour INT NOT NULL DEFAULT 100,
  active            BOOLEAN NOT NULL DEFAULT false, -- Requires admin approval
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Users table
CREATE TABLE users (
  user_id           SERIAL PRIMARY KEY,
  customer_id       INT NOT NULL REFERENCES b2b_customers(customer_id) ON DELETE CASCADE,
  email             VARCHAR(255) UNIQUE NOT NULL,
  password_hash     VARCHAR(128) NOT NULL,
  full_name         VARCHAR(255) NOT NULL,
  role              user_role NOT NULL DEFAULT 'VIEWER',
  mfa_enabled       BOOLEAN NOT NULL DEFAULT false,
  mfa_secret        TEXT, -- Encrypted TOTP secret
  last_login        TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- MFA backup codes table
CREATE TABLE mfa_backup_codes (
  backup_code_id    SERIAL PRIMARY KEY,
  user_id           INT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  code_hash         VARCHAR(128) NOT NULL,
  used_at           TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Grid regions table (simplified for auth context)
CREATE TABLE grid_regions (
  grid_region_id    SERIAL PRIMARY KEY,
  region_name       VARCHAR(100) UNIQUE NOT NULL,
  boundary_polygon  GEOMETRY(POLYGON, 4326),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customer region subscriptions
CREATE TABLE customer_regions (
  customer_id       INT NOT NULL REFERENCES b2b_customers(customer_id) ON DELETE CASCADE,
  grid_region_id    INT NOT NULL REFERENCES grid_regions(grid_region_id) ON DELETE CASCADE,
  subscribed_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (customer_id, grid_region_id)
);

-- Security audit log
CREATE TABLE security_audit_log (
  audit_id          BIGSERIAL PRIMARY KEY,
  user_id           INT REFERENCES users(user_id) ON DELETE SET NULL,
  event_type        VARCHAR(100) NOT NULL,
  resource_accessed VARCHAR(255),
  ip_address        INET,
  user_agent        TEXT,
  success           BOOLEAN NOT NULL,
  metadata          JSONB,
  timestamp         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_users_customer ON users(customer_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_mfa_backup_codes_user ON mfa_backup_codes(user_id);
CREATE INDEX idx_mfa_backup_codes_unused ON mfa_backup_codes(user_id, used_at) WHERE used_at IS NULL;
CREATE INDEX idx_customer_regions_customer ON customer_regions(customer_id);
CREATE INDEX idx_customer_regions_region ON customer_regions(grid_region_id);
CREATE INDEX idx_security_audit_user_time ON security_audit_log(user_id, timestamp DESC);
CREATE INDEX idx_security_audit_event_time ON security_audit_log(event_type, timestamp DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_b2b_customers_updated_at
  BEFORE UPDATE ON b2b_customers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Insert sample grid regions for testing
INSERT INTO grid_regions (region_name) VALUES
  ('Northeast'),
  ('Midwest'),
  ('Western'),
  ('Southern'),
  ('Pacific');

-- Retention policy for security audit logs (2 years per NFR-007)
CREATE INDEX idx_security_audit_timestamp ON security_audit_log(timestamp);
-- Note: Implement automated cleanup job to delete records older than 2 years

-- Retention policy for used backup codes (delete after 90 days)
CREATE INDEX idx_mfa_backup_codes_used_at ON mfa_backup_codes(used_at) WHERE used_at IS NOT NULL;
-- Note: Implement automated cleanup job to delete used codes older than 90 days