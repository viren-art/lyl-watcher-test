const { Kafka } = require('kafkajs');
const { encryptData, decryptData } = require('../../utils/encryption');
const logger = require('../../utils/logger');

const kafka = new Kafka({
  clientId: 'weather-ingestion-service',
  brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
  ssl: process.env.KAFKA_SSL === 'true' ? {
    rejectUnauthorized: true,
    ca: [process.env.KAFKA_SSL_CA_CERT],
    cert: process.env.KAFKA_SSL_CLIENT_CERT,
    key: process.env.KAFKA_SSL_CLIENT_KEY,
  } : undefined,
  sasl: process.env.KAFKA_SASL_ENABLED === 'true' ? {
    mechanism: 'plain',
    username: process.env.KAFKA_USERNAME,
    password: process.env.KAFKA_PASSWORD,
  } : undefined,
  retry: {
    initialRetryTime: 100,
    retries: 8,
    maxRetryTime: 30000,
    multiplier: 2,
  },
});

const producer = kafka.producer({
  allowAutoTopicCreation: false,
  transactionTimeout: 30000,
  maxInFlightRequests: 5,
  idempotent: true,
  compression: 1, // GZIP compression
});

const consumer = kafka.consumer({
  groupId: 'weather-processing-group',
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
  maxBytesPerPartition: 1048576, // 1MB
  retry: {
    retries: 5,
  },
});

const admin = kafka.admin();

// Topic configurations
const TOPICS = {
  RAW_WEATHER: 'weather.raw',
  VALIDATED_WEATHER: 'weather.validated',
  ANOMALIES: 'weather.anomalies',
  PREDICTIONS: 'weather.predictions',
};

/**
 * Encrypts weather data using AES-256-GCM with PBKDF2 key derivation
 * @param {Object} data - Weather data to encrypt
 * @returns {Object} Encrypted data with metadata
 */
function encryptWeatherData(data) {
  try {
    return encryptData(data);
  } catch (error) {
    logger.error('Failed to encrypt weather data', { error: error.message });
    throw error;
  }
}

/**
 * Decrypts weather data
 * @param {Object} encryptedData - Encrypted weather data
 * @returns {Object} Decrypted weather data
 */
function decryptWeatherData(encryptedData) {
  try {
    return decryptData(encryptedData);
  } catch (error) {
    logger.error('Failed to decrypt weather data', { error: error.message });
    throw error;
  }
}

async function initializeTopics() {
  await admin.connect();
  
  try {
    const existingTopics = await admin.listTopics();
    const topicsToCreate = Object.values(TOPICS).filter(
      topic => !existingTopics.includes(topic)
    );
    
    if (topicsToCreate.length > 0) {
      await admin.createTopics({
        topics: topicsToCreate.map(topic => ({
          topic,
          numPartitions: 10,
          replicationFactor: 3,
          configEntries: [
            { name: 'compression.type', value: 'gzip' },
            { name: 'retention.ms', value: '2592000000' }, // 30 days
            { name: 'segment.ms', value: '86400000' }, // 1 day
          ],
        })),
      });
      
      logger.info('Kafka topics created', { topics: topicsToCreate });
    }
  } finally {
    await admin.disconnect();
  }
}

module.exports = {
  kafka,
  producer,
  consumer,
  admin,
  TOPICS,
  encryptWeatherData,
  decryptWeatherData,
  initializeTopics,
};