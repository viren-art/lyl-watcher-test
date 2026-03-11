const logger = require('../../utils/logger');

class WeatherDataValidator {
  constructor() {
    this.validationRules = {
      temperature: { min: -100, max: 60, unit: 'celsius' },
      windSpeed: { min: 0, max: 150, unit: 'm/s' },
      precipitation: { min: 0, max: 500, unit: 'mm' },
      humidity: { min: 0, max: 100, unit: 'percent' },
      solarRadiation: { min: 0, max: 1500, unit: 'W/m²' },
      pressure: { min: 800, max: 1100, unit: 'hPa' },
    };
    
    this.requiredFields = [
      'timestamp',
      'gridRegionId',
      'location',
      'source',
    ];
    
    this.anomalyThresholds = {
      temperatureChange: 20, // Max °C change per hour
      windSpeedChange: 30, // Max m/s change per hour
      pressureChange: 10, // Max hPa change per hour
    };
  }

  validate(weatherData) {
    const errors = [];
    const warnings = [];
    
    // Check required fields
    for (const field of this.requiredFields) {
      if (!weatherData[field]) {
        errors.push(`Missing required field: ${field}`);
      }
    }
    
    // Validate timestamp
    if (weatherData.timestamp) {
      const timestamp = new Date(weatherData.timestamp);
      if (isNaN(timestamp.getTime())) {
        errors.push('Invalid timestamp format');
      } else {
        const now = Date.now();
        const dataAge = now - timestamp.getTime();
        if (dataAge > 3600000) { // 1 hour
          warnings.push(`Data is ${Math.floor(dataAge / 60000)} minutes old`);
        }
        if (timestamp.getTime() > now + 60000) { // Future timestamp
          errors.push('Timestamp is in the future');
        }
      }
    }
    
    // Validate location
    if (weatherData.location) {
      const { lat, lon } = weatherData.location;
      if (lat < -90 || lat > 90) {
        errors.push(`Invalid latitude: ${lat}`);
      }
      if (lon < -180 || lon > 180) {
        errors.push(`Invalid longitude: ${lon}`);
      }
    }
    
    // Validate measurements
    for (const [field, rules] of Object.entries(this.validationRules)) {
      if (weatherData[field] !== undefined && weatherData[field] !== null) {
        const value = weatherData[field];
        if (typeof value !== 'number' || isNaN(value)) {
          errors.push(`${field} must be a valid number`);
        } else if (value < rules.min || value > rules.max) {
          errors.push(
            `${field} out of range: ${value} (expected ${rules.min}-${rules.max} ${rules.unit})`
          );
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  detectAnomalies(currentData, previousData) {
    if (!previousData) return { hasAnomalies: false, anomalies: [] };
    
    const anomalies = [];
    
    // Temperature change detection
    if (currentData.temperature && previousData.temperature) {
      const tempChange = Math.abs(currentData.temperature - previousData.temperature);
      if (tempChange > this.anomalyThresholds.temperatureChange) {
        anomalies.push({
          type: 'RAPID_TEMPERATURE_CHANGE',
          severity: 'HIGH',
          message: `Temperature changed by ${tempChange.toFixed(1)}°C`,
          current: currentData.temperature,
          previous: previousData.temperature,
        });
      }
    }
    
    // Wind speed change detection
    if (currentData.windSpeed && previousData.windSpeed) {
      const windChange = Math.abs(currentData.windSpeed - previousData.windSpeed);
      if (windChange > this.anomalyThresholds.windSpeedChange) {
        anomalies.push({
          type: 'RAPID_WIND_CHANGE',
          severity: 'MEDIUM',
          message: `Wind speed changed by ${windChange.toFixed(1)} m/s`,
          current: currentData.windSpeed,
          previous: previousData.windSpeed,
        });
      }
    }
    
    // Pressure change detection
    if (currentData.pressure && previousData.pressure) {
      const pressureChange = Math.abs(currentData.pressure - previousData.pressure);
      if (pressureChange > this.anomalyThresholds.pressureChange) {
        anomalies.push({
          type: 'RAPID_PRESSURE_CHANGE',
          severity: 'MEDIUM',
          message: `Pressure changed by ${pressureChange.toFixed(1)} hPa`,
          current: currentData.pressure,
          previous: previousData.pressure,
        });
      }
    }
    
    // Duplicate detection
    if (currentData.timestamp === previousData.timestamp &&
        currentData.gridRegionId === previousData.gridRegionId) {
      anomalies.push({
        type: 'DUPLICATE_DATA',
        severity: 'LOW',
        message: 'Duplicate timestamp and region detected',
      });
    }
    
    return {
      hasAnomalies: anomalies.length > 0,
      anomalies,
    };
  }

  sanitize(weatherData) {
    const sanitized = { ...weatherData };
    
    // Round numeric values to appropriate precision
    const numericFields = Object.keys(this.validationRules);
    for (const field of numericFields) {
      if (sanitized[field] !== undefined && sanitized[field] !== null) {
        sanitized[field] = parseFloat(sanitized[field].toFixed(2));
      }
    }
    
    // Ensure timestamp is ISO 8601
    if (sanitized.timestamp) {
      sanitized.timestamp = new Date(sanitized.timestamp).toISOString();
    }
    
    // Add validation metadata
    sanitized.validatedAt = new Date().toISOString();
    sanitized.validatorVersion = '1.0.0';
    
    return sanitized;
  }
}

module.exports = WeatherDataValidator;