const { Pool } = require('pg');
const logger = require('../../utils/logger');

const pool = new Pool({
  host: process.env.TIMESCALEDB_HOST || 'localhost',
  port: parseInt(process.env.TIMESCALEDB_PORT) || 5432,
  database: process.env.TIMESCALEDB_DATABASE || 'weather_db',
  user: process.env.TIMESCALEDB_USER || 'postgres',
  password: process.env.TIMESCALEDB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

async function initializeTelemetryTable() {
  const client = await pool.connect();
  
  try {
    // Create grid_telemetry table
    await client.query(`
      CREATE TABLE IF NOT EXISTS grid_telemetry (
        telemetry_id BIGSERIAL,
        substation_id INT NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL,
        load_mw NUMERIC(10,2) NOT NULL,
        generation_mw NUMERIC(10,2),
        voltage_kv NUMERIC(8,2),
        frequency_hz NUMERIC(6,3),
        temperature NUMERIC(5,2),
        status VARCHAR(50) NOT NULL DEFAULT 'normal',
        capacity_utilization NUMERIC(5,2),
        renewable_percentage NUMERIC(5,2),
        PRIMARY KEY (timestamp, telemetry_id)
      )
    `);
    
    // Convert to hypertable if not already
    await client.query(`
      SELECT create_hypertable(
        'grid_telemetry', 
        'timestamp',
        chunk_time_interval => INTERVAL '1 day',
        if_not_exists => TRUE
      )
    `);
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_telemetry_substation_time 
      ON grid_telemetry(substation_id, timestamp DESC)
    `);
    
    // Add compression policy (compress data older than 7 days)
    await client.query(`
      SELECT add_compression_policy(
        'grid_telemetry', 
        INTERVAL '7 days',
        if_not_exists => TRUE
      )
    `);
    
    // Add retention policy (drop data older than 2 years)
    await client.query(`
      SELECT add_retention_policy(
        'grid_telemetry',
        INTERVAL '2 years',
        if_not_exists => TRUE
      )
    `);
    
    logger.info('Grid telemetry table initialized');
    
  } catch (error) {
    logger.error('Failed to initialize telemetry table', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
}

async function storeTelemetryBatch(telemetryData) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    const values = telemetryData.map((data, idx) => {
      const offset = idx * 9;
      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6}, $${offset + 7}, $${offset + 8}, $${offset + 9})`;
    }).join(',');
    
    const params = telemetryData.flatMap(data => [
      data.substationId,
      data.timestamp,
      data.loadMw,
      data.generationMw,
      data.voltageKv,
      data.frequencyHz,
      data.temperature,
      data.status,
      data.capacityUtilization
    ]);
    
    await client.query(
      `INSERT INTO grid_telemetry (
        substation_id, timestamp, load_mw, generation_mw, voltage_kv,
        frequency_hz, temperature, status, capacity_utilization
      ) VALUES ${values}
      ON CONFLICT (timestamp, telemetry_id) DO NOTHING`,
      params
    );
    
    await client.query('COMMIT');
    
    logger.debug('Telemetry batch stored', { count: telemetryData.length });
    
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Failed to store telemetry batch', { 
      count: telemetryData.length,
      error: error.message 
    });
    throw error;
  } finally {
    client.release();
  }
}

async function getGridTelemetryHistory(gridRegionId, hours = 24) {
  try {
    const result = await pool.query(
      `SELECT 
        t.telemetry_id,
        t.substation_id,
        t.timestamp,
        t.load_mw,
        t.generation_mw,
        t.voltage_kv,
        t.frequency_hz,
        t.temperature,
        t.status,
        t.capacity_utilization,
        t.renewable_percentage
      FROM grid_telemetry t
      JOIN substations s ON t.substation_id = s.substation_id
      WHERE s.grid_region_id = $1
        AND t.timestamp >= NOW() - INTERVAL '1 hour' * $2
      ORDER BY t.timestamp DESC`,
      [gridRegionId, hours]
    );
    
    return result.rows.map(row => ({
      telemetryId: row.telemetry_id,
      substationId: row.substation_id,
      timestamp: row.timestamp.toISOString(),
      loadMw: parseFloat(row.load_mw),
      generationMw: row.generation_mw ? parseFloat(row.generation_mw) : null,
      voltageKv: row.voltage_kv ? parseFloat(row.voltage_kv) : null,
      frequencyHz: row.frequency_hz ? parseFloat(row.frequency_hz) : null,
      temperature: row.temperature ? parseFloat(row.temperature) : null,
      status: row.status,
      capacityUtilization: row.capacity_utilization ? parseFloat(row.capacity_utilization) : null,
      renewablePercentage: row.renewable_percentage ? parseFloat(row.renewable_percentage) : null
    }));
    
  } catch (error) {
    logger.error('Failed to fetch telemetry history', { 
      gridRegionId, 
      hours,
      error: error.message 
    });
    throw error;
  }
}

async function getLatestTelemetry(substationId) {
  try {
    const result = await pool.query(
      `SELECT 
        telemetry_id,
        substation_id,
        timestamp,
        load_mw,
        generation_mw,
        voltage_kv,
        frequency_hz,
        temperature,
        status,
        capacity_utilization
      FROM grid_telemetry
      WHERE substation_id = $1
      ORDER BY timestamp DESC
      LIMIT 1`,
      [substationId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      telemetryId: row.telemetry_id,
      substationId: row.substation_id,
      timestamp: row.timestamp.toISOString(),
      loadMw: parseFloat(row.load_mw),
      generationMw: row.generation_mw ? parseFloat(row.generation_mw) : null,
      voltageKv: row.voltage_kv ? parseFloat(row.voltage_kv) : null,
      frequencyHz: row.frequency_hz ? parseFloat(row.frequency_hz) : null,
      temperature: row.temperature ? parseFloat(row.temperature) : null,
      status: row.status,
      capacityUtilization: row.capacity_utilization ? parseFloat(row.capacity_utilization) : null
    };
    
  } catch (error) {
    logger.error('Failed to fetch latest telemetry', { 
      substationId,
      error: error.message 
    });
    throw error;
  }
}

module.exports = {
  initializeTelemetryTable,
  storeTelemetryBatch,
  getGridTelemetryHistory,
  getLatestTelemetry
};