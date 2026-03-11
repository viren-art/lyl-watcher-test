const { Pool } = require('pg');
const logger = require('../../utils/logger');

const pool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'weather_impact',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres'
});

/**
 * Initialize immutable audit logs table
 */
async function initializeAuditTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS audit_logs (
      audit_id BIGSERIAL PRIMARY KEY,
      timestamp TIMESTAMPTZ NOT NULL DEFAULT now(),
      event_type VARCHAR(100) NOT NULL,
      resource_type VARCHAR(100) NOT NULL,
      resource_id VARCHAR(255),
      user_id INTEGER,
      customer_id INTEGER,
      action VARCHAR(50) NOT NULL DEFAULT 'READ',
      status VARCHAR(50) NOT NULL DEFAULT 'SUCCESS',
      ip_address INET,
      user_agent TEXT,
      request_id VARCHAR(64),
      metadata JSONB,
      input_data JSONB,
      output_data JSONB,
      algorithm_version VARCHAR(50),
      model_version VARCHAR(50),
      compliance_flags TEXT[],
      data_classification VARCHAR(50),
      retention_date TIMESTAMPTZ NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    -- Create indexes for common queries
    CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON audit_logs(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_event_type ON audit_logs(event_type);
    CREATE INDEX IF NOT EXISTS idx_audit_resource ON audit_logs(resource_type, resource_id);
    CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_customer ON audit_logs(customer_id, timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_compliance ON audit_logs USING GIN(compliance_flags);
    CREATE INDEX IF NOT EXISTS idx_audit_retention ON audit_logs(retention_date);

    -- Create partition by month for performance
    CREATE TABLE IF NOT EXISTS audit_logs_2024_01 PARTITION OF audit_logs
      FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
    CREATE TABLE IF NOT EXISTS audit_logs_2024_02 PARTITION OF audit_logs
      FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
    CREATE TABLE IF NOT EXISTS audit_logs_2024_03 PARTITION OF audit_logs
      FOR VALUES FROM ('2024-03-01') TO ('2024-04-01');

    -- Prevent updates and deletes (immutable audit trail)
    CREATE OR REPLACE FUNCTION prevent_audit_modification()
    RETURNS TRIGGER AS $$
    BEGIN
      RAISE EXCEPTION 'Audit logs are immutable and cannot be modified or deleted';
    END;
    $$ LANGUAGE plpgsql;

    DROP TRIGGER IF EXISTS audit_immutable_update ON audit_logs;
    CREATE TRIGGER audit_immutable_update
      BEFORE UPDATE ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();

    DROP TRIGGER IF EXISTS audit_immutable_delete ON audit_logs;
    CREATE TRIGGER audit_immutable_delete
      BEFORE DELETE ON audit_logs
      FOR EACH ROW EXECUTE FUNCTION prevent_audit_modification();
  `;

  try {
    await pool.query(createTableQuery);
    logger.info('Audit logs table initialized with immutability constraints');
  } catch (error) {
    logger.error('Failed to initialize audit logs table', { error: error.message });
    throw error;
  }
}

/**
 * Insert audit log (only operation allowed)
 */
async function insertAuditLog(auditRecord) {
  const query = `
    INSERT INTO audit_logs (
      timestamp, event_type, resource_type, resource_id,
      user_id, customer_id, action, status,
      ip_address, user_agent, request_id,
      metadata, input_data, output_data,
      algorithm_version, model_version,
      compliance_flags, data_classification, retention_date
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    RETURNING audit_id
  `;

  const values = [
    auditRecord.timestamp,
    auditRecord.eventType,
    auditRecord.resourceType,
    auditRecord.resourceId,
    auditRecord.userId,
    auditRecord.customerId,
    auditRecord.action,
    auditRecord.status,
    auditRecord.ipAddress,
    auditRecord.userAgent,
    auditRecord.requestId,
    auditRecord.metadata,
    auditRecord.inputData,
    auditRecord.outputData,
    auditRecord.algorithmVersion,
    auditRecord.modelVersion,
    auditRecord.complianceFlags,
    auditRecord.dataClassification,
    auditRecord.retentionDate
  ];

  try {
    const result = await pool.query(query, values);
    return result.rows[0].audit_id;
  } catch (error) {
    logger.error('Failed to insert audit log', { error: error.message });
    throw error;
  }
}

/**
 * Query audit logs for compliance reporting
 */
async function queryAuditLogs(filters = {}) {
  let query = 'SELECT * FROM audit_logs WHERE 1=1';
  const values = [];
  let paramCount = 1;

  if (filters.eventType) {
    query += ` AND event_type = $${paramCount}`;
    values.push(filters.eventType);
    paramCount++;
  }

  if (filters.resourceType) {
    query += ` AND resource_type = $${paramCount}`;
    values.push(filters.resourceType);
    paramCount++;
  }

  if (filters.resourceId) {
    query += ` AND resource_id = $${paramCount}`;
    values.push(filters.resourceId);
    paramCount++;
  }

  if (filters.userId) {
    query += ` AND user_id = $${paramCount}`;
    values.push(filters.userId);
    paramCount++;
  }

  if (filters.customerId) {
    query += ` AND customer_id = $${paramCount}`;
    values.push(filters.customerId);
    paramCount++;
  }

  if (filters.startDate) {
    query += ` AND timestamp >= $${paramCount}`;
    values.push(filters.startDate);
    paramCount++;
  }

  if (filters.endDate) {
    query += ` AND timestamp <= $${paramCount}`;
    values.push(filters.endDate);
    paramCount++;
  }

  if (filters.complianceFlag) {
    query += ` AND $${paramCount} = ANY(compliance_flags)`;
    values.push(filters.complianceFlag);
    paramCount++;
  }

  query += ' ORDER BY timestamp DESC';

  if (filters.limit) {
    query += ` LIMIT $${paramCount}`;
    values.push(filters.limit);
    paramCount++;
  }

  if (filters.offset) {
    query += ` OFFSET $${paramCount}`;
    values.push(filters.offset);
  }

  try {
    const result = await pool.query(query, values);
    return result.rows;
  } catch (error) {
    logger.error('Failed to query audit logs', { error: error.message });
    throw error;
  }
}

/**
 * Get audit statistics for compliance dashboard
 */
async function getAuditStatistics(customerId, startDate, endDate) {
  const query = `
    SELECT 
      COUNT(*) as total_events,
      COUNT(DISTINCT user_id) as unique_users,
      COUNT(CASE WHEN status = 'SUCCESS' THEN 1 END) as successful_events,
      COUNT(CASE WHEN status = 'FAILURE' THEN 1 END) as failed_events,
      COUNT(CASE WHEN status = 'UNAUTHORIZED' THEN 1 END) as unauthorized_attempts,
      COUNT(CASE WHEN event_type = 'REPORT_GENERATION' THEN 1 END) as reports_generated,
      COUNT(CASE WHEN event_type = 'BESS_OPTIMIZATION' THEN 1 END) as optimizations_run,
      COUNT(CASE WHEN 'NERC_CIP' = ANY(compliance_flags) THEN 1 END) as nerc_cip_events,
      COUNT(CASE WHEN 'GDPR' = ANY(compliance_flags) THEN 1 END) as gdpr_events
    FROM audit_logs
    WHERE customer_id = $1
      AND timestamp >= $2
      AND timestamp <= $3
  `;

  try {
    const result = await pool.query(query, [customerId, startDate, endDate]);
    return result.rows[0];
  } catch (error) {
    logger.error('Failed to get audit statistics', { error: error.message });
    throw error;
  }
}

/**
 * Archive old audit logs (called by scheduled job)
 */
async function archiveOldLogs() {
  const archiveQuery = `
    WITH archived AS (
      DELETE FROM audit_logs
      WHERE retention_date < now()
      RETURNING *
    )
    INSERT INTO audit_logs_archive
    SELECT * FROM archived
  `;

  try {
    const result = await pool.query(archiveQuery);
    logger.info('Archived old audit logs', { count: result.rowCount });
    return result.rowCount;
  } catch (error) {
    logger.error('Failed to archive old logs', { error: error.message });
    throw error;
  }
}

module.exports = {
  initializeAuditTable,
  insertAuditLog,
  queryAuditLogs,
  getAuditStatistics,
  archiveOldLogs
};