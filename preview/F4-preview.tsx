export default function MultiRegionDashboard() {
  const [selectedRegion, setSelectedRegion] = React.useState(1);
  const [viewMode, setViewMode] = React.useState('single');
  const [selectedComparisonRegions, setSelectedComparisonRegions] = React.useState([1, 2]);
  const [dismissedAlerts, setDismissedAlerts] = React.useState([]);
  const [showSubstationDetails, setShowSubstationDetails] = React.useState(null);

  const regions = [
    { id: 1, name: 'Northeast', color: 'violet' },
    { id: 2, name: 'Midwest', color: 'emerald' },
    { id: 3, name: 'Western', color: 'amber' },
    { id: 4, name: 'Southern', color: 'rose' },
    { id: 5, name: 'Pacific', color: 'cyan' }
  ];

  const weatherData = {
    1: { temp: 22.5, wind: 5.2, precip: 0, humidity: 65, stress: 35, outage: 8 },
    2: { temp: 18.3, wind: 7.8, precip: 2.5, humidity: 72, stress: 52, outage: 15 },
    3: { temp: 28.1, wind: 3.5, precip: 0, humidity: 45, stress: 28, outage: 5 },
    4: { temp: 31.2, wind: 4.1, precip: 0, humidity: 68, stress: 68, outage: 22 },
    5: { temp: 19.8, wind: 6.3, precip: 1.2, humidity: 78, stress: 41, outage: 12 }
  };

  const hourlyForecast = [
    { time: '00:00', temp: 22, precip: 0, wind: 5.2, condition: 'cloudy' },
    { time: '03:00', temp: 21, precip: 0, wind: 5.5, condition: 'cloudy' },
    { time: '06:00', temp: 20, precip: 0, wind: 6.1, condition: 'cloudy' },
    { time: '09:00', temp: 23, precip: 0, wind: 5.8, condition: 'sunny' },
    { time: '12:00', temp: 26, precip: 0, wind: 4.9, condition: 'sunny' },
    { time: '15:00', temp: 28, precip: 0, wind: 4.2, condition: 'sunny' },
    { time: '18:00', temp: 25, precip: 5, wind: 5.5, condition: 'rainy' },
    { time: '21:00', temp: 23, precip: 10, wind: 6.8, condition: 'rainy' }
  ];

  const alerts = [
    {
      id: 'alert-1',
      severity: 'HIGH',
      title: 'Severe Weather Warning - Southern Region',
      message: 'High temperatures (31°C) combined with elevated grid stress (68%) may cause equipment failures.',
      timestamp: '2 minutes ago',
      recommendations: [
        'Activate demand response programs',
        'Monitor transformer temperatures',
        'Prepare backup generation capacity'
      ]
    },
    {
      id: 'alert-2',
      severity: 'MEDIUM',
      title: 'Increased Load Forecast - Midwest',
      message: 'Grid stress index rising to 52% due to weather conditions.',
      timestamp: '15 minutes ago',
      recommendations: [
        'Review load distribution',
        'Check substation capacity'
      ]
    }
  ];

  const substations = [
    { id: 1, name: 'Substation Alpha', severity: 'HIGH', load: 245, stress: 78, outage: 22 },
    { id: 2, name: 'Substation Beta', severity: 'MEDIUM', load: 189, stress: 52, outage: 12 },
    { id: 3, name: 'Substation Gamma', severity: 'LOW', load: 156, stress: 31, outage: 5 },
    { id: 4, name: 'Substation Delta', severity: 'CRITICAL', load: 298, stress: 92, outage: 35 }
  ];

  const currentData = weatherData[selectedRegion];
  const currentRegion = regions.find(r => r.id === selectedRegion);
  const activeAlerts = alerts.filter(a => !dismissedAlerts.includes(a.id));

  const getSeverityColor = (severity) => {
    const colors = {
      LOW: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
      MEDIUM: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
      HIGH: 'bg-orange-500/20 border-orange-500/40 text-orange-400',
      CRITICAL: 'bg-rose-500/20 border-rose-500/40 text-rose-400'
    };
    return colors[severity] || colors.LOW;
  };

  const getWeatherIcon = (condition) => {
    const icons = { sunny: '☀️', cloudy: '☁️', rainy: '🌧️', stormy: '⛈️' };
    return icons[condition] || '☁️';
  };

  const toggleComparisonRegion = (regionId) => {
    setSelectedComparisonRegions(prev => {
      if (prev.includes(regionId)) {
        return prev.filter(id => id !== regionId);
      } else if (prev.length < 3) {
        return [...prev, regionId];
      }
      return prev;
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-zinc-900/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">⚡ Weather Impact Dashboard</h1>
              <p className="text-sm text-zinc-400 mt-1">Real-time grid monitoring & AI predictions</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setViewMode(viewMode === 'single' ? 'comparison' : 'single')}
                className={`px-4 py-2 rounded-xl font-semibold text-sm transition-all ${
                  viewMode === 'comparison'
                    ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                    : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                }`}
              >
                {viewMode === 'comparison' ? '📊 Comparison' : '📍 Single Region'}
              </button>
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white font-bold shadow-lg shadow-violet-500/30">
                JD
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Region Selector (Single Mode) */}
        {viewMode === 'single' && (
          <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/10 shadow-lg shadow-black/20">
            <label className="block text-sm font-medium text-zinc-300 mb-3">Select Region</label>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {regions.map(region => (
                <button
                  key={region.id}
                  onClick={() => setSelectedRegion(region.id)}
                  className={`p-4 rounded-xl font-semibold text-sm transition-all ${
                    selectedRegion === region.id
                      ? `bg-${region.color}-500 text-white shadow-lg shadow-${region.color}-500/30`
                      : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                  }`}
                >
                  {region.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Alerts */}
        {activeAlerts.length > 0 && viewMode === 'single' && (
          <div className="space-y-3">
            {activeAlerts.map(alert => (
              <div
                key={alert.id}
                className={`rounded-xl p-5 border shadow-lg shadow-black/20 ${getSeverityColor(alert.severity)}`}
              >
                <div className="flex items-start gap-3">
                  <div className="text-2xl flex-shrink-0">
                    {alert.severity === 'CRITICAL' ? '🚨' : alert.severity === 'HIGH' ? '⚠️' : 'ℹ️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="font-bold text-white">{alert.title}</div>
                      <div className="text-xs text-zinc-400 flex-shrink-0">{alert.timestamp}</div>
                    </div>
                    <div className="text-sm text-zinc-300 mb-3">{alert.message}</div>
                    <div className="space-y-1 mb-3">
                      <div className="text-xs font-medium text-zinc-400">Recommendations:</div>
                      <ul className="text-xs text-zinc-300 space-y-1">
                        {alert.recommendations.map((rec, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <span className="text-zinc-500">•</span>
                            <span>{rec}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setDismissedAlerts([...dismissedAlerts, alert.id])}
                        className="text-xs px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white font-medium transition-colors"
                      >
                        Dismiss
                      </button>
                      <button className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 font-medium transition-colors">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {viewMode === 'single' ? (
          <>
            {/* Weather Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/10 shadow-lg shadow-black/20">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">🌡️</div>
                  <div className="text-xs font-medium text-zinc-400">→ 0%</div>
                </div>
                <div className="text-sm text-zinc-400">Temperature</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {currentData.temp}<span className="text-base text-zinc-400 ml-1">°C</span>
                </div>
              </div>

              <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/10 shadow-lg shadow-black/20">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">💨</div>
                  <div className="text-xs font-medium text-rose-400">↑ 5%</div>
                </div>
                <div className="text-sm text-zinc-400">Wind Speed</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {currentData.wind}<span className="text-base text-zinc-400 ml-1">m/s</span>
                </div>
              </div>

              <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/10 shadow-lg shadow-black/20">
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">🌧️</div>
                  <div className="text-xs font-medium text-emerald-400">↓ 2%</div>
                </div>
                <div className="text-sm text-zinc-400">Precipitation</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {currentData.precip}<span className="text-base text-zinc-400 ml-1">mm</span>
                </div>
              </div>

              <div className={`rounded-2xl p-5 border shadow-lg shadow-black/20 ${
                currentData.stress > 60 ? 'bg-rose-500/10 border-rose-500/30' : 
                currentData.stress > 40 ? 'bg-amber-500/10 border-amber-500/30' : 
                'bg-zinc-800/50 border-white/10'
              }`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="text-3xl">⚡</div>
                  <div className="text-xs font-medium text-zinc-400">→ 0%</div>
                </div>
                <div className="text-sm text-zinc-400">Grid Stress</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {currentData.stress}<span className="text-base text-zinc-400 ml-1">%</span>
                </div>
              </div>
            </div>

            {/* Map and Hourly Forecast */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Regional Map */}
              <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/10 shadow-lg shadow-black/20">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-white">Regional Map</h3>
                  <div className="flex gap-2">
                    <button className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 font-medium transition-colors">
                      🔍 Zoom
                    </button>
                  </div>
                </div>
                <div className="bg-zinc-900/50 rounded-xl overflow-hidden" style={{ height: '300px' }}>
                  <svg viewBox="0 0 800 300" className="w-full h-full">
                    {/* Northeast */}
                    <path
                      d="M 650 60 L 750 60 L 750 130 L 650 130 Z"
                      className={`${selectedRegion === 1 ? 'fill-violet-500/40' : 'fill-zinc-700/40'} stroke-white/20 stroke-2 cursor-pointer transition-all hover:opacity-80`}
                      onClick={() => setSelectedRegion(1)}
                    />
                    <text x="700" y="95" className="text-xs fill-white font-medium" textAnchor="middle">Northeast</text>

                    {/* Midwest */}
                    <path
                      d="M 400 80 L 600 80 L 600 160 L 400 160 Z"
                      className={`${selectedRegion === 2 ? 'fill-violet-500/40' : 'fill-zinc-700/40'} stroke-white/20 stroke-2 cursor-pointer transition-all hover:opacity-80`}
                      onClick={() => setSelectedRegion(2)}
                    />
                    <text x="500" y="120" className="text-xs fill-white font-medium" textAnchor="middle">Midwest</text>

                    {/* Western */}
                    <path
                      d="M 50 60 L 350 60 L 350 200 L 50 200 Z"
                      className={`${selectedRegion === 3 ? 'fill-violet-500/40' : 'fill-zinc-700/40'} stroke-white/20 stroke-2 cursor-pointer transition-all hover:opacity-80`}
                      onClick={() => setSelectedRegion(3)}
                    />
                    <text x="200" y="130" className="text-xs fill-white font-medium" textAnchor="middle">Western</text>

                    {/* Southern */}
                    <path
                      d="M 400 180 L 700 180 L 700 280 L 400 280 Z"
                      className={`${selectedRegion === 4 ? 'fill-violet-500/40' : 'fill-zinc-700/40'} stroke-white/20 stroke-2 cursor-pointer transition-all hover:opacity-80`}
                      onClick={() => setSelectedRegion(4)}
                    />
                    <text x="550" y="230" className="text-xs fill-white font-medium" textAnchor="middle">Southern</text>

                    {/* Pacific */}
                    <path
                      d="M 50 220 L 200 220 L 200 290 L 50 290 Z"
                      className={`${selectedRegion === 5 ? 'fill-violet-500/40' : 'fill-zinc-700/40'} stroke-white/20 stroke-2 cursor-pointer transition-all hover:opacity-80`}
                      onClick={() => setSelectedRegion(5)}
                    />
                    <text x="125" y="255" className="text-xs fill-white font-medium" textAnchor="middle">Pacific</text>
                  </svg>
                </div>
                <div className="mt-4 flex items-center gap-4 text-xs">
                  <span className="text-zinc-400">Impact Level:</span>
                  <div className="flex gap-3">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-emerald-500/40 border border-emerald-500"></div>
                      <span className="text-zinc-300">Low</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-amber-500/40 border border-amber-500"></div>
                      <span className="text-zinc-300">Medium</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-rose-500/40 border border-rose-500"></div>
                      <span className="text-zinc-300">High</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hourly Forecast */}
              <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/10 shadow-lg shadow-black/20">
                <h3 className="text-lg font-bold text-white mb-4">24-Hour Forecast</h3>
                <div className="overflow-x-auto">
                  <div className="flex gap-3 pb-2">
                    {hourlyForecast.map((forecast, i) => (
                      <div key={i} className="flex-shrink-0 bg-white/5 rounded-xl p-3 border border-white/5 min-w-[80px] text-center">
                        <div className="text-xs text-zinc-400 mb-2">{forecast.time}</div>
                        <div className="text-2xl mb-2">{getWeatherIcon(forecast.condition)}</div>
                        <div className="text-sm font-semibold text-white mb-1">{forecast.temp}°C</div>
                        <div className="text-xs text-zinc-500">{forecast.precip}%</div>
                        <div className="text-xs text-zinc-500 mt-1">💨 {forecast.wind}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Grid Impact Heat Map */}
            <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/10 shadow-lg shadow-black/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-white">Grid Impact Analysis</h3>
                <div className="flex gap-2 text-xs">
                  <span className="px-2 py-1 rounded-full bg-emerald-500/20 text-emerald-400">Low</span>
                  <span className="px-2 py-1 rounded-full bg-amber-500/20 text-amber-400">Medium</span>
                  <span className="px-2 py-1 rounded-full bg-orange-500/20 text-orange-400">High</span>
                  <span className="px-2 py-1 rounded-full bg-rose-500/20 text-rose-400">Critical</span>
                </div>
              </div>
              <div className="space-y-2">
                {substations.map(sub => (
                  <div
                    key={sub.id}
                    onClick={() => setShowSubstationDetails(sub)}
                    className={`rounded-xl p-4 border cursor-pointer transition-all hover:scale-[1.02] ${getSeverityColor(sub.severity)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="text-xl">{sub.severity === 'CRITICAL' ? '⚡' : sub.severity === 'HIGH' ? '⚠' : '✓'}</div>
                        <div>
                          <div className="font-semibold text-white">{sub.name}</div>
                          <div className="text-xs text-zinc-400 mt-1">
                            Load: {sub.load} MW | Stress: {sub.stress}%
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-medium">{sub.outage}%</div>
                        <div className="text-xs text-zinc-400">Risk</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          /* Comparison Mode */
          <div className="bg-zinc-800/50 rounded-2xl p-5 border border-white/10 shadow-lg shadow-black/20">
            <h3 className="text-lg font-bold text-white mb-4">Region Comparison</h3>
            
            <div className="flex flex-wrap gap-2 mb-6">
              {regions.map(region => (
                <button
                  key={region.id}
                  onClick={() => toggleComparisonRegion(region.id)}
                  className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                    selectedComparisonRegions.includes(region.id)
                      ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                      : 'bg-white/5 text-zinc-400 hover:bg-white/10'
                  }`}
                >
                  {region.name}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-3 px-2 text-zinc-400 font-medium">Metric</th>
                    {selectedComparisonRegions.map(id => {
                      const region = regions.find(r => r.id === id);
                      return (
                        <th key={id} className="text-center py-3 px-2 text-white font-semibold">
                          {region?.name}
                        </th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-2 text-zinc-300">Temperature</td>
                    {selectedComparisonRegions.map(id => (
                      <td key={id} className="text-center py-3 px-2">
                        <div className="font-semibold text-white">{weatherData[id].temp}°C</div>
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-2 text-zinc-300">Wind Speed</td>
                    {selectedComparisonRegions.map(id => (
                      <td key={id} className="text-center py-3 px-2">
                        <div className="font-semibold text-white">{weatherData[id].wind} m/s</div>
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-2 text-zinc-300">Grid Stress</td>
                    {selectedComparisonRegions.map(id => (
                      <td key={id} className="text-center py-3 px-2">
                        <div className="font-semibold text-white">{weatherData[id].stress}%</div>
                        <div className={`text-xs mt-1 ${
                          weatherData[id].stress > 60 ? 'text-rose-400' : 
                          weatherData[id].stress > 40 ? 'text-amber-400' : 
                          'text-emerald-400'
                        }`}>
                          {weatherData[id].stress > 60 ? 'High' : weatherData[id].stress > 40 ? 'Medium' : 'Low'}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr className="hover:bg-white/5 transition-colors">
                    <td className="py-3 px-2 text-zinc-300">Outage Risk</td>
                    {selectedComparisonRegions.map(id => (
                      <td key={id} className="text-center py-3 px-2">
                        <div className="font-semibold text-white">{weatherData[id].outage}%</div>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Substation Details Modal */}
      {showSubstationDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-800 rounded-2xl p-6 border border-white/10 shadow-2xl max-w-md w-full">
            <div className="flex items-start justify-between mb-4">
              <h3 className="text-xl font-bold text-white">{showSubstationDetails.name}</h3>
              <button
                onClick={() => setShowSubstationDetails(null)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="space-y-3">
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-zinc-400">Status</span>
                <span className={`font-semibold ${
                  showSubstationDetails.severity === 'CRITICAL' ? 'text-rose-400' :
                  showSubstationDetails.severity === 'HIGH' ? 'text-orange-400' :
                  showSubstationDetails.severity === 'MEDIUM' ? 'text-amber-400' :
                  'text-emerald-400'
                }`}>
                  {showSubstationDetails.severity}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-zinc-400">Current Load</span>
                <span className="font-semibold text-white">{showSubstationDetails.load} MW</span>
              </div>
              <div className="flex justify-between py-2 border-b border-white/5">
                <span className="text-zinc-400">Stress Index</span>
                <span className="font-semibold text-white">{showSubstationDetails.stress}%</span>
              </div>
              <div className="flex justify-between py-2">
                <span className="text-zinc-400">Outage Probability</span>
                <span className="font-semibold text-white">{showSubstationDetails.outage}%</span>
              </div>
            </div>
            <button
              onClick={() => setShowSubstationDetails(null)}
              className="w-full mt-6 py-3 px-4 rounded-xl bg-violet-500 hover:bg-violet-600 text-white font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}