const { Pool } = require('pg');

class CustomerDataRepository {
  constructor() {
    this.pool = new Pool({
      host: process.env.DB_HOST,
      port: process.env.DB_PORT,
      database: process.env.DB_NAME,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD
    });
  }

  async createProfile(data) {
    const {
      customerId,
      companyName,
      industry,
      companySize,
      annualRevenue,
      primaryUseCase,
      technicalMaturity,
      leadScore,
      marketSegment,
      decisionMakers
    } = data;

    const query = `
      INSERT INTO customer_profiles (
        customer_id, company_name, industry, company_size, annual_revenue,
        primary_use_case, technical_maturity, lead_score, market_segment, decision_makers
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const values = [
      customerId,
      companyName,
      industry,
      companySize,
      annualRevenue,
      primaryUseCase,
      technicalMaturity,
      leadScore,
      marketSegment,
      decisionMakers
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async updateProfile(customerId, updates) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    Object.keys(updates).forEach(key => {
      if (updates[key] !== undefined) {
        const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
        fields.push(`${snakeKey} = $${paramCount}`);
        values.push(updates[key]);
        paramCount++;
      }
    });

    fields.push(`updated_at = $${paramCount}`);
    values.push(new Date());
    paramCount++;

    values.push(customerId);

    const query = `
      UPDATE customer_profiles
      SET ${fields.join(', ')}
      WHERE customer_id = $${paramCount}
      RETURNING *
    `;

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async getProfile(customerId) {
    const query = `
      SELECT 
        cp.*,
        cs.subscription_tier,
        cs.rate_limit_per_hour,
        cs.max_regions,
        cs.max_users,
        (SELECT COUNT(*) FROM customer_region_interests WHERE customer_id = cp.customer_id) as grid_regions_count
      FROM customer_profiles cp
      LEFT JOIN customer_subscriptions cs ON cp.customer_id = cs.customer_id
      WHERE cp.customer_id = $1
    `;

    const result = await this.pool.query(query, [customerId]);
    return result.rows[0];
  }

  async getQualifiedCustomers(filters) {
    const {
      minLeadScore,
      marketSegment,
      industry,
      subscriptionTier,
      limit,
      offset
    } = filters;

    const conditions = ['cp.lead_score >= $1'];
    const values = [minLeadScore];
    let paramCount = 2;

    if (marketSegment) {
      conditions.push(`cp.market_segment = $${paramCount}`);
      values.push(marketSegment);
      paramCount++;
    }

    if (industry) {
      conditions.push(`cp.industry = $${paramCount}`);
      values.push(industry);
      paramCount++;
    }

    if (subscriptionTier) {
      conditions.push(`cs.subscription_tier = $${paramCount}`);
      values.push(subscriptionTier);
      paramCount++;
    }

    values.push(limit, offset);

    const query = `
      SELECT 
        cp.*,
        cs.subscription_tier,
        cs.rate_limit_per_hour,
        bc.active as customer_active
      FROM customer_profiles cp
      LEFT JOIN customer_subscriptions cs ON cp.customer_id = cs.customer_id
      LEFT JOIN b2b_customers bc ON cp.customer_id = bc.customer_id
      WHERE ${conditions.join(' AND ')}
      ORDER BY cp.lead_score DESC
      LIMIT $${paramCount} OFFSET $${paramCount + 1}
    `;

    const result = await this.pool.query(query, values);
    return result.rows;
  }

  async getSubscription(customerId) {
    const query = `
      SELECT * FROM customer_subscriptions
      WHERE customer_id = $1
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const result = await this.pool.query(query, [customerId]);
    return result.rows[0];
  }

  async addRegionInterest(customerId, regionId, interestLevel = 3) {
    const query = `
      INSERT INTO customer_region_interests (customer_id, grid_region_id, interest_level)
      VALUES ($1, $2, $3)
      ON CONFLICT (customer_id, grid_region_id) 
      DO UPDATE SET 
        last_queried_at = now(),
        query_count = customer_region_interests.query_count + 1
      RETURNING *
    `;

    const result = await this.pool.query(query, [customerId, regionId, interestLevel]);
    return result.rows[0];
  }

  async getRegionInterests(customerId) {
    const query = `
      SELECT 
        cri.*,
        gr.region_name
      FROM customer_region_interests cri
      JOIN grid_regions gr ON cri.grid_region_id = gr.grid_region_id
      WHERE cri.customer_id = $1
      ORDER BY cri.interest_level DESC, cri.query_count DESC
    `;

    const result = await this.pool.query(query, [customerId]);
    return result.rows;
  }

  async getMarketSegments() {
    const query = `
      SELECT 
        market_segment,
        COUNT(*) as customer_count,
        AVG(lead_score) as avg_lead_score
      FROM customer_profiles
      GROUP BY market_segment
      ORDER BY customer_count DESC
    `;

    const result = await this.pool.query(query);
    return result.rows;
  }

  async getCustomersBySegment(segment) {
    const query = `
      SELECT * FROM customer_profiles
      WHERE market_segment = $1
      ORDER BY lead_score DESC
    `;

    const result = await this.pool.query(query, [segment]);
    return result.rows;
  }

  async getIndustriesBySegment(segment) {
    const query = `
      SELECT 
        industry,
        COUNT(*) as customer_count
      FROM customer_profiles
      WHERE market_segment = $1
      GROUP BY industry
      ORDER BY customer_count DESC
    `;

    const result = await this.pool.query(query, [segment]);
    return result.rows;
  }

  async close() {
    await this.pool.end();
  }
}

module.exports = CustomerDataRepository;