export default function MultiRegionScalingDashboard() {
  const [selectedView, setSelectedView] = React.useState('overview');
  const [selectedRegion, setSelectedRegion] = React.useState(null);
  const [timeRange, setTimeRange] = React.useState('24h');
  const [showScalingDetails, setShowScalingDetails] = React.useState(false);

  const regions = [
    { id: 1, name: 'Northeast', code: 'NE', status: 'healthy', pods: 12, cpu: 68, memory: 72, accuracy: 87.2, customers: 23, datacenter: 'us-east-1' },
    { id: 2, name: 'Midwest', code: 'MW', status: 'healthy', pods: 10, cpu: 62, memory: 65, accuracy: 86.8, customers: 18, datacenter: 'us-central-1' },
    { id: 3, name: 'Western', code: 'WE', status: 'scaling', pods: 15, cpu: 74, memory: 78, accuracy: 88.1, customers: 31, datacenter: 'us-west-1' },
    { id: 4, name: 'Southern', code: 'SO', status: 'healthy', pods: 11, cpu: 59, memory: 61, accuracy: 85.9, customers: 19, datacenter: 'us-south-1' },
    { id: 5, name: 'Pacific', code: 'PA', status: 'healthy', pods: 13, cpu: 71, memory: 75, accuracy: 87.5, customers: 27, datacenter: 'us-west-2' },
    { id: 6, name: 'Southeast', code: 'SE', status: 'provisioning', pods: 3, cpu: 45, memory: 48, accuracy: 84.2, customers: 5, datacenter: 'us-east-2' },
    { id: 7, name: 'Northwest', code: 'NW', status: 'provisioning', pods: 3, cpu: 42, memory: 46, accuracy: 83.8, customers: 4, datacenter: 'us-west-3' },
  ];

  const platformMetrics = {
    totalRegions: 7,
    activeRegions: 5,
    provisioningRegions: 2,
    totalCustomers: 127,
    totalPods: 67,
    avgAccuracy: 86.5,
    uptime: 99.7,
    peakLoadCapacity: '3x',
  };

  const scalingEvents = [
    { id: 1, region: 'Western', type: 'scale-up', from: 10, to: 15, reason: 'CPU threshold exceeded (74%)', timestamp: '2 min ago', status: 'completed' },
    { id: 2, region: 'Northeast', type: 'scale-down', from: 15, to: 12, reason: 'Low demand period', timestamp: '18 min ago', status: 'completed' },
    { id: 3, region: 'Pacific', type: 'scale-up', from: 10, to: 13, reason: 'Memory threshold exceeded (78%)', timestamp: '45 min ago', status: 'completed' },
    { id: 4, region: 'Southeast', type: 'provision', from: 0, to: 3, reason: 'New region deployment', timestamp: '2 hours ago', status: 'in-progress' },
  ];

  const tenantDistribution = [
    { tier: 'Enterprise', count: 28, regions: 4.2, color: 'violet' },
    { tier: 'Professional', count: 51, regions: 2.8, color: 'cyan' },
    { tier: 'Basic', count: 48, regions: 1.3, color: 'emerald' },
  ];

  const accuracyTrend = [
    { time: '00:00', ne: 87, mw: 86, we: 88, so: 85, pa: 87 },
    { time: '04:00', ne: 86, mw: 87, we: 87, so: 86, pa: 88 },
    { time: '08:00', ne: 88, mw: 86, we: 89, so: 85, pa: 87 },
    { time: '12:00', ne: 87, mw: 87, we: 88, so: 86, pa: 88 },
    { time: '16:00', ne: 87, mw: 86, we: 88, so: 85, pa: 87 },
    { time: '20:00', ne: 87, mw: 87, we: 88, so: 86, pa: 87 },
  ];

  const getStatusColor = (status) => {
    const colors = {
      healthy: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
      scaling: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
      provisioning: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
      degraded: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    };
    return colors[status] || colors.healthy;
  };

  const getStatusIcon = (status) => {
    const icons = { healthy: '✓', scaling: '↗', provisioning: '⚙', degraded: '⚠' };
    return icons[status] || '•';
  };

  const getTierColor = (tier) => {
    const colors = { Enterprise: 'violet', Professional: 'cyan', Basic: 'emerald' };
    return colors[tier] || 'slate';
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-zinc-900/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Multi-Region Platform</h1>
              <p className="text-sm text-zinc-400 mt-1">Geographic scaling & tenant management</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-sm font-medium text-emerald-400">{platformMetrics.uptime}% Uptime</span>
              </div>
              <button className="px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold text-sm transition-colors">
                Add Region
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mt-4">
            {['overview', 'regions', 'scaling', 'tenants'].map((view) => (
              <button
                key={view}
                onClick={() => setSelectedView(view)}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                  selectedView === view
                    ? 'bg-white/10 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-white/5'
                }`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Platform Metrics */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
            <div className="text-sm text-zinc-400 mb-1">Total Regions</div>
            <div className="text-3xl font-bold text-white">{platformMetrics.totalRegions}</div>
            <div className="text-xs text-emerald-400 mt-2">+2 provisioning</div>
          </div>
          <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
            <div className="text-sm text-zinc-400 mb-1">B2B Customers</div>
            <div className="text-3xl font-bold text-white">{platformMetrics.totalCustomers}</div>
            <div className="text-xs text-cyan-400 mt-2">Across all regions</div>
          </div>
          <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
            <div className="text-sm text-zinc-400 mb-1">Avg Accuracy</div>
            <div className="text-3xl font-bold text-white">{platformMetrics.avgAccuracy}%</div>
            <div className="text-xs text-emerald-400 mt-2">Above 85% target</div>
          </div>
          <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
            <div className="text-sm text-zinc-400 mb-1">Peak Capacity</div>
            <div className="text-3xl font-bold text-white">{platformMetrics.peakLoadCapacity}</div>
            <div className="text-xs text-violet-400 mt-2">Auto-scaling ready</div>
          </div>
        </div>

        {selectedView === 'overview' && (
          <>
            {/* Region Status Grid */}
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-white/[0.06]">
              <h2 className="text-lg font-bold text-white mb-4">Regional Status</h2>
              <div className="grid grid-cols-3 gap-4">
                {regions.map((region) => (
                  <div
                    key={region.id}
                    onClick={() => setSelectedRegion(region)}
                    className="bg-zinc-900/50 rounded-xl p-4 border border-white/[0.06] hover:border-violet-500/30 cursor-pointer transition-all"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold text-white">{region.name}</div>
                        <div className="text-xs text-zinc-500 mt-0.5">{region.datacenter}</div>
                      </div>
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusColor(region.status)}`}>
                        {getStatusIcon(region.status)} {region.status}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <div className="text-zinc-500 text-xs">Pods</div>
                        <div className="font-semibold text-white">{region.pods}</div>
                      </div>
                      <div>
                        <div className="text-zinc-500 text-xs">Customers</div>
                        <div className="font-semibold text-white">{region.customers}</div>
                      </div>
                      <div>
                        <div className="text-zinc-500 text-xs">CPU</div>
                        <div className={`font-semibold ${region.cpu > 70 ? 'text-amber-400' : 'text-emerald-400'}`}>{region.cpu}%</div>
                      </div>
                      <div>
                        <div className="text-zinc-500 text-xs">Accuracy</div>
                        <div className={`font-semibold ${region.accuracy >= 85 ? 'text-emerald-400' : 'text-rose-400'}`}>{region.accuracy}%</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Accuracy Trend */}
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-white/[0.06]">
              <h2 className="text-lg font-bold text-white mb-4">Prediction Accuracy Trend (24h)</h2>
              <div className="space-y-3">
                {accuracyTrend.map((point, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="text-xs text-zinc-500 w-12">{point.time}</div>
                    <div className="flex-1 flex items-center gap-2">
                      {['ne', 'mw', 'we', 'so', 'pa'].map((code) => (
                        <div key={code} className="flex-1">
                          <div className="h-8 bg-zinc-900/50 rounded-lg overflow-hidden">
                            <div
                              className={`h-full ${point[code] >= 85 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                              style={{ width: `${point[code]}%` }}
                            ></div>
                          </div>
                          <div className="text-xs text-zinc-500 mt-1 text-center">{point[code]}%</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-center gap-4 mt-4 text-xs text-zinc-500">
                <span>NE</span>
                <span>MW</span>
                <span>WE</span>
                <span>SO</span>
                <span>PA</span>
              </div>
            </div>
          </>
        )}

        {selectedView === 'scaling' && (
          <div className="space-y-6">
            {/* Scaling Events */}
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-white/[0.06]">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white">Recent Scaling Events</h2>
                <button
                  onClick={() => setShowScalingDetails(!showScalingDetails)}
                  className="text-sm text-violet-400 hover:text-violet-300"
                >
                  {showScalingDetails ? 'Hide' : 'Show'} Details
                </button>
              </div>
              <div className="space-y-3">
                {scalingEvents.map((event) => (
                  <div key={event.id} className="bg-zinc-900/50 rounded-xl p-4 border border-white/[0.06]">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <span className="font-semibold text-white">{event.region}</span>
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            event.type === 'scale-up' ? 'bg-emerald-500/20 text-emerald-400' :
                            event.type === 'scale-down' ? 'bg-cyan-500/20 text-cyan-400' :
                            'bg-violet-500/20 text-violet-400'
                          }`}>
                            {event.type === 'scale-up' ? '↗' : event.type === 'scale-down' ? '↘' : '⚙'} {event.type}
                          </span>
                          <span className="text-xs text-zinc-500">{event.timestamp}</span>
                        </div>
                        <div className="text-sm text-zinc-400">{event.reason}</div>
                        {showScalingDetails && (
                          <div className="mt-3 flex items-center gap-4 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-zinc-500">Pods:</span>
                              <span className="font-mono text-zinc-400">{event.from}</span>
                              <span className="text-zinc-600">→</span>
                              <span className="font-mono text-white">{event.to}</span>
                            </div>
                            <div className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
                              event.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                            }`}>
                              {event.status}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Auto-Scaling Configuration */}
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-white/[0.06]">
              <h2 className="text-lg font-bold text-white mb-4">Auto-Scaling Thresholds</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/[0.06]">
                  <div className="text-sm text-zinc-400 mb-3">CPU Threshold</div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-amber-500" style={{ width: '70%' }}></div>
                    </div>
                    <span className="text-lg font-bold text-white">70%</span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-2">Scale up when exceeded</div>
                </div>
                <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/[0.06]">
                  <div className="text-sm text-zinc-400 mb-3">Memory Threshold</div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                      <div className="h-full bg-violet-500" style={{ width: '80%' }}></div>
                    </div>
                    <span className="text-lg font-bold text-white">80%</span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-2">Scale up when exceeded</div>
                </div>
                <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/[0.06]">
                  <div className="text-sm text-zinc-400 mb-3">Min Replicas</div>
                  <div className="text-2xl font-bold text-white">3</div>
                  <div className="text-xs text-zinc-500 mt-2">Per region baseline</div>
                </div>
                <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/[0.06]">
                  <div className="text-sm text-zinc-400 mb-3">Max Replicas</div>
                  <div className="text-2xl font-bold text-white">50</div>
                  <div className="text-xs text-zinc-500 mt-2">Peak load capacity</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {selectedView === 'tenants' && (
          <div className="space-y-6">
            {/* Tenant Distribution */}
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-white/[0.06]">
              <h2 className="text-lg font-bold text-white mb-4">Tenant Distribution by Tier</h2>
              <div className="space-y-4">
                {tenantDistribution.map((tier) => (
                  <div key={tier.tier} className="bg-zinc-900/50 rounded-xl p-4 border border-white/[0.06]">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className={`w-3 h-3 rounded-full bg-${tier.color}-500`}></span>
                        <span className="font-semibold text-white">{tier.tier}</span>
                      </div>
                      <span className="text-2xl font-bold text-white">{tier.count}</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <div className="flex-1">
                        <div className="text-zinc-500 text-xs mb-1">Avg Regions per Customer</div>
                        <div className="font-semibold text-zinc-300">{tier.regions}</div>
                      </div>
                      <div className="flex-1">
                        <div className="text-zinc-500 text-xs mb-1">Total Coverage</div>
                        <div className="font-semibold text-zinc-300">{Math.round(tier.count * tier.regions)} regions</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Multi-Tenant Isolation */}
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-white/[0.06]">
              <h2 className="text-lg font-bold text-white mb-4">Multi-Tenant Isolation</h2>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/[0.06]">
                  <div className="text-sm text-zinc-400 mb-2">Schema Isolation</div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🔒</span>
                    <span className="text-lg font-bold text-emerald-400">Active</span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-2">Per-tenant database schemas</div>
                </div>
                <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/[0.06]">
                  <div className="text-sm text-zinc-400 mb-2">API Rate Limiting</div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">⚡</span>
                    <span className="text-lg font-bold text-cyan-400">Enforced</span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-2">Tier-based quotas</div>
                </div>
                <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/[0.06]">
                  <div className="text-sm text-zinc-400 mb-2">Regional Access</div>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">🌍</span>
                    <span className="text-lg font-bold text-violet-400">Controlled</span>
                  </div>
                  <div className="text-xs text-zinc-500 mt-2">Subscription-based filtering</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Region Details Modal */}
        {selectedRegion && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-6">
            <div className="bg-zinc-900 rounded-2xl border border-white/10 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="sticky top-0 bg-zinc-900 border-b border-white/10 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-white">{selectedRegion.name} Region</h3>
                    <p className="text-sm text-zinc-400 mt-1">{selectedRegion.datacenter}</p>
                  </div>
                  <button
                    onClick={() => setSelectedRegion(null)}
                    className="text-zinc-400 hover:text-white"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-800/50 rounded-xl p-4">
                    <div className="text-sm text-zinc-400 mb-1">Active Pods</div>
                    <div className="text-2xl font-bold text-white">{selectedRegion.pods}</div>
                  </div>
                  <div className="bg-zinc-800/50 rounded-xl p-4">
                    <div className="text-sm text-zinc-400 mb-1">Customers</div>
                    <div className="text-2xl font-bold text-white">{selectedRegion.customers}</div>
                  </div>
                  <div className="bg-zinc-800/50 rounded-xl p-4">
                    <div className="text-sm text-zinc-400 mb-1">CPU Usage</div>
                    <div className={`text-2xl font-bold ${selectedRegion.cpu > 70 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {selectedRegion.cpu}%
                    </div>
                  </div>
                  <div className="bg-zinc-800/50 rounded-xl p-4">
                    <div className="text-sm text-zinc-400 mb-1">Prediction Accuracy</div>
                    <div className={`text-2xl font-bold ${selectedRegion.accuracy >= 85 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {selectedRegion.accuracy}%
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button className="flex-1 py-3 px-4 rounded-xl bg-violet-600 hover:bg-violet-500 font-semibold text-sm transition-colors">
                    View Metrics
                  </button>
                  <button className="flex-1 py-3 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-semibold text-sm transition-colors">
                    Configure
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}