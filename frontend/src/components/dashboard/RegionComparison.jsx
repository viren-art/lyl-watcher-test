import React from 'react';

const RegionComparison = ({ regions, selectedRegions, onToggleRegion, comparisonData, className = '' }) => {
  return (
    <div className={`bg-zinc-800/50 rounded-2xl p-5 border border-white/10 shadow-lg shadow-black/20 ${className}`}>
      <h3 className="text-lg font-bold text-white mb-4">Region Comparison</h3>
      
      {/* Region Selection */}
      <div className="flex flex-wrap gap-2 mb-6">
        {regions.map((region) => (
          <button
            key={region.id}
            onClick={() => onToggleRegion(region.id)}
            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
              selectedRegions.includes(region.id)
                ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                : 'bg-white/5 text-zinc-400 hover:bg-white/10'
            }`}
          >
            {region.name}
          </button>
        ))}
      </div>

      {/* Comparison Table */}
      {selectedRegions.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-2 text-zinc-400 font-medium">Metric</th>
                {selectedRegions.map((regionId) => {
                  const region = regions.find(r => r.id === regionId);
                  return (
                    <th key={regionId} className="text-center py-3 px-2 text-white font-semibold">
                      {region?.name}
                    </th>
                  );
                })}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {comparisonData.map((metric, index) => (
                <tr key={index} className="hover:bg-white/5 transition-colors">
                  <td className="py-3 px-2 text-zinc-300">{metric.name}</td>
                  {selectedRegions.map((regionId) => {
                    const value = metric.values[regionId];
                    const isDelta = metric.showDelta;
                    return (
                      <td key={regionId} className="text-center py-3 px-2">
                        <div className="font-semibold text-white">{value?.value}</div>
                        {isDelta && value?.delta && (
                          <div className={`text-xs mt-1 ${
                            value.delta > 0 ? 'text-rose-400' : 'text-emerald-400'
                          }`}>
                            {value.delta > 0 ? '↑' : '↓'} {Math.abs(value.delta)}%
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedRegions.length === 0 && (
        <div className="text-center py-8 text-zinc-500">
          Select regions above to compare weather and grid metrics
        </div>
      )}
    </div>
  );
};

export default RegionComparison;