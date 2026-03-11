-- ============================================================================
-- CUSTOMER INTELLIGENCE & USAGE ANALYTICS SCHEMA
-- ============================================================================

-- Company size enum
CREATE TYPE company_size AS ENUM ('SMALL', 'MEDIUM', 'LARGE', 'ENTERPRISE');

-- Industry enum
CREATE TYPE industry_type AS ENUM ('UTILITY', 'ENERGY', 'MANUFACTURING', 'TECHNOLOGY', 'GOVERNMENT', 'OTHER');

-- Primary use case enum
CREATE TYPE use_case_type AS ENUM ('WEATHER_FORECASTING', 'GRID_IMPACT', 'BESS_OPTIMIZATION', 'INTEGRATED');

-- Technical maturity enum
CREATE TYPE technical_maturity AS ENUM ('NONE', 'BASIC', 'INTERMEDIATE', 'ADVANCED');

-- Market segment enum
CREATE TYPE market_segment AS ENUM ('ENTERPRISE', 'STRATEGIC', 'GROWTH', 'SMB', 'GENERAL');

-- Customer profiles table
CREATE TABLE customer_profiles (
  customer_id       INT PRIMARY KEY REFERENCES b2b_customers(customer_id) ON DELETE CASCADE,
  company_name      VARCHAR(255) NOT NULL,
  industry          industry_type NOT NULL,
  company_size      company_size NOT NULL,
  annual_revenue    NUMERIC(15,2),
  primary_use_case  use_case_type NOT NULL,
  technical_maturity technical_maturity NOT NULL DEFAULT 'BASIC',
  lead_score        INT CHECK (lead_score BETWEEN 0 AND 100),
  market_segment    market_segment NOT NULL,
  decision_makers   JSONB, -- Array of decision maker objects
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Customer region interests (beyond subscriptions)
CREATE TABLE customer_region_interests (
  customer_id       INT NOT NULL REFERENCES b2b_customers(customer_id) ON DELETE CASCADE,
  grid_region_id    INT NOT NULL REFERENCES grid_regions(grid_region_id) ON DELETE CASCADE,
  interest_level    INT CHECK (interest_level BETWEEN 1 AND 5), -- 1=low, 5=high
  first_queried_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_queried_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  query_count       INT NOT NULL DEFAULT 0,
  PRIMARY KEY (customer_id, grid_region_id)
);

-- Customer subscriptions (enhanced from base schema)
CREATE TABLE customer_subscriptions (
  subscription_id   SERIAL PRIMARY KEY,
  customer_id       INT NOT NULL REFERENCES b2b_customers(customer_id) ON DELETE CASCADE,
  subscription_tier subscription_tier NOT NULL,
  rate_limit_per_hour INT NOT NULL,
  max_regions       INT NOT NULL DEFAULT 5,
  max_users         INT NOT NULL DEFAULT 10,
  features_enabled  JSONB, -- Array of enabled features
  started_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at        TIMESTAMPTZ,
  auto_renew        BOOLEAN NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- API call logs (TimescaleDB hypertable)
CREATE TABLE api_call_logs (
  log_id            BIGSERIAL,
  customer_id       INT NOT NULL REFERENCES b2b_customers(customer_id) ON DELETE CASCADE,
  user_id           INT REFERENCES users(user_id) ON DELETE SET NULL,
  endpoint          VARCHAR(255) NOT NULL,
  method            VARCHAR(10) NOT NULL,
  status_code       INT NOT NULL,
  response_time_ms  INT NOT NULL,
  region_id         INT REFERENCES grid_regions(grid_region_id) ON DELETE SET NULL,
  timestamp         TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (timestamp, log_id)
);

-- Convert to TimescaleDB hypertable
SELECT create_hypertable('api_call_logs', 'timestamp', chunk_time_interval => INTERVAL '1 day');

-- Dashboard view logs (TimescaleDB hypertable)
CREATE TABLE dashboard_view_logs (
  log_id            BIGSERIAL,
  customer_id       INT NOT NULL REFERENCES b2b_customers(customer_id) ON DELETE CASCADE,
  user_id           INT REFERENCES users(user_id) ON DELETE SET NULL,
  dashboard_type    VARCHAR(100) NOT NULL, -- 'weather', 'grid_impact', 'bess', 'multi_region'
  region_id         INT REFERENCES grid_regions(grid_region_id) ON DELETE SET NULL,
  timestamp         TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (timestamp, log_id)
);

SELECT create_hypertable('dashboard_view_logs', 'timestamp', chunk_time_interval => INTERVAL '1 day');

-- Prediction request logs (TimescaleDB hypertable)
CREATE TABLE prediction_request_logs (
  log_id            BIGSERIAL,
  customer_id       INT NOT NULL REFERENCES b2b_customers(customer_id) ON DELETE CASCADE,
  user_id           INT REFERENCES users(user_id) ON DELETE SET NULL,
  prediction_type   VARCHAR(50) NOT NULL, -- 'weather', 'grid_impact', 'bess'
  region_id         INT NOT NULL REFERENCES grid_regions(grid_region_id) ON DELETE CASCADE,
  accuracy          NUMERIC(5,2), -- Filled in after validation
  timestamp         TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (timestamp, log_id)
);

SELECT create_hypertable('prediction_request_logs', 'timestamp', chunk_time_interval => INTERVAL '1 day');

-- BESS analysis logs (TimescaleDB hypertable)
CREATE TABLE bess_analysis_logs (
  log_id            BIGSERIAL,
  customer_id       INT NOT NULL REFERENCES b2b_customers(customer_id) ON DELETE CASCADE,
  user_id           INT REFERENCES users(user_id) ON DELETE SET NULL,
  region_id         INT NOT NULL REFERENCES grid_regions(grid_region_id) ON DELETE CASCADE,
  optimization_score NUMERIC(5,2),
  timestamp         TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (timestamp, log_id)
);

SELECT create_hypertable('bess_analysis_logs', 'timestamp', chunk_time_interval => INTERVAL '1 day');

-- Indexes for customer intelligence queries
CREATE INDEX idx_customer_profiles_lead_score ON customer_profiles(lead_score DESC);
CREATE INDEX idx_customer_profiles_segment ON customer_profiles(market_segment);
CREATE INDEX idx_customer_profiles_industry ON customer_profiles(industry);
CREATE INDEX idx_customer_region_interests_customer ON customer_region_interests(customer_id);
CREATE INDEX idx_customer_subscriptions_customer ON customer_subscriptions(customer_id);
CREATE INDEX idx_customer_subscriptions_tier ON customer_subscriptions(subscription_tier);

-- Indexes for usage analytics queries
CREATE INDEX idx_api_logs_customer_time ON api_call_logs(customer_id, timestamp DESC);
CREATE INDEX idx_api_logs_endpoint ON api_call_logs(endpoint, timestamp DESC);
CREATE INDEX idx_dashboard_logs_customer_time ON dashboard_view_logs(customer_id, timestamp DESC);
CREATE INDEX idx_prediction_logs_customer_time ON prediction_request_logs(customer_id, timestamp DESC);
CREATE INDEX idx_bess_logs_customer_time ON bess_analysis_logs(customer_id, timestamp DESC);

-- Continuous aggregates for usage analytics (TimescaleDB)
CREATE MATERIALIZED VIEW customer_daily_usage
WITH (timescaledb.continuous) AS
SELECT
  customer_id,
  time_bucket('1 day', timestamp) AS day,
  COUNT(*) AS api_calls,
  AVG(response_time_ms) AS avg_response_time,
  SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END) AS error_count
FROM api_call_logs
GROUP BY customer_id, day
WITH NO DATA;

SELECT add_continuous_aggregate_policy('customer_daily_usage',
  start_offset => INTERVAL '3 days',
  end_offset => INTERVAL '1 hour',
  schedule_interval => INTERVAL '1 hour');

-- Retention policies (2 years per NFR-007)
SELECT add_retention_policy('api_call_logs', INTERVAL '2 years');
SELECT add_retention_policy('dashboard_view_logs', INTERVAL '2 years');
SELECT add_retention_policy('prediction_request_logs', INTERVAL '2 years');
SELECT add_retention_policy('bess_analysis_logs', INTERVAL '2 years');

-- Compression policies (compress after 30 days)
SELECT add_compression_policy('api_call_logs', INTERVAL '30 days');
SELECT add_compression_policy('dashboard_view_logs', INTERVAL '30 days');
SELECT add_compression_policy('prediction_request_logs', INTERVAL '30 days');
SELECT add_compression_policy('bess_analysis_logs', INTERVAL '30 days');