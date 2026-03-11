import React from 'react';

const HourlyForecast = ({ forecasts, className = '' }) => {
  const getWeatherIcon = (condition) => {
    const icons = {
      sunny: '☀️',
      cloudy: '☁️',
      rainy: '🌧️',
      stormy: '⛈️',
      snowy: '❄️',
      windy: '💨'
    };
    return icons[condition] || '☁️';
  };

  return (
    <div className={`bg-zinc-800/50 rounded-2xl p-5 border border-white/10 shadow-lg shadow-black/20 ${className}`}>
      <h3 className="text-lg font-bold text-white mb-4">24-Hour Forecast</h3>
      <div className="overflow-x-auto">
        <div className="flex gap-3 pb-2">
          {forecasts.map((forecast, index) => (
            <div
              key={index}
              className="flex-shrink-0 bg-white/5 rounded-xl p-3 border border-white/5 min-w-[80px] text-center"
            >
              <div className="text-xs text-zinc-400 mb-2">{forecast.time}</div>
              <div className="text-2xl mb-2">{getWeatherIcon(forecast.condition)}</div>
              <div className="text-sm font-semibold text-white mb-1">{forecast.temp}°C</div>
              <div className="text-xs text-zinc-500">{forecast.precipitation}%</div>
              <div className="text-xs text-zinc-500 mt-1">
                <span className="inline-block">💨 {forecast.windSpeed} m/s</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HourlyForecast;