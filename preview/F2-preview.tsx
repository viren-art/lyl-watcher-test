export default function GridImpactDashboard() {
  const [selectedRegion, setSelectedRegion] = React.useState(1);
  const [selectedTimeRange, setSelectedTimeRange] = React.useState('24h');
  const [activeTab, setActiveTab] = React.useState('overview');
  const [showAlertDetails, setShowAlertDetails] = React.useState(false);
  const [selectedAlert, setSelectedAlert] = React.useState(null);

  const regions = [
    { id: 1, name: 'Northeast Grid', status: 'CRITICAL', stressIndex: 87 },
    { id: 2, name: 'Midwest Grid', status: 'HIGH', stressIndex: 72 },
    { id: 3, name: 'Western Grid', status: 'MEDIUM', stressIndex: 54 },
    { id: 4, name: 'Southern Grid', status: 'LOW', stressIndex: 28 },
    { id: 5, name: 'Pacific Grid', status: 'MEDIUM', stressIndex: 61 }
  ];

  const currentRegion = regions.find(r => r.id === selectedRegion);

  const gridImpacts = [
    {
      id: 'impact_001',
      timestamp: '2024-01-15T14:30:00Z',
      severity: 'CRITICAL',
      stressIndex: 87,
      outageProbability: 0.78,
      predictedLoadMw: 8450,
      predictedGenerationMw: 7200,
      affectedSubstations: 12,
      confidence: 0.92
    },
    {
      id: 'impact_002',
      timestamp: '2024-01-15T13:30:00Z',
      severity: 'HIGH',
      stressIndex: 72,
      outageProbability: 0.54,
      predictedLoadMw: 7800,
      predictedGenerationMw: 7100,
      affectedSubstations: 8,
      confidence: 0.88
    },
    {
      id: 'impact_003',
      timestamp: '2024-01-15T12:30:00Z',
      severity: 'MEDIUM',
      stressIndex: 58,
      outageProbability: 0.32,
      predictedLoadMw: 7200,
      predictedGenerationMw: 6900,
      affectedSubstations: 4,
      confidence: 0.85
    }
  ];

  const affectedSubstations = [
    { id: 101, name: 'Central Station Alpha', riskLevel: 'CRITICAL', capacityUtilization: 94, currentLoadMw: 1880 },
    { id: 102, name: 'North Hub Beta', riskLevel: 'CRITICAL', capacityUtilization: 91, currentLoadMw: 1820 },
    { id: 103, name: 'East Junction Gamma', riskLevel: 'HIGH', capacityUtilization: 87, currentLoadMw: 1740 },
    { id: 104, name: 'West Terminal Delta', riskLevel: 'HIGH', capacityUtilization: 82, currentLoadMw: 1640 },
    { id: 105, name: 'South Point Epsilon', riskLevel: 'MEDIUM', capacityUtilization: 76, currentLoadMw: 1520 }
  ];

  const recommendations = [
    'Activate emergency load shedding protocols immediately',
    'Deploy mobile generation units to Central Station Alpha and North Hub Beta',
    'Notify grid operators for manual intervention within 30 minutes',
    'Increase spinning reserves by 20% across all substations',
    'Monitor 12 critical substations with real-time telemetry'
  ];

  const telemetryMetrics = {
    totalDataPoints: 847293,
    dataPointsPerSecond: 12847,
    averageLatency: 342,
    bufferUtilization: 67,
    cacheHitRate: 0.84
  };

  const stressHistory = [
    { time: '10:00', stress: 45 },
    { time: '11:00', stress: 52 },
    { time: '12:00', stress: 58 },
    { time: '13:00', stress: 72 },
    { time: '14:00', stress: 87 }
  ];

  const getSeverityColor = (severity) => {
    const colors = {
      'CRITICAL': 'bg-rose-500',
      'HIGH': 'bg-amber-500',
      'MEDIUM': 'bg-cyan-500',
      'LOW': 'bg-emerald-500'
    };
    return colors[severity] || 'bg-zinc-500';
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      'CRITICAL': 'bg-rose-500/20 text-rose-400 border-rose-500/30',
      'HIGH': 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      'MEDIUM': 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      'LOW': 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
    };
    return colors[severity] || 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30';
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-zinc-900/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Grid Impact Analysis</h1>
              <p className="text-sm text-zinc-400 mt-1">AI-powered grid stability prediction & monitoring</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-zinc-500">Processing Rate</div>
                <div className="text-lg font-bold text-violet-400">{telemetryMetrics.dataPointsPerSecond.toLocaleString()}/s</div>
              </div>
              <div className="h-12 w-px bg-white/10"></div>
              <div className="text-right">
                <div className="text-xs text-zinc-500">Avg Latency</div>
                <div className="text-lg font-bold text-emerald-400">{telemetryMetrics.averageLatency}ms</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Region Selector */}
        <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06] shadow-lg shadow-black/20">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Grid Regions</h2>
            <select 
              value={selectedTimeRange}
              onChange={(e) => setSelectedTimeRange(e.target.value)}
              className="rounded-xl bg-zinc-900 border border-white/10 px-4 py-2 text-sm text-zinc-300 focus:ring-2 focus:ring-violet-500/50 focus:outline-none"
            >
              <option value="1h">Last Hour</option>
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
            </select>
          </div>
          <div className="grid grid-cols-5 gap-3">
            {regions.map(region => (
              <button
                key={region.id}
                onClick={() => setSelectedRegion(region.id)}
                className={`rounded-xl p-4 border transition-all ${
                  selectedRegion === region.id
                    ? 'bg-violet-500/20 border-violet-500/50 shadow-lg shadow-violet-500/20'
                    : 'bg-zinc-900/50 border-white/10 hover:border-white/20'
                }`}
              >
                <div className="text-sm font-semibold text-white mb-2">{region.name}</div>
                <div className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border ${getSeverityBadge(region.status)}`}>
                  <div className={`w-2 h-2 rounded-full ${getSeverityColor(region.status)}`}></div>
                  {region.status}
                </div>
                <div className="mt-3 text-2xl font-bold text-white">{region.stressIndex}</div>
                <div className="text-xs text-zinc-500">Stress Index</div>
              </button>
            ))}
          </div>
        </div>

        {/* Critical Alert Banner */}
        {currentRegion.status === 'CRITICAL' && (
          <div className="bg-gradient-to-r from-rose-500/20 to-rose-600/20 rounded-2xl p-5 border border-rose-500/30 shadow-lg shadow-rose-500/10">
            <div className="flex items-start gap-4">
              <div className="text-4xl">⚠️</div>
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h3 className="text-xl font-bold text-rose-400">CRITICAL GRID IMPACT DETECTED</h3>
                  <span className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium bg-rose-500/30 text-rose-300 border border-rose-500/50">
                    78% Outage Probability
                  </span>
                </div>
                <p className="text-sm text-zinc-300 mb-3">
                  Severe weather conditions predicted to impact {currentRegion.name} within the next 3 hours. 
                  Immediate action required to prevent grid instability.
                </p>
                <div className="flex gap-3">
                  <button className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white px-4 py-2 text-sm font-semibold transition-colors">
                    View Emergency Protocols
                  </button>
                  <button 
                    onClick={() => setShowAlertDetails(true)}
                    className="rounded-xl bg-white/10 hover:bg-white/20 text-white px-4 py-2 text-sm font-semibold transition-colors"
                  >
                    View Details
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10">
          {['overview', 'substations', 'telemetry', 'history'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 text-sm font-semibold capitalize transition-colors ${
                activeTab === tab
                  ? 'text-violet-400 border-b-2 border-violet-500'
                  : 'text-zinc-500 hover:text-zinc-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'overview' && (
          <div className="grid grid-cols-3 gap-6">
            {/* Current Impact */}
            <div className="col-span-2 space-y-6">
              <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06] shadow-lg shadow-black/20">
                <h3 className="text-lg font-bold text-white mb-4">Current Grid Impact</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-900/50 rounded-xl p-4">
                    <div className="text-xs text-zinc-500 mb-1">Predicted Load</div>
                    <div className="text-3xl font-bold text-white">{gridImpacts[0].predictedLoadMw.toLocaleString()}</div>
                    <div className="text-sm text-zinc-400">MW</div>
                  </div>
                  <div className="bg-zinc-900/50 rounded-xl p-4">
                    <div className="text-xs text-zinc-500 mb-1">Predicted Generation</div>
                    <div className="text-3xl font-bold text-white">{gridImpacts[0].predictedGenerationMw.toLocaleString()}</div>
                    <div className="text-sm text-zinc-400">MW</div>
                  </div>
                  <div className="bg-zinc-900/50 rounded-xl p-4">
                    <div className="text-xs text-zinc-500 mb-1">Stress Index</div>
                    <div className="flex items-baseline gap-2">
                      <div className="text-3xl font-bold text-rose-400">{gridImpacts[0].stressIndex}</div>
                      <div className="text-sm text-zinc-400">/100</div>
                    </div>
                    <div className="mt-2 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-rose-500 to-rose-600" style={{width: `${gridImpacts[0].stressIndex}%`}}></div>
                    </div>
                  </div>
                  <div className="bg-zinc-900/50 rounded-xl p-4">
                    <div className="text-xs text-zinc-500 mb-1">Outage Probability</div>
                    <div className="text-3xl font-bold text-amber-400">{(gridImpacts[0].outageProbability * 100).toFixed(0)}%</div>
                    <div className="text-sm text-zinc-400">Confidence: {(gridImpacts[0].confidence * 100).toFixed(0)}%</div>
                  </div>
                </div>
              </div>

              {/* Stress History Chart */}
              <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06] shadow-lg shadow-black/20">
                <h3 className="text-lg font-bold text-white mb-4">Stress Index Trend</h3>
                <div className="h-48 flex items-end gap-4">
                  {stressHistory.map((point, idx) => (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full bg-zinc-900 rounded-t-lg overflow-hidden" style={{height: '160px'}}>
                        <div 
                          className={`w-full rounded-t-lg transition-all ${
                            point.stress > 70 ? 'bg-gradient-to-t from-rose-500 to-rose-600' :
                            point.stress > 50 ? 'bg-gradient-to-t from-amber-500 to-amber-600' :
                            'bg-gradient-to-t from-cyan-500 to-cyan-600'
                          }`}
                          style={{height: `${(point.stress / 100) * 160}px`}}
                        ></div>
                      </div>
                      <div className="text-xs text-zinc-500">{point.time}</div>
                      <div className="text-sm font-bold text-white">{point.stress}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recommendations */}
            <div className="space-y-6">
              <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06] shadow-lg shadow-black/20">
                <h3 className="text-lg font-bold text-white mb-4">AI Recommendations</h3>
                <div className="space-y-3">
                  {recommendations.map((rec, idx) => (
                    <div key={idx} className="flex gap-3 p-3 bg-zinc-900/50 rounded-xl">
                      <div className="text-violet-400 font-bold">{idx + 1}</div>
                      <div className="text-sm text-zinc-300">{rec}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06] shadow-lg shadow-black/20">
                <h3 className="text-lg font-bold text-white mb-4">System Metrics</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-400">Cache Hit Rate</span>
                      <span className="text-white font-semibold">{(telemetryMetrics.cacheHitRate * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600" style={{width: `${telemetryMetrics.cacheHitRate * 100}%`}}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-zinc-400">Buffer Utilization</span>
                      <span className="text-white font-semibold">{telemetryMetrics.bufferUtilization}%</span>
                    </div>
                    <div className="h-2 bg-zinc-900 rounded-full overflow-hidden">
                      <div className="h-full bg-gradient-to-r from-cyan-500 to-cyan-600" style={{width: `${telemetryMetrics.bufferUtilization}%`}}></div>
                    </div>
                  </div>
                  <div className="pt-3 border-t border-white/10">
                    <div className="text-xs text-zinc-500 mb-1">Total Data Points</div>
                    <div className="text-2xl font-bold text-white">{telemetryMetrics.totalDataPoints.toLocaleString()}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'substations' && (
          <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06] shadow-lg shadow-black/20">
            <h3 className="text-lg font-bold text-white mb-4">Affected Substations</h3>
            <div className="space-y-3">
              {affectedSubstations.map(station => (
                <div key={station.id} className="bg-zinc-900/50 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-semibold text-white">{station.name}</div>
                      <div className="text-xs text-zinc-500">ID: {station.id}</div>
                    </div>
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border ${getSeverityBadge(station.riskLevel)}`}>
                      <div className={`w-2 h-2 rounded-full ${getSeverityColor(station.riskLevel)}`}></div>
                      {station.riskLevel}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">Capacity Utilization</div>
                      <div className="text-xl font-bold text-white">{station.capacityUtilization}%</div>
                      <div className="mt-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                        <div className={`h-full ${
                          station.capacityUtilization > 90 ? 'bg-gradient-to-r from-rose-500 to-rose-600' :
                          station.capacityUtilization > 80 ? 'bg-gradient-to-r from-amber-500 to-amber-600' :
                          'bg-gradient-to-r from-cyan-500 to-cyan-600'
                        }`} style={{width: `${station.capacityUtilization}%`}}></div>
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500 mb-1">Current Load</div>
                      <div className="text-xl font-bold text-white">{station.currentLoadMw.toLocaleString()}</div>
                      <div className="text-sm text-zinc-400">MW</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'telemetry' && (
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06] shadow-lg shadow-black/20">
              <h3 className="text-lg font-bold text-white mb-4">Real-Time Telemetry</h3>
              <div className="space-y-4">
                <div className="bg-zinc-900/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-2">Data Processing Rate</div>
                  <div className="text-3xl font-bold text-violet-400">{telemetryMetrics.dataPointsPerSecond.toLocaleString()}</div>
                  <div className="text-sm text-zinc-400">data points/second</div>
                </div>
                <div className="bg-zinc-900/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-2">Average Latency</div>
                  <div className="text-3xl font-bold text-emerald-400">{telemetryMetrics.averageLatency}</div>
                  <div className="text-sm text-zinc-400">milliseconds</div>
                </div>
                <div className="bg-zinc-900/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-2">Total Data Points Processed</div>
                  <div className="text-3xl font-bold text-cyan-400">{telemetryMetrics.totalDataPoints.toLocaleString()}</div>
                  <div className="text-sm text-zinc-400">since system start</div>
                </div>
              </div>
            </div>
            <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06] shadow-lg shadow-black/20">
              <h3 className="text-lg font-bold text-white mb-4">MQTT Connection Status</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl">
                  <span className="text-sm text-zinc-300">SCADA Broker</span>
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-400">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    Connected
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl">
                  <span className="text-sm text-zinc-300">Kafka Producer</span>
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-400">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    Active
                  </span>
                </div>
                <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-xl">
                  <span className="text-sm text-zinc-300">TimescaleDB</span>
                  <span className="inline-flex items-center gap-2 text-xs font-medium text-emerald-400">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    Healthy
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06] shadow-lg shadow-black/20">
            <h3 className="text-lg font-bold text-white mb-4">Impact Prediction History</h3>
            <div className="space-y-3">
              {gridImpacts.map(impact => (
                <div key={impact.id} className="bg-zinc-900/50 rounded-xl p-4 border border-white/10">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="text-sm text-zinc-400">{new Date(impact.timestamp).toLocaleString()}</div>
                      <div className="text-xs text-zinc-500 mt-1">ID: {impact.id}</div>
                    </div>
                    <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium border ${getSeverityBadge(impact.severity)}`}>
                      <div className={`w-2 h-2 rounded-full ${getSeverityColor(impact.severity)}`}></div>
                      {impact.severity}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    <div>
                      <div className="text-xs text-zinc-500">Stress Index</div>
                      <div className="text-lg font-bold text-white">{impact.stressIndex}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Outage Prob.</div>
                      <div className="text-lg font-bold text-white">{(impact.outageProbability * 100).toFixed(0)}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Affected Stations</div>
                      <div className="text-lg font-bold text-white">{impact.affectedSubstations}</div>
                    </div>
                    <div>
                      <div className="text-xs text-zinc-500">Confidence</div>
                      <div className="text-lg font-bold text-white">{(impact.confidence * 100).toFixed(0)}%</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}