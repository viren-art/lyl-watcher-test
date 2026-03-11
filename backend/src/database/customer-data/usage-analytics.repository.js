const { Pool } = require('pg');

class UsageAnalyticsRepository {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
  }

  async logApiCall(data) {
    const {
      customerId,
      userId,
      endpoint,
      method,
      statusCode,
      responseTimeMs,
      regionId,
      timestamp
    } = data;

    const query = `
      INSERT INTO api_call_logs (
        customer_id, user_id, endpoint, method, status_code, 
        response_time_ms, region_id, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    const values = [
      customerId,
      userId,
      endpoint,
      method,
      statusCode,
      responseTimeMs,
      regionId,
      timestamp
    ];

    await this.pool.query(query, values);
  }

  async logDashboardView(data) {
    const {
      customerId,
      userId,
      dashboardType,
      regionId,
      timestamp
    } = data;

    const query = `
      INSERT INTO dashboard_view_logs (
        customer_id, user_id, dashboard_type, region_id, timestamp
      )
      VALUES ($1, $2, $3, $4, $5)
    `;

    const values = [customerId, userId, dashboardType, regionId, timestamp];
    await this.pool.query(query, values);
  }

  async logPredictionRequest(data) {
    const {
      customerId,
      userId,
      predictionType,
      regionId,
      accuracy,
      timestamp
    } = data;

    const query = `
      INSERT INTO prediction_request_logs (
        customer_id, user_id, prediction_type, region_id, accuracy, timestamp
      )
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    const values = [customerId, userId, predictionType, regionId, accuracy, timestamp];
    await this.pool.query(query, values);
  }

  async logBessAnalysis(data) {
    const {
      customerId,
      userId,
      regionId,
      optimizationScore,
      timestamp
    } = data;

    const query = `
      INSERT INTO bess_analysis_logs (
        customer_id, user_id, region_id, optimization_score, timestamp
      )
      VALUES ($1, $2, $3, $4, $5)
    `;

    const values = [customerId, userId, regionId, optimizationScore, timestamp];
    await this.pool.query(query, values);
  }

  async getCustomerUsageStats(customerId, startDate = null, endDate = null) {
    const now = new Date();
    const defaultStartDate = new Date(now.getFullYear(), now.getMonth(), 1); // Start of current month
    const defaultEndDate = now;

    const start = startDate || defaultStartDate;
    const end
 = endDate || defaultEndDate;

    const query = `
      SELECT
        -- API calls
        (SELECT COUNT(*) FROM api_call_logs 
         WHERE customer_id = $1 AND timestamp BETWEEN $2 AND $3) as api_calls_total,
        (SELECT COUNT(*) FROM api_call_logs 
         WHERE customer_id = $1 AND timestamp >= date_trunc('month', CURRENT_DATE)) as api_calls_this_month,
        (SELECT AVG(response_time_ms) FROM api_call_logs 
         WHERE customer_id = $1 AND timestamp BETWEEN $2 AND $3) as avg_response_time_ms,
        
        -- Dashboard views
        (SELECT COUNT(*) FROM dashboard_view_logs 
         WHERE customer_id = $1 AND timestamp BETWEEN $2 AND $3) as dashboard_views_total,
        (SELECT COUNT(*) FROM dashboard_view_logs 
         WHERE customer_id = $1 AND timestamp >= date_trunc('month', CURRENT_DATE)) as dashboard_views_this_month,
        
        -- Prediction requests
        (SELECT COUNT(*) FROM prediction_request_logs 
         WHERE customer_id = $1 AND timestamp BETWEEN $2 AND $3) as prediction_requests_total,
        (SELECT COUNT(*) FROM prediction_request_logs 
         WHERE customer_id = $1 AND timestamp >= date_trunc('month', CURRENT_DATE)) as prediction_requests_this_month,
        (SELECT AVG(accuracy) FROM prediction_request_logs 
         WHERE customer_id = $1 AND timestamp BETWEEN $2 AND $3 AND accuracy IS NOT NULL) as average_prediction_accuracy,
        
        -- BESS analyses
        (SELECT COUNT(*) FROM bess_analysis_logs 
         WHERE customer_id = $1 AND timestamp BETWEEN $2 AND $3) as bess_analysis_runs,
        
        -- Grid impact analyses
        (SELECT COUNT(*) FROM prediction_request_logs 
         WHERE customer_id = $1 AND prediction_type = 'grid_impact' AND timestamp BETWEEN $2 AND $3) as grid_impact_analysis_runs,
        
        -- Unique regions queried
        (SELECT COUNT(DISTINCT region_id) FROM api_call_logs 
         WHERE customer_id = $1 AND region_id IS NOT NULL AND timestamp BETWEEN $2 AND $3) as unique_regions_queried
    `;

    const result = await this.pool.query(query, [customerId, start, end]);
    return result.rows[0];
  }

  async getAllCustomersUsage(filters) {
    const {
      startDate,
      endDate,
      subscriptionTier,
      minApiCalls,
      limit,
      offset
    } = filters;

    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate || now;

    const conditions = ['acl.timestamp BETWEEN $1 AND $2'];
    const values = [start, end];
    let paramCount = 3;

    if (subscriptionTier) {
      conditions.push(`cs.subscription_tier = $${paramCount}`);
      values.push(subscriptionTier);
      paramCount++;
    }

    values.push(limit, offset);

    const query = `
      SELECT
        cp.customer_id,
        cp.company_name,
        cs.subscription_tier,
        COUNT(DISTINCT acl.log_id) as api_calls,
        AVG(acl.response_time_ms) as avg_response_time,
        (SELECT COUNT(*) FROM prediction_request_logs 
         WHERE customer_id = cp.customer_id AND timestamp BETWEEN $1 AND $2) as prediction_requests,
        (SELECT COUNT(*) FROM dashboard_view_logs 
         WHERE customer_id = cp.customer_id AND timestamp BETWEEN $1 AND $2) as dashboard_views
      FROM customer_profiles cp
      LEFT JOIN customer_subscriptions cs ON cp.customer_id = cs.customer_id
      LEFT JOIN api_call_logs acl ON cp.customer_id = acl.customer_id AND ${conditions.join(' AND ')}
      GROUP BY cp.customer_id, cp.company_name, cs.subscription_tier
      ${minApiCalls ? `HAVING COUNT(DISTINCT acl.log_id) >= ${minApiCalls}` : ''}
      ORDER BY api_calls DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async getFeatureAdoption(customerId = null) {
    const customerFilter = customerId ? 'WHERE customer_id = $1' : '';
    const values = customerId ? [customerId] : [];

    const query = `
      SELECT
        (SELECT COUNT(*) FROM prediction_request_logs 
         WHERE prediction_type = 'weather' ${customerId ? 'AND customer_id = $1' : ''}) as weather_requests,
        (SELECT COUNT(DISTINCT customer_id) FROM prediction_request_logs 
         WHERE prediction_type = 'weather') as weather_customers,
        (SELECT AVG(accuracy) FROM prediction_request_logs 
         WHERE prediction_type = 'weather' AND accuracy IS NOT NULL ${customerId ? 'AND customer_id = $1' : ''}) as weather_accuracy,
        
        (SELECT COUNT(*) FROM prediction_request_logs 
         WHERE prediction_type = 'grid_impact' ${customerId ? 'AND customer_id = $1' : ''}) as grid_analyses,
        (SELECT COUNT(DISTINCT customer_id) FROM prediction_request_logs 
         WHERE prediction_type = 'grid_impact') as grid_customers,
        (SELECT AVG(accuracy) FROM prediction_request_logs 
         WHERE prediction_type = 'grid_impact' AND accuracy IS NOT NULL ${customerId ? 'AND customer_id = $1' : ''}) as grid_accuracy,
        
        (SELECT COUNT(*) FROM bess_analysis_logs ${customerFilter}) as bess_analyses,
        (SELECT COUNT(DISTINCT customer_id) FROM bess_analysis_logs) as bess_customers,
        (SELECT AVG(optimization_score) FROM bess_analysis_logs ${customerFilter}) as bess_score,
        
        (SELECT COUNT(*) FROM dashboard_view_logs ${customerFilter}) as dashboard_views,
        (SELECT COUNT(DISTINCT customer_id) FROM dashboard_view_logs) as dashboard_customers
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getUsageTrends(customerId, startDate, endDate) {
    const query = `
      SELECT
        date_trunc('day', timestamp) as date,
        COUNT(DISTINCT CASE WHEN log_type = 'api' THEN log_id END) as api_calls,
        COUNT(DISTINCT CASE WHEN log_type = 'prediction' THEN log_id END) as prediction_requests,
        COUNT(DISTINCT CASE WHEN log_type = 'dashboard' THEN log_id END) as dashboard_views,
        COUNT(DISTINCT CASE WHEN log_type = 'bess' THEN log_id END) as bess_analyses
      FROM (
        SELECT log_id, timestamp, 'api' as log_type FROM api_call_logs WHERE customer_id = $1
        UNION ALL
        SELECT log_id, timestamp, 'prediction' as log_type FROM prediction_request_logs WHERE customer_id = $1
        UNION ALL
        SELECT log_id, timestamp, 'dashboard' as log_type FROM dashboard_view_logs WHERE customer_id = $1
        UNION ALL
        SELECT log_id, timestamp, 'bess' as log_type FROM bess_analysis_logs WHERE customer_id = $1
      ) combined
      WHERE timestamp BETWEEN $2 AND $3
      GROUP BY date_trunc('day', timestamp)
      ORDER BY date
    `;

    const result = await this.pool.query(query, [customerId, startDate, endDate]);
    return result.rows;
  }

  async getRegionalUsage(customerId) {
    const query = `
      SELECT
        gr.grid_region_id as region_id,
        gr.region_name,
        COUNT(DISTINCT acl.log_id) as api_calls,
        COUNT(DISTINCT prl.log_id) as prediction_requests,
        COUNT(DISTINCT dvl.log_id) as dashboard_views,
        AVG(prl.accuracy) as average_accuracy
      FROM grid_regions gr
      LEFT JOIN api_call_logs acl ON gr.grid_region_id = acl.region_id AND acl.customer_id = $1
      LEFT JOIN prediction_request_logs prl ON gr.grid_region_id = prl.region_id AND prl.customer_id = $1
      LEFT JOIN dashboard_view_logs dvl ON gr.grid_region_id = dvl.region_id AND dvl.customer_id = $1
      WHERE EXISTS (
        SELECT 1 FROM customer_regions WHERE customer_id = $1 AND grid_region_id = gr.grid_region_id
      )
      GROUP BY gr.grid_region_id, gr.region_name
      ORDER BY api_calls DESC
    `;

    const result = await this.pool.query(query, [customerId]);
    return result.rows;
  }

  async getEndpointUsage(customerId, startDate = null, endDate = null) {
    const now = new Date();
    const start = startDate || new Date(now.getFullYear(), now.getMonth(), 1);
    const end = endDate || now;

    const query = `
      SELECT
        endpoint,
        method,
        COUNT(*) as call_count,
        AVG(response_time_ms) as avg_response_time,
        (SUM(CASE WHEN status_code >= 400 THEN 1 ELSE 0 END)::float / COUNT(*)) * 100 as error_rate
      FROM api_call_logs
      WHERE customer_id = $1 AND timestamp BETWEEN $2 AND $3
      GROUP BY endpoint, method
      ORDER BY call_count DESC
    `;

    const result = await this.pool.query(query, [customerId, start, end]);
    return result.rows;
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = UsageAnalyticsRepository;