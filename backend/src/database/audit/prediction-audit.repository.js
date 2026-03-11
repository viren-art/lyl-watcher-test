const { Pool } = require('pg');

class PredictionAuditRepository {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
  }

  async logPrediction({ userId, customerId, requestType, requestParams, responseSummary }) {
    const query = `
      INSERT INTO prediction_audit_log (user_id, customer_id, request_type, request_params, response_summary)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING audit_id
    `;

    const values = [
      userId,
      customerId,
      requestType,
      JSON.stringify(requestParams),
      JSON.stringify(responseSummary)
    ];

    try {
      const result = await this.pool.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('Audit log error:', error);
      // Don't throw - logging failures shouldn't break application
    }
  }
}

module.exports = PredictionAuditRepository;