const h3 = require('h3-js');
const logger = require('../../utils/logger');

class H3GeospatialAnalyzer {
  constructor() {
    // H3 resolution 7 provides ~5.16 km² hexagons (ideal for BESS site analysis)
    this.resolution = 7;
    
    // Cache for hexagon analysis results
    this.hexagonCache = new Map();
    
    logger.info('H3 Geospatial Analyzer initialized with resolution', this.resolution);
  }

  /**
   * Convert lat/lon coordinates to H3 index
   */
  coordinatesToH3(lat, lon) {
    try {
      return h3.latLngToCell(lat, lon, this.resolution);
    } catch (error) {
      logger.error('Error converting coordinates to H3:', error);
      throw new Error(`Invalid coordinates: ${lat}, ${lon}`);
    }
  }

  /**
   * Convert H3 index back to lat/lon
   */
  h3ToCoordinates(h3Index) {
    try {
      const [lat, lon] = h3.cellToLatLng(h3Index);
      return { lat, lon };
    } catch (error) {
      logger.error('Error converting H3 to coordinates:', error);
      throw new Error(`Invalid H3 index: ${h3Index}`);
    }
  }

  /**
   * Get hexagon boundary polygon for visualization
   */
  getHexagonBoundary(h3Index) {
    try {
      const boundary = h3.cellToBoundary(h3Index);
      return boundary.map(([lat, lon]) => ({ lat, lon }));
    } catch (error) {
      logger.error('Error getting hexagon boundary:', error);
      return [];
    }
  }

  /**
   * Find all hexagons within a radius (in km) of a point
   */
  getHexagonsInRadius(lat, lon, radiusKm) {
    const centerH3 = this.coordinatesToH3(lat, lon);
    
    // Convert radius to grid distance (approximate)
    const gridDistance = Math.ceil(radiusKm / 5.16);
    
    try {
      const hexagons = h3.gridDisk(centerH3, gridDistance);
      return hexagons;
    } catch (error) {
      logger.error('Error getting hexagons in radius:', error);
      return [centerH3];
    }
  }

  /**
   * Calculate distance between two H3 hexagons (in km)
   */
  getHexagonDistance(h3Index1, h3Index2) {
    try {
      const gridDistance = h3.gridDistance(h3Index1, h3Index2);
      // Approximate km distance (each grid step ~5.16 km at resolution 7)
      return gridDistance * 5.16;
    } catch (error) {
      logger.error('Error calculating hexagon distance:', error);
      return Infinity;
    }
  }

  /**
   * Find neighboring hexagons (k-ring)
   */
  getNeighbors(h3Index, k = 1) {
    try {
      return h3.gridDisk(h3Index, k);
    } catch (error) {
      logger.error('Error getting neighbors:', error);
      return [h3Index];
    }
  }

  /**
   * Cluster candidate locations by hexagon
   */
  clusterLocationsByHexagon(locations) {
    const clusters = new Map();
    
    for (const location of locations) {
      const h3Index = this.coordinatesToH3(
        location.coordinates.lat,
        location.coordinates.lon
      );
      
      if (!clusters.has(h3Index)) {
        clusters.set(h3Index, []);
      }
      
      clusters.get(h3Index).push({
        ...location,
        h3_index: h3Index
      });
    }
    
    logger.info(`Clustered ${locations.length} locations into ${clusters.size} hexagons`);
    
    return clusters;
  }

  /**
   * Score hexagon based on multiple criteria
   */
  scoreHexagon(h3Index, gridData, weatherData, existingBESS) {
    const cacheKey = `${h3Index}-${Date.now()}`;
    
    if (this.hexagonCache.has(cacheKey)) {
      return this.hexagonCache.get(cacheKey);
    }
    
    const center = this.h3ToCoordinates(h3Index);
    
    // Calculate proximity to substations
    const substationProximity = this._calculateSubstationProximity(
      center,
      gridData.substations
    );
    
    // Calculate grid stress in hexagon
    const gridStress = this._calculateGridStress(
      h3Index,
      gridData.telemetry
    );
    
    // Calculate weather vulnerability
    const weatherVulnerability = this._calculateWeatherVulnerability(
      h3Index,
      weatherData
    );
    
    // Calculate existing BESS proximity (avoid clustering)
    const bessProximity = this._calculateBESSProximity(
      h3Index,
      existingBESS
    );
    
    // Calculate load density
    const loadDensity = this._calculateLoadDensity(
      h3Index,
      gridData.loadData
    );
    
    const score = {
      h3Index,
      coordinates: center,
      substationProximity: substationProximity.score,
      nearestSubstationKm: substationProximity.distance,
      gridStressScore: gridStress,
      weatherVulnerabilityScore: weatherVulnerability,
      bessProximityScore: bessProximity.score,
      nearestBESSKm: bessProximity.distance,
      loadDensityScore: loadDensity,
      overallScore: this._calculateOverallScore({
        substationProximity: substationProximity.score,
        gridStress,
        weatherVulnerability,
        bessProximity: bessProximity.score,
        loadDensity
      })
    };
    
    this.hexagonCache.set(cacheKey, score);
    
    return score;
  }

