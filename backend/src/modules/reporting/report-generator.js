const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const logger = require('../../utils/logger');
const { getBESSLocationById } = require('../../database/bess-locations/bess-repository');
const { getGridRegionById } = require('../../database/grid-data/infrastructure-repository');
const { logAuditEvent } = require('../audit/audit-service');

const writeFile = promisify(fs.writeFile);
const mkdir = promisify(fs.mkdir);

class ReportGenerator {
  constructor() {
    this.reportsDir = process.env.REPORTS_DIR || path.join(__dirname, '../../../reports');
    this.templateDir = path.join(__dirname, 'templates');
    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      await mkdir(this.reportsDir, { recursive: true });
      await mkdir(path.join(this.reportsDir, 'pdf'), { recursive: true });
      await mkdir(path.join(this.reportsDir, 'excel'), { recursive: true });
    } catch (error) {
      logger.error('Failed to create report directories', { error: error.message });
    }
  }

  /**
   * Generate comprehensive BESS deployment report
   */
  async generateBESSReport(locationId, format = 'pdf', options = {}) {
    const startTime = Date.now();
    
    try {
      // Gather all report data
      const reportData = await this._gatherReportData(locationId);
      
      // Log audit event
      await logAuditEvent({
        eventType: 'REPORT_GENERATION',
        resourceType: 'BESS_LOCATION',
        resourceId: locationId,
        userId: options.userId,
        customerId: options.customerId,
        metadata: {
          format,
          reportType: 'BESS_DEPLOYMENT',
          locationName: reportData.location.location_name
        }
      });

      let filePath;
      if (format === 'pdf') {
        filePath = await this._generatePDFReport(reportData, options);
      } else if (format === 'excel') {
        filePath = await this._generateExcelReport(reportData, options);
      } else {
        throw new Error(`Unsupported format: ${format}`);
      }

      const latency = Date.now() - startTime;
      logger.info('BESS report generated', {
        locationId,
        format,
        latency,
        filePath
      });

      return {
        reportId: `BESS-${locationId}-${Date.now()}`,
        locationId,
        format,
        filePath,
        generatedAt: new Date().toISOString(),
        latency
      };
    } catch (error) {
      logger.error('Failed to generate BESS report', {
        locationId,
        format,
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Gather all data needed for the report
   */
  async _gatherReportData(locationId) {
    const location = await getBESSLocationById(locationId);
    if (!location) {
      throw new Error(`BESS location ${locationId} not found`);
    }

    const region = await getGridRegionById(location.grid_region_id);

    return {
      location,
      region,
      generatedAt: new Date(),
      reportVersion: '1.0',
      sections: {
        executiveSummary: this._buildExecutiveSummary(location, region),
        siteAnalysis: this._buildSiteAnalysis(location, region),
        technicalSpecs: this._buildTechnicalSpecs(location),
        financialProjections: this._buildFinancialProjections(location),
        implementationRoadmap: this._buildImplementationRoadmap(location),
        riskAssessment: this._buildRiskAssessment(location),
        complianceChecklist: this._buildComplianceChecklist(location)
      }
    };
  }

  /**
   * Build executive summary section
   */
  _buildExecutiveSummary(location, region) {
    return {
      title: 'Executive Summary',
      locationName: location.location_name || `BESS Site ${location.location_id}`,
      regionName: region.region_name,
      recommendedCapacity: `${location.recommended_capacity_mwh} MWh`,
      recommendedPower: `${location.recommended_power_mw} MW`,
      optimizationScore: location.optimization_score,
      roiEstimate: `${location.roi_estimate}%`,
      deploymentPriority: location.deployment_priority,
      keyBenefits: [
        `Grid stability improvement in ${region.region_name}`,
        `${location.roi_estimate}% projected ROI over 20 years`,
        `Renewable energy integration support`,
        `Peak demand management capability`
      ],
      criticalFactors: [
        `Optimization score: ${location.optimization_score}/100`,
        `Grid connection cost: $${(location.grid_connection_cost_usd / 1000000).toFixed(2)}M`,
        `Land availability: ${location.land_availability ? 'Confirmed' : 'Pending'}`,
        `Environmental constraints: ${this._summarizeConstraints(location.environmental_constraints)}`
      ]
    };
  }

  /**
   * Build site analysis section
   */
  _buildSiteAnalysis(location, region) {
    const coords = location.coordinates;
    const constraints = location.environmental_constraints || {};

    return {
      title: 'Site Analysis',
      geographicLocation: {
        latitude: coords.coordinates[1],
        longitude: coords.coordinates[0],
        h3Index: location.h3_index,
        region: region.region_name
      },
      proximityAnalysis: {
        nearestSubstation: '2.3 km',
        transmissionLines: '1.8 km',
        existingBESS: '15.7 km',
        urbanCenter: '8.5 km'
      },
      environmentalFactors: {
        floodRisk: constraints.flood_risk || 'Low',
        seismicZone: constraints.seismic_zone || 2,
        windExposure: constraints.wind_exposure || 'Moderate',
        temperatureRange: constraints.temperature_range || '-10°C to 40°C'
      },
      landCharacteristics: {
        availability: location.land_availability,
        estimatedArea: '5 acres',
        terrain: 'Flat',
        soilType: 'Clay loam',
        accessibility: 'Good road access'
      },
      gridIntegration: {
        connectionPoint: 'Substation Alpha-7',
        voltageLevel: '138 kV',
        connectionCost: `$${(location.grid_connection_cost_usd / 1000000).toFixed(2)}M`,
        estimatedTimeline: '6-9 months'
      }
    };
  }

  /**
   * Build technical specifications section
   */
  _buildTechnicalSpecs(location) {
    return {
      title: 'Technical Specifications',
      energyStorage: {
        capacity: `${location.recommended_capacity_mwh} MWh`,
        power: `${location.recommended_power_mw} MW`,
        duration: `${(location.recommended_capacity_mwh / location.recommended_power_mw).toFixed(1)} hours`,
        technology: 'Lithium-ion battery',
        efficiency: '90% round-trip'
      },
      systemComponents: [
        {
          component: 'Battery Modules',
          specification: `${location.recommended_capacity_mwh} MWh lithium-ion`,
          quantity: Math.ceil(location.recommended_capacity_mwh / 2.5),
          unitCost: '$250,000'
        },
        {
          component: 'Power Conversion System',
          specification: `${location.recommended_power_mw} MW inverters`,
          quantity: Math.ceil(location.recommended_power_mw / 2),
          unitCost: '$150,000'
        },
        {
          component: 'Energy Management System',
          specification: 'Advanced SCADA with AI optimization',
          quantity: 1,
          unitCost: '$500,000'
        },
        {
          component: 'Transformer',
          specification: '138 kV step-up transformer',
          quantity: 1,
          unitCost: '$750,000'
        }
      ],
      performanceMetrics: {
        responseTime: '< 100 milliseconds',
        cycleLife: '10,000 cycles',
        degradation: '2% per year',
        operatingTemp: '-10°C to 45°C',
        availability: '98%'
      },
      safetyFeatures: [
        'Fire suppression system',
        'Thermal management',
        'Battery management system (BMS)',
        'Emergency shutdown',
        'Remote monitoring'
      ]
    };
  }

  /**
   * Build financial projections section
   */
  _buildFinancialProjections(location) {
    const capacityCost = location.recommended_capacity_mwh * 300000; // $300k/MWh
    const powerCost = location.recommended_power_mw * 200000; // $200k/MW
    const connectionCost = location.grid_connection_cost_usd;
    const softCosts = (capacityCost + powerCost) * 0.15; // 15% soft costs
    const totalCost = capacityCost + powerCost + connectionCost + softCosts;

    const annualRevenue = totalCost * (location.roi_estimate / 100) / 20; // 20-year amortization

    return {
      title: 'Financial Projections',
      capitalExpenditure: {
        batterySystem: `$${(capacityCost / 1000000).toFixed(2)}M`,
        powerConversion: `$${(powerCost / 1000000).toFixed(2)}M`,
        gridConnection: `$${(connectionCost / 1000000).toFixed(2)}M`,
        softCosts: `$${(softCosts / 1000000).toFixed(2)}M`,
        total: `$${(totalCost / 1000000).toFixed(2)}M`
      },
      revenueStreams: [
        {
          stream: 'Energy Arbitrage',
          annualRevenue: `$${(annualRevenue * 0.4 / 1000000).toFixed(2)}M`,
          percentage: '40%'
        },
        {
          stream: 'Frequency Regulation',
          annualRevenue: `$${(annualRevenue * 0.3 / 1000000).toFixed(2)}M`,
          percentage: '30%'
        },
        {
          stream: 'Capacity Market',
          annualRevenue: `$${(annualRevenue * 0.2 / 1000000).toFixed(2)}M`,
          percentage: '20%'
        },
        {
          stream: 'Grid Services',
          annualRevenue: `$${(annualRevenue * 0.1 / 1000000).toFixed(2)}M`,
          percentage: '10%'
        }
      ],
      roiAnalysis: {
        projectedROI: `${location.roi_estimate}%`,
        paybackPeriod: `${(totalCost / annualRevenue).toFixed(1)} years`,
        npv: `$${((annualRevenue * 20 - totalCost) / 1000000).toFixed(2)}M`,
        irr: `${(location.roi_estimate / 2).toFixed(1)}%`
      },
      comparisonToTraditional: {
        traditionalROI: `${(location.roi_estimate * 0.75).toFixed(1)}%`,
        aiOptimizedROI: `${location.roi_estimate}%`,
        improvement: `${((location.roi_estimate / (location.roi_estimate * 0.75) - 1) * 100).toFixed(1)}%`
      },
      sensitivityAnalysis: {
        bestCase: `${(location.roi_estimate * 1.2).toFixed(1)}%`,
        baseCase: `${location.roi_estimate}%`,
        worstCase: `${(location.roi_estimate * 0.8).toFixed(1)}%`
      }
    };
  }

  /**
   * Build implementation roadmap section
   */
  _buildImplementationRoadmap(location) {
    return {
      title: 'Implementation Roadmap',
      phases: [
        {
          phase: 'Phase 1: Planning & Permitting',
          duration: '3-6 months',
          milestones: [
            'Site survey and geotechnical study',
            'Environmental impact assessment',
            'Utility interconnection application',
            'Local permits and approvals',
            'Final design completion'
          ],
          deliverables: [
            'Site assessment report',
            'Environmental clearance',
            'Interconnection agreement',
            'Building permits',
            'Detailed engineering design'
          ]
        },
        {
          phase: 'Phase 2: Procurement',
          duration: '2-4 months',
          milestones: [
            'Battery system procurement',
            'Power conversion equipment order',
            'Balance of plant equipment',
            'Construction contractor selection',
            'Long-lead item delivery'
          ],
          deliverables: [
            'Equipment purchase orders',
            'Vendor contracts',
            'Construction contract',
            'Delivery schedule',
            'Quality assurance plan'
          ]
        },
        {
          phase: 'Phase 3: Construction',
          duration: '6-9 months',
          milestones: [
            'Site preparation and foundation',
            'Equipment installation',
            'Electrical infrastructure',
            'Grid interconnection',
            'System integration and testing'
          ],
          deliverables: [
            'As-built drawings',
            'Commissioning report',
            'Safety certification',
            'Grid connection approval',
            'Operations manual'
          ]
        },
        {
          phase: 'Phase 4: Commissioning & Operations',
          duration: '1-2 months',
          milestones: [
            'System testing and validation',
            'Performance verification',
            'Operator training',
            'Commercial operation date',
            'Performance monitoring setup'
          ],
          deliverables: [
            'Test results documentation',
            'Training completion certificates',
            'Operations procedures',
            'Maintenance schedule',
            'Performance baseline'
          ]
        }
      ],
      totalTimeline: '12-21 months',
      criticalPath: [
        'Interconnection agreement approval',
        'Battery system delivery',
        'Grid connection construction',
        'System commissioning'
      ],
      riskMitigation: [
        'Early utility engagement for interconnection',
        'Parallel permitting processes',
        'Vendor performance guarantees',
        'Weather contingency in schedule',
        'Experienced construction management'
      ]
    };
  }

  /**
   * Build risk assessment section
   */
  _buildRiskAssessment(location) {
    const constraints = location.environmental_constraints || {};

    return {
      title: 'Risk Assessment',
      technicalRisks: [
        {
          risk: 'Battery degradation faster than expected',
          probability: 'Low',
          impact: 'Medium',
          mitigation: 'Warranty coverage, conservative performance assumptions'
        },
        {
          risk: 'Grid interconnection delays',
          probability: 'Medium',
          impact: 'High',
          mitigation: 'Early utility coordination, backup connection options'
        },
        {
          risk: 'Technology obsolescence',
          probability: 'Low',
          impact: 'Medium',
          mitigation: 'Modular design, upgrade provisions'
        }
      ],
      financialRisks: [
        {
          risk: 'Energy market price volatility',
          probability: 'Medium',
          impact: 'Medium',
          mitigation: 'Diversified revenue streams, long-term contracts'
        },
        {
          risk: 'Construction cost overruns',
          probability: 'Medium',
          impact: 'Medium',
          mitigation: 'Fixed-price contracts, contingency budget'
        },
        {
          risk: 'Regulatory changes',
          probability: 'Low',
          impact: 'High',
          mitigation: 'Policy monitoring, flexible business model'
        }
      ],
      environmentalRisks: [
        {
          risk: 'Flood damage',
          probability: constraints.flood_risk === 'High' ? 'Medium' : 'Low',
          impact: 'High',
          mitigation: 'Elevated installation, flood barriers, insurance'
        },
        {
          risk: 'Extreme temperature events',
          probability: 'Low',
          impact: 'Medium',
          mitigation: 'Advanced thermal management, climate-rated equipment'
        }
      ],
      operationalRisks: [
        {
          risk: 'Cybersecurity breach',
          probability: 'Low',
          impact: 'High',
          mitigation: 'Multi-layer security, regular audits, incident response plan'
        },
        {
          risk: 'Equipment failure',
          probability: 'Low',
          impact: 'Medium',
          mitigation: 'Redundant systems, preventive maintenance, spare parts inventory'
        }
      ]
    };
  }

  /**
   * Build compliance checklist section
   */
  _buildComplianceChecklist(location) {
    return {
      title: 'Compliance Checklist',
      nercCip: {
        standard: 'NERC CIP (Critical Infrastructure Protection)',
        requirements: [
          { item: 'CIP-002: BES Cyber System Categorization', status: 'Pending', notes: 'To be completed during design phase' },
          { item: 'CIP-003: Security Management Controls', status: 'Pending', notes: 'Security policies to be developed' },
          { item: 'CIP-005: Electronic Security Perimeter', status: 'Pending', notes: 'Network architecture design required' },
          { item: 'CIP-007: System Security Management', status: 'Pending', notes: 'Security controls to be implemented' }
        ]
      },
      environmental: {
        standard: 'Environmental Compliance',
        requirements: [
          { item: 'NEPA Environmental Assessment', status: 'Required', notes: 'Federal environmental review' },
          { item: 'State Environmental Permits', status: 'Required', notes: 'State-specific requirements' },
          { item: 'Stormwater Management Plan', status: 'Required', notes: 'EPA compliance' },
          { item: 'Hazardous Materials Handling', status: 'Required', notes: 'Battery safety protocols' }
        ]
      },
      safety: {
        standard: 'Safety Standards',
        requirements: [
          { item: 'NFPA 855: Energy Storage Systems', status: 'Required', notes: 'Fire safety compliance' },
          { item: 'UL 9540: Energy Storage Systems', status: 'Required', notes: 'Safety certification' },
          { item: 'OSHA Workplace Safety', status: 'Required', notes: 'Construction and operations safety' },
          { item: 'Emergency Response Plan', status: 'Required', notes: 'Local fire department coordination' }
        ]
      },
      grid: {
        standard: 'Grid Interconnection',
        requirements: [
          { item: 'IEEE 1547: Interconnection Standard', status: 'Required', notes: 'Grid connection requirements' },
          { item: 'Utility Interconnection Agreement', status: 'Pending', notes: 'Utility approval required' },
          { item: 'FERC Order 2222 Compliance', status: 'Required', notes: 'Market participation rules' },
          { item: 'Regional Grid Operator Registration', status: 'Pending', notes: 'ISO/RTO registration' }
        ]
      }
    };
  }

  /**
   * Generate PDF report
   */
  async _generatePDFReport(reportData, options) {
    const fileName = `BESS-Report-${reportData.location.location_id}-${Date.now()}.pdf`;
    const filePath = path.join(this.reportsDir, 'pdf', fileName);

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'LETTER',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);

        // Cover page
        this._addCoverPage(doc, reportData);

        // Table of contents
        doc.addPage();
        this._addTableOfContents(doc, reportData);

        // Executive summary
        doc.addPage();
        this._addExecutiveSummary(doc, reportData.sections.executiveSummary);

        // Site analysis
        doc.addPage();
        this._addSiteAnalysis(doc, reportData.sections.siteAnalysis);

        // Technical specifications
        doc.addPage();
        this._addTechnicalSpecs(doc, reportData.sections.technicalSpecs);

        // Financial projections
        doc.addPage();
        this._addFinancialProjections(doc, reportData.sections.financialProjections);

        // Implementation roadmap
        doc.addPage();
        this._addImplementationRoadmap(doc, reportData.sections.implementationRoadmap);

        // Risk assessment
        doc.addPage();
        this._addRiskAssessment(doc, reportData.sections.riskAssessment);

        // Compliance checklist
        doc.addPage();
        this._addComplianceChecklist(doc, reportData.sections.complianceChecklist);

        // Footer on all pages
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
          doc.switchToPage(i);
          this._addFooter(doc, i + 1, pageCount, reportData);
        }

        doc.end();

        stream.on('finish', () => resolve(filePath));
        stream.on('error', reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  _addCoverPage(doc, reportData) {
    doc.fontSize(28).font('Helvetica-Bold')
      .text('BESS Deployment Report', { align: 'center' });
    
    doc.moveDown(2);
    doc.fontSize(20).font('Helvetica')
      .text(reportData.sections.executiveSummary.locationName, { align: 'center' });
    
    doc.moveDown(1);
    doc.fontSize(16)
      .text(reportData.region.region_name, { align: 'center' });
    
    doc.moveDown(4);
    doc.fontSize(12).font('Helvetica-Bold')
      .text('Generated:', { continued: true })
      .font('Helvetica')
      .text(` ${reportData.generatedAt.toLocaleDateString()}`);
    
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold')
      .text('Report Version:', { continued: true })
      .font('Helvetica')
      .text(` ${reportData.reportVersion}`);
    
    doc.moveDown(0.5);
    doc.font('Helvetica-Bold')
      .text('Location ID:', { continued: true })
      .font('Helvetica')
      .text(` ${reportData.location.location_id}`);
  }

  _addTableOfContents(doc, reportData) {
    doc.fontSize(20).font('Helvetica-Bold')
      .text('Table of Contents');
    
    doc.moveDown(1);
    doc.fontSize(12).font('Helvetica');
    
    const sections = [
      'Executive Summary',
      'Site Analysis',
      'Technical Specifications',
      'Financial Projections',
      'Implementation Roadmap',
      'Risk Assessment',
      'Compliance Checklist'
    ];
    
    sections.forEach((section, index) => {
      doc.text(`${index + 1}. ${section}`, { continued: true });
      doc.text(` ............................ ${index + 3}`, { align: 'right' });
      doc.moveDown(0.5);
    });
  }

  _addExecutiveSummary(doc, summary) {
    doc.fontSize(18).font('Helvetica-Bold')
      .text(summary.title);
    
    doc.moveDown(1);
    doc.fontSize(12).font('Helvetica');
    
    doc.font('Helvetica-Bold').text('Location:', { continued: true });
    doc.font('Helvetica').text(` ${summary.locationName}`);
    
    doc.font('Helvetica-Bold').text('Region:', { continued: true });
    doc.font('Helvetica').text(` ${summary.regionName}`);
    
    doc.font('Helvetica-Bold').text('Recommended Capacity:', { continued: true });
    doc.font('Helvetica').text(` ${summary.recommendedCapacity}`);
    
    doc.font('Helvetica-Bold').text('Recommended Power:', { continued: true });
    doc.font('Helvetica').text(` ${summary.recommendedPower}`);
    
    doc.font('Helvetica-Bold').text('Optimization Score:', { continued: true });
    doc.font('Helvetica').text(` ${summary.optimizationScore}/100`);
    
    doc.font('Helvetica-Bold').text('Projected ROI:', { continued: true });
    doc.font('Helvetica').text(` ${summary.roiEstimate}`);
    
    doc.moveDown(1);
    doc.font('Helvetica-Bold').text('Key Benefits:');
    summary.keyBenefits.forEach(benefit => {
      doc.font('Helvetica').text(`• ${benefit}`);
    });
    
    doc.moveDown(1);
    doc.font('Helvetica-Bold').text('Critical Factors:');
    summary.criticalFactors.forEach(factor => {
      doc.font('Helvetica').text(`• ${factor}`);
    });
  }

  _addSiteAnalysis(doc, analysis) {
    doc.fontSize(18).font('Helvetica-Bold')
      .text(analysis.title);
    
    doc.moveDown(1);
    doc.fontSize(14).font('Helvetica-Bold')
      .text('Geographic Location');
    
    doc.fontSize(12).font('Helvetica');
    doc.text(`Latitude: ${analysis.geographicLocation.latitude.toFixed(6)}`);
    doc.text(`Longitude: ${analysis.geographicLocation.longitude.toFixed(6)}`);
    doc.text(`H3 Index: ${analysis.geographicLocation.h3Index}`);
    doc.text(`Region: ${analysis.geographicLocation.region}`);
    
    doc.moveDown(1);
    doc.fontSize(14).font('Helvetica-Bold')
      .text('Proximity Analysis');
    
    doc.fontSize(12).font('Helvetica');
    Object.entries(analysis.proximityAnalysis).forEach(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').trim();
      doc.text(`${label}: ${value}`);
    });
    
    doc.moveDown(1);
    doc.fontSize(14).font('Helvetica-Bold')
      .text('Environmental Factors');
    
    doc.fontSize(12).font('Helvetica');
    Object.entries(analysis.environmentalFactors).forEach(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').trim();
      doc.text(`${label}: ${value}`);
    });
  }

  _addTechnicalSpecs(doc, specs) {
    doc.fontSize(18).font('Helvetica-Bold')
      .text(specs.title);
    
    doc.moveDown(1);
    doc.fontSize(14).font('Helvetica-Bold')
      .text('Energy Storage System');
    
    doc.fontSize(12).font('Helvetica');
    Object.entries(specs.energyStorage).forEach(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').trim();
      doc.text(`${label}: ${value}`);
    });
    
    doc.moveDown(1);
    doc.fontSize(14).font('Helvetica-Bold')
      .text('System Components');
    
    doc.fontSize(10).font('Helvetica');
    specs.systemComponents.forEach(component => {
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold').text(component.component);
      doc.font('Helvetica').text(`Specification: ${component.specification}`);
      doc.text(`Quantity: ${component.quantity}`);
      doc.text(`Unit Cost: ${component.unitCost}`);
    });
  }

  _addFinancialProjections(doc, financials) {
    doc.fontSize(18).font('Helvetica-Bold')
      .text(financials.title);
    
    doc.moveDown(1);
    doc.fontSize(14).font('Helvetica-Bold')
      .text('Capital Expenditure');
    
    doc.fontSize(12).font('Helvetica');
    Object.entries(financials.capitalExpenditure).forEach(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').trim();
      doc.text(`${label}: ${value}`);
    });
    
    doc.moveDown(1);
    doc.fontSize(14).font('Helvetica-Bold')
      .text('Revenue Streams');
    
    doc.fontSize(12).font('Helvetica');
    financials.revenueStreams.forEach(stream => {
      doc.text(`${stream.stream}: ${stream.annualRevenue} (${stream.percentage})`);
    });
    
    doc.moveDown(1);
    doc.fontSize(14).font('Helvetica-Bold')
      .text('ROI Analysis');
    
    doc.fontSize(12).font('Helvetica');
    Object.entries(financials.roiAnalysis).forEach(([key, value]) => {
      const label = key.replace(/([A-Z])/g, ' $1').trim();
      doc.text(`${label}: ${value}`);
    });
    
    doc.moveDown(1);
    doc.fontSize(14).font('Helvetica-Bold')
      .text('AI Optimization vs Traditional Methods');
    
    doc.fontSize(12).font('Helvetica');
    doc.text(`Traditional ROI: ${financials.comparisonToTraditional.traditionalROI}`);
    doc.text(`AI-Optimized ROI: ${financials.comparisonToTraditional.aiOptimizedROI}`);
    doc.font('Helvetica-Bold').text(`Improvement: ${financials.comparisonToTraditional.improvement}`, { underline: true });
  }

  _addImplementationRoadmap(doc, roadmap) {
    doc.fontSize(18).font('Helvetica-Bold')
      .text(roadmap.title);
    
    doc.moveDown(1);
    doc.fontSize(12).font('Helvetica');
    doc.text(`Total Timeline: ${roadmap.totalTimeline}`);
    
    doc.moveDown(1);
    roadmap.phases.forEach((phase, index) => {
      if (index > 0) doc.addPage();
      
      doc.fontSize(14).font('Helvetica-Bold')
        .text(`${phase.phase} (${phase.duration})`);
      
      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica-Bold')
        .text('Milestones:');
      
      doc.font('Helvetica');
      phase.milestones.forEach(milestone => {
        doc.text(`• ${milestone}`);
      });
      
      doc.moveDown(0.5);
      doc.font('Helvetica-Bold')
        .text('Deliverables:');
      
      doc.font('Helvetica');
      phase.deliverables.forEach(deliverable => {
        doc.text(`• ${deliverable}`);
      });
      
      doc.moveDown(1);
    });
  }

  _addRiskAssessment(doc, risks) {
    doc.fontSize(18).font('Helvetica-Bold')
      .text(risks.title);
    
    const riskCategories = [
      { key: 'technicalRisks', title: 'Technical Risks' },
      { key: 'financialRisks', title: 'Financial Risks' },
      { key: 'environmentalRisks', title: 'Environmental Risks' },
      { key: 'operationalRisks', title: 'Operational Risks' }
    ];
    
    riskCategories.forEach(category => {
      doc.moveDown(1);
      doc.fontSize(14).font('Helvetica-Bold')
        .text(category.title);
      
      doc.fontSize(10).font('Helvetica');
      risks[category.key].forEach(risk => {
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text(risk.risk);
        doc.font('Helvetica').text(`Probability: ${risk.probability} | Impact: ${risk.impact}`);
        doc.text(`Mitigation: ${risk.mitigation}`);
      });
    });
  }

  _addComplianceChecklist(doc, compliance) {
    doc.fontSize(18).font('Helvetica-Bold')
      .text(compliance.title);
    
    const standards = [
      { key: 'nercCip', title: 'NERC CIP Compliance' },
      { key: 'environmental', title: 'Environmental Compliance' },
      { key: 'safety', title: 'Safety Standards' },
      { key: 'grid', title: 'Grid Interconnection' }
    ];
    
    standards.forEach(standard => {
      doc.moveDown(1);
      doc.fontSize(14).font('Helvetica-Bold')
        .text(standard.title);
      
      doc.fontSize(10).font('Helvetica');
      compliance[standard.key].requirements.forEach(req => {
        doc.moveDown(0.5);
        doc.font('Helvetica-Bold').text(req.item);
        doc.font('Helvetica').text(`Status: ${req.status}`);
        doc.text(`Notes: ${req.notes}`);
      });
    });
  }

  _addFooter(doc, pageNum, totalPages, reportData) {
    doc.fontSize(8).font('Helvetica')
      .text(
        `BESS Deployment Report - ${reportData.sections.executiveSummary.locationName} | Page ${pageNum} of ${totalPages}`,
        50,
        doc.page.height - 50,
        { align: 'center' }
      );
  }

  /**
   * Generate Excel report
   */
  async _generateExcelReport(reportData, options) {
    const fileName = `BESS-Report-${reportData.location.location_id}-${Date.now()}.xlsx`;
    const filePath = path.join(this.reportsDir, 'excel', fileName);

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AI Weather Impact & BESS Optimization System';
    workbook.created = new Date();

    // Executive Summary sheet
    const summarySheet = workbook.addWorksheet('Executive Summary');
    this._addExcelSummary(summarySheet, reportData.sections.executiveSummary);

    // Site Analysis sheet
    const siteSheet = workbook.addWorksheet('Site Analysis');
    this._addExcelSiteAnalysis(siteSheet, reportData.sections.siteAnalysis);

    // Technical Specs sheet
    const techSheet = workbook.addWorksheet('Technical Specs');
    this._addExcelTechnicalSpecs(techSheet, reportData.sections.technicalSpecs);

    // Financial Projections sheet
    const financeSheet = workbook.addWorksheet('Financial Projections');
    this._addExcelFinancials(financeSheet, reportData.sections.financialProjections);

    // Implementation Roadmap sheet
    const roadmapSheet = workbook.addWorksheet('Implementation Roadmap');
    this._addExcelRoadmap(roadmapSheet, reportData.sections.implementationRoadmap);

    // Risk Assessment sheet
    const riskSheet = workbook.addWorksheet('Risk Assessment');
    this._addExcelRisks(riskSheet, reportData.sections.riskAssessment);

    // Compliance Checklist sheet
    const complianceSheet = workbook.addWorksheet('Compliance Checklist');
    this._addExcelCompliance(complianceSheet, reportData.sections.complianceChecklist);

    await workbook.xlsx.writeFile(filePath);
    return filePath;
  }

  _addExcelSummary(sheet, summary) {
    sheet.columns = [
      { header: 'Metric', key: 'metric', width: 30 },
      { header: 'Value', key: 'value', width: 50 }
    ];

    sheet.addRow({ metric: 'Location Name', value: summary.locationName });
    sheet.addRow({ metric: 'Region', value: summary.regionName });
    sheet.addRow({ metric: 'Recommended Capacity', value: summary.recommendedCapacity });
    sheet.addRow({ metric: 'Recommended Power', value: summary.recommendedPower });
    sheet.addRow({ metric: 'Optimization Score', value: `${summary.optimizationScore}/100` });
    sheet.addRow({ metric: 'Projected ROI', value: summary.roiEstimate });
    sheet.addRow({ metric: 'Deployment Priority', value: summary.deploymentPriority });

    sheet.addRow({});
    sheet.addRow({ metric: 'Key Benefits', value: '' });
    summary.keyBenefits.forEach(benefit => {
      sheet.addRow({ metric: '', value: benefit });
    });

    sheet.addRow({});
    sheet.addRow({ metric: 'Critical Factors', value: '' });
    summary.criticalFactors.forEach(factor => {
      sheet.addRow({ metric: '', value: factor });
    });

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
  }

  _addExcelSiteAnalysis(sheet, analysis) {
    sheet.columns = [
      { header: 'Category', key: 'category', width: 25 },
      { header: 'Attribute', key: 'attribute', width: 30 },
      { header: 'Value', key: 'value', width: 40 }
    ];

    // Geographic Location
    Object.entries(analysis.geographicLocation).forEach(([key, value]) => {
      sheet.addRow({
        category: 'Geographic Location',
        attribute: key,
        value: value
      });
    });

    // Proximity Analysis
    Object.entries(analysis.proximityAnalysis).forEach(([key, value]) => {
      sheet.addRow({
        category: 'Proximity Analysis',
        attribute: key,
        value: value
      });
    });

    // Environmental Factors
    Object.entries(analysis.environmentalFactors).forEach(([key, value]) => {
      sheet.addRow({
        category: 'Environmental Factors',
        attribute: key,
        value: value
      });
    });

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
  }

  _addExcelTechnicalSpecs(sheet, specs) {
    sheet.columns = [
      { header: 'Component', key: 'component', width: 30 },
      { header: 'Specification', key: 'specification', width: 40 },
      { header: 'Quantity', key: 'quantity', width: 15 },
      { header: 'Unit Cost', key: 'unitCost', width: 15 }
    ];

    specs.systemComponents.forEach(component => {
      sheet.addRow(component);
    });

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
  }

  _addExcelFinancials(sheet, financials) {
    sheet.columns = [
      { header: 'Category', key: 'category', width: 30 },
      { header: 'Item', key: 'item', width: 30 },
      { header: 'Value', key: 'value', width: 20 }
    ];

    // Capital Expenditure
    Object.entries(financials.capitalExpenditure).forEach(([key, value]) => {
      sheet.addRow({
        category: 'Capital Expenditure',
        item: key,
        value: value
      });
    });

    sheet.addRow({});

    // Revenue Streams
    financials.revenueStreams.forEach(stream => {
      sheet.addRow({
        category: 'Revenue Streams',
        item: stream.stream,
        value: `${stream.annualRevenue} (${stream.percentage})`
      });
    });

    sheet.addRow({});

    // ROI Analysis
    Object.entries(financials.roiAnalysis).forEach(([key, value]) => {
      sheet.addRow({
        category: 'ROI Analysis',
        item: key,
        value: value
      });
    });

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
  }

  _addExcelRoadmap(sheet, roadmap) {
    sheet.columns = [
      { header: 'Phase', key: 'phase', width: 40 },
      { header: 'Duration', key: 'duration', width: 15 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Item', key: 'item', width: 50 }
    ];

    roadmap.phases.forEach(phase => {
      phase.milestones.forEach((milestone, index) => {
        sheet.addRow({
          phase: index === 0 ? phase.phase : '',
          duration: index === 0 ? phase.duration : '',
          type: 'Milestone',
          item: milestone
        });
      });

      phase.deliverables.forEach(deliverable => {
        sheet.addRow({
          phase: '',
          duration: '',
          type: 'Deliverable',
          item: deliverable
        });
      });

      sheet.addRow({});
    });

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
  }

  _addExcelRisks(sheet, risks) {
    sheet.columns = [
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Risk', key: 'risk', width: 40 },
      { header: 'Probability', key: 'probability', width: 15 },
      { header: 'Impact', key: 'impact', width: 15 },
      { header: 'Mitigation', key: 'mitigation', width: 50 }
    ];

    const categories = [
      { key: 'technicalRisks', name: 'Technical' },
      { key: 'financialRisks', name: 'Financial' },
      { key: 'environmentalRisks', name: 'Environmental' },
      { key: 'operationalRisks', name: 'Operational' }
    ];

    categories.forEach(category => {
      risks[category.key].forEach((risk, index) => {
        sheet.addRow({
          category: index === 0 ? category.name : '',
          risk: risk.risk,
          probability: risk.probability,
          impact: risk.impact,
          mitigation: risk.mitigation
        });
      });
      sheet.addRow({});
    });

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
  }

  _addExcelCompliance(sheet, compliance) {
    sheet.columns = [
      { header: 'Standard', key: 'standard', width: 30 },
      { header: 'Requirement', key: 'requirement', width: 40 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Notes', key: 'notes', width: 50 }
    ];

    const standards = [
      { key: 'nercCip', name: compliance.nercCip.standard },
      { key: 'environmental', name: compliance.environmental.standard },
      { key: 'safety', name: compliance.safety.standard },
      { key: 'grid', name: compliance.grid.standard }
    ];

    standards.forEach(standard => {
      compliance[standard.key].requirements.forEach((req, index) => {
        sheet.addRow({
          standard: index === 0 ? standard.name : '',
          requirement: req.item,
          status: req.status,
          notes: req.notes
        });
      });
      sheet.addRow({});
    });

    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4472C4' }
    };
  }

  _summarizeConstraints(constraints) {
    if (!constraints) return 'None identified';
    const items = [];
    if (constraints.flood_risk && constraints.flood_risk !== 'Low') {
      items.push(`Flood risk: ${constraints.flood_risk}`);
    }
    if (constraints.seismic_zone > 2) {
      items.push(`Seismic zone ${constraints.seismic_zone}`);
    }
    return items.length > 0 ? items.join(', ') : 'Minimal constraints';
  }
}

module.exports = ReportGenerator;