export default function BESSReportsAuditDashboard() {
  const [activeTab, setActiveTab] = React.useState('reports');
  const [selectedLocation, setSelectedLocation] = React.useState(null);
  const [reportFormat, setReportFormat] = React.useState('pdf');
  const [generatingReport, setGeneratingReport] = React.useState(false);
  const [reportGenerated, setReportGenerated] = React.useState(false);
  const [auditFilter, setAuditFilter] = React.useState('all');
  const [complianceView, setComplianceView] = React.useState('overview');

  const bessLocations = [
    {
      id: 1,
      name: 'Northeast Grid Alpha Site',
      region: 'Northeast',
      capacity: '50 MWh',
      power: '25 MW',
      optimizationScore: 94,
      roi: 28.5,
      status: 'PROPOSED',
      lastReportDate: '2024-01-15'
    },
    {
      id: 2,
      name: 'Midwest Grid Beta Site',
      region: 'Midwest',
      capacity: '75 MWh',
      power: '30 MW',
      optimizationScore: 89,
      roi: 24.2,
      status: 'APPROVED',
      lastReportDate: '2024-01-10'
    },
    {
      id: 3,
      name: 'Western Grid Gamma Site',
      region: 'Western',
      capacity: '100 MWh',
      power: '40 MW',
      optimizationScore: 92,
      roi: 31.8,
      status: 'UNDER_CONSTRUCTION',
      lastReportDate: '2024-01-08'
    }
  ];

  const auditLogs = [
    {
      id: 1,
      timestamp: '2024-01-15 14:32:18',
      eventType: 'REPORT_GENERATION',
      resourceType: 'BESS_LOCATION',
      resourceId: 1,
      user: 'john.smith@utility.com',
      action: 'GENERATE_PDF',
      status: 'SUCCESS',
      complianceFlags: ['NERC_CIP', 'SOC2']
    },
    {
      id: 2,
      timestamp: '2024-01-15 13:15:42',
      eventType: 'BESS_OPTIMIZATION',
      resourceType: 'BESS_LOCATION',
      resourceId: 1,
      user: 'sarah.johnson@utility.com',
      action: 'RUN_OPTIMIZATION',
      status: 'SUCCESS',
      complianceFlags: ['NERC_CIP', 'SOC2']
    },
    {
      id: 3,
      timestamp: '2024-01-15 11:28:05',
      eventType: 'DATA_ACCESS',
      resourceType: 'GRID_INFRASTRUCTURE',
      resourceId: 'SUBSTATION-A7',
      user: 'mike.chen@utility.com',
      action: 'READ',
      status: 'SUCCESS',
      complianceFlags: ['NERC_CIP', 'GDPR', 'SOC2']
    },
    {
      id: 4,
      timestamp: '2024-01-15 10:45:33',
      eventType: 'REPORT_GENERATION',
      resourceType: 'BESS_LOCATION',
      resourceId: 2,
      user: 'john.smith@utility.com',
      action: 'GENERATE_EXCEL',
      status: 'SUCCESS',
      complianceFlags: ['NERC_CIP', 'SOC2']
    },
    {
      id: 5,
      timestamp: '2024-01-15 09:12:19',
      eventType: 'ACCESS_DENIED',
      resourceType: 'CUSTOMER_DATA',
      resourceId: 'CUST-456',
      user: 'unauthorized@external.com',
      action: 'READ',
      status: 'UNAUTHORIZED',
      complianceFlags: ['GDPR', 'CCPA', 'SOC2']
    }
  ];

  const complianceStats = {
    totalEvents: 1247,
    nercCipEvents: 892,
    gdprEvents: 234,
    ccpaEvents: 89,
    soc2Events: 1247,
    unauthorizedAttempts: 3,
    reportsGenerated: 45,
    optimizationsRun: 28
  };

  const reportSections = [
    { name: 'Executive Summary', included: true, pages: 2 },
    { name: 'Site Analysis', included: true, pages: 4 },
    { name: 'Technical Specifications', included: true, pages: 3 },
    { name: 'Financial Projections', included: true, pages: 5 },
    { name: 'Implementation Roadmap', included: true, pages: 6 },
    { name: 'Risk Assessment', included: true, pages: 4 },
    { name: 'Compliance Checklist', included: true, pages: 3 }
  ];

  const handleGenerateReport = () => {
    setGeneratingReport(true);
    setTimeout(() => {
      setGeneratingReport(false);
      setReportGenerated(true);
      setTimeout(() => setReportGenerated(false), 3000);
    }, 2000);
  };

  const getStatusColor = (status) => {
    const colors = {
      PROPOSED: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      APPROVED: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      UNDER_CONSTRUCTION: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      DEPLOYED: 'bg-violet-500/20 text-violet-400 border-violet-500/30'
    };
    return colors[status] || 'bg-zinc-700 text-zinc-400';
  };

  const getEventTypeIcon = (type) => {
    const icons = {
      REPORT_GENERATION: '📄',
      BESS_OPTIMIZATION: '⚡',
      DATA_ACCESS: '🔍',
      ACCESS_DENIED: '🚫'
    };
    return icons[type] || '📋';
  };

  const getStatusIcon = (status) => {
    return status === 'SUCCESS' ? '✅' : status === 'UNAUTHORIZED' ? '⚠️' : '❌';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-zinc-900 to-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-zinc-900/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">BESS Reports & Audit Trail</h1>
              <p className="text-sm text-zinc-400 mt-1">Comprehensive deployment reports with 2-year compliance logging</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-zinc-500">Compliance Status</div>
                <div className="text-sm font-semibold text-emerald-400">✓ NERC CIP Compliant</div>
              </div>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold">
                JS
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            {['reports', 'audit', 'compliance'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                  activeTab === tab
                    ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                    : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                }`}
              >
                {tab === 'reports' && '📄 Report Generation'}
                {tab === 'audit' && '🔍 Audit Logs'}
                {tab === 'compliance' && '✓ Compliance Dashboard'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Report Generation Tab */}
        {activeTab === 'reports' && (
          <>
            {/* Location Selection */}
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-white/[0.06] shadow-lg shadow-black/20">
              <h2 className="text-lg font-bold text-white mb-4">Select BESS Location</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {bessLocations.map((location) => (
                  <button
                    key={location.id}
                    onClick={() => setSelectedLocation(location)}
                    className={`p-4 rounded-xl border-2 transition-all text-left ${
                      selectedLocation?.id === location.id
                        ? 'border-violet-500 bg-violet-500/10'
                        : 'border-white/10 bg-white/5 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="text-sm font-bold text-white">{location.name}</div>
                      <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(location.status)}`}>
                        {location.status.replace('_', ' ')}
                      </div>
                    </div>
                    <div className="text-xs text-zinc-400 space-y-1">
                      <div>📍 {location.region}</div>
                      <div>⚡ {location.capacity} / {location.power}</div>
                      <div>📊 Score: {location.optimizationScore}/100</div>
                      <div>💰 ROI: {location.roi}%</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {selectedLocation && (
              <>
                {/* Report Configuration */}
                <div className="bg-zinc-800/50 rounded-2xl p-6 border border-white/[0.06] shadow-lg shadow-black/20">
                  <h2 className="text-lg font-bold text-white mb-4">Report Configuration</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Format Selection */}
                    <div>
                      <label className="block text-sm font-semibold text-zinc-300 mb-2">Export Format</label>
                      <div className="flex gap-3">
                        <button
                          onClick={() => setReportFormat('pdf')}
                          className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                            reportFormat === 'pdf'
                              ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                              : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                          }`}
                        >
                          📄 PDF
                        </button>
                        <button
                          onClick={() => setReportFormat('excel')}
                          className={`flex-1 py-3 px-4 rounded-xl font-semibold transition-all ${
                            reportFormat === 'excel'
                              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/30'
                              : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                          }`}
                        >
                          📊 Excel
                        </button>
                      </div>
                    </div>

                    {/* Report Sections */}
                    <div>
                      <label className="block text-sm font-semibold text-zinc-300 mb-2">Included Sections</label>
                      <div className="bg-white/5 rounded-xl p-3 max-h-40 overflow-y-auto">
                        {reportSections.map((section, idx) => (
                          <div key={idx} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                            <span className="text-sm text-zinc-300">{section.name}</span>
                            <span className="text-xs text-zinc-500">{section.pages} pages</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Generate Button */}
                  <div className="mt-6">
                    <button
                      onClick={handleGenerateReport}
                      disabled={generatingReport}
                      className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 text-white font-bold shadow-lg shadow-violet-500/30 hover:shadow-violet-500/50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {generatingReport ? '⏳ Generating Report...' : reportGenerated ? '✅ Report Generated!' : '📄 Generate Comprehensive Report'}
                    </button>
                  </div>
                </div>

                {/* Report Preview */}
                <div className="bg-zinc-800/50 rounded-2xl p-6 border border-white/[0.06] shadow-lg shadow-black/20">
                  <h2 className="text-lg font-bold text-white mb-4">Report Preview</h2>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Executive Summary Preview */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="text-sm font-bold text-violet-400 mb-3">📋 Executive Summary</div>
                      <div className="space-y-2 text-xs text-zinc-300">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Location:</span>
                          <span className="font-semibold">{selectedLocation.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Capacity:</span>
                          <span className="font-semibold">{selectedLocation.capacity}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Optimization Score:</span>
                          <span className="font-semibold text-emerald-400">{selectedLocation.optimizationScore}/100</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Projected ROI:</span>
                          <span className="font-semibold text-emerald-400">{selectedLocation.roi}%</span>
                        </div>
                      </div>
                    </div>

                    {/* Financial Projections Preview */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="text-sm font-bold text-emerald-400 mb-3">💰 Financial Projections</div>
                      <div className="space-y-2 text-xs text-zinc-300">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Total CapEx:</span>
                          <span className="font-semibold">$18.5M</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Annual Revenue:</span>
                          <span className="font-semibold">$2.8M</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Payback Period:</span>
                          <span className="font-semibold">6.6 years</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">AI vs Traditional:</span>
                          <span className="font-semibold text-emerald-400">+33.3% improvement</span>
                        </div>
                      </div>
                    </div>

                    {/* Implementation Roadmap Preview */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="text-sm font-bold text-amber-400 mb-3">🗓️ Implementation Roadmap</div>
                      <div className="space-y-2 text-xs text-zinc-300">
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                          <span>Phase 1: Planning (3-6 months)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                          <span>Phase 2: Procurement (2-4 months)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                          <span>Phase 3: Construction (6-9 months)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                          <span>Phase 4: Commissioning (1-2 months)</span>
                        </div>
                      </div>
                    </div>

                    {/* Compliance Checklist Preview */}
                    <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                      <div className="text-sm font-bold text-cyan-400 mb-3">✓ Compliance Checklist</div>
                      <div className="space-y-2 text-xs text-zinc-300">
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400">✓</span>
                          <span>NERC CIP-002 Categorization</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400">⏳</span>
                          <span>Environmental Assessment</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-emerald-400">✓</span>
                          <span>NFPA 855 Fire Safety</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-amber-400">⏳</span>
                          <span>IEEE 1547 Interconnection</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* Audit Logs Tab */}
        {activeTab === 'audit' && (
          <>
            {/* Filters */}
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-white/[0.06] shadow-lg shadow-black/20">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Audit Log Filters</h2>
                <button className="px-4 py-2 rounded-xl bg-violet-500/20 text-violet-400 text-sm font-semibold hover:bg-violet-500/30 transition-all">
                  🔍 Advanced Search
                </button>
              </div>
              
              <div className="flex gap-3 flex-wrap">
                {['all', 'reports', 'optimization', 'access', 'security'].map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setAuditFilter(filter)}
                    className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                      auditFilter === filter
                        ? 'bg-violet-500 text-white'
                        : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                    }`}
                  >
                    {filter.charAt(0).toUpperCase() + filter.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Audit Logs Table */}
            <div className="bg-zinc-800/50 rounded-2xl border border-white/[0.06] shadow-lg shadow-black/20 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5 border-b border-white/10">
                    <tr>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase">Timestamp</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase">Event</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase">Resource</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase">User</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase">Status</th>
                      <th className="px-6 py-4 text-left text-xs font-semibold text-zinc-400 uppercase">Compliance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-white/5 transition-colors">
                        <td className="px-6 py-4 text-sm text-zinc-300 font-mono">{log.timestamp}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getEventTypeIcon(log.eventType)}</span>
                            <span className="text-sm text-zinc-300">{log.eventType.replace('_', ' ')}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-zinc-300">{log.resourceType}</div>
                          <div className="text-xs text-zinc-500">{log.resourceId}</div>
                        </td>
                        <td className="px-6 py-4 text-sm text-zinc-300">{log.user}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{getStatusIcon(log.status)}</span>
                            <span className={`text-sm font-semibold ${log.status === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {log.status}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-1 flex-wrap">
                            {log.complianceFlags.map((flag, idx) => (
                              <span key={idx} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                                {flag}
                              </span>
                            ))}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Audit Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
                <div className="text-xs text-zinc-500 mb-1">Total Events (30d)</div>
                <div className="text-2xl font-bold text-white">{complianceStats.totalEvents.toLocaleString()}</div>
              </div>
              <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
                <div className="text-xs text-zinc-500 mb-1">Reports Generated</div>
                <div className="text-2xl font-bold text-violet-400">{complianceStats.reportsGenerated}</div>
              </div>
              <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
                <div className="text-xs text-zinc-500 mb-1">Optimizations Run</div>
                <div className="text-2xl font-bold text-emerald-400">{complianceStats.optimizationsRun}</div>
              </div>
              <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
                <div className="text-xs text-zinc-500 mb-1">Unauthorized Attempts</div>
                <div className="text-2xl font-bold text-rose-400">{complianceStats.unauthorizedAttempts}</div>
              </div>
            </div>
          </>
        )}

        {/* Compliance Dashboard Tab */}
        {activeTab === 'compliance' && (
          <>
            {/* Compliance Overview */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-cyan-500/20 to-blue-500/20 rounded-2xl p-5 border border-cyan-500/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-cyan-400">NERC CIP Events</div>
                  <div className="text-2xl">🔒</div>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{complianceStats.nercCipEvents}</div>
                <div className="text-xs text-cyan-300">Critical infrastructure compliance</div>
              </div>

              <div className="bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-2xl p-5 border border-violet-500/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-violet-400">GDPR Events</div>
                  <div className="text-2xl">🇪🇺</div>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{complianceStats.gdprEvents}</div>
                <div className="text-xs text-violet-300">Data protection compliance</div>
              </div>

              <div className="bg-gradient-to-br from-emerald-500/20 to-green-500/20 rounded-2xl p-5 border border-emerald-500/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-emerald-400">SOC 2 Events</div>
                  <div className="text-2xl">✓</div>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{complianceStats.soc2Events}</div>
                <div className="text-xs text-emerald-300">Security controls compliance</div>
              </div>

              <div className="bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-2xl p-5 border border-amber-500/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-semibold text-amber-400">CCPA Events</div>
                  <div className="text-2xl">🇺🇸</div>
                </div>
                <div className="text-3xl font-bold text-white mb-1">{complianceStats.ccpaEvents}</div>
                <div className="text-xs text-amber-300">California privacy compliance</div>
              </div>
            </div>

            {/* Retention Policy */}
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-white/[0.06] shadow-lg shadow-black/20">
              <h2 className="text-lg font-bold text-white mb-4">📅 Audit Log Retention Policy</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-sm font-semibold text-violet-400 mb-2">Hot Storage (0-90 days)</div>
                  <div className="text-xs text-zinc-400 mb-3">Immediate access, full search capability</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500 rounded-full" style={{ width: '65%' }}></div>
                    </div>
                    <span className="text-xs text-zinc-500">65%</span>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-sm font-semibold text-amber-400 mb-2">Warm Storage (90-365 days)</div>
                  <div className="text-xs text-zinc-400 mb-3">Read-only, compressed storage</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500 rounded-full" style={{ width: '25%' }}></div>
                    </div>
                    <span className="text-xs text-zinc-500">25%</span>
                  </div>
                </div>

                <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                  <div className="text-sm font-semibold text-cyan-400 mb-2">Cold Storage (365-730 days)</div>
                  <div className="text-xs text-zinc-400 mb-3">Archived, compliance retention</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-500 rounded-full" style={{ width: '10%' }}></div>
                    </div>
                    <span className="text-xs text-zinc-500">10%</span>
                  </div>
                </div>
              </div>

              <div className="mt-4 p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">✓</div>
                  <div>
                    <div className="text-sm font-semibold text-emerald-400">2-Year Retention Active</div>
                    <div className="text-xs text-emerald-300 mt-1">All audit logs retained for 730 days per NERC CIP compliance requirements</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Compliance Actions */}
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-white/[0.06] shadow-lg shadow-black/20">
              <h2 className="text-lg font-bold text-white mb-4">🔧 Compliance Actions</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-2xl">📊</div>
                    <div className="text-sm font-semibold text-white">Generate Compliance Report</div>
                  </div>
                  <div className="text-xs text-zinc-400">Export comprehensive compliance report for regulatory review</div>
                </button>

                <button className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-2xl">🔍</div>
                    <div className="text-sm font-semibold text-white">Verify Audit Integrity</div>
                  </div>
                  <div className="text-xs text-zinc-400">Run tamper detection on audit log database</div>
                </button>

                <button className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-2xl">📥</div>
                    <div className="text-sm font-semibold text-white">Export Audit Logs</div>
                  </div>
                  <div className="text-xs text-zinc-400">Download audit logs for external compliance systems</div>
                </button>

                <button className="p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-left">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="text-2xl">⚙️</div>
                    <div className="text-sm font-semibold text-white">Configure Retention Policy</div>
                  </div>
                  <div className="text-xs text-zinc-400">Adjust audit log retention and archival settings</div>
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}