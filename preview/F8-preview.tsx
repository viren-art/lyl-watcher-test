export default function ApiPlatformPreview() {
  const [activeTab, setActiveTab] = useState('rest');
  const [selectedEndpoint, setSelectedEndpoint] = useState('weather-predict');
  const [apiKey, setApiKey] = useState('sk_live_abc123xyz789');
  const [requestBody, setRequestBody] = useState('{\n  "gridRegionId": 1,\n  "forecastHours": 24\n}');
  const [responseData, setResponseData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  const mockApiStats = {
    totalCalls: 8547,
    successRate: 99.2,
    avgResponseTime: 1.8,
    rateLimitRemaining: 742,
    rateLimitTotal: 1000
  };

  const restEndpoints = [
    { id: 'weather-predict', method: 'POST', path: '/api/v1/weather/predict', desc: 'Generate weather predictions' },
    { id: 'weather-get', method: 'GET', path: '/api/v1/weather/predictions/:regionId', desc: 'Retrieve predictions' },
    { id: 'grid-impact', method: 'POST', path: '/api/v1/grid/impact-analysis', desc: 'Analyze grid impact' },
    { id: 'grid-alerts', method: 'POST', path: '/api/v1/grid/alerts/subscribe', desc: 'Subscribe to alerts' },
    { id: 'bess-optimize', method: 'POST', path: '/api/v1/bess/optimize-location', desc: 'Optimize BESS location' },
    { id: 'bess-roi', method: 'POST', path: '/api/v1/bess/roi-analysis', desc: 'Analyze ROI' }
  ];

  const graphqlQueries = [
    { id: 'weather', name: 'weatherPredictions', desc: 'Query weather data with flexible fields' },
    { id: 'grid', name: 'gridImpacts', desc: 'Query grid impact predictions' },
    { id: 'bess', name: 'bessRecommendations', desc: 'Query BESS recommendations' },
    { id: 'analytics', name: 'predictionAccuracy', desc: 'Query model accuracy metrics' }
  ];

  const mockWeatherResponse = {
    predictionId: 'pred_8a7f9b2c',
    gridRegionId: 1,
    generatedAt: '2024-01-15T14:30:00Z',
    predictions: [
      { timestamp: '2024-01-15T15:00:00Z', temperature: 22.5, windSpeed: 8.2, precipitation: 0, humidity: 65, confidenceScore: 0.92 },
      { timestamp: '2024-01-15T16:00:00Z', temperature: 23.1, windSpeed: 9.5, precipitation: 0.2, humidity: 68, confidenceScore: 0.89 },
      { timestamp: '2024-01-15T17:00:00Z', temperature: 22.8, windSpeed: 10.1, precipitation: 1.5, humidity: 72, confidenceScore: 0.87 }
    ],
    modelVersion: 'lstm-v2.1.0',
    metadata: { responseTimeMs: 1847 }
  };

  const mockGraphQLResponse = {
    data: {
      weatherPredictions: {
        predictions: [
          {
            predictionId: 'pred_8a7f9b2c',
            gridRegionId: 1,
            generatedAt: '2024-01-15T14:30:00Z',
            predictions: [
              { timestamp: '2024-01-15T15:00:00Z', temperature: 22.5, confidenceScore: 0.92 }
            ]
          }
        ],
        totalCount: 156,
        nextCursor: 'eyJpZCI6MTU2fQ=='
      }
    }
  };

  const handleSendRequest = () => {
    setLoading(true);
    setTimeout(() => {
      if (activeTab === 'rest') {
        setResponseData(mockWeatherResponse);
      } else {
        setResponseData(mockGraphQLResponse);
      }
      setLoading(false);
    }, 1200);
  };

  const selectedRest = restEndpoints.find(e => e.id === selectedEndpoint);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950/20 to-slate-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-slate-900/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                <span className="text-xl">⚡</span>
              </div>
              <div>
                <h1 className="text-xl font-bold">Grid AI API Platform</h1>
                <p className="text-xs text-zinc-400">B2B Integration Hub</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-sm font-medium text-emerald-400">API Online</span>
              </div>
              <button
                onClick={() => setShowDocs(!showDocs)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-sm font-medium transition-colors"
              >
                📚 Docs
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* API Stats */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
            <div className="text-xs text-zinc-400 mb-1">Total API Calls</div>
            <div className="text-2xl font-bold text-white">{mockApiStats.totalCalls.toLocaleString()}</div>
            <div className="text-xs text-emerald-400 mt-1">↑ 12% this week</div>
          </div>
          <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
            <div className="text-xs text-zinc-400 mb-1">Success Rate</div>
            <div className="text-2xl font-bold text-emerald-400">{mockApiStats.successRate}%</div>
            <div className="text-xs text-zinc-500 mt-1">Last 24 hours</div>
          </div>
          <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
            <div className="text-xs text-zinc-400 mb-1">Avg Response Time</div>
            <div className="text-2xl font-bold text-cyan-400">{mockApiStats.avgResponseTime}s</div>
            <div className="text-xs text-zinc-500 mt-1">p95: 2.8s</div>
          </div>
          <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
            <div className="text-xs text-zinc-400 mb-1">Rate Limit</div>
            <div className="text-2xl font-bold text-violet-400">{mockApiStats.rateLimitRemaining}/{mockApiStats.rateLimitTotal}</div>
            <div className="w-full bg-white/5 rounded-full h-1.5 mt-2">
              <div className="bg-violet-500 h-1.5 rounded-full" style={{ width: `${(mockApiStats.rateLimitRemaining / mockApiStats.rateLimitTotal) * 100}%` }}></div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-12 gap-6">
          {/* Left Panel - API Explorer */}
          <div className="col-span-7 space-y-4">
            <div className="bg-zinc-800/50 rounded-2xl border border-white/[0.06] overflow-hidden">
              {/* Tabs */}
              <div className="flex border-b border-white/5">
                <button
                  onClick={() => setActiveTab('rest')}
                  className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                    activeTab === 'rest'
                      ? 'bg-violet-500/10 text-violet-400 border-b-2 border-violet-500'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  REST API
                </button>
                <button
                  onClick={() => setActiveTab('graphql')}
                  className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                    activeTab === 'graphql'
                      ? 'bg-violet-500/10 text-violet-400 border-b-2 border-violet-500'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  GraphQL
                </button>
                <button
                  onClick={() => setActiveTab('webhooks')}
                  className={`flex-1 px-6 py-4 text-sm font-semibold transition-colors ${
                    activeTab === 'webhooks'
                      ? 'bg-violet-500/10 text-violet-400 border-b-2 border-violet-500'
                      : 'text-zinc-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  Webhooks
                </button>
              </div>

              {/* REST API Tab */}
              {activeTab === 'rest' && (
                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-xs text-zinc-400 mb-2 block">Select Endpoint</label>
                    <select
                      value={selectedEndpoint}
                      onChange={(e) => setSelectedEndpoint(e.target.value)}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500 outline-none"
                    >
                      {restEndpoints.map(endpoint => (
                        <option key={endpoint.id} value={endpoint.id}>
                          {endpoint.method} {endpoint.path}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-zinc-500 mt-2">{selectedRest?.desc}</p>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 mb-2 block">API Key</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-sm focus:ring-2 focus:ring-violet-500/50 outline-none"
                      />
                      <button className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
                        🔄
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 mb-2 block">Request Body (JSON)</label>
                    <textarea
                      value={requestBody}
                      onChange={(e) => setRequestBody(e.target.value)}
                      rows={8}
                      className="w-full px-4 py-3 rounded-xl bg-zinc-900/50 border border-white/10 text-white font-mono text-sm focus:ring-2 focus:ring-violet-500/50 outline-none resize-none"
                    />
                  </div>

                  <button
                    onClick={handleSendRequest}
                    disabled={loading}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-violet-500/20"
                  >
                    {loading ? '⏳ Sending Request...' : '🚀 Send Request'}
                  </button>
                </div>
              )}

              {/* GraphQL Tab */}
              {activeTab === 'graphql' && (
                <div className="p-6 space-y-4">
                  <div>
                    <label className="text-xs text-zinc-400 mb-2 block">GraphQL Query</label>
                    <textarea
                      defaultValue={`query WeatherPredictions($regionId: Int!) {
  weatherPredictions(regionId: $regionId, limit: 10) {
    predictions {
      predictionId
      generatedAt
      predictions {
        timestamp
        temperature
        confidenceScore
      }
    }
    totalCount
    nextCursor
  }
}`}
                      rows={12}
                      className="w-full px-4 py-3 rounded-xl bg-zinc-900/50 border border-white/10 text-white font-mono text-sm focus:ring-2 focus:ring-violet-500/50 outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 mb-2 block">Variables (JSON)</label>
                    <textarea
                      defaultValue={`{\n  "regionId": 1\n}`}
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-zinc-900/50 border border-white/10 text-white font-mono text-sm focus:ring-2 focus:ring-violet-500/50 outline-none resize-none"
                    />
                  </div>

                  <button
                    onClick={handleSendRequest}
                    disabled={loading}
                    className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 font-semibold text-white transition-all disabled:opacity-50 shadow-lg shadow-violet-500/20"
                  >
                    {loading ? '⏳ Executing Query...' : '▶️ Execute Query'}
                  </button>
                </div>
              )}

              {/* Webhooks Tab */}
              {activeTab === 'webhooks' && (
                <div className="p-6 space-y-4">
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <span className="text-2xl">⚡</span>
                      <div>
                        <h3 className="font-semibold text-amber-400 mb-1">Real-Time Grid Alerts</h3>
                        <p className="text-sm text-zinc-400">Configure webhooks to receive instant notifications when grid impact severity exceeds thresholds.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 mb-2 block">Webhook URL</label>
                    <input
                      type="text"
                      placeholder="https://your-app.com/webhooks/grid-alerts"
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-violet-500/50 outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 mb-2 block">Severity Threshold</label>
                    <select className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-violet-500/50 outline-none">
                      <option>MEDIUM</option>
                      <option>HIGH</option>
                      <option>CRITICAL</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-xs text-zinc-400 mb-2 block">Grid Region</label>
                    <select className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white focus:ring-2 focus:ring-violet-500/50 outline-none">
                      <option>Northeast Region</option>
                      <option>Midwest Region</option>
                      <option>Western Region</option>
                    </select>
                  </div>

                  <button className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 font-semibold text-white transition-all shadow-lg shadow-violet-500/20">
                    🔔 Subscribe to Alerts
                  </button>

                  <div className="mt-6 space-y-2">
                    <h4 className="text-sm font-semibold text-zinc-300">Active Subscriptions</h4>
                    <div className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-sm font-medium">Grid Impact Alerts - Northeast</div>
                          <div className="text-xs text-zinc-500 mt-1">Threshold: HIGH • Last triggered: 2 hours ago</div>
                        </div>
                        <button className="text-rose-400 hover:text-rose-300 text-sm font-medium">Unsubscribe</button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Panel - Response & Docs */}
          <div className="col-span-5 space-y-4">
            {/* Response Panel */}
            <div className="bg-zinc-800/50 rounded-2xl border border-white/[0.06] overflow-hidden">
              <div className="px-6 py-4 border-b border-white/5 flex items-center justify-between">
                <h3 className="font-semibold">Response</h3>
                {responseData && (
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-medium">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400"></div>
                      200 OK
                    </span>
                    <span className="text-xs text-zinc-500">{mockWeatherResponse.metadata.responseTimeMs}ms</span>
                  </div>
                )}
              </div>
              <div className="p-6">
                {!responseData ? (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">📡</div>
                    <p className="text-zinc-400 text-sm">Send a request to see the response</p>
                  </div>
                ) : (
                  <pre className="text-xs font-mono text-zinc-300 overflow-auto max-h-96 bg-zinc-900/50 rounded-xl p-4 border border-white/5">
                    {JSON.stringify(responseData, null, 2)}
                  </pre>
                )}
              </div>
            </div>

            {/* Quick Reference */}
            <div className="bg-zinc-800/50 rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold mb-4">Quick Reference</h3>
              <div className="space-y-3">
                <div className="bg-zinc-900/50 rounded-xl p-3 border border-white/5">
                  <div className="text-xs text-zinc-400 mb-1">Base URL</div>
                  <code className="text-sm text-violet-400 font-mono">https://api.gridai.platform/v1</code>
                </div>
                <div className="bg-zinc-900/50 rounded-xl p-3 border border-white/5">
                  <div className="text-xs text-zinc-400 mb-1">Authentication</div>
                  <code className="text-sm text-cyan-400 font-mono">Bearer {apiKey.substring(0, 20)}...</code>
                </div>
                <div className="bg-zinc-900/50 rounded-xl p-3 border border-white/5">
                  <div className="text-xs text-zinc-400 mb-1">Rate Limit Headers</div>
                  <div className="text-xs font-mono text-zinc-300 space-y-1 mt-2">
                    <div>X-RateLimit-Limit: 1000</div>
                    <div>X-RateLimit-Remaining: 742</div>
                    <div>X-RateLimit-Reset: 2024-01-15T15:00:00Z</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Code Examples */}
            <div className="bg-zinc-800/50 rounded-2xl border border-white/[0.06] p-6">
              <h3 className="font-semibold mb-4">Code Examples</h3>
              <div className="space-y-3">
                <button className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">JavaScript / Node.js</span>
                    <span className="text-xs text-zinc-500">→</span>
                  </div>
                </button>
                <button className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Python</span>
                    <span className="text-xs text-zinc-500">→</span>
                  </div>
                </button>
                <button className="w-full text-left px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 transition-colors">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">cURL</span>
                    <span className="text-xs text-zinc-500">→</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Documentation Modal */}
      {showDocs && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-6">
          <div className="bg-zinc-900 rounded-2xl border border-white/10 max-w-4xl w-full max-h-[90vh] overflow-auto">
            <div className="sticky top-0 bg-zinc-900 border-b border-white/10 px-6 py-4 flex items-center justify-between">
              <h2 className="text-xl font-bold">API Documentation</h2>
              <button
                onClick={() => setShowDocs(false)}
                className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-3">Authentication</h3>
                <p className="text-sm text-zinc-400 mb-3">All API requests require authentication using Bearer tokens obtained from the OAuth 2.0 login flow.</p>
                <div className="bg-zinc-800/50 rounded-xl p-4 border border-white/5">
                  <code className="text-sm font-mono text-violet-400">Authorization: Bearer YOUR_ACCESS_TOKEN</code>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Rate Limiting</h3>
                <p className="text-sm text-zinc-400 mb-3">API requests are rate-limited based on your subscription tier:</p>
                <div className="space-y-2">
                  <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-zinc-800/50">
                    <span className="text-sm">Basic Tier</span>
                    <span className="text-sm font-mono text-zinc-400">100 req/hour</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-zinc-800/50">
                    <span className="text-sm">Professional Tier</span>
                    <span className="text-sm font-mono text-zinc-400">500 req/hour</span>
                  </div>
                  <div className="flex items-center justify-between px-4 py-2 rounded-lg bg-zinc-800/50">
                    <span className="text-sm">Enterprise Tier</span>
                    <span className="text-sm font-mono text-zinc-400">1000 req/hour</span>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-3">Error Codes</h3>
                <div className="space-y-2">
                  <div className="px-4 py-3 rounded-lg bg-zinc-800/50 border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-rose-500/10 text-rose-400">401</span>
                      <span className="text-sm font-medium">UNAUTHORIZED</span>
                    </div>
                    <p className="text-xs text-zinc-500">Invalid or expired authentication token</p>
                  </div>
                  <div className="px-4 py-3 rounded-lg bg-zinc-800/50 border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-amber-500/10 text-amber-400">429</span>
                      <span className="text-sm font-medium">RATE_LIMIT_EXCEEDED</span>
                    </div>
                    <p className="text-xs text-zinc-500">Too many requests, retry after rate limit reset</p>
                  </div>
                  <div className="px-4 py-3 rounded-lg bg-zinc-800/50 border border-white/5">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono bg-rose-500/10 text-rose-400">500</span>
                      <span className="text-sm font-medium">INTERNAL_ERROR</span>
                    </div>
                    <p className="text-xs text-zinc-500">Server-side error, contact support if persists</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}