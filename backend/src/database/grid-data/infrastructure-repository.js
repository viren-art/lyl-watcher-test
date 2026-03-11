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

async function initializeInfrastructureTables() {
  const client = await pool.connect();
  
  try {
    // Create grid_regions table
    await client.query(`
      CREATE TABLE IF NOT EXISTS grid_regions (
        grid_region_id SERIAL PRIMARY KEY,
        region_name VARCHAR(100) UNIQUE NOT NULL,
        boundary_polygon GEOMETRY(POLYGON, 4326),
        utility_provider VARCHAR(255),
        current_capacity_mw NUMERIC(10,2) NOT NULL,
        peak_demand_mw NUMERIC(10,2) NOT NULL,
        renewable_percentage NUMERIC(5,2) CHECK (renewable_percentage BETWEEN 0 AND 100),
        created_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    
    // Create substations table
    await client.query(`
      CREATE TABLE IF NOT EXISTS substations (
        substation_id SERIAL PRIMARY KEY,
        grid_region_id INT NOT NULL REFERENCES grid_regions(grid_region_id) ON DELETE CASCADE,
        substation_name VARCHAR(255) NOT NULL,
        location GEOMETRY(POINT, 4326) NOT NULL,
        capacity_mw NUMERIC(10,2) NOT NULL,
        voltage_kv NUMERIC(8,2) NOT NULL,
        status VARCHAR(50) NOT NULL DEFAULT 'operational',
        created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
      )
    `);
    
    // Create indexes
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_substations_region 
      ON substations(grid_region_id)
    `);
    
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_substations_location 
      ON substations USING GIST(location)
    `);
    
    logger.info('Grid infrastructure tables initialized');
    
  } catch (error) {
    logger.error('Failed to initialize infrastructure tables', { error: error.message });
    throw error;
  } finally {
    client.release();
  }
}

async function getSubstationsByRegion(gridRegionId) {
  try {
    const result = await pool.query(
      `SELECT 
        substation_id,
        substation_name,
        ST_X(location::geometry) as longitude,
        ST_Y(location::geometry) as latitude,
        capacity_mw,
        voltage_kv,
        status
      FROM substations
      WHERE grid_region_id = $1
      ORDER BY substation_name`,
      [gridRegionId]
    );
    
    return result.rows.map(row => ({
      substationId: row.substation_id,
      substationName: row.substation_name,
      location: {
        lat: row.latitude,
        lon: row.longitude
      },
      capacityMw: parseFloat(row.capacity_mw),
      voltageKv: parseFloat(row.voltage_kv),
      status: row.status
    }));
    
  } catch (error) {
    logger.error('Failed to fetch substations', { gridRegionId, error: error.message });
    throw error;
  }
}

async function getSubstationById(substationId) {
  try {
    const result = await pool.query(
      `SELECT 
        s.substation_id,
        s.substation_name,
        s.grid_region_id,
        ST_X(s.location::geometry) as longitude,
        ST_Y(s.location::geometry) as latitude,
        s.capacity_mw,
        s.voltage_kv,
        s.status,
        r.region_name
      FROM substations s
      JOIN grid_regions r ON s.grid_region_id = r.grid_region_id
      WHERE s.substation_id = $1`,
      [substationId]
    );
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    return {
      substationId: row.substation_id,
      substationName: row.substation_name,
      gridRegionId: row.grid_region_id,
      regionName: row.region_name,
      location: {
        lat: row.latitude,
        lon: row.longitude
      },
      capacityMw: parseFloat(row.capacity_mw),
      voltageKv: parseFloat(row.voltage_kv),
      status: row.status
    };
    
  } catch (error) {
    logger.error('Failed to fetch substation', { substationId, error: error.message });
    throw error;
  }
}

async function getGridRegions() {
  try {
    const result = await pool.query(
      `SELECT 
        grid_region_id,
        region_name,
        utility_provider,
        current_capacity_mw,
        peak_demand_mw,
        renewable_percentage
      FROM grid_regions
      ORDER BY region_name`
    );
    
    return result.rows.map(row => ({
      gridRegionId: row.grid_region_id,
      regionName: row.region_name,
      utilityProvider: row.utility_provider,
      currentCapacityMw: parseFloat(row.current_capacity_mw),
      peakDemandMw: parseFloat(row.peak_demand_mw),
      renewablePercentage: parseFloat(row.renewable_percentage)
    }));
    
  } catch (error) {
    logger.error('Failed to fetch grid regions', { error: error.message });
    throw error;
  }
}

module.exports = {
  initializeInfrastructureTables,
  getSubstationsByRegion,
  getSubstationById,
  getGridRegions
};