const mqttConfig = require('./mqtt-config');
const { producer, TOPICS } = require('../weather-ingestion/kafka-config');
const { storeTelemetryBatch } = require('../../database/grid-data/telemetry-repository');
const logger = require('../../utils/logger');

class TelemetryIngestionService {
  constructor() {
    this.processingBuffer = [];
    this.bufferSize = 1000;
    this.flushInterval = 5000; // 5 seconds
    this.flushTimer = null;
    
    this.metrics = {
      totalMessages: 0,
      messagesPerSecond: 0,
      lastFlushTime: Date.now(),
      bufferFlushes: 0,
      errors: 0
    };
    
    this.metricsInterval = null;
  }

  async start() {
    try {
      // Connect to MQTT broker
      await mqttConfig.connect();
      
      // Subscribe to SCADA topics
      this._subscribeToTopics();
      
      // Start buffer flush timer
      this._startFlushTimer();
      
      // Start metrics reporting
      this._startMetricsReporting();
      
      logger.info('Telemetry ingestion service started');
      
    } catch (error) {
      logger.error('Failed to start telemetry ingestion', { error: error.message });
      throw error;
    }
  }

  _subscribeToTopics() {
    // Subscribe to substation telemetry
    mqttConfig.subscribe(
      mqttConfig.TOPICS.SUBSTATION_TELEMETRY,
      this._handleSubstationTelemetry.bind(this)
    );
    
    // Subscribe to transmission line status
    mqttConfig.subscribe(
      mqttConfig.TOPICS.TRANSMISSION_LINE,
      this._handleTransmissionStatus.bind(this)
    );
    
    // Subscribe to generation units
    mqttConfig.subscribe(
      mqttConfig.TOPICS.GENERATION_UNITS,
      this._handleGenerationOutput.bind(this)
    );
    
    // Subscribe to system status
    mqttConfig.subscribe(
      mqttConfig.TOPICS.SYSTEM_STATUS,
      this._handleSystemStatus.bind(this)
    );
  }

  _handleSubstationTelemetry(topic, payload) {
    try {
      // Extract substation ID from topic (scada/substations/{id}/telemetry)
      const substationId = parseInt(topic.split('/')[2]);
      
      const telemetryData = {
        substationId,
        timestamp: new Date(payload.timestamp || Date.now()).toISOString(),
        loadMw: parseFloat(payload.load_mw),
        generationMw: parseFloat(payload.generation_mw || 0),
        voltageKv: parseFloat(payload.voltage_kv),
        frequencyHz: parseFloat(payload.frequency_hz),
        temperature: parseFloat(payload.temperature || 0),
        status: payload.status || 'normal',
        capacityUtilization: parseFloat(payload.capacity_utilization || 0),
        renewablePercentage: parseFloat(payload.renewable_percentage || 0)
      };
      
      // Validate data
      if (this._validateTelemetry(telemetryData)) {
        this._bufferTelemetry(telemetryData);
        this.metrics.totalMessages++;
      } else {
        logger.warn('Invalid telemetry data', { substationId, payload });
        this.metrics.errors++;
      }
      
    } catch (error) {
      logger.error('Failed to process substation telemetry', { 
        topic, 
        error: error.message 
      });
      this.metrics.errors++;
    }
  }

  _handleTransmissionStatus(topic, payload) {
    try {
      const lineId = parseInt(topic.split('/')[2]);
      
      logger.debug('Transmission line status received', { lineId, payload });
      
      // Store transmission line data (future enhancement)
      // For now, just log
      
    } catch (error) {
      logger.error('Failed to process transmission status', { 
        topic, 
        error: error.message 
      });
    }
  }

  _handleGenerationOutput(topic, payload) {
    try {
      const unitId = parseInt(topic.split('/')[2]);
      
      logger.debug('Generation unit output received', { unitId, payload });
      
      // Store generation data (future enhancement)
      
    } catch (error) {
      logger.error('Failed to process generation output', { 
        topic, 
        error: error.message 
      });
    }
  }

  _handleSystemStatus(topic, payload) {
    try {
      logger.info('System status update', { payload });
      
      // Publish to Kafka for monitoring
      producer.send({
        topic: TOPICS.GRID_ALERTS,
        messages: [{
          key: 'system_status',
          value: JSON.stringify({
            type: 'SYSTEM_STATUS',
            ...payload,
            timestamp: new Date().toISOString()
          })
        }]
      });
      
    } catch (error) {
      logger.error('Failed to process system status', { 
        topic, 
        error: error.message 
      });
    }
  }

  _validateTelemetry(data) {
    // Check required fields
    if (!data.substationId || !data.timestamp) {
      return false;
    }
    
    // Validate ranges
    if (data.loadMw < 0 || data.loadMw > 10000) {
      return false;
    }
    
    if (data.voltageKv < 0 || data.voltageKv > 1000) {
      return false;
    }
    
    if (data.frequencyHz < 55 || data.frequencyHz > 65) {
      return false;
    }
    
    return true;
  }

  _bufferTelemetry(data) {
    this.processingBuffer.push(data);
    
    // Flush if buffer is full
    if (this.processingBuffer.length >= this.bufferSize) {
      this._flushBuffer();
    }
  }

  async _flushBuffer() {
    if (this.processingBuffer.length === 0) {
      return;
    }
    
    const batch = [...this.processingBuffer];
    this.processingBuffer = [];
    
    try {
      // Store in TimescaleDB
      await storeTelemetryBatch(batch);
      
      // Publish to Kafka for real-time processing
      await producer.send({
        topic: TOPICS.GRID_TELEMETRY,
        messages: batch.map(data => ({
          key: `${data.substationId}`,
          value: JSON.stringify(data)
        }))
      });
      
      this.metrics.bufferFlushes++;
      this.metrics.lastFlushTime = Date.now();
      
      logger.debug('Telemetry buffer flushed', { 
        batchSize: batch.length,
        totalFlushes: this.metrics.bufferFlushes
      });
      
    } catch (error) {
      logger.error('Failed to flush telemetry buffer', { 
        batchSize: batch.length,
        error: error.message 
      });
      
      // Re-add to buffer for retry
      this.processingBuffer.unshift(...batch);
      this.metrics.errors++;
    }
  }

  _startFlushTimer() {
    this.flushTimer = setInterval(() => {
      this._flushBuffer();
    }, this.flushInterval);
  }

  _startMetricsReporting() {
    this.metricsInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - this.metrics.lastFlushTime) / 1000;
      this.metrics.messagesPerSecond = Math.round(
        this.metrics.totalMessages / elapsed
      );
      
      logger.info('Telemetry ingestion metrics', {
        totalMessages: this.metrics.totalMessages,
        messagesPerSecond: this.metrics.messagesPerSecond,
        bufferSize: this.processingBuffer.length,
        bufferFlushes: this.metrics.bufferFlushes,
        errors: this.metrics.errors
      });
    }, 60000); // Every minute
  }

  async stop() {
    // Flush remaining buffer
    await this._flushBuffer();
    
    // Clear timers
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
    
    // Disconnect MQTT
    await mqttConfig.disconnect();
    
    logger.info('Telemetry ingestion service stopped');
  }

  getMetrics() {
    return {
      ...this.metrics,
      bufferSize: this.processingBuffer.length
    };
  }
}

module.exports = TelemetryIngestionService;