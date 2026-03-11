const express = require('express');
const ReportGenerator = require('../../modules/reporting/report-generator');
const auditService = require('../../modules/audit/audit-service');
const { queryAuditLogs, getAuditStatistics } = require('../../database/audit-logs/audit-repository');
const logger = require('../../utils/logger');

const router = express.Router();
const reportGenerator = new ReportGenerator();

// POST /api/v1/reports/bess/:locationId
router.post('/bess/:locationId', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const locationId = parseInt(req.params.locationId);
    const { format = 'pdf', includeCharts = true } = req.body;

    if (!['pdf', 'excel'].includes(format)) {
      return res.status(400).json({
        error: {
          code: 'INVALID_FORMAT',
          message: 'Format must be either "pdf" or "excel"'
        }
      });
    }

    const result = await reportGenerator.generateBESSReport(locationId, format, {
      userId: req.user?.userId,
      customerId: req.user?.customerId,
      includeCharts
    });

    const latency = Date.now() - startTime;
    logger.info('BESS report generated via API', {
      locationId,
      format,
      latency,
      userId: req.user?.userId
    });

    res.json({
      reportId: result.reportId,
      locationId: result.locationId,
      format: result.format,
      downloadUrl: `/api/v1/reports/download/${result.reportId}`,
      generatedAt: result.generatedAt,
      latency
    });
  } catch (error) {
    logger.error('Failed to generate BESS report', {
      locationId: req.params.locationId,
      error: error.message
    });
    res.status(500).json({
      error: {
        code: 'REPORT_GENERATION_FAILED',
        message: error.message
      }
    });
  }
});

// GET /api/v1/reports/audit/bess/:locationId
router.get('/audit/bess/:locationId', async (req, res) => {
  try {
    const locationId = parseInt(req.params.locationId);

    const auditTrail = await auditService.getBESSAuditTrail(locationId);

    res.json({
      locationId,
      auditTrail
    });
  } catch (error) {
    logger.error('Failed to get BESS audit trail', {
      locationId: req.params.locationId,
      error: error.message
    });
    res.status(500).json({
      error: {
        code: 'AUDIT_QUERY_FAILED',
        message: error.message
      }
    });
  }
});

// GET /api/v1/reports/audit/logs
router.get('/audit/logs', async (req, res) => {
  try {
    const filters = {
      eventType: req.query.eventType,
      resourceType: req.query.resourceType,
      resourceId: req.query.resourceId,
      userId: req.query.userId ? parseInt(req.query.userId) : undefined,
      customerId: req.user?.customerId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      complianceFlag: req.query.complianceFlag,
      limit: req.query.limit ? parseInt(req.query.limit) : 100,
      offset: req.query.offset ? parseInt(req.query.offset) : 0
    };

    const logs = await auditService.queryAuditLogs(filters);

    res.json({
      total: logs.total,
      logs: logs.logs,
      filters
    });
  } catch (error) {
    logger.error('Failed to query audit logs', {
      error: error.message
    });
    res.status(500).json({
      error: {
        code: 'AUDIT_QUERY_FAILED',
        message: error.message
      }
    });
  }
});

// GET /api/v1/reports/compliance/:customerId
router.get('/compliance/:customerId', async (req, res) => {
  try {
    const customerId = parseInt(req.params.customerId);
    const startDate = req.query.startDate || new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = req.query.endDate || new Date().toISOString();

    // Verify user has access to this customer
    if (req.user?.customerId !== customerId && req.user?.role !== 'ADMIN') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied to customer compliance data'
        }
      });
    }

    const report = await auditService.generateComplianceReport(customerId, startDate, endDate);

    res.json(report);
  } catch (error) {
    logger.error('Failed to generate compliance report', {
      customerId: req.params.customerId,
      error: error.message
    });
    res.status(500).json({
      error: {
        code: 'COMPLIANCE_REPORT_FAILED',
        message: error.message
      }
    });
  }
});

// GET /api/v1/reports/audit/statistics
router.get('/audit/statistics', async (req, res) => {
  try {
    const customerId = req.user?.customerId;
    const startDate = req.query.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = req.query.endDate || new Date().toISOString();

    const statistics = await getAuditStatistics(customerId, startDate, endDate);

    res.json({
      customerId,
      period: { startDate, endDate },
      statistics
    });
  } catch (error) {
    logger.error('Failed to get audit statistics', {
      error: error.message
    });
    res.status(500).json({
      error: {
        code: 'STATISTICS_FAILED',
        message: error.message
      }
    });
  }
});

// POST /api/v1/reports/audit/verify
router.post('/audit/verify', async (req, res) => {
  try {
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        error: {
          code: 'MISSING_PARAMETERS',
          message: 'startDate and endDate are required'
        }
      });
    }

    const verification = await auditService.verifyAuditIntegrity(startDate, endDate);

    res.json(verification);
  } catch (error) {
    logger.error('Failed to verify audit integrity', {
      error: error.message
    });
    res.status(500).json({
      error: {
        code: 'VERIFICATION_FAILED',
        message: error.message
      }
    });
  }
});

module.exports = router;