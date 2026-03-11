export default function BESSOptimizationDashboard() {
  const [selectedRegion, setSelectedRegion] = React.useState(1);
  const [activeTab, setActiveTab] = React.useState('recommendations');
  const [selectedLocation, setSelectedLocation] = React.useState(null);
  const [optimizationRunning, setOptimizationRunning] = React.useState(false);
  const [showComparison, setShowComparison] = React.useState(false);

  const regions = [
    { id: 1, name: 'Northeast Grid', capacity: 2500, demand: 2200 },
    { id: 2, name: 'Midwest Grid', capacity: 3200, demand: 2800 },
    { id: 3, name: 'Western Grid', capacity: 2800, demand: 2400 },
    { id: 4, name: 'Southern Grid', capacity: 3500, demand: 3100 },
    { id: 5, name: 'Pacific Grid', capacity: 2900, demand: 2600 }
  ];

  const currentRegion = regions.find(r => r.id === selectedRegion);

  const bessRecommendations = [
    {
      id: 1,
      priority: 1,
      name: 'Hartford Industrial Zone',
      coordinates: { lat: 41.7658, lon: -72.6734 },
      h3Index: '8928308280fffff',
      capacityMwh: 150,
      powerMw: 112,
      optimizationScore: 94.2,
      roiEstimate: 28.5,
      roiImprovement: 24.3,
      gridImpactMitigation: 92,
      weatherRiskMitigation: 88,
      implementationFeasibility: 95,
      totalCostUsd: 28500000,
      connectionCostUsd: 2100000,
      paybackYears: 8.2,
      distanceToSubstationKm: 3.2,
      justification: 'Exceptional ROI improvement of 24.3%; High grid stability enhancement potential; Optimal proximity to existing grid infrastructure; Confirmed land availability',
      status: 'PROPOSED'
    },
    {
      id: 2,
      priority: 2,
      name: 'Springfield Commerce Park',
      coordinates: { lat: 42.1015, lon: -72.5898 },
      h3Index: '8928308281fffff',
      capacityMwh: 125,
      powerMw: 94,
      optimizationScore: 91.8,
      roiEstimate: 26.8,
      roiImprovement: 22.7,
      gridImpactMitigation: 89,
      weatherRiskMitigation: 85,
      implementationFeasibility: 92,
      totalCostUsd: 24200000,
      connectionCostUsd: 1800000,
      paybackYears: 8.9,
      distanceToSubstationKm: 2.8,
      justification: 'Strong ROI improvement of 22.7%; High grid stability enhancement potential; Optimal proximity to existing grid infrastructure; Minimal environmental constraints',
      status: 'PROPOSED'
    },
    {
      id: 3,
      priority: 3,
      name: 'Worcester Tech Corridor',
      coordinates: { lat: 42.2626, lon: -71.8023 },
      h3Index: '8928308282fffff',
      capacityMwh: 140,
      powerMw: 105,
      optimizationScore: 89.5,
      roiEstimate: 25.2,
      roiImprovement: 21.8,
      gridImpactMitigation: 87,
      weatherRiskMitigation: 82,
      implementationFeasibility: 90,
      totalCostUsd: 26800000,
      connectionCostUsd: 2400000,
      paybackYears: 9.4,
      distanceToSubstationKm: 4.1,
      justification: 'Strong ROI improvement of 21.8%; Significant weather risk mitigation capability; Confirmed land availability; Rapid payback period of 9.4 years',
      status: 'PROPOSED'
    },
    {
      id: 4,
      priority: 4,
      name: 'New Haven Distribution Hub',
      coordinates: { lat: 41.3083, lon: -72.9279 },
      h3Index: '8928308283fffff',
      capacityMwh: 110,
      powerMw: 83,
      optimizationScore: 87.3,
      roiEstimate: 24.1,
      roiImprovement: 20.5,
      gridImpactMitigation: 85,
      weatherRiskMitigation: 80,
      implementationFeasibility: 88,
      totalCostUsd: 22500000,
      connectionCostUsd: 1600000,
      paybackYears: 9.8,
      distanceToSubstationKm: 3.6,
      justification: 'Strong ROI improvement of 20.5%; High grid stability enhancement potential; Minimal environmental constraints; Rapid payback period of 9.8 years',
      status: 'PROPOSED'
    },
    {
      id: 5,
      priority: 5,
      name: 'Bridgeport Energy District',
      coordinates: { lat: 41.1865, lon: -73.1952 },
      h3Index: '8928308284fffff',
      capacityMwh: 135,
      powerMw: 101,
      optimizationScore: 85.7,
      roiEstimate: 23.4,
      roiImprovement: 20.1,
      gridImpactMitigation: 83,
      weatherRiskMitigation: 78,
      implementationFeasibility: 86,
      totalCostUsd: 25900000,
      connectionCostUsd: 2200000,
      paybackYears: 10.2,
      distanceToSubstationKm: 4.8,
      justification: 'Strong ROI improvement of 20.1%; Balanced multi-criteria optimization; Confirmed land availability',
      status: 'PROPOSED'
    }
  ];

  const optimizationMetrics = {
    totalOptimizations: 47,
    averageLatencyMs: 12450,
    cacheHits: 23,
    cacheMisses: 24,
    cacheSize: 8
  };

  const traditionalComparison = {
    traditionalROI: 18.2,
    aiROI: 28.5,
    improvement: 56.6,
    traditionalPayback: 12.5,
    aiPayback: 8.2,
    costSavings: 4200000
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 80) return 'text-cyan-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-rose-400';
  };

  const getScoreBg = (score) => {
    if (score >= 90) return 'bg-emerald-500/20 border-emerald-500/30';
    if (score >= 80) return 'bg-cyan-500/20 border-cyan-500/30';
    if (score >= 70) return 'bg-amber-500/20 border-amber-500/30';
    return 'bg-rose-500/20 border-rose-500/30';
  };

  const runOptimization = () => {
    setOptimizationRunning(true);
    setTimeout(() => {
      setOptimizationRunning(false);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                <span className="text-3xl">🔋</span>
                BESS Location Optimizer
              </h1>
              <p className="text-sm text-zinc-400 mt-1">AI-Powered Battery Storage Site Selection</p>
            </div>
            <div className="flex items-center gap-3">
              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(Number(e.target.value))}
                className="rounded-xl bg-white/5 border border-white/10 text-white py-3 px-4 focus:ring-2 focus:ring-violet-500/50 focus:outline-none"
              >
                {regions.map(region => (
                  <option key={region.id} value={region.id} className="bg-slate-800">
                    {region.name}
                  </option>
                ))}
              </select>
              <button
                onClick={runOptimization}
                disabled={optimizationRunning}
                className="rounded-xl bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-500 hover:to-purple-500 disabled:from-violet-600/50 disabled:to-purple-600/50 text-white font-semibold py-3 px-6 transition-all shadow-lg shadow-violet-500/20"
              >
                {optimizationRunning ? '⚙️ Optimizing...' : '▶️ Run Optimization'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Region Overview */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/[0.06]">
            <div className="text-xs text-zinc-400 mb-1">Grid Capacity</div>
            <div className="text-2xl font-bold text-white">{currentRegion.capacity} MW</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/[0.06]">
            <div className="text-xs text-zinc-400 mb-1">Peak Demand</div>
            <div className="text-2xl font-bold text-white">{currentRegion.demand} MW</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/[0.06]">
            <div className="text-xs text-zinc-400 mb-1">Avg Optimization Time</div>
            <div className="text-2xl font-bold text-emerald-400">{(optimizationMetrics.averageLatencyMs / 1000).toFixed(1)}s</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5 border border-white/[0.06]">
            <div className="text-xs text-zinc-400 mb-1">Cache Hit Rate</div>
            <div className="text-2xl font-bold text-cyan-400">
              {((optimizationMetrics.cacheHits / (optimizationMetrics.cacheHits + optimizationMetrics.cacheMisses)) * 100).toFixed(0)}%
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10">
          {['recommendations', 'comparison', 'map'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-3 font-semibold rounded-t-xl transition-all ${
                activeTab === tab
                  ? 'bg-white/10 text-white border-b-2 border-violet-500'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab === 'recommendations' && '📍 Top Recommendations'}
              {tab === 'comparison' && '📊 ROI Comparison'}
              {tab === 'map' && '🗺️ Location Map'}
            </button>
          ))}
        </div>

        {/* Recommendations Tab */}
        {activeTab === 'recommendations' && (
          <div className="space-y-4">
            {bessRecommendations.map(location => (
              <div
                key={location.id}
                className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/[0.06] hover:border-violet-500/30 transition-all cursor-pointer"
                onClick={() => setSelectedLocation(location.id === selectedLocation ? null : location.id)}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-500/30 text-violet-400 font-bold text-lg">
                      #{location.priority}
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white mb-1">{location.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-zinc-400">
                        <span>📍 {location.coordinates.lat.toFixed(4)}, {location.coordinates.lon.toFixed(4)}</span>
                        <span>🔷 {location.h3Index}</span>
                      </div>
                    </div>
                  </div>
                  <div className={`inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium border ${getScoreBg(location.optimizationScore)}`}>
                    <span className={getScoreColor(location.optimizationScore)}>Score: {location.optimizationScore}</span>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="bg-slate-800/50 rounded-xl p-4">
                    <div className="text-xs text-zinc-400 mb-1">Capacity</div>
                    <div className="text-lg font-bold text-white">{location.capacityMwh} MWh</div>
                    <div className="text-xs text-zinc-500">{location.powerMw} MW</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4">
                    <div className="text-xs text-zinc-400 mb-1">ROI Estimate</div>
                    <div className="text-lg font-bold text-emerald-400">{location.roiEstimate}%</div>
                    <div className="text-xs text-emerald-500">+{location.roiImprovement}% vs traditional</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4">
                    <div className="text-xs text-zinc-400 mb-1">Total Cost</div>
                    <div className="text-lg font-bold text-white">${(location.totalCostUsd / 1000000).toFixed(1)}M</div>
                    <div className="text-xs text-zinc-500">Payback: {location.paybackYears}y</div>
                  </div>
                  <div className="bg-slate-800/50 rounded-xl p-4">
                    <div className="text-xs text-zinc-400 mb-1">Distance to Grid</div>
                    <div className="text-lg font-bold text-cyan-400">{location.distanceToSubstationKm} km</div>
                    <div className="text-xs text-zinc-500">${(location.connectionCostUsd / 1000000).toFixed(1)}M connection</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2">
                    <span className="text-xs text-zinc-400">Grid Impact</span>
                    <span className={`text-sm font-semibold ${getScoreColor(location.gridImpactMitigation)}`}>
                      {location.gridImpactMitigation}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2">
                    <span className="text-xs text-zinc-400">Weather Risk</span>
                    <span className={`text-sm font-semibold ${getScoreColor(location.weatherRiskMitigation)}`}>
                      {location.weatherRiskMitigation}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-slate-800/30 rounded-lg px-3 py-2">
                    <span className="text-xs text-zinc-400">Feasibility</span>
                    <span className={`text-sm font-semibold ${getScoreColor(location.implementationFeasibility)}`}>
                      {location.implementationFeasibility}%
                    </span>
                  </div>
                </div>

                {selectedLocation === location.id && (
                  <div className="border-t border-white/10 pt-4 mt-4">
                    <div className="text-sm text-zinc-300 mb-3">
                      <span className="font-semibold text-white">Justification:</span> {location.justification}
                    </div>
                    <div className="flex gap-3">
                      <button className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-3 px-4 transition-all">
                        ✅ Approve Location
                      </button>
                      <button className="flex-1 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-4 transition-all border border-white/10">
                        📄 Generate Report
                      </button>
                      <button className="rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold py-3 px-4 transition-all border border-white/10">
                        🗺️ View on Map
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ROI Comparison Tab */}
        {activeTab === 'comparison' && (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/[0.06]">
              <h3 className="text-xl font-bold text-white mb-6">AI vs Traditional Site Selection</h3>
              
              <div className="grid grid-cols-2 gap-6 mb-8">
                <div className="bg-slate-800/50 rounded-xl p-6 border border-rose-500/30">
                  <div className="text-sm text-zinc-400 mb-2">Traditional Method</div>
                  <div className="text-4xl font-bold text-rose-400 mb-4">{traditionalComparison.traditionalROI}%</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Payback Period</span>
                      <span className="text-white font-semibold">{traditionalComparison.traditionalPayback} years</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Method</span>
                      <span className="text-white font-semibold">Manual Analysis</span>
                    </div>
                  </div>
                </div>

                <div className="bg-slate-800/50 rounded-xl p-6 border border-emerald-500/30">
                  <div className="text-sm text-zinc-400 mb-2">AI-Optimized Method</div>
                  <div className="text-4xl font-bold text-emerald-400 mb-4">{traditionalComparison.aiROI}%</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Payback Period</span>
                      <span className="text-white font-semibold">{traditionalComparison.aiPayback} years</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-zinc-400">Method</span>
                      <span className="text-white font-semibold">RL + Geospatial</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-xl p-6 border border-emerald-500/30">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-sm text-zinc-300 mb-1">ROI Improvement</div>
                    <div className="text-3xl font-bold text-emerald-400">+{traditionalComparison.improvement}%</div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-zinc-300 mb-1">Cost Savings</div>
                    <div className="text-3xl font-bold text-cyan-400">${(traditionalComparison.costSavings / 1000000).toFixed(1)}M</div>
                  </div>
                </div>
                <div className="text-sm text-zinc-300">
                  ✅ Exceeds 20% improvement threshold required by NFR-006
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/[0.06]">
              <h3 className="text-lg font-bold text-white mb-4">Top 5 Locations ROI Breakdown</h3>
              <div className="space-y-3">
                {bessRecommendations.slice(0, 5).map(location => (
                  <div key={location.id} className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 font-bold text-sm">
                      {location.priority}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-white font-medium">{location.name}</span>
                        <span className="text-sm text-emerald-400 font-semibold">{location.roiEstimate}%</span>
                      </div>
                      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-emerald-500 to-cyan-500"
                          style={{ width: `${(location.roiEstimate / 30) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="text-xs text-emerald-500 font-medium">
                      +{location.roiImprovement}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Map Tab */}
        {activeTab === 'map' && (
          <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/[0.06]">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">BESS Location Map</h3>
              <div className="flex gap-2">
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  <span className="text-zinc-400">Score 90+</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-cyan-500"></div>
                  <span className="text-zinc-400">Score 80-89</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                  <span className="text-zinc-400">Score 70-79</span>
                </div>
              </div>
            </div>
            
            <div className="bg-slate-800/50 rounded-xl h-96 flex items-center justify-center border border-white/10">
              <div className="text-center">
                <div className="text-6xl mb-4">🗺️</div>
                <div className="text-zinc-400 text-sm">Interactive map with H3 hexagon overlay</div>
                <div className="text-zinc-500 text-xs mt-2">Showing {bessRecommendations.length} optimized locations</div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-6">
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="text-xs text-zinc-400 mb-1">H3 Resolution</div>
                <div className="text-lg font-bold text-white">7</div>
                <div className="text-xs text-zinc-500">~5.16 km² hexagons</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="text-xs text-zinc-400 mb-1">Analyzed Hexagons</div>
                <div className="text-lg font-bold text-cyan-400">1,247</div>
                <div className="text-xs text-zinc-500">100 candidates selected</div>
              </div>
              <div className="bg-slate-800/50 rounded-xl p-4">
                <div className="text-xs text-zinc-400 mb-1">Coverage Area</div>
                <div className="text-lg font-bold text-violet-400">6,432 km²</div>
                <div className="text-xs text-zinc-500">50 km radius</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}