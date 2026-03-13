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

  async getPendingCustomers() {
    const query = `
      SELECT 
        c.*,
        u.email as admin_email,
        u.full_name as admin_name
      FROM b2b_customers c
      JOIN users u ON c.customer_id = u.customer_id AND u.role = 'ADMIN'
      WHERE c.active = false
      ORDER BY c.created_at DESC
    `;
    const result = await this.pool.query(query);
    return result.rows;
  }

  async getCustomerAdminUser(customerId) {
    const query = `
      SELECT * FROM users
      WHERE customer_id = $1 AND role = 'ADMIN'
      LIMIT 1
    `;
    const result = await this.pool.query(query, [customerId]);
    return result.rows[0];
  }

  async storeBackupCodes(userId, hashedCodes) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      const insertQuery = `
        INSERT INTO mfa_backup_codes (user_id, code_hash)
        VALUES ($1, $2)
      `;

      for (const codeHash of hashedCodes) {
        await client.query(insertQuery, [userId, codeHash]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  async getBackupCodes(userId) {
    const query = `
      SELECT backup_code_id, code_hash, used_at, created_at
      FROM mfa_backup_codes
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;
    const result = await this.pool.query(query, [userId]);
    return result.rows;
  }

  async markBackupCodeUsed(backupCodeId) {
    const query = `
      UPDATE mfa_backup_codes
      SET used_at = now()
      WHERE backup_code_id = $1
      RETURNING *
    `;
    const result = await this.pool.query(query, [backupCodeId]);
    return result.rows[0];
  }

  async replaceBackupCodes(userId, hashedCodes) {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');

      // Delete old backup codes
      await client.query('DELETE FROM mfa_backup_codes WHERE user_id = $1', [userId]);

      // Insert new backup codes
      const insertQuery = `
        INSERT INTO mfa_backup_codes (user_id, code_hash)
        VALUES ($1, $2)
      `;

      for (const codeHash of hashedCodes) {
        await client.query(insertQuery, [userId, codeHash]);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
}

module.exports = UserRepository;