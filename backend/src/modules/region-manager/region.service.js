const { Pool } = require('pg');
const logger = require('../../utils/logger');
const fs = require('fs').promises;
const path = require('path');

const pool = new Pool({
  host: process.env.TIMESCALEDB_HOST,
  port: process.env.TIMESCALEDB_PORT || 5432,
  database: process.env.TIMESCALEDB_DATABASE,
  user: process.env.TIMESCALEDB_USER,
  password: process.env.TIMESCALEDB_PASSWORD,
  ssl: process.env.TIMESCALEDB_SSL === 'true',
});

class RegionService {
  constructor() {
    this.regionConfig = null;
    this.loadRegionConfig();
  }
  
  async loadRegionConfig() {
    try {
      const configPath = process.env.REGION_CONFIG_PATH || path.join(__dirname, '../../../config/regions.json');
      const configData = await fs.readFile(configPath, 'utf8');
      this.regionConfig = JSON.parse(configData);
      
      logger.info('Region configuration loaded', {
        regionCount: this.regionConfig.regions.length
      });
    } catch (error) {
      logger.error('Failed to load region configuration', { error: error.message });
      this.regionConfig = { regions: [] };
    }
  }
  
  async getAllRegions() {
    const result = await pool.query(
      `SELECT grid_region_id, region_name, boundary_polygon, 
              utility_provider, current_capacity_mw, peak_demand_mw,
              renewable_percentage, created_at
       FROM grid_regions
       ORDER BY region_name`
    );
    
    return result.rows;
  }
  
  async getRegionById(regionId) {
    const result = await pool.query(
      `SELECT grid_region_id, region_name, boundary_polygon, 
              utility_provider, current_capacity_mw, peak_demand_mw,
              renewable_percentage, created_at
       FROM grid_regions
       WHERE grid_region_id = $1`,
      [regionId]
    );
    
    return result.rows[0];
  }
  
  async getRegionMetrics(regionId) {
    const result = await pool.query(
      `SELECT 
         COUNT(DISTINCT s.substation_id) as substation_count,
         COUNT(DISTINCT tl.line_id) as transmission_line_count,
         SUM(s.capacity_mw) as total_substation_capacity,
         AVG(s.capacity_mw) as avg_substation_capacity
       FROM grid_regions gr
       LEFT JOIN substations s ON gr.grid_region_id = s.grid_region_id
       LEFT JOIN transmission_lines tl ON gr.grid_region_id = tl.grid_region_id
       WHERE gr.grid_region_id = $1
       GROUP BY gr.grid_region_id`,
      [regionId]
    );
    
    return result.rows[0];
  }
  
  async getRegionAccuracyStats(regionId, days = 30) {
    const result = await pool.query(
      `SELECT 
         AVG(confidence_score) as avg_confidence,
         COUNT(*) as prediction_count,
         DATE_TRUNC('day', timestamp) as date
       FROM weather_predictions
       WHERE grid_region_id = $1
         AND timestamp >= NOW() - INTERVAL '${days} days'
       GROUP BY DATE_TRUNC('day', timestamp)
       ORDER BY date DESC`,
      [regionId]
    );
    
    return result.rows;
  }
  
  getRegionConfigByCode(regionCode) {
    if (!this.regionConfig) {
      return null;
    }
    
    return this.regionConfig.regions.find(r => r.code === regionCode);
  }
  
  getAllRegionConfigs() {
    return this.regionConfig ? this.regionConfig.regions : [];
  }
}

module.exports = RegionService;