  /**
   * Calculate proximity to substations (closer is better)
   */
  _calculateSubstationProximity(center, substations) {
    if (!substations || substations.length === 0) {
      return { score: 0, distance: Infinity };
    }
    
    let minDistance = Infinity;
    
    for (const substation of substations) {
      const distance = this._haversineDistance(
        center.lat,
        center.lon,
        substation.location.lat,
        substation.location.lon
      );
      
      if (distance < minDistance) {
        minDistance = distance;
      }
    }
    
    // Score: 100 at 0km, 50 at 10km, 0 at 50km+
    const score = Math.max(0, 100 - (minDistance / 50) * 100);
    
    return { score, distance: minDistance };
  }

  /**
   * Calculate grid stress score (higher stress = better BESS candidate)
   */
  _calculateGridStress(h3Index, telemetryData) {
    if (!telemetryData || telemetryData.length === 0) {
      return 50; // Default medium stress
    }
    
    // Aggregate stress indicators from nearby substations
    const neighbors = this.getNeighbors(h3Index, 2);
    let totalStress = 0;
    let count = 0;
    
    for (const telemetry of telemetryData) {
      const telemetryH3 = this.coordinatesToH3(
        telemetry.location.lat,
        telemetry.location.lon
      );
      
      if (neighbors.includes(telemetryH3)) {
        // Calculate stress from load/capacity ratio
        const loadRatio = telemetry.load_mw / telemetry.capacity_mw;
        const stress = Math.min(100, loadRatio * 100);
        
        totalStress += stress;
        count++;
      }
    }
    
    return count > 0 ? totalStress / count : 50;
  }

  /**
   * Calculate weather vulnerability score
   */
  _calculateWeatherVulnerability(h3Index, weatherData) {
    if (!weatherData || weatherData.length === 0) {
      return 50; // Default medium vulnerability
    }
    
    const neighbors = this.getNeighbors(h3Index, 1);
    let totalVulnerability = 0;
    let count = 0;
    
    for (const weather of weatherData) {
      const weatherH3 = this.coordinatesToH3(
        weather.location.lat,
        weather.location.lon
      );
      
      if (neighbors.includes(weatherH3)) {
        // Calculate vulnerability from weather severity
        let vulnerability = 0;
        
        if (weather.wind_speed_ms > 15) vulnerability += 30;
        if (weather.precipitation_mm > 50) vulnerability += 25;
        if (weather.temperature_c < -10 || weather.temperature_c > 40) vulnerability += 20;
        
        totalVulnerability += Math.min(100, vulnerability);
        count++;
      }
    }
    
    return count > 0 ? totalVulnerability / count : 50;
  }

  /**
   * Calculate existing BESS proximity (farther is better to avoid clustering)
   */
  _calculateBESSProximity(h3Index, existingBESS) {
    if (!existingBESS || existingBESS.length === 0) {
      return { score: 100, distance: Infinity };
    }
    
    const center = this.h3ToCoordinates(h3Index);
    let minDistance = Infinity;
    
    for (const bess of existingBESS) {
      const distance = this._haversineDistance(
        center.lat,
        center.lon,
        bess.coordinates.lat,
        bess.coordinates.lon
      );
      
      if (distance < minDistance) {
        minDistance = distance;
      }
    }
    
    // Score: 0 at 0km, 50 at 25km, 100 at 50km+
    const score = Math.min(100, (minDistance / 50) * 100);
    
    return { score, distance: minDistance };
  }

  /**
   * Calculate load density score
   */
  _calculateLoadDensity(h3Index, loadData) {
    if (!loadData || loadData.length === 0) {
      return 50; // Default medium density
    }
    
    const neighbors = this.getNeighbors(h3Index, 1);
    let totalLoad = 0;
    let count = 0;
    
    for (const load of loadData) {
      const loadH3 = this.coordinatesToH3(
        load.location.lat,
        load.location.lon
      );
      
      if (neighbors.includes(loadH3)) {
        totalLoad += load.load_mw;
        count++;
      }
    }
    
    const avgLoad = count > 0 ? totalLoad / count : 0;
    
    // Score: 0 at 0MW, 50 at 500MW, 100 at 1000MW+
    return Math.min(100, (avgLoad / 1000) * 100);
  }

  /**
   * Calculate overall hexagon score
   */
  _calculateOverallScore(components) {
    return (
      components.substationProximity * 0.25 +
      components.gridStress * 0.25 +
      components.weatherVulnerability * 0.20 +
      components.bessProximity * 0.15 +
      components.loadDensity * 0.15
    );
  }

  /**
   * Haversine distance calculation (in km)
   */
  _haversineDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = this._toRadians(lat2 - lat1);
    const dLon = this._toRadians(lon2 - lon1);
    
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this._toRadians(lat1)) * Math.cos(this._toRadians(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    
    return R * c;
  }

  _toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  /**
   * Clear cache (call periodically to prevent memory bloat)
   */
  clearCache() {
    this.hexagonCache.clear();
    logger.info('H3 hexagon cache cleared');
  }
}

module.exports = H3GeospatialAnalyzer;