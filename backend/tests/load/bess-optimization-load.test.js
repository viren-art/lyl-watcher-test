const autocannon = require('autocannon');
const { spawn } = require('child_process');
const logger = require('../../src/utils/logger');

describe('BESS Optimization Load Tests', () => {
  let serverProcess;
  const BASE_URL = 'http://localhost:3000';
  const SLA_THRESHOLD_MS = 900000; // 15 minutes
  
  beforeAll(async () => {
    // Start server
    serverProcess = spawn('node', ['src/server.js'], {
      env: { ...process.env, NODE_ENV: 'test' }
    });
    
    // Wait for server to be ready
    await new Promise(resolve => setTimeout(resolve, 5000));
  });
  
  afterAll(() => {
    if (serverProcess) {
      serverProcess.kill();
    }
  });
  
  test('BESS optimization completes within 15-minute SLA under load', async () => {
    const results = [];
    const concurrentRequests = 5; // Simulate 5 concurrent optimization requests
    
    const optimizationRequests = Array(concurrentRequests).fill(null).map((_, idx) => {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        autocannon({
          url: `${BASE_URL}/api/v1/bess/optimize-location`,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          },
          body: JSON.stringify({
            gridRegionId: 1 + (idx % 5), // Distribute across 5 regions
            capacityMwh: 100 + (idx * 20),
            budgetUsd: 5000000
          }),
          connections: 1,
          duration: 1,
          timeout: SLA_THRESHOLD_MS
        }, (err, result) => {
          const elapsedMs = Date.now() - startTime;
          
          if (err) {
            reject(err);
          } else {
            results.push({
              requestId: idx,
              elapsedMs,
              statusCode: result.statusCodeStats ? result.statusCodeStats['200'] : 0,
              errors: result.errors
            });
            resolve();
          }
        });
      });
    });
    
    await Promise.all(optimizationRequests);
    
    // Verify all requests completed within SLA
    results.forEach(result => {
      expect(result.elapsedMs).toBeLessThan(SLA_THRESHOLD_MS);
      expect(result.statusCode).toBeGreaterThan(0);
      expect(result.errors).toBe(0);
    });
    
    // Calculate statistics
    const avgElapsedMs = results.reduce((sum, r) => sum + r.elapsedMs, 0) / results.length;
    const maxElapsedMs = Math.max(...results.map(r => r.elapsedMs));
    
    logger.info('BESS optimization load test results', {
      concurrentRequests,
      avgElapsedMs,
      maxElapsedMs,
      slaThresholdMs: SLA_THRESHOLD_MS,
      allWithinSLA: maxElapsedMs < SLA_THRESHOLD_MS
    });
    
    expect(maxElapsedMs).toBeLessThan(SLA_THRESHOLD_MS);
  }, 3600000); // 1-hour timeout for test
  
  test('BESS optimization maintains 20%+ ROI improvement under load', async () => {
    const roiResults = [];
    const testIterations = 10;
    
    for (let i = 0; i < testIterations; i++) {
      const response = await fetch(`${BASE_URL}/api/v1/bess/optimize-location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer test-token'
        },
        body: JSON.stringify({
          gridRegionId: (i % 5) + 1,
          capacityMwh: 100,
          budgetUsd: 5000000
        })
      });
      
      const result = await response.json();
      
      if (result.locations && result.locations.length > 0) {
        roiResults.push(result.locations[0].roi_improvement_percent);
      }
    }
    
    // Verify all results meet 20% ROI improvement target
    roiResults.forEach(roi => {
      expect(roi).toBeGreaterThanOrEqual(20);
    });
    
    const avgRoi = roiResults.reduce((sum, roi) => sum + roi, 0) / roiResults.length;
    
    logger.info('BESS ROI improvement under load', {
      testIterations,
      avgRoi,
      minRoi: Math.min(...roiResults),
      maxRoi: Math.max(...roiResults)
    });
    
    expect(avgRoi).toBeGreaterThanOrEqual(20);
  }, 3600000);
  
  test('System handles peak load of 3x concurrent optimizations', async () => {
    const peakConcurrency = 15; // 3x normal load (5 concurrent)
    const results = [];
    
    const peakRequests = Array(peakConcurrency).fill(null).map((_, idx) => {
      return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        fetch(`${BASE_URL}/api/v1/bess/optimize-location`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer test-token'
          },
          body: JSON.stringify({
            gridRegionId: (idx % 5) + 1,
            capacityMwh: 100,
            budgetUsd: 5000000
          })
        })
        .then(response => response.json())
        .then(data => {
          const elapsedMs = Date.now() - startTime;
          results.push({
            requestId: idx,
            elapsedMs,
            success: data.locations && data.locations.length > 0
          });
          resolve();
        })
        .catch(reject);
      });
    });
    
    await Promise.all(peakRequests);
    
    // Verify all requests succeeded
    const successCount = results.filter(r => r.success).length;
    const successRate = (successCount / peakConcurrency) * 100;
    
    expect(successRate).toBeGreaterThanOrEqual(95); // 95% success rate under peak load
    
    // Verify most requests still meet SLA (allow some degradation under peak)
    const withinSLA = results.filter(r => r.elapsedMs < SLA_THRESHOLD_MS).length;
    const slaComplianceRate = (withinSLA / peakConcurrency) * 100;
    
    expect(slaComplianceRate).toBeGreaterThanOrEqual(80); // 80% SLA compliance under 3x load
    
    logger.info('Peak load test results', {
      peakConcurrency,
      successRate,
      slaComplianceRate,
      avgElapsedMs: results.reduce((sum, r) => sum + r.elapsedMs, 0) / results.length
    });
  }, 3600000);
});