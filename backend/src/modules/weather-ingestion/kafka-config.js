const { Kafka } = require('kafkajs');
const crypto = require('crypto');

const kafka = new Kafka({
  clientId: 'weather-impact-system',
  brokers: (process.env.KAFKA_BROKERS || 'localhost:9092').split(','),
  ssl: process.env.KAFKA_SSL === 'true',
});

const producer = kafka.producer({
  allowAutoTopicCreation: true,
  transactionTimeout: 30000,
});

const consumer = kafka.consumer({
  groupId: 'weather-ingestion-group',
  sessionTimeout: 30000,
  heartbeatInterval: 3000,
});

const admin = kafka.admin();

// Topic configurations
const TOPICS = {
  WEATHER_RAW: 'weather.raw',
  WEATHER_VALIDATED: 'weather.validated',
  WEATHER_PREDICTIONS: 'weather.predictions',
  GRID_TELEMETRY: 'grid.telemetry',
  GRID_ALERTS: 'grid.alerts'
};

// Encryption utilities
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = Buffer.from(process.env.WEATHER_ENCRYPTION_KEY || crypto.randomBytes(32));

function encryptWeatherData(data) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
  
  const encrypted = Buffer.concat([
    cipher.update(JSON.stringify(data), 'utf8'),
    cipher.final()
  ]);
  
  const authTag = cipher.getAuthTag();
  
  return {
    encrypted: encrypted.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64')
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
    decipher.final()
  ]);
  
  return JSON.parse(decrypted.toString('utf8'));
}

async function initializeTopics() {
  try {
    await admin.connect();
    
    const existingTopics = await admin.listTopics();
    const topicsToCreate = Object.values(TOPICS).filter(
      topic => !existingTopics.includes(topic)
    );
    
    if (topicsToCreate.length > 0) {
      await admin.createTopics({
        topics: topicsToCreate.map(topic => ({
          topic,
          numPartitions: 3,
          replicationFactor: 1,
          configEntries: [
            { name: 'retention.ms', value: '604800000' }, // 7 days
            { name: 'compression.type', value: 'snappy' }
          ]
        }))
      });
    }
    
    await admin.disconnect();
  } catch (error) {
    console.error('Failed to initialize Kafka topics:', error);
    throw error;
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
  initializeTopics
};