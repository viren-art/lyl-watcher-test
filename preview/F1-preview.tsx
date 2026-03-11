export default function WeatherIngestionDashboard() {
  const [activeTab, setActiveTab] = React.useState('overview');
  const [selectedRegion, setSelectedRegion] = React.useState(1);
  const [isProcessing, setIsProcessing] = React.useState(true);

  const regions = [
    { id: 1, name: 'Northeast', color: 'violet' },
    { id: 2, name: 'Midwest', color: 'emerald' },
    { id: 3, name: 'Western', color: 'amber' },
    { id: 4, name: 'Southern', color: 'rose' },
    { id: 5, name: 'Pacific', color: 'cyan' },
  ];

  const ingestionMetrics = {
    totalProcessed: 847293,
    validRecords: 842156,
    invalidRecords: 5137,
    anomaliesDetected: 247,
    dataGapPercentage: 0.61,
    validationRate: 99.39,
    throughput: 12847,
    avgLatency: 342,
  };

  const recentPredictions = [
    {
      id: 'pred_1704567890_abc123',
      region: 'Northeast',
      generatedAt: '2024-01-06 14:30:00',
      confidence: 0.92,
      forecastHours: 24,
      processingTime: 2847,
    },
    {
      id: 'pred_1704567650_def456',
      region: 'Midwest',
      generatedAt: '2024-01-06 14:25:00',
      confidence: 0.89,
      forecastHours: 24,
      processingTime: 2654,
    },
    {
      id: 'pred_1704567410_ghi789',
      region: 'Western',
      generatedAt: '2024-01-06 14:20:00',
      confidence: 0.94,
      forecastHours: 24,
      processingTime: 2912,
    },
  ];

  const weatherData = [
    { hour: '00:00', temp: 12.4, wind: 8.2, precip: 0.0, humidity: 72 },
    { hour: '03:00', temp: 11.8, wind: 7.5, precip: 0.2, humidity: 75 },
    { hour: '06:00', temp: 10.9, wind: 6.8, precip: 0.5, humidity: 78 },
    { hour: '09:00', temp: 13.2, wind: 9.1, precip: 0.0, humidity: 68 },
    { hour: '12:00', temp: 16.5, wind: 11.3, precip: 0.0, humidity: 62 },
    { hour: '15:00', temp: 18.2, wind: 12.7, precip: 0.0, humidity: 58 },
    { hour: '18:00', temp: 15.8, wind: 10.4, precip: 0.3, humidity: 65 },
    { hour: '21:00', temp: 13.6, wind: 8.9, precip: 0.8, humidity: 71 },
  ];

  const anomalies = [
    {
      type: 'RAPID_TEMPERATURE_CHANGE',
      severity: 'HIGH',
      message: 'Temperature changed by 8.3°C in 1 hour',
      timestamp: '2024-01-06 13:45:00',
      region: 'Southern',
    },
    {
      type: 'RAPID_WIND_CHANGE',
      severity: 'MEDIUM',
      message: 'Wind speed changed by 15.2 m/s',
      timestamp: '2024-01-06 12:30:00',
      region: 'Pacific',
    },
    {
      type: 'VALIDATION_FAILURE',
      severity: 'LOW',
      message: 'Missing humidity data',
      timestamp: '2024-01-06 11:15:00',
      region: 'Midwest',
    },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-zinc-900/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-xl">
                ⚡
              </div>
              <div>
                <h1 className="text-xl font-bold">Weather Ingestion & AI Forecasting</h1>
                <p className="text-xs text-zinc-400">Real-time data processing & prediction engine</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></div>
                <span className="text-xs font-medium text-emerald-400">System Active</span>
              </div>
              <div className="text-right">
                <div className="text-xs text-zinc-500">Throughput</div>
                <div className="text-sm font-semibold text-violet-400">{ingestionMetrics.throughput.toLocaleString()}/sec</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="max-w-7xl mx-auto px-6 pt-6">
        <div className="flex gap-2 border-b border-white/5">
          {['overview', 'predictions', 'anomalies'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 text-sm font-semibold rounded-t-xl transition-all ${
                activeTab === tab
                  ? 'bg-white/5 text-white border-b-2 border-violet-500'
                  : 'text-zinc-400 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {activeTab === 'overview' && (
          <>
            {/* Metrics Grid */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
                <div className="text-xs text-zinc-400 mb-1">Total Processed</div>
                <div className="text-2xl font-bold text-white">{ingestionMetrics.totalProcessed.toLocaleString()}</div>
                <div className="text-xs text-emerald-400 mt-1">+12.4% vs yesterday</div>
              </div>
              <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
                <div className="text-xs text-zinc-400 mb-1">Validation Rate</div>
                <div className="text-2xl font-bold text-emerald-400">{ingestionMetrics.validationRate}%</div>
                <div className="text-xs text-zinc-500 mt-1">Target: ≥95%</div>
              </div>
              <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
                <div className="text-xs text-zinc-400 mb-1">Data Gap</div>
                <div className="text-2xl font-bold text-amber-400">{ingestionMetrics.dataGapPercentage}%</div>
                <div className="text-xs text-zinc-500 mt-1">Target: &lt;5%</div>
              </div>
              <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
                <div className="text-xs text-zinc-400 mb-1">Avg Latency</div>
                <div className="text-2xl font-bold text-cyan-400">{ingestionMetrics.avgLatency}ms</div>
                <div className="text-xs text-zinc-500 mt-1">Target: &lt;500ms</div>
              </div>
            </div>

            {/* Region Selection */}
            <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
              <h3 className="text-sm font-semibold mb-4">Select Region</h3>
              <div className="grid grid-cols-5 gap-3">
                {regions.map((region) => (
                  <button
                    key={region.id}
                    onClick={() => setSelectedRegion(region.id)}
                    className={`p-4 rounded-xl border transition-all ${
                      selectedRegion === region.id
                        ? `bg-${region.color}-500/10 border-${region.color}-500/50 text-${region.color}-400`
                        : 'bg-white/5 border-white/10 text-zinc-400 hover:border-white/20'
                    }`}
                  >
                    <div className="text-2xl mb-2">📍</div>
                    <div className="text-xs font-medium">{region.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Weather Data Chart */}
            <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold">24-Hour Weather Data</h3>
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-violet-500"></div>
                    <span className="text-zinc-400">Temperature</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
                    <span className="text-zinc-400">Wind Speed</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                {weatherData.map((data, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="w-16 text-xs text-zinc-500">{data.hour}</div>
                    <div className="flex-1 flex items-center gap-3">
                      <div className="flex-1 bg-zinc-900 rounded-lg h-8 relative overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-violet-500/30 to-violet-500/10 rounded-lg"
                          style={{ width: `${(data.temp / 20) * 100}%` }}
                        ></div>
                        <div className="absolute inset-0 flex items-center px-3 text-xs font-medium text-violet-300">
                          {data.temp}°C
                        </div>
                      </div>
                      <div className="flex-1 bg-zinc-900 rounded-lg h-8 relative overflow-hidden">
                        <div
                          className="absolute inset-y-0 left-0 bg-gradient-to-r from-cyan-400/30 to-cyan-400/10 rounded-lg"
                          style={{ width: `${(data.wind / 15) * 100}%` }}
                        ></div>
                        <div className="absolute inset-0 flex items-center px-3 text-xs font-medium text-cyan-300">
                          {data.wind} m/s
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {activeTab === 'predictions' && (
          <div className="space-y-4">
            <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
              <h3 className="text-sm font-semibold mb-4">Recent AI Predictions</h3>
              <div className="space-y-3">
                {recentPredictions.map((pred) => (
                  <div key={pred.id} className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-lg">
                          🤖
                        </div>
                        <div>
                          <div className="text-sm font-semibold">{pred.region} Region</div>
                          <div className="text-xs text-zinc-500">{pred.id}</div>
                        </div>
                      </div>
                      <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1">
                        <span className="text-xs font-medium text-emerald-400">{(pred.confidence * 100).toFixed(0)}% confidence</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-3 gap-4 text-xs">
                      <div>
                        <div className="text-zinc-500">Generated</div>
                        <div className="text-white font-medium mt-1">{pred.generatedAt}</div>
                      </div>
                      <div>
                        <div className="text-zinc-500">Forecast Hours</div>
                        <div className="text-white font-medium mt-1">{pred.forecastHours}h</div>
                      </div>
                      <div>
                        <div className="text-zinc-500">Processing Time</div>
                        <div className="text-cyan-400 font-medium mt-1">{pred.processingTime}ms</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
              <h3 className="text-sm font-semibold mb-4">Model Performance</h3>
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-zinc-900/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-400 mb-2">Accuracy (24h)</div>
                  <div className="text-2xl font-bold text-emerald-400">87.3%</div>
                  <div className="text-xs text-zinc-500 mt-1">Target: ≥85%</div>
                </div>
                <div className="bg-zinc-900/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-400 mb-2">MAE</div>
                  <div className="text-2xl font-bold text-violet-400">1.24°C</div>
                  <div className="text-xs text-zinc-500 mt-1">Mean Absolute Error</div>
                </div>
                <div className="bg-zinc-900/50 rounded-xl p-4">
                  <div className="text-xs text-zinc-400 mb-2">RMSE</div>
                  <div className="text-2xl font-bold text-cyan-400">1.87°C</div>
                  <div className="text-xs text-zinc-500 mt-1">Root Mean Square Error</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'anomalies' && (
          <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold">Detected Anomalies</h3>
              <div className="text-xs text-zinc-400">{anomalies.length} anomalies in last 24h</div>
            </div>
            <div className="space-y-3">
              {anomalies.map((anomaly, idx) => (
                <div key={idx} className="bg-zinc-900/50 rounded-xl p-4 border border-white/5">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-lg ${
                        anomaly.severity === 'HIGH' ? 'bg-rose-500/10 border border-rose-500/20' :
                        anomaly.severity === 'MEDIUM' ? 'bg-amber-500/10 border border-amber-500/20' :
                        'bg-cyan-500/10 border border-cyan-500/20'
                      }`}>
                        {anomaly.severity === 'HIGH' ? '⚠️' : anomaly.severity === 'MEDIUM' ? '⚡' : 'ℹ️'}
                      </div>
                      <div>
                        <div className="text-sm font-semibold">{anomaly.type.replace(/_/g, ' ')}</div>
                        <div className="text-xs text-zinc-400 mt-0.5">{anomaly.message}</div>
                      </div>
                    </div>
                    <div className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                      anomaly.severity === 'HIGH' ? 'bg-rose-500/10 text-rose-400' :
                      anomaly.severity === 'MEDIUM' ? 'bg-amber-500/10 text-amber-400' :
                      'bg-cyan-500/10 text-cyan-400'
                    }`}>
                      {anomaly.severity}
                    </div>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-zinc-500 mt-3">
                    <div className="flex items-center gap-1.5">
                      <span>📍</span>
                      <span>{anomaly.region}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span>🕐</span>
                      <span>{anomaly.timestamp}</span>
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