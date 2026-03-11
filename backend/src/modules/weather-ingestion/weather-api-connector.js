const axios = require('axios');
const { producer, TOPICS } = require('./kafka-config');
const logger = require('../../utils/logger');

class WeatherAPIConnector {
  constructor() {
    this.sources = [
      {
        name: 'NOAA',
        baseUrl: process.env.NOAA_API_URL || 'https://api.weather.gov',
        apiKey: process.env.NOAA_API_KEY,
        refreshInterval: 900000, // 15 minutes
        regions: ['northeast', 'midwest', 'western', 'southern', 'pacific'],
      },
      {
        name: 'OpenWeatherMap',
        baseUrl: 'https://api.openweathermap.org/data/2.5',
        apiKey: process.env.OPENWEATHER_API_KEY,
        refreshInterval: 900000,
        regions: ['northeast', 'midwest', 'western', 'southern', 'pacific'],
      },
    ];
    
    this.regionCoordinates = {
      northeast: { lat: 42.3601, lon: -71.0589 }, // Boston
      midwest: { lat: 41.8781, lon: -87.6298 }, // Chicago
      western: { lat: 37.7749, lon: -122.4194 }, // San Francisco
      southern: { lat: 29.7604, lon: -95.3698 }, // Houston
      pacific: { lat: 47.6062, lon: -122.3321 }, // Seattle
    };
    
    this.intervals = [];
  }

  async start() {
    logger.info('Starting weather API connectors');
    
    for (const source of this.sources) {
      // Initial fetch
      await this.fetchFromSource(source);
      
      // Schedule periodic fetches
      const interval = setInterval(
        () => this.fetchFromSource(source),
        source.refreshInterval
      );
      this.intervals.push(interval);
    }
  }

  async fetchFromSource(source) {
    for (const region of source.regions) {
      try {
        const weatherData = await this.fetchWeatherData(source, region);
        await this.publishToKafka(weatherData);
      } catch (error) {
        logger.error('Failed to fetch weather data', {
          source: source.name,
          region,
          error: error.message,
        });
      }
    }
  }

  async fetchWeatherData(source, region) {
    const coords = this.regionCoordinates[region];
    let weatherData;
    
    if (source.name === 'NOAA') {
      weatherData = await this.fetchNOAAData(source, coords, region);
    } else if (source.name === 'OpenWeatherMap') {
      weatherData = await this.fetchOpenWeatherData(source, coords, region);
    }
    
    return weatherData;
  }

  async fetchNOAAData(source, coords, region) {
    const response = await axios.get(`${source.baseUrl}/points/${coords.lat},${coords.lon}`, {
      headers: {
        'User-Agent': 'WeatherImpactSystem/1.0',
      },
      timeout: 10000,
    });
    
    const forecastUrl = response.data.properties.forecast;
    const forecastResponse = await axios.get(forecastUrl, {
      headers: {
        'User-Agent': 'WeatherImpactSystem/1.0',
      },
      timeout: 10000,
    });
    
    const currentPeriod = forecastResponse.data.properties.periods[0];
    
    return {
      timestamp: new Date().toISOString(),
      gridRegionId: this.getRegionId(region),
      location: coords,
      source: 'NOAA',
      temperature: this.fahrenheitToCelsius(currentPeriod.temperature),
      windSpeed: this.parseWindSpeed(currentPeriod.windSpeed),
      humidity: currentPeriod.relativeHumidity?.value || null,
      precipitation: 0, // NOAA doesn't provide current precipitation in this endpoint
      pressure: null,
      solarRadiation: null,
      conditions: currentPeriod.shortForecast,
    };
  }

  async fetchOpenWeatherData(source, coords, region) {
    const response = await axios.get(`${source.baseUrl}/weather`, {
      params: {
        lat: coords.lat,
        lon: coords.lon,
        appid: source.apiKey,
        units: 'metric',
      },
      timeout: 10000,
    });
    
    const data = response.data;
    
    return {
      timestamp: new Date(data.dt * 1000).toISOString(),
      gridRegionId: this.getRegionId(region),
      location: coords,
      source: 'OpenWeatherMap',
      temperature: data.main.temp,
      windSpeed: data.wind.speed,
      humidity: data.main.humidity,
      precipitation: data.rain?.['1h'] || 0,
      pressure: data.main.pressure,
      solarRadiation: null,
      conditions: data.weather[0].description,
    };
  }

  async publishToKafka(weatherData) {
    await producer.send({
      topic: TOPICS.RAW_WEATHER,
      messages: [
        {
          key: `${weatherData.gridRegionId}`,
          value: JSON.stringify(weatherData),
          timestamp: Date.now().toString(),
        },
      ],
    });
    
    logger.debug('Published weather data to Kafka', {
      source: weatherData.source,
      region: weatherData.gridRegionId,
    });
  }

  getRegionId(regionName) {
    const regionMap = {
      northeast: 1,
      midwest: 2,
      western: 3,
      southern: 4,
      pacific: 5,
    };
    return regionMap[regionName] || 0;
  }

  fahrenheitToCelsius(fahrenheit) {
    return ((fahrenheit - 32) * 5) / 9;
  }

  parseWindSpeed(windSpeedStr) {
    // Parse "10 to 15 mph" format
    const match = windSpeedStr.match(/(\d+)/);
    if (match) {
      const mph = parseInt(match[1]);
      return mph * 0.44704; // Convert mph to m/s
    }
    return 0;
  }

  stop() {
    this.intervals.forEach(interval => clearInterval(interval));
    logger.info('Weather API connectors stopped');
  }
}

module.exports = WeatherAPIConnector;