const { Pool } = require('pg');
const { encryptData, decryptData } = require('../../utils/encryption');
const logger = require('../../utils/logger');

const pool = new Pool({
  host: process.env.TIMESCALEDB_HOST || 'localhost',
  port: process.env.TIMESCALEDB_PORT || 5432,
  database: process.env.TIMESCALEDB_DATABASE || 'weather_db',
  user: process.env.TIMESCALEDB_USER || 'postgres',
  password: process.env.TIMESCALEDB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
  ssl: process.env.TIMESCALEDB_SSL === 'true' ? {
    rejectUnauthorized: true,
    ca: process.env.TIMESCALEDB_SSL_CA_CERT,
    cert: process.env.TIMESCALEDB_SSL_CLIENT_CERT,
    key: process.env.TIMESCALEDB_SSL_CLIENT_KEY,
  } : false,
});

async function initializeDatabase() {
  const client = await pool.connect();
  
  try {
    // Create extension
    await client.query('CREATE EXTENSION IF NOT EXISTS timescaledb CASCADE');
    await client.query('CREATE EXTENSION IF NOT EXISTS postgis');
    
    // Create weather_data table with encryption metadata
    await client.query(`
      CREATE TABLE IF NOT EXISTS weather_data (
        id BIGSERIAL,
        timestamp TIMESTAMPTZ NOT NULL,
        grid_region_id INTEGER NOT NULL,
        location GEOMETRY(POINT, 4326) NOT NULL,
        source VARCHAR(50) NOT NULL,
        encrypted_data TEXT NOT NULL,
        encryption_iv TEXT NOT NULL,
        encryption_auth_tag TEXT NOT NULL,
        encryption_salt TEXT NOT NULL,
        encryption_key_version INTEGER NOT NULL,
        encryption_algorithm VARCHAR(20) NOT NULL DEFAULT 'aes-256-gcm',
        validated_at TIMESTAMPTZ,
        validator_version VARCHAR(20),
        PRIMARY KEY (timestamp, id)
      )
    `);
    
    // Convert to hypertable
    await client.query(`
      SELECT create_hypertable('weather_data', 'timestamp', 
        chunk_time_interval => INTERVAL '1 day',
        if_not_exists => TRUE
      )
    `);
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_weather_region_time 
      ON weather_data (grid_region_id, timestamp DESC)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_weather_location 
      ON weather_data USING GIST(location)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_weather_key_version 
      ON weather_data (encryption_key_version)
    `);
    
    // Add compression policy (compress data older than 7 days)
    await client.query(`
      SELECT add_compression_policy('weather_data', INTERVAL '7 days', if_not_exists => TRUE)
    `);
    
    // Add retention policy (keep data for 5 years)
    await client.query(`
      SELECT add_retention_policy('weather_data', INTERVAL '5 years', if_not_exists => TRUE)
    `);
    
    logger.info('TimescaleDB weather database initialized with encryption support');
  } catch (error) {
    logger.error('Failed to initialize database', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
}

async function storeWeatherData(weatherDataArray) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const insertQuery = `
      INSERT INTO weather_data (
        timestamp, grid_region_id, location, source,
        encrypted_data, encryption_iv, encryption_auth_tag, 
        encryption_salt, encryption_key_version, encryption_algorithm,
        validated_at, validator_version
      ) VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6, $7, $8, $9, $10, $11, $12, $13)
      ON CONFLICT (timestamp, id) DO NOTHING
    `;
    
    for (const data of weatherDataArray) {
      // Encrypt sensitive weather data
      const sensitiveData = {
        temperature: data.temperature,
        windSpeed: data.windSpeed,
        precipitation: data.precipitation,
        humidity: data.humidity,
        solarRadiation: data.solarRadiation,
        pressure: data.pressure,
        conditions: data.conditions,
      };
      
      const encrypted = encryptData(sensitiveData);
      
      await client.query(insertQuery, [
        data.timestamp,
        data.gridRegionId,
        data.location.lon,
        data.location.lat,
        data.source,
        encrypted.encrypted,
        encrypted.iv,
        encrypted.authTag,
        encrypted.salt,
        encrypted.keyVersion,
        encrypted.algorithm,
        data.validatedAt,
        data.validatorVersion,
      ]);
    }
    
    await client.query('COMMIT');
    
    logger.debug('Stored encrypted weather data batch', { count: weatherDataArray.length });
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to store weather data', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
}

async function getWeatherHistory(gridRegionId, hours = 24) {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT 
        timestamp,
        grid_region_id,
        ST_X(location) as lon,
        ST_Y(location) as lat,
        encrypted_data,
        encryption_iv,
        encryption_auth_tag,
        encryption_salt,
        encryption_key_version,
        encryption_algorithm
      FROM weather_data
      WHERE grid_region_id = $1
        AND timestamp >= NOW() - INTERVAL '${hours} hours'
      ORDER BY timestamp ASC
    `;
    
    const result = await client.query(query, [gridRegionId]);
    
    return result.rows.map(row => {
      // Decrypt weather data
      const decrypted = decryptData({
        encrypted: row.encrypted_data,
        iv: row.encryption_iv,
        authTag: row.encryption_auth_tag,
        salt: row.encryption_salt,
        keyVersion: row.encryption_key_version,
        algorithm: row.encryption_algorithm,
      });
      
      return {
        timestamp: row.timestamp,
        gridRegionId: row.grid_region_id,
        location: { lat: row.lat, lon: row.lon },
        temperature: parseFloat(decrypted.temperature),
        windSpeed: parseFloat(decrypted.windSpeed),
        precipitation: parseFloat(decrypted.precipitation),
        humidity: parseFloat(decrypted.humidity),
        solarRadiation: parseFloat(decrypted.solarRadiation),
        pressure: parseFloat(decrypted.pressure),
      };
    });
  } finally {
    client.release();
  }
}

async function getLatestWeatherData(gridRegionId) {
  const client = await pool.connect();
  
  try {
    const query = `
      SELECT 
        timestamp,
        grid_region_id,
        ST_X(location) as lon,
        ST_Y(location) as lat,
        source,
        encrypted_data,
        encryption_iv,
        encryption_auth_tag,
        encryption_salt,
        encryption_key_version,
        encryption_algorithm
      FROM weather_data
      WHERE grid_region_id = $1
      ORDER BY timestamp DESC
      LIMIT 1
    `;
    
    const result = await client.query(query, [gridRegionId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    
    // Decrypt weather data
    const decrypted = decryptData({
      encrypted: row.encrypted_data,
      iv: row.encryption_iv,
      authTag: row.encryption_auth_tag,
      salt: row.encryption_salt,
      keyVersion: row.encryption_key_version,
      algorithm: row.encryption_algorithm,
    });
    
    return {
      timestamp: row.timestamp,
      gridRegionId: row.grid_region_id,
      location: { lat: row.lat, lon: row.lon },
      source: row.source,
      temperature: parseFloat(decrypted.temperature),
      windSpeed: parseFloat(decrypted.windSpeed),
      precipitation: parseFloat(decrypted.precipitation),
      humidity: parseFloat(decrypted.humidity),
      solarRadiation: parseFloat(decrypted.solarRadiation),
      pressure: parseFloat(decrypted.pressure),
      conditions: decrypted.conditions,
    };
  } finally {
    client.release();
  }
}

module.exports = {
  initializeDatabase,
  storeWeatherData,
  getWeatherHistory,
  getLatestWeatherData,
  pool,
};