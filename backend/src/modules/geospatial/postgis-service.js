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

class PostGISService {
  /**
   * Find substations within radius of a point
   */
  async findSubstationsInRadius(lat, lon, radiusKm) {
    const query = `
      SELECT 
        substation_id,
        substation_name,
        ST_X(location::geometry) as lon,
        ST_Y(location::geometry) as lat,
        capacity_mw,
        voltage_kv,
        status,
        ST_Distance(
          location::geography,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
        ) / 1000 as distance_km
      FROM substations
      WHERE ST_DWithin(
        location::geography,
        ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography,
        $3 * 1000
      )
      ORDER BY distance_km
    `;
    
    try {
      const result = await pool.query(query, [lat, lon, radiusKm]);
      return result.rows.map(row => ({
        substationId: row.substation_id,
        substationName: row.substation_name,
        location: { lat: row.lat, lon: row.lon },
        capacityMw: parseFloat(row.capacity_mw),
        voltageKv: parseFloat(row.voltage_kv),
        status: row.status,
        distanceKm: parseFloat(row.distance_km)
      }));
    } catch (error) {
      logger.error('Error finding substations in radius:', error);
      throw error;
    }
  }

  /**
   * Find transmission lines intersecting with a polygon
   */
  async findTransmissionLinesInArea(boundaryPolygon) {
    const query = `
      SELECT 
        line_id,
        line_name,
        capacity_mw,
        voltage_kv,
        ST_AsGeoJSON(line_geometry) as geometry,
        ST_Length(line_geometry::geography) / 1000 as length_km
      FROM transmission_lines
      WHERE ST_Intersects(
        line_geometry,
        ST_GeomFromGeoJSON($1)
      )
    `;
    
    try {
      const result = await pool.query(query, [JSON.stringify(boundaryPolygon)]);
      return result.rows.map(row => ({
        lineId: row.line_id,
        lineName: row.line_name,
        capacityMw: parseFloat(row.capacity_mw),
        voltageKv: parseFloat(row.voltage_kv),
        geometry: JSON.parse(row.geometry),
        lengthKm: parseFloat(row.length_km)
      }));
    } catch (error) {
      logger.error('Error finding transmission lines in area:', error);
      throw error;
    }
  }

  /**
   * Calculate grid connection cost based on distance to nearest substation
   */
  async calculateConnectionCost(lat, lon) {
    const nearestSubstation = await this.findNearestSubstation(lat, lon);
    
    if (!nearestSubstation) {
      return {
        connectionCostUsd: 5000000, // Default high cost
        distanceKm: 50,
        substationId: null
      };
    }
    
    // Cost model: $100k/km base + $50k/km for terrain difficulty
    const baselineCost = 100000;
    const terrainMultiplier = 1.5; // Assume moderate terrain
    const costPerKm = baselineCost * terrainMultiplier;
    
    const connectionCost = nearestSubstation.distanceKm * costPerKm;
    
    return {
      connectionCostUsd: Math.round(connectionCost),
      distanceKm: nearestSubstation.distanceKm,
      substationId: nearestSubstation.substationId,
      substationName: nearestSubstation.substationName
    };
  }

  /**
   * Find nearest substation to a point
   */
  async findNearestSubstation(lat, lon) {
    const query = `
      SELECT 
        substation_id,
        substation_name,
        ST_X(location::geometry) as lon,
        ST_Y(location::geometry) as lat,
        capacity_mw,
        voltage_kv,
        ST_Distance(
          location::geography,
          ST_SetSRID(ST_MakePoint($2, $1), 4326)::geography
        ) / 1000 as distance_km
      FROM substations
      WHERE status = 'operational'
      ORDER BY location <-> ST_SetSRID(ST_MakePoint($2, $1), 4326)
      LIMIT 1
    `;
    
    try {
      const result = await pool.query(query, [lat, lon]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        substationId: row.substation_id,
        substationName: row.substation_name,
        location: { lat: row.lat, lon: row.lon },
        capacityMw: parseFloat(row.capacity_mw),
        voltageKv: parseFloat(row.voltage_kv),
        distanceKm: parseFloat(row.distance_km)
      };
    } catch (error) {
      logger.error('Error finding nearest substation:', error);
      throw error;
    }
  }

