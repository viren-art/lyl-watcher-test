const { Pool } = require('pg');

class UserRepository {
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

  async createCustomer(customerData) {
    const {
      companyName,
      industry,
      subscriptionTier,
      apiKeyHash,
      rateLimitPerHour
    } = customerData;

    const query = `
      INSERT INTO b2b_customers (
        company_name,
        industry,
        subscription_tier,
        api_key_hash,
        rate_limit_per_hour,
        active
      ) VALUES ($1, $2, $3, $4, $5, false)
      RETURNING *
    `;

    const values = [
      companyName,
      industry,
      subscriptionTier,
      apiKeyHash,
      rateLimitPerHour
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async createUser(userData) {
    const {
      customerId,
      email,
      passwordHash,
      fullName,
      role,
      mfaEnabled
    } = userData;

    const query = `
      INSERT INTO users (
        customer_id,
        email,
        password_hash,
        full_name,
        role,
        mfa_enabled
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING user_id, customer_id, email, full_name, role, mfa_enabled, created_at
    `;

    const values = [
      customerId,
      email,
      passwordHash,
      fullName,
      role,
      mfaEnabled
    ];

    const result = await this.pool.query(query, values);
    return result.rows[0];
  }

  async findUserByEmail(email) {
    const query = `
      SELECT * FROM users WHERE email = $1
    `;
    const result = await this.pool.query(query, [email]);
    return result.rows[0];
  }

  async findUserById(userId) {
    const query = `
      SELECT * FROM users WHERE user_id = $1
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows[0];
  }

  async findCustomerById(customerId) {
    const query = `
      SELECT * FROM b2b_customers WHERE customer_id = $1
    `;
    const result = await this.pool.query(query, [customerId]);
    return result.rows[0];
  }

  async findCustomerByEmail(email) {
    const query = `
      SELECT c.* FROM b2b_customers c
      JOIN users u ON c.customer_id = u.customer_id
      WHERE u.email = $1 AND u.role = 'ADMIN'
    `;
    const result = await this.pool.query(query, [email]);
    return result.rows[0];
  }

  async updateMfaSecret(userId, encryptedSecret) {
    const query = `
      UPDATE users
      SET mfa_secret = $1, updated_at = now()
      WHERE user_id = $2
      RETURNING user_id
    `;
    const result = await this.pool.query(query, [encryptedSecret, userId]);
    return result.rows[0];
  }

  async enableMfa(userId) {
    const query = `
      UPDATE users
      SET mfa_enabled = true, updated_at = now()
      WHERE user_id = $1
      RETURNING user_id
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows[0];
  }

  async updateLastLogin(userId) {
    const query = `
      UPDATE users
      SET last_login = now(), updated_at = now()
      WHERE user_id = $1
      RETURNING user_id
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows[0];
  }

  async getUserRegions(customerId) {
    const query = `
      SELECT gr.grid_region_id, gr.region_name
      FROM customer_regions cr
      JOIN grid_regions gr ON cr.grid_region_id = gr.grid_region_id
      WHERE cr.customer_id = $1
    `;
    const result = await this.pool.query(query, [customerId]);
    return result.rows;
  }

  async addCustomerRegion(customerId, regionId) {
    const query = `
      INSERT INTO customer_regions (customer_id, grid_region_id)
      VALUES ($1, $2)
      ON CONFLICT (customer_id, grid_region_id) DO NOTHING
      RETURNING *
    `;
    const result = await this.pool.query(query, [customerId, regionId]);
    return result.rows[0];
  }

  async removeCustomerRegion(customerId, regionId) {
    const query = `
      DELETE FROM customer_regions
      WHERE customer_id = $1 AND grid_region_id = $2
      RETURNING *
    `;
    const result = await this.pool.query(query, [customerId, regionId]);
    return result.rows[0];
  }

  async approveCustomer(customerId) {
    const query = `
      UPDATE b2b_customers
      SET active = true, updated_at = now()
      WHERE customer_id = $1
      RETURNING *
    `;
    const result = await this.pool.query(query, [customerId]);
    return result.rows[0];
  }

  async updateUserRole(userId, role) {
    const query = `
      UPDATE users
      SET role = $1, updated_at = now()
      WHERE user_id = $2
      RETURNING *
    `;
    const result = await this.pool.query(query, [role, userId]);
    return result.rows[0];
  }
}

module.exports = UserRepository;