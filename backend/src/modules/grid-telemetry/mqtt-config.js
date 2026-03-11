const mqtt = require('mqtt');
const logger = require('../../utils/logger');

class MQTTConfig {
  constructor() {
    this.client = null;
    this.subscriptions = new Map();
    this.messageHandlers = new Map();
    
    this.config = {
      host: process.env.MQTT_BROKER_HOST || 'localhost',
      port: parseInt(process.env.MQTT_BROKER_PORT) || 1883,
      protocol: process.env.MQTT_PROTOCOL || 'mqtt',
      username: process.env.MQTT_USERNAME,
      password: process.env.MQTT_PASSWORD,
      clientId: `grid-telemetry-${Date.now()}`,
      clean: true,
      reconnectPeriod: 5000,
      connectTimeout: 30000,
      keepalive: 60
    };
    
    // SCADA topics for grid telemetry
    this.TOPICS = {
      SUBSTATION_TELEMETRY: 'scada/substations/+/telemetry',
      TRANSMISSION_LINE: 'scada/transmission/+/status',
      GENERATION_UNITS: 'scada/generation/+/output',
      LOAD_FORECAST: 'scada/load/forecast',
      SYSTEM_STATUS: 'scada/system/status'
    };
  }

  async connect() {
    return new Promise((resolve, reject) => {
      try {
        const url = `${this.config.protocol}://${this.config.host}:${this.config.port}`;
        
        this.client = mqtt.connect(url, this.config);
        
        this.client.on('connect', () => {
          logger.info('MQTT client connected', { 
            broker: url,
            clientId: this.config.clientId 
          });
          resolve();
        });
        
        this.client.on('error', (error) => {
          logger.error('MQTT connection error', { error: error.message });
          reject(error);
        });
        
        this.client.on('message', (topic, message) => {
          this._handleMessage(topic, message);
        });
        
        this.client.on('reconnect', () => {
          logger.warn('MQTT client reconnecting');
        });
        
        this.client.on('close', () => {
          logger.warn('MQTT client disconnected');
        });
        
      } catch (error) {
        logger.error('Failed to create MQTT client', { error: error.message });
        reject(error);
      }
    });
  }

  subscribe(topic, handler) {
    if (!this.client) {
      throw new Error('MQTT client not connected');
    }
    
    this.client.subscribe(topic, { qos: 1 }, (error) => {
      if (error) {
        logger.error('MQTT subscription failed', { topic, error: error.message });
      } else {
        logger.info('MQTT subscribed to topic', { topic });
        this.subscriptions.set(topic, true);
        this.messageHandlers.set(topic, handler);
      }
    });
  }

  unsubscribe(topic) {
    if (!this.client) return;
    
    this.client.unsubscribe(topic, (error) => {
      if (error) {
        logger.error('MQTT unsubscribe failed', { topic, error: error.message });
      } else {
        logger.info('MQTT unsubscribed from topic', { topic });
        this.subscriptions.delete(topic);
        this.messageHandlers.delete(topic);
      }
    });
  }

  publish(topic, message, options = {}) {
    if (!this.client) {
      throw new Error('MQTT client not connected');
    }
    
    const payload = typeof message === 'string' ? message : JSON.stringify(message);
    
    this.client.publish(topic, payload, { qos: 1, ...options }, (error) => {
      if (error) {
        logger.error('MQTT publish failed', { topic, error: error.message });
      }
    });
  }

  _handleMessage(topic, message) {
    try {
      const payload = JSON.parse(message.toString());
      
      // Find matching handler
      for (const [subscribedTopic, handler] of this.messageHandlers.entries()) {
        if (this._topicMatches(topic, subscribedTopic)) {
          handler(topic, payload);
          break;
        }
      }
      
    } catch (error) {
      logger.error('Failed to process MQTT message', { 
        topic, 
        error: error.message 
      });
    }
  }

  _topicMatches(actualTopic, subscribedTopic) {
    const actualParts = actualTopic.split('/');
    const subscribedParts = subscribedTopic.split('/');
    
    if (actualParts.length !== subscribedParts.length) {
      return false;
    }
    
    for (let i = 0; i < subscribedParts.length; i++) {
      if (subscribedParts[i] === '+') continue;
      if (subscribedParts[i] === '#') return true;
      if (subscribedParts[i] !== actualParts[i]) return false;
    }
    
    return true;
  }

  async disconnect() {
    if (this.client) {
      return new Promise((resolve) => {
        this.client.end(false, () => {
          logger.info('MQTT client disconnected');
          resolve();
        });
      });
    }
  }
}

module.exports = new MQTTConfig();