  /**
   * Check if location is within grid region boundary
   */
  async isWithinGridRegion(lat, lon, gridRegionId) {
    const query = `
      SELECT EXISTS(
        SELECT 1
        FROM grid_regions
        WHERE grid_region_id = $1
        AND ST_Contains(
          boundary_polygon,
          ST_SetSRID(ST_MakePoint($3, $2), 4326)
        )
      ) as is_within
    `;
    
    try {
      const result = await pool.query(query, [gridRegionId, lat, lon]);
      return result.rows[0].is_within;
    } catch (error) {
      logger.error('Error checking grid region boundary:', error);
      return false;
    }
  }

  /**
   * Get grid region boundary polygon
   */
  async getGridRegionBoundary(gridRegionId) {
    const query = `
      SELECT 
        grid_region_id,
        region_name,
        ST_AsGeoJSON(boundary_polygon) as boundary,
        current_capacity_mw,
        peak_demand_mw,
        renewable_percentage
      FROM grid_regions
      WHERE grid_region_id = $1
    `;
    
    try {
      const result = await pool.query(query, [gridRegionId]);
      
      if (result.rows.length === 0) {
        return null;
      }
      
      const row = result.rows[0];
      return {
        gridRegionId: row.grid_region_id,
        regionName: row.region_name,
        boundary: JSON.parse(row.boundary),
        currentCapacityMw: parseFloat(row.current_capacity_mw),
        peakDemandMw: parseFloat(row.peak_demand_mw),
        renewablePercentage: parseFloat(row.renewable_percentage)
      };
    } catch (error) {
      logger.error('Error getting grid region boundary:', error);
      throw error;
    }
  }

  /**
   * Find existing BESS locations in region
   */
  async getExistingBESSInRegion(gridRegionId) {
    const query = `
      SELECT 
        location_id,
        location_name,
        ST_X(coordinates::geometry) as lon,
        ST_Y(coordinates::geometry) as lat,
        h3_index,
        recommended_capacity_mwh,
        recommended_power_mw,
        status
      FROM bess_locations
      WHERE grid_region_id = $1
      AND status IN ('DEPLOYED', 'UNDER_CONSTRUCTION', 'APPROVED')
    `;
    
    try {
      const result = await pool.query(query, [gridRegionId]);
      return result.rows.map(row => ({
        locationId: row.location_id,
        locationName: row.location_name,
        coordinates: { lat: row.lat, lon: row.lon },
        h3Index: row.h3_index,
        capacityMwh: parseFloat(row.recommended_capacity_mwh),
        powerMw: parseFloat(row.recommended_power_mw),
        status: row.status
      }));
    } catch (error) {
      logger.error('Error getting existing BESS locations:', error);
      throw error;
    }
  }

  /**
   * Calculate area of a polygon (in km²)
   */
  async calculatePolygonArea(polygon) {
    const query = `
      SELECT ST_Area(ST_GeomFromGeoJSON($1)::geography) / 1000000 as area_km2
    `;
    
    try {
      const result = await pool.query(query, [JSON.stringify(polygon)]);
      return parseFloat(result.rows[0].area_km2);
    } catch (error) {
      logger.error('Error calculating polygon area:', error);
      return 0;
    }
  }

  /**
   * Check environmental constraints at location
   */
  async checkEnvironmentalConstraints(lat, lon) {
    // This would integrate with environmental databases
    // For now, return mock data based on simple heuristics
    
    const constraints = {
      floodRisk: 'low',
      seismicZone: 2,
      protectedArea: false,
      wetlands: false,
      constraints: []
    };
    
    // Mock logic: areas near water bodies have flood risk
    // In production, this would query actual environmental databases
    
    return constraints;
  }
}

module.exports = PostGISService;