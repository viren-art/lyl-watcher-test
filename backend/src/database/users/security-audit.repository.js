const { Pool } = require('pg');

class SecurityAuditRepository {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 2000,
    });
  }

  async logEvent(eventData) {
    const {
      userId,
      eventType,
      resourceAccessed,
      ipAddress,
      userAgent,
      success,
      metadata = null
    } = eventData;

    const query = `
      INSERT INTO security_audit_log (
        user_id,
        event_type,
        resource_accessed,
        ip_address,
        user_agent,
        success,
        metadata,
        timestamp
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, now())
      RETURNING audit_id, timestamp
    `;

    const values = [
      userId,
      eventType,
      resourceAccessed,
      ipAddress,
      userAgent,
      success,
      metadata ? JSON.stringify(metadata) : null
    ];

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Failed to log security event:', error);
      // Don't throw - logging failures shouldn't break application flow
      return null;
    }
  }

  async getAuditLogs(filters = {}) {
    const {
      userId,
      eventType,
      startDate,
      endDate,
      success,
      limit = 100,
      offset = 0
    } = filters;

    let query = `
      SELECT 
        sal.*,
        u.email,
        u.full_name
      FROM security_audit_log sal
      LEFT JOIN users u ON sal.user_id = u.user_id
      WHERE 1=1
    `;

    const values = [];
    let paramCount = 1;

    if (userId) {
      query += ` AND sal.user_id = $${paramCount}`;
      values.push(userId);
      paramCount++;
    }

    if (eventType) {
      query += ` AND sal.event_type = $${paramCount}`;
      values.push(eventType);
      paramCount++;
    }

    if (startDate) {
      query += ` AND sal.timestamp >= $${paramCount}`;
      values.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND sal.timestamp <= $${paramCount}`;
      values.push(endDate);
      paramCount++;
    }

    if (success !== undefined) {
      query += ` AND sal.success = $${paramCount}`;
      values.push(success);
      paramCount++;
    }

    query += ` ORDER BY sal.timestamp DESC LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    values.push(limit, offset);

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async getFailedLoginAttempts(userId, hours = 24) {
    const query = `
      SELECT COUNT(*) as attempt_count
      FROM security_audit_log
      WHERE user_id = $1
        AND event_type = 'login_failed'
        AND success = false
        AND timestamp > now() - interval '${hours} hours'
    `;

    const result = await this.pool.query(query, [userId]);
    return parseInt(result.rows[0].attempt_count);
  }

  async cleanupOldLogs(retentionDays = 730) {
    // Delete logs older than retention period (default 2 years per NFR-007)
    const query = `
      DELETE FROM security_audit_log
      WHERE timestamp < now() - interval '${retentionDays} days'
      RETURNING COUNT(*) as deleted_count
    `;

    const result = await this.pool.query(query);
    return result.rows[0];
  }
}

module.exports = SecurityAuditRepository;