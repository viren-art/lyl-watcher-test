const { Client } = require('@elastic/elasticsearch');
const { Pool } = require('pg');
const logger = require('../../utils/logger');

const esClient = new Client({
  node: process.env.ELASTICSEARCH_URL || 'http://localhost:9200',
  auth: {
    username: process.env.ELASTICSEARCH_USER || 'elastic',
    password: process.env.ELASTICSEARCH_PASSWORD || 'changeme'
  }
});

const pgPool = new Pool({
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || 5432,
  database: process.env.POSTGRES_DB || 'weather_impact',
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres'
});

const AUDIT_INDEX = 'bess-audit-logs';
const RETENTION_DAYS = 730; // 2 years for NERC CIP compliance

class AuditService {
  constructor() {
    this.initializeIndex();
  }

  /**
   * Initialize Elasticsearch index with proper mappings
   */
  async initializeIndex() {
    try {
      const indexExists = await esClient.indices.exists({ index: AUDIT_INDEX });
      
      if (!indexExists) {
        await esClient.indices.create({
          index: AUDIT_INDEX,
          body: {
            settings: {
              number_of_shards: 3,
              number_of_replicas: 2,
              'index.lifecycle.name': 'bess-audit-policy',
              'index.lifecycle.rollover_alias': AUDIT_INDEX
            },
            mappings: {
              properties: {
                timestamp: { type: 'date' },
                eventType: { type: 'keyword' },
                resourceType: { type: 'keyword' },
                resourceId: { type: 'keyword' },
                userId: { type: 'integer' },
                customerId: { type: 'integer' },
                action: { type: 'keyword' },
                status: { type: 'keyword' },
                ipAddress: { type: 'ip' },
                userAgent: { type: 'text' },
                requestId: { type: 'keyword' },
                metadata: { type: 'object', enabled: true },
                inputData: { type: 'object', enabled: true },
                outputData: { type: 'object', enabled: true },
                algorithmVersion: { type: 'keyword' },
                modelVersion: { type: 'keyword' },
                complianceFlags: { type: 'keyword' },
                dataClassification: { type: 'keyword' },
                retentionDate: { type: 'date' }
              }
            }
          }
        });

        logger.info('Audit index created', { index: AUDIT_INDEX });
      }

      // Create ILM policy for 2-year retention
      await this._createRetentionPolicy();
    } catch (error) {
      logger.error('Failed to initialize audit index', { error: error.message });
    }
  }

  /**
   * Create Index Lifecycle Management policy for 2-year retention
   */
  async _createRetentionPolicy() {
    try {
      await esClient.ilm.putLifecycle({
        name: 'bess-audit-policy',
        body: {
          policy: {
            phases: {
              hot: {
                min_age: '0ms',
                actions: {
                  rollover: {
                    max_age: '30d',
                    max_size: '50gb'
                  },
                  set_priority: {
                    priority: 100
                  }
                }
              },
              warm: {
                min_age: '90d',
                actions: {
                  set_priority: {
                    priority: 50
                  },
                  readonly: {}
                }
              },
              cold: {
                min_age: '365d',
                actions: {
                  set_priority: {
                    priority: 0
                  },
                  freeze: {}
                }
              },
              delete: {
                min_age: `${RETENTION_DAYS}d`,
                actions: {
                  delete: {}
                }
              }
            }
          }
        }
      });

      logger.info('ILM policy created', { policy: 'bess-audit-policy', retentionDays: RETENTION_DAYS });
    } catch (error) {
      logger.error('Failed to create ILM policy', { error: error.message });
    }
  }

