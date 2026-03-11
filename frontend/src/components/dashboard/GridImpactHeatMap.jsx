import React from 'react';

const GridImpactHeatMap = ({ impacts, onSubstationClick, className = '' }) => {
  const getSeverityColor = (severity) => {
    const colors = {
      LOW: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400',
      MEDIUM: 'bg-amber-500/20 border-amber-500/40 text-amber-400',
      HIGH: 'bg-orange-500/20 border-orange-500/40 text-orange-400',
      CRITICAL: 'bg-rose-500/20 border-rose-500/40 text-rose-400'
    };
    return colors[severity] || colors.LOW;
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      LOW: '✓',
      MEDIUM: '⚠',
      HIGH: '⚠',
      CRITICAL: '⚡'
    };
    return icons[severity] || '•';
  };

  return (
    <div className={`bg-zinc-800/50 rounded-2xl p-5 border border-white/10 shadow-lg shadow-black/20 ${className}`}>
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
        {impacts.map((impact) => (
          <div
            key={impact.substationId}
            onClick={() => onSubstationClick && onSubstationClick(impact)}
            className={`rounded-xl p-4 border cursor-pointer transition-all hover:scale-[1.02] ${getSeverityColor(impact.severity)}`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="text-xl">{getSeverityIcon(impact.severity)}</div>
                <div>
                  <div className="font-semibold text-white">{impact.substationName}</div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Load: {impact.predictedLoad} MW | Stress: {impact.stressIndex}%
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium">{impact.outageProbability}%</div>
                <div className="text-xs text-zinc-400">Risk</div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GridImpactHeatMap;