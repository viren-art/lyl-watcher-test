const { producer, consumer, TOPICS, encryptWeatherData, initializeTopics } = require('./kafka-config');
const WeatherDataValidator = require('./data-validator');
const logger = require('../../utils/logger');
const { storeWeatherData, getLatestWeatherData } = require('../../database/timeseries/weather-repository');

class WeatherIngestionService {
  constructor() {
    this.validator = new WeatherDataValidator();
    this.isRunning = false;
    this.metrics = {
      totalProcessed: 0,
      validRecords: 0,
      invalidRecords: 0,
      anomaliesDetected: 0,
      processingErrors: 0,
      lastProcessedTimestamp: null,
    };
    this.previousDataCache = new Map(); // Cache for anomaly detection
  }

  async start() {
    try {
      await initializeTopics();
      await producer.connect();
      await consumer.connect();
      
      await consumer.subscribe({
        topics: [TOPICS.RAW_WEATHER],
        fromBeginning: false,
      });
      
      this.isRunning = true;
      logger.info('Weather ingestion service started');
      
      await this.processMessages();
    } catch (error) {
      logger.error('Failed to start weather ingestion service', { error: error.message });
      throw error;
    }
  }

  async processMessages() {
    await consumer.run({
      partitionsConsumedConcurrently: 5,
      eachBatchAutoResolve: false,
      eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning }) => {
        const messages = batch.messages;
        const processedMessages = [];
        
        for (const message of messages) {
          if (!isRunning()) break;
          
          try {
            const weatherData = JSON.parse(message.value.toString());
            const processed = await this.processWeatherData(weatherData);
            
            if (processed) {
              processedMessages.push(processed);
            }
            
            resolveOffset(message.offset);
            await heartbeat();
          } catch (error) {
            logger.error('Error processing weather message', {
              error: error.message,
              offset: message.offset,
            });
            this.metrics.processingErrors++;
          }
        }
        
        // Batch store to database
        if (processedMessages.length > 0) {
          await this.batchStoreWeatherData(processedMessages);
        }
        
        // Update metrics
        this.metrics.lastProcessedTimestamp = new Date().toISOString();
        
        // Log throughput metrics every 1000 messages
        if (this.metrics.totalProcessed % 1000 === 0) {
          logger.info('Weather ingestion metrics', this.metrics);
        }
      },
    });
  }

  async processWeatherData(weatherData) {
    this.metrics.totalProcessed++;
    
    // Validate data
    const validation = this.validator.validate(weatherData);
    
    if (!validation.isValid) {
      logger.warn('Invalid weather data', {
        errors: validation.errors,
        data: weatherData,
      });
      this.metrics.invalidRecords++;
      
      // Send to anomalies topic for analysis
      await this.publishAnomaly({
        type: 'VALIDATION_FAILURE',
        errors: validation.errors,
        data: weatherData,
        timestamp: new Date().toISOString(),
      });
      
      return null;
    }
    
    // Log warnings but continue processing
    if (validation.warnings.length > 0) {
      logger.debug('Weather data warnings', {
        warnings: validation.warnings,
        regionId: weatherData.gridRegionId,
      });
    }
    
    // Detect anomalies
    const cacheKey = `${weatherData.gridRegionId}-${weatherData.location.lat}-${weatherData.location.lon}`;
    const previousData = this.previousDataCache.get(cacheKey);
    const anomalyCheck = this.validator.detectAnomalies(weatherData, previousData);
    
    if (anomalyCheck.hasAnomalies) {
      logger.warn('Weather anomalies detected', {
        anomalies: anomalyCheck.anomalies,
        regionId: weatherData.gridRegionId,
      });
      this.metrics.anomaliesDetected++;
      
      await this.publishAnomaly({
        type: 'ANOMALY_DETECTED',
        anomalies: anomalyCheck.anomalies,
        data: weatherData,
        timestamp: new Date().toISOString(),
      });
    }
    
    // Update cache
    this.previousDataCache.set(cacheKey, weatherData);
    
    // Sanitize and encrypt
    const sanitized = this.validator.sanitize(weatherData);
    const encrypted = encryptWeatherData(sanitized);
    
    this.metrics.validRecords++;
    
    // Publish to validated topic
    await this.publishValidatedData({
      ...encrypted,
      metadata: {
        originalTimestamp: weatherData.timestamp,
        gridRegionId: weatherData.gridRegionId,
        source: weatherData.source,
      },
    });
    
    return {
      encrypted,
      plaintext: sanitized, // For immediate database storage
    };
  }

  async publishValidatedData(data) {
    await producer.send({
      topic: TOPICS.VALIDATED_WEATHER,
      messages: [
        {
          key: `${data.metadata.gridRegionId}`,
          value: JSON.stringify(data),
          timestamp: Date.now().toString(),
        },
      ],
    });
  }

  async publishAnomaly(anomaly) {
    await producer.send({
      topic: TOPICS.ANOMALIES,
      messages: [
        {
          value: JSON.stringify(anomaly),
          timestamp: Date.now().toString(),
        },
      ],
    });
  }

  async batchStoreWeatherData(processedMessages) {
    try {
      const dataToStore = processedMessages.map(msg => msg.plaintext);
      await storeWeatherData(dataToStore);
      
      logger.debug('Batch stored weather data', {
        count: dataToStore.length,
      });
    } catch (error) {
      logger.error('Failed to batch store weather data', {
        error: error.message,
        count: processedMessages.length,
      });
      throw error;
    }
  }

  async stop() {
    this.isRunning = false;
    await consumer.disconnect();
    await producer.disconnect();
    logger.info('Weather ingestion service stopped', this.metrics);
  }

  getMetrics() {
    return {
      ...this.metrics,
      dataGapPercentage: this.metrics.totalProcessed > 0
        ? ((this.metrics.invalidRecords / this.metrics.totalProcessed) * 100).toFixed(2)
        : 0,
      validationRate: this.metrics.totalProcessed > 0
        ? ((this.metrics.validRecords / this.metrics.totalProcessed) * 100).toFixed(2)
        : 0,
    };
  }
}

module.exports = WeatherIngestionService;