  /**
   * Log audit event to Elasticsearch and PostgreSQL
   */
  async logAuditEvent(event) {
    const auditRecord = {
      timestamp: new Date().toISOString(),
      eventType: event.eventType,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      userId: event.userId,
      customerId: event.customerId,
      action: event.action || 'READ',
      status: event.status || 'SUCCESS',
      ipAddress: event.ipAddress,
      userAgent: event.userAgent,
      requestId: event.requestId,
      metadata: event.metadata || {},
      inputData: event.inputData || null,
      outputData: event.outputData || null,
      algorithmVersion: event.algorithmVersion,
      modelVersion: event.modelVersion,
      complianceFlags: this._determineComplianceFlags(event),
      dataClassification: this._classifyData(event),
      retentionDate: this._calculateRetentionDate()
    };

    try {
      // Log to Elasticsearch for fast querying
      await esClient.index({
        index: AUDIT_INDEX,
        body: auditRecord
      });

      // Log to PostgreSQL for immutable compliance record
      await this._logToPostgres(auditRecord);

      logger.debug('Audit event logged', {
        eventType: event.eventType,
        resourceType: event.resourceType,
        resourceId: event.resourceId
      });

      return auditRecord;
    } catch (error) {
      logger.error('Failed to log audit event', {
        event,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Log to PostgreSQL for immutable audit trail
   */
  async _logToPostgres(record) {
    const query = `
      INSERT INTO audit_logs (
        timestamp, event_type, resource_type, resource_id,
        user_id, customer_id, action, status,
        ip_address, user_agent, request_id,
        metadata, input_data, output_data,
        algorithm_version, model_version,
        compliance_flags, data_classification, retention_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
    `;

    const values = [
      record.timestamp,
      record.eventType,
      record.resourceType,
      record.resourceId,
      record.userId,
      record.customerId,
      record.action,
      record.status,
      record.ipAddress,
      record.userAgent,
      record.requestId,
      JSON.stringify(record.metadata),
      JSON.stringify(record.inputData),
      JSON.stringify(record.outputData),
      record.algorithmVersion,
      record.modelVersion,
      record.complianceFlags,
      record.dataClassification,
      record.retentionDate
    ];

    await pgPool.query(query, values);
  }

  /**
   * Query audit logs with compliance filters
   */
  async queryAuditLogs(filters = {}) {
    try {
      const query = {
        bool: {
          must: []
        }
      };

      if (filters.eventType) {
        query.bool.must.push({ term: { eventType: filters.eventType } });
      }

      if (filters.resourceType) {
        query.bool.must.push({ term: { resourceType: filters.resourceType } });
      }

      if (filters.resourceId) {
        query.bool.must.push({ term: { resourceId: filters.resourceId } });
      }

      if (filters.userId) {
        query.bool.must.push({ term: { userId: filters.userId } });
      }

      if (filters.customerId) {
        query.bool.must.push({ term: { customerId: filters.customerId } });
      }

      if (filters.startDate || filters.endDate) {
        const range = {};
        if (filters.startDate) range.gte = filters.startDate;
        if (filters.endDate) range.lte = filters.endDate;
        query.bool.must.push({ range: { timestamp: range } });
      }

      if (filters.complianceFlag) {
        query.bool.must.push({ term: { complianceFlags: filters.complianceFlag } });
      }

      const result = await esClient.search({
        index: AUDIT_INDEX,
        body: {
          query,
          sort: [{ timestamp: { order: 'desc' } }],
          size: filters.limit || 100,
          from: filters.offset || 0
        }
      });

      return {
        total: result.hits.total.value,
        logs: result.hits.hits.map(hit => hit._source)
      };
    } catch (error) {
      logger.error('Failed to query audit logs', {
        filters,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Generate compliance report for regulatory review
   */
  async generateComplianceReport(customerId, startDate, endDate) {
    try {
      const logs = await this.queryAuditLogs({
        customerId,
        startDate,
        endDate,
        limit: 10000
      });

      const report = {
        customerId,
        reportPeriod: { startDate, endDate },
        generatedAt: new Date().toISOString(),
        totalEvents: logs.total,
        eventsByType: {},
        eventsByResource: {},
        complianceFlags: {},
        dataAccess: {
          totalAccess: 0,
          unauthorizedAttempts: 0,
          dataExports: 0
        },
        nercCipCompliance: {
          cyberSecurityEvents: 0,
          accessControlEvents: 0,
          dataProtectionEvents: 0
        }
      };

      logs.logs.forEach(log => {
        // Count by event type
        report.eventsByType[log.eventType] = (report.eventsByType[log.eventType] || 0) + 1;

        // Count by resource type
        report.eventsByResource[log.resourceType] = (report.eventsByResource[log.resourceType] || 0) + 1;

        // Count compliance flags
        if (log.complianceFlags) {
          log.complianceFlags.forEach(flag => {
            report.complianceFlags[flag] = (report.complianceFlags[flag] || 0) + 1;
          });
        }

        // Track data access
        if (log.action === 'READ') report.dataAccess.totalAccess++;
        if (log.status === 'UNAUTHORIZED') report.dataAccess.unauthorizedAttempts++;
        if (log.eventType === 'DATA_EXPORT') report.dataAccess.dataExports++;

        // NERC CIP specific tracking
        if (log.complianceFlags && log.complianceFlags.includes('NERC_CIP')) {
          if (log.eventType.includes('SECURITY')) report.nercCipCompliance.cyberSecurityEvents++;
          if (log.eventType.includes('ACCESS')) report.nercCipCompliance.accessControlEvents++;
          if (log.eventType.includes('DATA')) report.nercCipCompliance.dataProtectionEvents++;
        }
      });

      return report;
    } catch (error) {
      logger.error('Failed to generate compliance report', {
        customerId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get audit trail for specific BESS recommendation
   */
  async getBESSAuditTrail(locationId) {
    try {
      const logs = await this.queryAuditLogs({
        resourceType: 'BESS_LOCATION',
        resourceId: locationId.toString(),
        limit: 1000
      });

      return {
        locationId,
        totalEvents: logs.total,
        timeline: logs.logs.map(log => ({
          timestamp: log.timestamp,
          eventType: log.eventType,
          action: log.action,
          userId: log.userId,
          status: log.status,
          metadata: log.metadata
        })),
        inputDataHistory: logs.logs
          .filter(log => log.inputData)
          .map(log => ({
            timestamp: log.timestamp,
            inputData: log.inputData,
            algorithmVersion: log.algorithmVersion
          })),
        outputDataHistory: logs.logs
          .filter(log => log.outputData)
          .map(log => ({
            timestamp: log.timestamp,
            outputData: log.outputData,
            modelVersion: log.modelVersion
          }))
      };
    } catch (error) {
      logger.error('Failed to get BESS audit trail', {
        locationId,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Determine compliance flags based on event
   */
  _determineComplianceFlags(event) {
    const flags = [];

    // NERC CIP compliance for critical infrastructure
    if (event.resourceType === 'GRID_INFRASTRUCTURE' || 
        event.resourceType === 'BESS_LOCATION' ||
        event.eventType.includes('GRID')) {
      flags.push('NERC_CIP');
    }

    // GDPR compliance for customer data
    if (event.resourceType === 'CUSTOMER' || 
        event.metadata?.containsPII) {
      flags.push('GDPR');
    }

    // CCPA compliance for California customers
    if (event.metadata?.region === 'California') {
      flags.push('CCPA');
    }

    // SOC 2 compliance for all system access
    flags.push('SOC2');

    return flags;
  }

  /**
   * Classify data sensitivity
   */
  _classifyData(event) {
    if (event.resourceType === 'CUSTOMER' || event.metadata?.containsPII) {
      return 'CONFIDENTIAL';
    }
    if (event.resourceType === 'GRID_INFRASTRUCTURE' || event.resourceType === 'BESS_LOCATION') {
      return 'RESTRICTED';
    }
    return 'INTERNAL';
  }

  /**
   * Calculate retention date (2 years from now)
   */
  _calculateRetentionDate() {
    const date = new Date();
    date.set
    date.setFullYear(date.getFullYear() + 2);
    return date.toISOString();
  }

  /**
   * Verify audit log integrity (tamper detection)
   */
  async verifyAuditIntegrity(startDate, endDate) {
    try {
      // Query PostgreSQL for immutable records
      const pgQuery = `
        SELECT COUNT(*) as pg_count, 
               MIN(timestamp) as pg_min_date,
               MAX(timestamp) as pg_max_date
        FROM audit_logs
        WHERE timestamp >= $1 AND timestamp <= $2
      `;
      const pgResult = await pgPool.query(pgQuery, [startDate, endDate]);

      // Query Elasticsearch for comparison
      const esResult = await esClient.count({
        index: AUDIT_INDEX,
        body: {
          query: {
            range: {
              timestamp: {
                gte: startDate,
                lte: endDate
              }
            }
          }
        }
      });

      const pgCount = parseInt(pgResult.rows[0].pg_count);
      const esCount = esResult.count;

      return {
        verified: pgCount === esCount,
        postgresCount: pgCount,
        elasticsearchCount: esCount,
        discrepancy: Math.abs(pgCount - esCount),
        dateRange: { startDate, endDate }
      };
    } catch (error) {
      logger.error('Failed to verify audit integrity', {
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new AuditService();
module.exports.logAuditEvent = async (event) => {
  const service = new AuditService();
  return service.logAuditEvent(event);
};