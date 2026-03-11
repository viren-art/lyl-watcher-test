const { Pool } = require('pg');
const logger = require('../../utils/logger');

const pool = new Pool({
  host: process.env.TIMESCALEDB_HOST,
  port: process.env.TIMESCALEDB_PORT || 5432,
  database: process.env.TIMESCALEDB_DATABASE,
  user: process.env.TIMESCALEDB_USER,
  password: process.env.TIMESCALEDB_PASSWORD,
  ssl: process.env.TIMESCALEDB_SSL === 'true',
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

class TenantModel {
  static async createTenant(tenantData) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Create tenant record
      const tenantResult = await client.query(
        `INSERT INTO b2b_customers (
          company_name, industry, subscription_tier, api_key_hash, 
          rate_limit_per_hour, active
        ) VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING customer_id, company_name, subscription_tier, created_at`,
        [
          tenantData.companyName,
          tenantData.industry,
          tenantData.subscriptionTier || 'BASIC',
          tenantData.apiKeyHash,
          tenantData.rateLimitPerHour || 100,
          true
        ]
      );
      
      const tenant = tenantResult.rows[0];
      
      // Create tenant schema for data isolation
      await client.query(`CREATE SCHEMA IF NOT EXISTS tenant_${tenant.customer_id}`);
      
      // Grant permissions
      await client.query(`GRANT USAGE ON SCHEMA tenant_${tenant.customer_id} TO ${process.env.TIMESCALEDB_USER}`);
      
      // Create tenant-specific tables
      await client.query(`
        CREATE TABLE IF NOT EXISTS tenant_${tenant.customer_id}.weather_cache (
          cache_key VARCHAR(255) PRIMARY KEY,
          data JSONB NOT NULL,
          expires_at TIMESTAMPTZ NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      
      await client.query(`
        CREATE TABLE IF NOT EXISTS tenant_${tenant.customer_id}.prediction_history (
          prediction_id BIGSERIAL PRIMARY KEY,
          grid_region_id INT NOT NULL,
          prediction_data JSONB NOT NULL,
          accuracy_score NUMERIC(5,2),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        )
      `);
      
      // Create index for faster queries
      await client.query(`
        CREATE INDEX IF NOT EXISTS idx_weather_cache_expires 
        ON tenant_${tenant.customer_id}.weather_cache(expires_at)
      `);
      
      await client.query('COMMIT');
      
      logger.info('Tenant created successfully', {
        customerId: tenant.customer_id,
        companyName: tenant.company_name
      });
      
      return tenant;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to create tenant', { error: error.message });
      throw error;
    } finally {
      client.release();
    }
  }
  
  static async getTenantById(customerId) {
    const result = await pool.query(
      `SELECT customer_id, company_name, industry, subscription_tier, 
              rate_limit_per_hour, active, created_at, updated_at
       FROM b2b_customers
       WHERE customer_id = $1`,
      [customerId]
    );
    
    return result.rows[0];
  }
  
  static async getTenantByApiKey(apiKeyHash) {
    const result = await pool.query(
      `SELECT customer_id, company_name, industry, subscription_tier, 
              rate_limit_per_hour, active, created_at
       FROM b2b_customers
       WHERE api_key_hash = $1 AND active = true`,
      [apiKeyHash]
    );
    
    return result.rows[0];
  }
  
  static async updateTenantSubscription(customerId, subscriptionData) {
    const result = await pool.query(
      `UPDATE b2b_customers
       SET subscription_tier = $1,
           rate_limit_per_hour = $2,
           updated_at = now()
       WHERE customer_id = $3
       RETURNING customer_id, company_name, subscription_tier, rate_limit_per_hour`,
      [
        subscriptionData.subscriptionTier,
        subscriptionData.rateLimitPerHour,
        customerId
      ]
    );
    
    logger.info('Tenant subscription updated', {
      customerId,
      newTier: subscriptionData.subscriptionTier
    });
    
    return result.rows[0];
  }
  
  static async assignRegionsToTenant(customerId, regionIds) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Remove existing region assignments
      await client.query(
        'DELETE FROM customer_regions WHERE customer_id = $1',
        [customerId]
      );
      
      // Insert new region assignments
      for (const regionId of regionIds) {
        await client.query(
          `INSERT INTO customer_regions (customer_id, grid_region_id)
           VALUES ($1, $2)
           ON CONFLICT (customer_id, grid_region_id) DO NOTHING`,
          [customerId, regionId]
        );
      }
      
      await client.query('COMMIT');
      
      logger.info('Regions assigned to tenant', {
        customerId,
        regionCount: regionIds.length
      });
      
      return { customerId, regionIds };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error('Failed to assign regions to tenant', { error: error.message });
      throw error;
    } finally {
      client.release();
    }
  }
  
  static async getTenantRegions(customerId) {
    const result = await pool.query(
      `SELECT gr.grid_region_id, gr.region_name, gr.boundary_polygon, 
              gr.utility_provider, cr.subscribed_at
       FROM customer_regions cr
       JOIN grid_regions gr ON cr.grid_region_id = gr.grid_region_id
       WHERE cr.customer_id = $1
       ORDER BY gr.region_name`,
      [customerId]
    );
    
    return result.rows;
  }
  
  static async getAllTenants(filters = {}) {
    let query = `
      SELECT customer_id, company_name, industry, subscription_tier, 
             rate_limit_per_hour, active, created_at,
             (SELECT COUNT(*) FROM customer_regions WHERE customer_id = b2b_customers.customer_id) as region_count
      FROM b2b_customers
      WHERE 1=1
    `;
    const params = [];
    let paramIndex = 1;
    
    if (filters.active !== undefined) {
      query += ` AND active = $${paramIndex}`;
      params.push(filters.active);
      paramIndex++;
    }
    
    if (filters.subscriptionTier) {
      query += ` AND subscription_tier = $${paramIndex}`;
      params.push(filters.subscriptionTier);
      paramIndex++;
    }
    
    query += ' ORDER BY created_at DESC';
    
    if (filters.limit) {
      query += ` LIMIT $${paramIndex}`;
      params.push(filters.limit);
      paramIndex++;
    }
    
    const result = await pool.query(query, params);
    return result.rows;
  }
  
  static async deactivateTenant(customerId) {
    const result = await pool.query(
      `UPDATE b2b_customers
       SET active = false, updated_at = now()
       WHERE customer_id = $1
       RETURNING customer_id, company_name, active`,
      [customerId]
    );
    
    logger.warn('Tenant deactivated', { customerId });
    
    return result.rows[0];
  }
  
  static async getTenantUsageStats(customerId, startDate, endDate) {
    const result = await pool.query(
      `SELECT 
         COUNT(*) as total_requests,
         COUNT(DISTINCT DATE(timestamp)) as active_days,
         AVG(CASE WHEN accuracy_metric IS NOT NULL THEN accuracy_metric END) as avg_accuracy,
         request_type,
         COUNT(*) as request_count
       FROM prediction_audit_log
       WHERE customer_id = $1
         AND timestamp >= $2
         AND timestamp <= $3
       GROUP BY request_type
       ORDER BY request_count DESC`,
      [customerId, startDate, endDate]
    );
    
    return result.rows;
  }
}

module.exports = TenantModel;