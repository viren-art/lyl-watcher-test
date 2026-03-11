import React from 'react';

const AlertPanel = ({ alerts, onDismiss, className = '' }) => {
  const getSeverityStyle = (severity) => {
    const styles = {
      LOW: 'bg-blue-500/10 border-blue-500/30 text-blue-400',
      MEDIUM: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
      HIGH: 'bg-orange-500/10 border-orange-500/30 text-orange-400',
      CRITICAL: 'bg-rose-500/10 border-rose-500/30 text-rose-400'
    };
    return styles[severity] || styles.LOW;
  };

  const getSeverityIcon = (severity) => {
    const icons = {
      LOW: 'ℹ️',
      MEDIUM: '⚠️',
      HIGH: '⚠️',
      CRITICAL: '🚨'
    };
    return icons[severity] || 'ℹ️';
  };

  if (alerts.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {alerts.map((alert) => (
        <div
          key={alert.id}
          className={`rounded-xl p-4 border ${getSeverityStyle(alert.severity)} shadow-lg shadow-black/20`}
        >
          <div className="flex items-start gap-3">
            <div className="text-2xl flex-shrink-0">{getSeverityIcon(alert.severity)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="font-semibold text-white">{alert.title}</div>
                <div className="text-xs text-zinc-400 flex-shrink-0">{alert.timestamp}</div>
              </div>
              <div className="text-sm text-zinc-300 mb-3">{alert.message}</div>
              {alert.recommendations && alert.recommendations.length > 0 && (
                <div className="space-y-1 mb-3">
                  <div className="text-xs font-medium text-zinc-400">Recommendations:</div>
                  <ul className="text-xs text-zinc-300 space-y-1">
                    {alert.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <span className="text-zinc-500">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex gap-2">
                <button
                  onClick={() => onDismiss && onDismiss(alert.id)}
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
  );
};

export default AlertPanel;