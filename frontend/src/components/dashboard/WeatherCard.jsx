import React from 'react';

const WeatherCard = ({ title, value, unit, icon, trend, severity = 'normal' }) => {
  const severityColors = {
    normal: 'bg-zinc-800/50 border-white/10',
    warning: 'bg-amber-500/10 border-amber-500/30',
    danger: 'bg-rose-500/10 border-rose-500/30',
    success: 'bg-emerald-500/10 border-emerald-500/30'
  };

  const trendColors = {
    up: 'text-rose-400',
    down: 'text-emerald-400',
    stable: 'text-zinc-400'
  };

  return (
    <div className={`rounded-2xl p-5 border ${severityColors[severity]} shadow-lg shadow-black/20`}>
      <div className="flex items-start justify-between mb-3">
        <div className="text-3xl">{icon}</div>
        {trend && (
          <div className={`text-xs font-medium ${trendColors[trend.direction]}`}>
            {trend.direction === 'up' ? '↑' : trend.direction === 'down' ? '↓' : '→'} {trend.value}
          </div>
        )}
      </div>
      <div className="space-y-1">
        <div className="text-sm text-zinc-400">{title}</div>
        <div className="text-2xl font-bold text-white">
          {value}
          <span className="text-base text-zinc-400 ml-1">{unit}</span>
        </div>
      </div>
    </div>
  );
};

export default WeatherCard;