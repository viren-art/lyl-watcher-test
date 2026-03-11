export default function MLPipelineMonitoring() {
  const [activeTab, setActiveTab] = React.useState('overview');
  const [selectedModel, setSelectedModel] = React.useState('weather_lstm');
  const [showRetrainingModal, setShowRetrainingModal] = React.useState(false);
  const [retrainingInProgress, setRetrainingInProgress] = React.useState(false);

  const models = [
    { id: 'weather_lstm', name: 'Weather LSTM', type: 'Forecasting' },
    { id: 'grid_transformer', name: 'Grid Transformer', type: 'Impact Analysis' }
  ];

  const currentModel = models.find(m => m.id === selectedModel);

  const modelMetrics = {
    weather_lstm: {
      currentAccuracy: 0.87,
      threshold: 0.85,
      productionVersion: 'v20240115_143022',
      lastTrained: '2024-01-15 14:30:22',
      trainingTime: '45 min',
      status: 'healthy',
      predictions24h: 12847,
      avgLatency: 2.3
    },
    grid_transformer: {
      currentAccuracy: 0.82,
      threshold: 0.80,
      productionVersion: 'v20240114_092015',
      lastTrained: '2024-01-14 09:20:15',
      trainingTime: '52 min',
      status: 'warning',
      predictions24h: 8934,
      avgLatency: 2.8
    }
  };

  const currentMetrics = modelMetrics[selectedModel];

  const trainingHistory = [
    {
      id: 1,
      version: 'v20240115_143022',
      accuracy: 0.87,
      valLoss: 0.0234,
      status: 'production',
      trainedAt: '2024-01-15 14:30',
      trigger: 'Scheduled Weekly',
      duration: '45 min'
    },
    {
      id: 2,
      version: 'v20240108_151045',
      accuracy: 0.86,
      valLoss: 0.0256,
      status: 'deprecated',
      trainedAt: '2024-01-08 15:10',
      trigger: 'Data Accumulation',
      duration: '43 min'
    },
    {
      id: 3,
      version: 'v20240101_083012',
      accuracy: 0.84,
      valLoss: 0.0289,
      status: 'deprecated',
      trainedAt: '2024-01-01 08:30',
      trigger: 'Accuracy Degradation',
      duration: '48 min'
    }
  ];

  const abTests = [
    {
      id: 'ab_test_001',
      modelType: 'weather_lstm',
      control: 'v20240108_151045',
      treatment: 'v20240115_143022',
      status: 'completed',
      winner: 'treatment',
      improvement: '+1.2%',
      startDate: '2024-01-15 14:35',
      endDate: '2024-01-16 14:35',
      controlMetrics: { predictions: 1247, avgError: 0.0256, avgLatency: 2.4 },
      treatmentMetrics: { predictions: 68, avgError: 0.0234, avgLatency: 2.3 }
    },
    {
      id: 'ab_test_002',
      modelType: 'grid_transformer',
      control: 'v20240107_112033',
      treatment: 'v20240114_092015',
      status: 'running',
      winner: null,
      improvement: null,
      startDate: '2024-01-14 09:25',
      endDate: null,
      controlMetrics: { predictions: 8456, avgError: 0.0312, avgLatency: 2.9 },
      treatmentMetrics: { predictions: 478, avgError: 0.0298, avgLatency: 2.8 }
    }
  ];

  const accuracyTrend = [
    { date: '2024-01-09', accuracy: 0.86 },
    { date: '2024-01-10', accuracy: 0.855 },
    { date: '2024-01-11', accuracy: 0.858 },
    { date: '2024-01-12', accuracy: 0.862 },
    { date: '2024-01-13', accuracy: 0.865 },
    { date: '2024-01-14', accuracy: 0.868 },
    { date: '2024-01-15', accuracy: 0.87 }
  ];

  const getStatusColor = (status) => {
    const colors = {
      healthy: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      warning: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      critical: 'text-rose-400 bg-rose-500/10 border-rose-500/20'
    };
    return colors[status] || colors.healthy;
  };

  const getStatusIcon = (status) => {
    if (status === 'healthy') return '✓';
    if (status === 'warning') return '⚠';
    return '✗';
  };

  const handleTriggerRetraining = () => {
    setRetrainingInProgress(true);
    setTimeout(() => {
      setRetrainingInProgress(false);
      setShowRetrainingModal(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <div className="sticky top-0 z-50 backdrop-blur-xl bg-zinc-900/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">ML Pipeline Monitoring</h1>
              <p className="text-sm text-zinc-400 mt-1">Automated model retraining & A/B testing</p>
            </div>
            <button
              onClick={() => setShowRetrainingModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-colors"
            >
              <span>🔄</span>
              Trigger Retraining
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 space-y-6">
        {/* Model Selector */}
        <div className="flex gap-3">
          {models.map(model => (
            <button
              key={model.id}
              onClick={() => setSelectedModel(model.id)}
              className={`flex-1 p-4 rounded-2xl border transition-all ${
                selectedModel === model.id
                  ? 'bg-violet-500/10 border-violet-500/30 shadow-lg shadow-violet-500/10'
                  : 'bg-white/5 border-white/10 hover:border-white/20'
              }`}
            >
              <div className="text-left">
                <div className="text-sm text-zinc-400">{model.type}</div>
                <div className="text-lg font-semibold mt-1">{model.name}</div>
              </div>
            </button>
          ))}
        </div>

        {/* Status Overview */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-zinc-400">Current Accuracy</span>
              <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(currentMetrics.status)}`}>
                {getStatusIcon(currentMetrics.status)} {currentMetrics.status}
              </span>
            </div>
            <div className="text-3xl font-bold text-white">
              {(currentMetrics.currentAccuracy * 100).toFixed(1)}%
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              Threshold: {(currentMetrics.threshold * 100)}%
            </div>
          </div>

          <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
            <div className="text-sm text-zinc-400 mb-3">Production Version</div>
            <div className="text-lg font-semibold text-white font-mono">
              {currentMetrics.productionVersion}
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              Deployed {currentMetrics.lastTrained}
            </div>
          </div>

          <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
            <div className="text-sm text-zinc-400 mb-3">24h Predictions</div>
            <div className="text-3xl font-bold text-white">
              {currentMetrics.predictions24h.toLocaleString()}
            </div>
            <div className="text-xs text-emerald-400 mt-1">
              ↑ 12% from yesterday
            </div>
          </div>

          <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/[0.06]">
            <div className="text-sm text-zinc-400 mb-3">Avg Latency</div>
            <div className="text-3xl font-bold text-white">
              {currentMetrics.avgLatency}s
            </div>
            <div className="text-xs text-zinc-500 mt-1">
              Target: &lt;3s
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 border-b border-white/10">
          {['overview', 'training', 'ab-tests'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-2.5 font-medium transition-colors ${
                activeTab === tab
                  ? 'text-violet-400 border-b-2 border-violet-400'
                  : 'text-zinc-400 hover:text-zinc-300'
              }`}
            >
              {tab === 'overview' && 'Overview'}
              {tab === 'training' && 'Training History'}
              {tab === 'ab-tests' && 'A/B Tests'}
            </button>
          ))}
        </div>

        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Accuracy Trend Chart */}
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-white/[0.06]">
              <h3 className="text-lg font-semibold mb-4">Accuracy Trend (7 Days)</h3>
              <div className="h-64 flex items-end gap-2">
                {accuracyTrend.map((point, idx) => {
                  const height = ((point.accuracy - 0.84) / (0.88 - 0.84)) * 100;
                  return (
                    <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                      <div className="text-xs text-zinc-400 font-medium">
                        {(point.accuracy * 100).toFixed(1)}%
                      </div>
                      <div
                        className="w-full bg-gradient-to-t from-violet-600 to-violet-400 rounded-t-lg transition-all hover:from-violet-500 hover:to-violet-300"
                        style={{ height: `${height}%` }}
                      />
                      <div className="text-xs text-zinc-500">
                        {point.date.slice(5)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                <div className="text-sm text-zinc-400">
                  Threshold: <span className="text-amber-400 font-semibold">{(currentMetrics.threshold * 100)}%</span>
                </div>
                <div className="text-sm text-emerald-400">
                  ↑ +1.2% improvement this week
                </div>
              </div>
            </div>

            {/* Retraining Triggers */}
            <div className="bg-zinc-800/50 rounded-2xl p-6 border border-white/[0.06]">
              <h3 className="text-lg font-semibold mb-4">Retraining Triggers</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                      ✓
                    </div>
                    <div>
                      <div className="font-medium">Accuracy Threshold</div>
                      <div className="text-sm text-zinc-400">Current: 87% (≥85% required)</div>
                    </div>
                  </div>
                  <span className="text-emerald-400 text-sm font-medium">Healthy</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-violet-500/10 flex items-center justify-center text-violet-400">
                      📊
                    </div>
                    <div>
                      <div className="font-medium">Data Accumulation</div>
                      <div className="text-sm text-zinc-400">8,234 new data points (10,000 threshold)</div>
                    </div>
                  </div>
                  <span className="text-zinc-400 text-sm font-medium">82%</span>
                </div>

                <div className="flex items-center justify-between p-4 bg-white/5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-cyan-500/10 flex items-center justify-center text-cyan-400">
                      📅
                    </div>
                    <div>
                      <div className="font-medium">Scheduled Retraining</div>
                      <div className="text-sm text-zinc-400">Next: Sunday 2:00 AM (in 4 days)</div>
                    </div>
                  </div>
                  <span className="text-cyan-400 text-sm font-medium">Scheduled</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Training History Tab */}
        {activeTab === 'training' && (
          <div className="bg-zinc-800/50 rounded-2xl border border-white/[0.06] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-white/5 border-b border-white/10">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300">Version</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300">Accuracy</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300">Val Loss</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300">Trigger</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300">Duration</th>
                    <th className="px-6 py-4 text-left text-sm font-semibold text-zinc-300">Trained At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {trainingHistory.map(training => (
                    <tr key={training.id} className="hover:bg-white/5 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-sm text-violet-400">{training.version}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="font-semibold">{(training.accuracy * 100).toFixed(1)}%</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-zinc-400">{training.valLoss.toFixed(4)}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                          training.status === 'production'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-zinc-700/50 text-zinc-400 border border-zinc-600/20'
                        }`}>
                          {training.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-zinc-400">{training.trigger}</td>
                      <td className="px-6 py-4 text-sm text-zinc-400">{training.duration}</td>
                      <td className="px-6 py-4 text-sm text-zinc-400">{training.trainedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* A/B Tests Tab */}
        {activeTab === 'ab-tests' && (
          <div className="space-y-4">
            {abTests.map(test => (
              <div key={test.id} className="bg-zinc-800/50 rounded-2xl p-6 border border-white/[0.06]">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold">{test.id}</h3>
                      <span className={`inline-flex px-3 py-1 rounded-full text-xs font-medium ${
                        test.status === 'completed'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      }`}>
                        {test.status}
                      </span>
                      {test.winner && (
                        <span className="text-sm text-emerald-400 font-medium">
                          Winner: {test.winner} ({test.improvement})
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-zinc-400 mt-1">
                      Started: {test.startDate} {test.endDate && `• Ended: ${test.endDate}`}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Control */}
                  <div className="bg-white/5 rounded-xl p-4 border border-white/10">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-zinc-300">Control</span>
                      <span className="text-xs font-mono text-zinc-400">{test.control}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Predictions:</span>
                        <span className="font-medium">{test.controlMetrics.predictions.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Avg Error:</span>
                        <span className="font-medium">{test.controlMetrics.avgError.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Avg Latency:</span>
                        <span className="font-medium">{test.controlMetrics.avgLatency}s</span>
                      </div>
                    </div>
                  </div>

                  {/* Treatment */}
                  <div className="bg-violet-500/10 rounded-xl p-4 border border-violet-500/20">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-semibold text-violet-300">Treatment (5%)</span>
                      <span className="text-xs font-mono text-violet-400">{test.treatment}</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Predictions:</span>
                        <span className="font-medium">{test.treatmentMetrics.predictions.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Avg Error:</span>
                        <span className="font-medium text-emerald-400">{test.treatmentMetrics.avgError.toFixed(4)}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-zinc-400">Avg Latency:</span>
                        <span className="font-medium">{test.treatmentMetrics.avgLatency}s</span>
                      </div>
                    </div>
                  </div>
                </div>

                {test.status === 'running' && (
                  <div className="mt-4 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-zinc-400">
                        Auto-evaluation in 18 hours
                      </span>
                      <button className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-sm font-semibold transition-colors">
                        Evaluate Now
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Retraining Modal */}
      {showRetrainingModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-2xl border border-white/10 max-w-md w-full p-6 shadow-2xl">
            <h3 className="text-xl font-bold mb-4">Trigger Model Retraining</h3>
            
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Model</label>
                <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 outline-none">
                  <option value="weather_lstm">Weather LSTM</option>
                  <option value="grid_transformer">Grid Transformer</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Reason</label>
                <select className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white focus:ring-2 focus:ring-violet-500/50 focus:border-violet-500/50 outline-none">
                  <option value="manual">Manual Trigger</option>
                  <option value="accuracy">Accuracy Degradation</option>
                  <option value="data">Data Accumulation</option>
                  <option value="scheduled">Scheduled</option>
                </select>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                <div className="flex gap-3">
                  <span className="text-amber-400 text-xl">⚠️</span>
                  <div className="text-sm text-amber-200">
                    <div className="font-semibold mb-1">Training will take ~45-60 minutes</div>
                    <div className="text-amber-300/80">New model will undergo A/B testing before production deployment</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowRetrainingModal(false)}
                className="flex-1 px-4 py-3 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-xl font-semibold transition-colors"
                disabled={retrainingInProgress}
              >
                Cancel
              </button>
              <button
                onClick={handleTriggerRetraining}
                className="flex-1 px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={retrainingInProgress}
              >
                {retrainingInProgress ? 'Starting...' : 'Start Training'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}