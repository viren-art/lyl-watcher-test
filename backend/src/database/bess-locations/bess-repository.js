const { Pool } = require('pg');
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
});

/**
 * Initialize BESS locations table
 */
async function initializeBESSTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS bess_locations (
      location_id SERIAL PRIMARY KEY,
      grid_region_id INTEGER NOT NULL,
      location_name VARCHAR(255),
      coordinates GEOMETRY(POINT, 4326) NOT NULL,
      h3_index VARCHAR(20) NOT NULL,
      recommended_capacity_mwh NUMERIC(10,2) NOT NULL,
      recommended_power_mw NUMERIC(10,2) NOT NULL,
      optimization_score NUMERIC(5,2) CHECK (optimization_score BETWEEN 0 AND 100),
      roi_estimate NUMERIC(5,2),
      roi_improvement NUMERIC(5,2),
      grid_connection_cost_usd NUMERIC(12,2),
      total_cost_usd NUMERIC(12,2),
      payback_years NUMERIC(5,2),
      land_availability BOOLEAN NOT NULL DEFAULT true,
      environmental_constraints JSONB,
      deployment_priority INTEGER CHECK (deployment_priority > 0),
      status VARCHAR(50) NOT NULL DEFAULT 'PROPOSED',
      justification TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );

    CREATE INDEX IF NOT EXISTS idx_bess_region ON bess_locations(grid_region_id);
    CREATE INDEX IF NOT EXISTS idx_bess_coordinates ON bess_locations USING GIST(coordinates);
    CREATE INDEX IF NOT EXISTS idx_bess_h3 ON bess_locations(h3_index);
    CREATE INDEX IF NOT EXISTS idx_bess_status ON bess_locations(status);
    CREATE INDEX IF NOT EXISTS idx_bess_priority ON bess_locations(deployment_priority);
  `;

  try {
    await pool.query(createTableQuery);
    logger.info('BESS locations table initialized');
  } catch (error) {
    logger.error('Error initializing BESS locations table:', error);
    throw error;
  }
}

/**
 * Store BESS recommendations
 */
async function storeBESSRecommendations(gridRegionId, recommendations) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Mark existing PROPOSED locations as outdated
    await client.query(
      `UPDATE bess_locations 
       SET status = 'SUPERSEDED', updated_at = now()
       WHERE grid_region_id = $1 AND status = 'PROPOSED'`,
      [gridRegionId]
    );
    
    // Insert new recommendations
    for (const rec of recommendations) {
      const insertQuery = `
        INSERT INTO bess_locations (
          grid_region_id,
          location_name,
          coordinates,
          h3_index,
          recommended_capacity_mwh,
          recommended_power_mw,
          optimization_score,
          roi_estimate,
          roi_improvement,
          grid_connection_cost_usd,
          total_cost_usd,
          payback_years,
          land_availability,
          environmental_constraints,
          deployment_priority,
          status,
          justification
        ) VALUES ($1, $2, ST_SetSRID(ST_MakePoint($3, $4), 4326), $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
        RETURNING location_id
      `;
      
      const values = [
        gridRegionId,
        rec.location_name || `BESS Site ${rec.deployment_priority}`,
        rec.coordinates.lon,
        rec.coordinates.lat,
        rec.h3_index,
        rec.recommended_capacity_mwh,
        rec.recommended_power_mw,
        rec.optimization_score,
        rec.projected_roi,
        rec.roi_improvement,
        rec.total_cost_usd * 0.15, // Connection cost estimate
        rec.total_cost_usd,
        rec.payback_years,
        rec.land_available !== false,
        JSON.stringify(rec.environmental_constraints || {}),
        rec.deployment_priority,
        'PROPOSED',
        rec.justification
      ];
      
      await client.query(insertQuery, values);
    }
    
    await client.query('COMMIT');
    
    logger.info(`Stored ${recommendations.length} BESS recommendations for region ${gridRegionId}`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    logger.error('Error storing BESS recommendations:', error);
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get BESS recommendations for a region
 */
async function getBESSRecommendations(gridRegionId, limit = 10) {
  const query = `
    SELECT 
      location_id,
      location_name,
      ST_X(coordinates::geometry) as lon,
      ST_Y(coordinates::geometry) as lat,
      h3_index,
      recommended_capacity_mwh,
      recommended_power_mw,
      optimization_score,
      roi_estimate,
      roi_improvement,
      grid_connection_cost_usd,
      total_cost_usd,
      payback_years,
      land_availability,
      environmental_constraints,
      deployment_priority,
      status,
      justification,
      created_at
    FROM bess_locations
    WHERE grid_region_id = $1
    AND status = 'PROPOSED'
    ORDER BY deployment_priority ASC
    LIMIT $2
  `;
  
  try {
    const result = await pool.query(query, [gridRegionId, limit]);
    
    return result.rows.map(row => ({
      locationId: row.location_id,
      locationName: row.location_name,
      coordinates: { lat: row.lat, lon: row.lon },
      h3Index: row.h3_index,
      recommendedCapacityMwh: parseFloat(row.recommended_capacity_mwh),
      recommendedPowerMw: parseFloat(row.recommended_power_mw),
      optimizationScore: parseFloat(row.optimization_score),
      roiEstimate: parseFloat(row.roi_estimate),
      roiImprovement: parseFloat(row.roi_improvement),
      gridConnectionCostUsd: parseFloat(row.grid_connection_cost_usd),
      totalCostUsd: parseFloat(row.total_cost_usd),
      paybackYears: parseFloat(row.payback_years),
      landAvailability: row.land_availability,
      environmentalConstraints: row.environmental_constraints,
      deploymentPriority: row.deployment_priority,
      status: row.status,
      justification: row.justification,
      createdAt: row.created_at
    }));
    
  } catch (error) {
    logger.error('Error getting BESS recommendations:', error);
    throw error;
  }
}

/**
 * Update BESS location status
 */
async function updateBESSStatus(locationId, status) {
  const query = `
    UPDATE bess_locations
    SET status = $1, updated_at = now()
    WHERE location_id = $2
    RETURNING location_id
  `;
  
  try {
    const result = await pool.query(query, [status, locationId]);
    
    if (result.rows.length === 0) {
      throw new Error(`BESS location ${locationId} not found`);
    }
    
    logger.info(`Updated BESS location ${locationId} status to ${status}`);
    
    return result.rows[0];
    
  } catch (error) {
    logger.error('Error updating BESS status:', error);
    throw error;
  }
}

/**
 * Get BESS location by ID
 */
async function getBESSLocationById(locationId) {
  const query = `
    SELECT 
      location_id,
      grid_region_id,
      location_name,
      ST_X(coordinates::geometry) as lon,
      ST_Y(coordinates::geometry) as lat,
      h3_index,
      recommended_capacity_mwh,
      recommended_power_mw,
      optimization_score,
      roi_estimate,
      roi_improvement,
      grid_connection_cost_usd,
      total_cost_usd,
      payback_years,
      land_availability,
      environmental_constraints,
      deployment_priority,
      status,
      justification,
      created_at,
      updated_at
    FROM bess_locations
    WHERE location_id = $1
  `;
  
  try {
    const result = await pool.query(query, [locationId]);
    
    if (result.rows.length === 0) {
      return null;
    }
    
    const row = result.rows[0];
    
    return {
      locationId: row.location_id,
      gridRegionId: row.grid_region_id,
      locationName: row.location_name,
      coordinates: { lat: row.lat, lon: row.lon },
      h3Index: row.h3_index,
      recommendedCapacityMwh: parseFloat(row.recommended_capacity_mwh),
      recommendedPowerMw: parseFloat(row.recommended_power_mw),
      optimizationScore: parseFloat(row.optimization_score),
      roiEstimate: parseFloat(row.roi_estimate),
      roiImprovement: parseFloat(row.roi_improvement),
      gridConnectionCostUsd: parseFloat(row.grid_connection_cost_usd),
      totalCostUsd: parseFloat(row.total_cost_usd),
      paybackYears: parseFloat(row.payback_years),
      landAvailability: row.land_availability,
      environmentalConstraints: row.environmental_constraints,
      deploymentPriority: row.deployment_priority,
      status: row.status,
      justification: row.justification,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
    
  } catch (error) {
    logger.error('Error getting BESS location by ID:', error);
    throw error;
  }
}

module.exports = {
  initializeBESSTable,
  storeBESSRecommendations,
  getBESSRecommendations,
  updateBESSStatus,
  getBESSLocationById
};