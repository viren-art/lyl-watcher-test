const { Kafka } = require('kafkajs');
const crypto = require('crypto');

const kafka = new Kafka({
  clientId: 'weather-ingestion-service',
  brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
  ssl: process.env.KAFKA_SSL === 'true',
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

// Encryption utilities
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = Buffer.from(process.env.WEATHER_ENCRYPTION_KEY || crypto.randomBytes(32));

function encryptWeatherData(data) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), 'utf8'),
    cipher.final(),
  ]);
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
  };
}

function decryptWeatherData(encryptedData) {
  const decipher = crypto.createDecipheriv(
    ENCRYPTION_ALGORITHM,
    ENCRYPTION_KEY,
    Buffer.from(encryptedData.iv, 'base64')
  );
  
  decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'base64'));
  
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedData.encrypted, 'base64')),
    decipher.final(),
  ]);
  
  return JSON.parse(decrypted.toString('utf8'));
}

async function initializeTopics() {
  await admin.connect();
  
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
  }
  
  await admin.disconnect();
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