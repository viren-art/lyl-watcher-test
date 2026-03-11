export default function CustomerIntelligencePreview() {
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showUpsellModal, setShowUpsellModal] = useState(false);
  const [selectedSegment, setSelectedSegment] = useState('all');

  const qualifiedCustomers = [
    {
      id: 1,
      companyName: 'Pacific Grid Solutions',
      industry: 'UTILITY',
      leadScore: 92,
      segment: 'STRATEGIC',
      tier: 'PROFESSIONAL',
      monthlyApiCalls: 8500,
      rateLimit: 500,
      usagePercent: 85,
      regions: 5,
      roi: 245,
      upsellValue: 15000
    },
    {
      id: 2,
      companyName: 'Midwest Energy Analytics',
      industry: 'ENERGY',
      leadScore: 88,
      segment: 'ENTERPRISE',
      tier: 'BASIC',
      monthlyApiCalls: 7200,
      rateLimit: 100,
      usagePercent: 98,
      regions: 3,
      roi: 180,
      upsellValue: 12000
    },
    {
      id: 3,
      companyName: 'Northeast Power Co',
      industry: 'UTILITY',
      leadScore: 85,
      segment: 'STRATEGIC',
      tier: 'ENTERPRISE',
      monthlyApiCalls: 15000,
      rateLimit: 1000,
      usagePercent: 75,
      regions: 8,
      roi: 320,
      upsellValue: 5000
    },
    {
      id: 4,
      companyName: 'SolarTech Industries',
      industry: 'ENERGY',
      leadScore: 78,
      segment: 'GROWTH',
      tier: 'PROFESSIONAL',
      monthlyApiCalls: 4200,
      rateLimit: 500,
      usagePercent: 42,
      regions: 2,
      roi: 165,
      upsellValue: 8000
    },
    {
      id: 5,
      companyName: 'Grid Innovations LLC',
      industry: 'TECHNOLOGY',
      leadScore: 82,
      segment: 'GROWTH',
      tier: 'PROFESSIONAL',
      monthlyApiCalls: 6800,
      rateLimit: 500,
      usagePercent: 68,
      regions: 4,
      roi: 210,
      upsellValue: 10000
    },
    {
      id: 6,
      companyName: 'Southern Energy Systems',
      industry: 'UTILITY',
      leadScore: 90,
      segment: 'STRATEGIC',
      tier: 'ENTERPRISE',
      monthlyApiCalls: 12000,
      rateLimit: 1000,
      usagePercent: 60,
      regions: 6,
      roi: 285,
      upsellValue: 7000
    },
    {
      id: 7,
      companyName: 'Western Grid Analytics',
      industry: 'ENERGY',
      leadScore: 75,
      segment: 'SMB',
      tier: 'BASIC',
      monthlyApiCalls: 2800,
      rateLimit: 100,
      usagePercent: 93,
      regions: 2,
      roi: 145,
      upsellValue: 9000
    },
    {
      id: 8,
      companyName: 'Metro Power Solutions',
      industry: 'UTILITY',
      leadScore: 86,
      segment: 'ENTERPRISE',
      tier: 'PROFESSIONAL',
      monthlyApiCalls: 9500,
      rateLimit: 500,
      usagePercent: 95,
      regions: 5,
      roi: 230,
      upsellValue: 14000
    },
    {
      id: 9,
      companyName: 'Clean Energy Partners',
      industry: 'ENERGY',
      leadScore: 80,
      segment: 'GROWTH',
      tier: 'BASIC',
      monthlyApiCalls: 5600,
      rateLimit: 100,
      usagePercent: 87,
      regions: 3,
      roi: 175,
      upsellValue: 11000
    },
    {
      id: 10,
      companyName: 'National Grid Services',
      industry: 'UTILITY',
      leadScore: 94,
      segment: 'STRATEGIC',
      tier: 'ENTERPRISE',
      monthlyApiCalls: 18000,
      rateLimit: 1000,
      usagePercent: 90,
      regions: 10,
      roi: 350,
      upsellValue: 6000
    }
  ];

  const marketSegments = [
    { name: 'STRATEGIC', count: 4, avgScore: 90, revenue: 2400000, color: 'violet' },
    { name: 'ENTERPRISE', count: 3, avgScore: 88, revenue: 1800000, color: 'emerald' },
    { name: 'GROWTH', count: 3, avgScore: 79, revenue: 900000, color: 'amber' },
    { name: 'SMB', count: 1, avgScore: 75, revenue: 300000, color: 'cyan' }
  ];

  const usageTrends = [
    { date: 'Jan 1', apiCalls: 45000, predictions: 12000, dashboards: 3200 },
    { date: 'Jan 8', apiCalls: 52000, predictions: 14500, dashboards: 3800 },
    { date: 'Jan 15', apiCalls: 58000, predictions: 16200, dashboards: 4100 },
    { date: 'Jan 22', apiCalls: 63000, predictions: 18000, dashboards: 4500 },
    { date: 'Jan 29', apiCalls: 71000, predictions: 20500, dashboards: 5200 }
  ];

  const featureAdoption = [
    { feature: 'Weather Forecasting', users: 10, requests: 45000, accuracy: 87 },
    { feature: 'Grid Impact Analysis', users: 8, requests: 28000, accuracy: 82 },
    { feature: 'BESS Optimization', users: 6, requests: 12000, score: 88 },
    { feature: 'Multi-Region Dashboard', users: 10, views: 15000, engagement: 92 }
  ];

  const upsellOpportunities = selectedCustomer ? [
    {
      type: 'RATE_LIMIT_UPGRADE',
      priority: 'HIGH',
      reason: `Using ${selectedCustomer.usagePercent}% of monthly API quota`,
      currentTier: selectedCustomer.tier,
      recommendedTier: selectedCustomer.tier === 'BASIC' ? 'PROFESSIONAL' : 'ENTERPRISE',
      value: selectedCustomer.tier === 'BASIC' ? 4000 : 10000
    },
    {
      type: 'REGION_EXPANSION',
      priority: 'MEDIUM',
      reason: `High engagement across ${selectedCustomer.regions} regions`,
      currentRegions: selectedCustomer.regions,
      recommendedRegions: selectedCustomer.regions + 3,
      value: 6000
    },
    {
      type: 'FEATURE_ACCESS',
      priority: 'MEDIUM',
      reason: 'Advanced analytics features available in higher tier',
      currentTier: selectedCustomer.tier,
      recommendedTier: 'ENTERPRISE',
      value: 5000
    }
  ] : [];

  const filteredCustomers = selectedSegment === 'all' 
    ? qualifiedCustomers 
    : qualifiedCustomers.filter(c => c.segment === selectedSegment);

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-emerald-400';
    if (score >= 80) return 'text-violet-400';
    if (score >= 70) return 'text-amber-400';
    return 'text-zinc-400';
  };

  const getTierBadge = (tier) => {
    const colors = {
      BASIC: 'bg-zinc-500/20 text-zinc-300',
      PROFESSIONAL: 'bg-violet-500/20 text-violet-300',
      ENTERPRISE: 'bg-emerald-500/20 text-emerald-300'
    };
    return colors[tier] || colors.BASIC;
  };

  const getPriorityBadge = (priority) => {
    const colors = {
      HIGH: 'bg-rose-500/20 text-rose-300',
      MEDIUM: 'bg-amber-500/20 text-amber-300',
      LOW: 'bg-cyan-500/20 text-cyan-300'
    };
    return colors[priority] || colors.MEDIUM;
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-zinc-900/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Customer Intelligence</h1>
              <p className="text-sm text-zinc-400 mt-1">B2B Analytics & Upsell Opportunities</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className="text-xs text-zinc-500">Total Qualified Customers</div>
                <div className="text-2xl font-bold text-emerald-400">{qualifiedCustomers.length}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-500">Total Upsell Value</div>
                <div className="text-2xl font-bold text-violet-400">
                  ${(qualifiedCustomers.reduce((sum, c) => sum + c.upsellValue, 0) / 1000).toFixed(0)}K
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex gap-2 mt-4">
            {['dashboard', 'customers', 'segments', 'usage'].map(view => (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                  activeView === view
                    ? 'bg-violet-500 text-white'
                    : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                }`}
              >
                {view.charAt(0).toUpperCase() + view.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Dashboard View */}
        {activeView === 'dashboard' && (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
                <div className="text-xs text-zinc-500 mb-2">Avg Lead Score</div>
                <div className="text-3xl font-bold text-violet-400">
                  {Math.round(qualifiedCustomers.reduce((sum, c) => sum + c.leadScore, 0) / qualifiedCustomers.length)}
                </div>
                <div className="text-xs text-emerald-400 mt-2">↑ 8% vs last month</div>
              </div>
              <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
                <div className="text-xs text-zinc-500 mb-2">Avg ROI</div>
                <div className="text-3xl font-bold text-emerald-400">
                  {Math.round(qualifiedCustomers.reduce((sum, c) => sum + c.roi, 0) / qualifiedCustomers.length)}%
                </div>
                <div className="text-xs text-emerald-400 mt-2">↑ 12% vs last month</div>
              </div>
              <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
                <div className="text-xs text-zinc-500 mb-2">High Priority Upsells</div>
                <div className="text-3xl font-bold text-rose-400">
                  {qualifiedCustomers.filter(c => c.usagePercent > 80).length}
                </div>
                <div className="text-xs text-amber-400 mt-2">⚠️ Needs attention</div>
              </div>
              <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
                <div className="text-xs text-zinc-500 mb-2">Total API Calls/Month</div>
                <div className="text-3xl font-bold text-cyan-400">
                  {(qualifiedCustomers.reduce((sum, c) => sum + c.monthlyApiCalls, 0) / 1000).toFixed(0)}K
                </div>
                <div className="text-xs text-emerald-400 mt-2">↑ 15% vs last month</div>
              </div>
            </div>

            {/* Usage Trends Chart */}
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-white/[0.06]">
              <h3 className="text-lg font-bold mb-4">Platform Usage Trends</h3>
              <div className="space-y-3">
                {usageTrends.map((trend, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="w-16 text-xs text-zinc-500">{trend.date}</div>
                    <div className="flex-1 flex gap-2">
                      <div 
                        className="bg-violet-500/30 rounded h-8 flex items-center justify-end px-2"
                        style={{ width: `${(trend.apiCalls / 80000) * 100}%` }}
                      >
                        <span className="text-xs font-semibold text-violet-200">{(trend.apiCalls / 1000).toFixed(0)}K</span>
                      </div>
                      <div 
                        className="bg-emerald-500/30 rounded h-8 flex items-center justify-end px-2"
                        style={{ width: `${(trend.predictions / 25000) * 100}%` }}
                      >
                        <span className="text-xs font-semibold text-emerald-200">{(trend.predictions / 1000).toFixed(0)}K</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex gap-4 mt-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-violet-500/30"></div>
                  <span className="text-zinc-400">API Calls</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded bg-emerald-500/30"></div>
                  <span className="text-zinc-400">Predictions</span>
                </div>
              </div>
            </div>

            {/* Feature Adoption */}
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-white/[0.06]">
              <h3 className="text-lg font-bold mb-4">Feature Adoption</h3>
              <div className="grid grid-cols-2 gap-4">
                {featureAdoption.map((feature, idx) => (
                  <div key={idx} className="bg-white/5 rounded-xl p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <div className="font-semibold text-white">{feature.feature}</div>
                        <div className="text-xs text-zinc-500 mt-1">{feature.users} customers</div>
                      </div>
                      <div className="text-2xl font-bold text-violet-400">
                        {feature.accuracy || feature.score || feature.engagement}%
                      </div>
                    </div>
                    <div className="text-sm text-zinc-400">
                      {feature.requests ? `${(feature.requests / 1000).toFixed(0)}K requests` : `${(feature.views / 1000).toFixed(0)}K views`}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Customers View */}
        {activeView === 'customers' && (
          <div className="space-y-4">
            {/* Filters */}
            <div className="bg-zinc-800/50 rounded-2xl p-4 border border-white/[0.06]">
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-400">Filter by segment:</span>
                {['all', 'STRATEGIC', 'ENTERPRISE', 'GROWTH', 'SMB'].map(seg => (
                  <button
                    key={seg}
                    onClick={() => setSelectedSegment(seg)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      selectedSegment === seg
                        ? 'bg-violet-500 text-white'
                        : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                    }`}
                  >
                    {seg === 'all' ? 'All' : seg}
                  </button>
                ))}
              </div>
            </div>

            {/* Customer List */}
            <div className="space-y-3">
              {filteredCustomers.map(customer => (
                <div
                  key={customer.id}
                  className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06] hover:border-violet-500/30 transition-all cursor-pointer"
                  onClick={() => {
                    setSelectedCustomer(customer);
                    setShowUpsellModal(true);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-bold text-white">{customer.companyName}</h3>
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getTierBadge(customer.tier)}`}>
                          {customer.tier}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-zinc-700/50 text-zinc-300">
                          {customer.industry}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-sm">
                        <div>
                          <span className="text-zinc-500">Lead Score: </span>
                          <span className={`font-bold ${getScoreColor(customer.leadScore)}`}>{customer.leadScore}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">ROI: </span>
                          <span className="font-bold text-emerald-400">{customer.roi}%</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">Regions: </span>
                          <span className="font-bold text-cyan-400">{customer.regions}</span>
                        </div>
                        <div>
                          <span className="text-zinc-500">API Usage: </span>
                          <span className={`font-bold ${customer.usagePercent > 80 ? 'text-rose-400' : 'text-zinc-300'}`}>
                            {customer.usagePercent}%
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-zinc-500 mb-1">Upsell Value</div>
                      <div className="text-2xl font-bold text-violet-400">${(customer.upsellValue / 1000).toFixed(0)}K</div>
                      {customer.usagePercent > 80 && (
                        <div className="inline-flex items-center px-2 py-1 rounded-full bg-rose-500/20 text-rose-300 text-xs font-medium mt-2">
                          ⚠️ High Priority
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Segments View */}
        {activeView === 'segments' && (
          <div className="grid grid-cols-2 gap-6">
            {marketSegments.map((segment, idx) => (
              <div key={idx} className="bg-zinc-800/50 rounded-2xl p-6 border border-white/[0.06]">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h3 className="text-xl font-bold text-white mb-1">{segment.name}</h3>
                    <div className="text-sm text-zinc-400">{segment.count} customers</div>
                  </div>
                  <div className={`w-12 h-12 rounded-xl bg-${segment.color}-500/20 flex items-center justify-center`}>
                    <span className="text-2xl">📊</span>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Avg Lead Score</span>
                    <span className={`text-lg font-bold text-${segment.color}-400`}>{segment.avgScore}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Total Revenue</span>
                    <span className="text-lg font-bold text-emerald-400">${(segment.revenue / 1000000).toFixed(1)}M</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-zinc-400">Avg per Customer</span>
                    <span className="text-lg font-bold text-zinc-300">${(segment.revenue / segment.count / 1000).toFixed(0)}K</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Usage View */}
        {activeView === 'usage' && (
          <div className="space-y-6">
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-white/[0.06]">
              <h3 className="text-lg font-bold mb-4">Platform-Wide Usage Analytics</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-2">Total API Calls</div>
                  <div className="text-3xl font-bold text-violet-400">
                    {(qualifiedCustomers.reduce((sum, c) => sum + c.monthlyApiCalls, 0) / 1000).toFixed(0)}K
                  </div>
                  <div className="text-xs text-emerald-400 mt-2">This month</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-2">Avg Response Time</div>
                  <div className="text-3xl font-bold text-emerald-400">285ms</div>
                  <div className="text-xs text-zinc-400 mt-2">95th percentile</div>
                </div>
                <div className="bg-white/5 rounded-xl p-4">
                  <div className="text-xs text-zinc-500 mb-2">Error Rate</div>
                  <div className="text-3xl font-bold text-cyan-400">0.3%</div>
                  <div className="text-xs text-emerald-400 mt-2">↓ 0.2% vs last month</div>
                </div>
              </div>
            </div>

            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-white/[0.06]">
              <h3 className="text-lg font-bold mb-4">Top Endpoints by Usage</h3>
              <div className="space-y-3">
                {[
                  { endpoint: '/api/v1/weather/predict', calls: 28000, avgTime: 245 },
                  { endpoint: '/api/v1/grid/impact-analysis', calls: 18000, avgTime: 320 },
                  { endpoint: '/api/v1/bess/optimize-location', calls: 12000, avgTime: 8500 },
                  { endpoint: '/api/v1/weather/predictions/:regionId', calls: 15000, avgTime: 180 }
                ].map((endpoint, idx) => (
                  <div key={idx} className="flex items-center justify-between bg-white/5 rounded-xl p-4">
                    <div className="flex-1">
                      <div className="font-mono text-sm text-violet-300">{endpoint.endpoint}</div>
                      <div className="text-xs text-zinc-500 mt-1">{(endpoint.calls / 1000).toFixed(0)}K calls</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-semibold text-emerald-400">{endpoint.avgTime}ms</div>
                      <div className="text-xs text-zinc-500">avg response</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Upsell Modal */}
      {showUpsellModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6">
          <div className="bg-zinc-900 rounded-2xl border border-white/10 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-zinc-900 border-b border-white/10 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-white">{selectedCustomer.companyName}</h2>
                  <p className="text-sm text-zinc-400 mt-1">Upsell Opportunities Analysis</p>
                </div>
                <button
                  onClick={() => setShowUpsellModal(false)}
                  className="text-zinc-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {/* Customer Summary */}
              <div className="bg-zinc-800/50 rounded-xl p-5 border border-white/[0.06]">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Current Tier</div>
                    <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${getTierBadge(selectedCustomer.tier)}`}>
                      {selectedCustomer.tier}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Lead Score</div>
                    <div className={`text-2xl font-bold ${getScoreColor(selectedCustomer.leadScore)}`}>
                      {selectedCustomer.leadScore}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Monthly API Usage</div>
                    <div className="text-lg font-bold text-white">
                      {selectedCustomer.monthlyApiCalls.toLocaleString()} / {selectedCustomer.rateLimit * 730}
                    </div>
                    <div className={`text-xs mt-1 ${selectedCustomer.usagePercent > 80 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {selectedCustomer.usagePercent}% utilized
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-zinc-500 mb-1">Current ROI</div>
                    <div className="text-lg font-bold text-emerald-400">{selectedCustomer.roi}%</div>
                  </div>
                </div>
              </div>

              {/* Upsell Opportunities */}
              <div>
                <h3 className="text-lg font-bold mb-3">Recommended Actions</h3>
                <div className="space-y-3">
                  {upsellOpportunities.map((opp, idx) => (
                    <div key={idx} className="bg-zinc-800/50 rounded-xl p-5 border border-white/[0.06]">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getPriorityBadge(opp.priority)}`}>
                              {opp.priority}
                            </span>
                            <span className="text-sm font-semibold text-white">{opp.type.replace(/_/g, ' ')}</span>
                          </div>
                          <p className="text-sm text-zinc-400">{opp.reason}</p>
                        </div>
                        <div className="text-right ml-4">
                          <div className="text-xs text-zinc-500">Value</div>
                          <div className="text-xl font-bold text-violet-400">${(opp.value / 1000).toFixed(0)}K</div>
                        </div>
                      </div>
                      {opp.recommendedTier && (
                        <div className="flex items-center gap-2 text-sm mt-3 pt-3 border-t border-white/5">
                          <span className="text-zinc-500">Upgrade to:</span>
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getTierBadge(opp.recommendedTier)}`}>
                            {opp.recommendedTier}
                          </span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Total Value */}
              <div className="bg-gradient-to-r from-violet-500/20 to-emerald-500/20 rounded-xl p-5 border border-violet-500/30">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm text-zinc-300 mb-1">Total Upsell Opportunity</div>
                    <div className="text-3xl font-bold text-white">
                      ${(selectedCustomer.upsellValue / 1000).toFixed(0)}K
                    </div>
                  </div>
                  <button className="px-6 py-3 bg-violet-500 hover:bg-violet-600 text-white font-semibold rounded-xl transition-all">
                    Contact Customer
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}