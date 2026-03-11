import React, { useEffect, useRef, useState } from 'react';

const RegionMap = ({ 
  regions, 
  selectedRegion, 
  onRegionClick, 
  weatherData = [], 
  gridImpacts = [],
  showHeatMap = false,
  className = '' 
}) => {
  const mapContainerRef = useRef(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Simulate map initialization
  useEffect(() => {
    const timer = setTimeout(() => setMapLoaded(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const getRegionColor = (regionId) => {
    if (!showHeatMap) {
      return selectedRegion === regionId ? 'fill-violet-500/40' : 'fill-zinc-700/40';
    }
    
    const impact = gridImpacts.find(i => i.regionId === regionId);
    if (!impact) return 'fill-zinc-700/40';
    
    const severityColors = {
      LOW: 'fill-emerald-500/40',
      MEDIUM: 'fill-amber-500/40',
      HIGH: 'fill-orange-500/40',
      CRITICAL: 'fill-rose-500/40'
    };
    return severityColors[impact.severity] || 'fill-zinc-700/40';
  };

  const getRegionStroke = (regionId) => {
    return selectedRegion === regionId ? 'stroke-violet-400' : 'stroke-white/20';
  };

  return (
    <div className={`bg-zinc-800/50 rounded-2xl p-5 border border-white/10 shadow-lg shadow-black/20 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Regional Map</h3>
        <div className="flex gap-2">
          <button
            onClick={() => {}}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 font-medium transition-colors"
          >
            🔍 Zoom In
          </button>
          <button
            onClick={() => {}}
            className="text-xs px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 font-medium transition-colors"
          >
            🔍 Zoom Out
          </button>
        </div>
      </div>

      <div ref={mapContainerRef} className="relative bg-zinc-900/50 rounded-xl overflow-hidden" style={{ height: '400px' }}>
        {!mapLoaded ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-zinc-500">Loading map...</div>
          </div>
        ) : (
          <svg viewBox="0 0 800 400" className="w-full h-full">
            {/* Simplified US regions representation */}
            {/* Northeast */}
            <path
              d="M 650 80 L 750 80 L 750 150 L 650 150 Z"
              className={`${getRegionColor(1)} ${getRegionStroke(1)} stroke-2 cursor-pointer transition-all hover:opacity-80`}
              onClick={() => onRegionClick && onRegionClick(1)}
            />
            <text x="700" y="115" className="text-xs fill-white font-medium text-center" textAnchor="middle">
              Northeast
            </text>

            {/* Midwest */}
            <path
              d="M 400 100 L 600 100 L 600 200 L 400 200 Z"
              className={`${getRegionColor(2)} ${getRegionStroke(2)} stroke-2 cursor-pointer transition-all hover:opacity-80`}
              onClick={() => onRegionClick && onRegionClick(2)}
            />
            <text x="500" y="150" className="text-xs fill-white font-medium" textAnchor="middle">
              Midwest
            </text>

            {/* Western */}
            <path
              d="M 50 80 L 350 80 L 350 250 L 50 250 Z"
              className={`${getRegionColor(3)} ${getRegionStroke(3)} stroke-2 cursor-pointer transition-all hover:opacity-80`}
              onClick={() => onRegionClick && onRegionClick(3)}
            />
            <text x="200" y="165" className="text-xs fill-white font-medium" textAnchor="middle">
              Western
            </text>

            {/* Southern */}
            <path
              d="M 400 220 L 700 220 L 700 350 L 400 350 Z"
              className={`${getRegionColor(4)} ${getRegionStroke(4)} stroke-2 cursor-pointer transition-all hover:opacity-80`}
              onClick={() => onRegionClick && onRegionClick(4)}
            />
            <text x="550" y="285" className="text-xs fill-white font-medium" textAnchor="middle">
              Southern
            </text>

            {/* Pacific */}
            <path
              d="M 50 270 L 200 270 L 200 370 L 50 370 Z"
              className={`${getRegionColor(5)} ${getRegionStroke(5)} stroke-2 cursor-pointer transition-all hover:opacity-80`}
              onClick={() => onRegionClick && onRegionClick(5)}
            />
            <text x="125" y="320" className="text-xs fill-white font-medium" textAnchor="middle">
              Pacific
            </text>

            {/* Weather markers */}
            {weatherData.map((data, index) => (
              <g key={index}>
                <circle
                  cx={data.x}
                  cy={data.y}
                  r="8"
                  className="fill-cyan-400/60 stroke-cyan-300 stroke-2"
                />
                <text
                  x={data.x}
                  y={data.y + 20}
                  className="text-xs fill-cyan-300 font-medium"
                  textAnchor="middle"
                >
                  {data.temp}°C
                </text>
              </g>
            ))}
          </svg>
        )}
      </div>

      {/* Legend */}
      {showHeatMap && (
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
              <div className="w-3 h-3 rounded-full bg-orange-500/40 border border-orange-500"></div>
              <span className="text-zinc-300">High</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded-full bg-rose-500/40 border border-rose-500"></div>
              <span className="text-zinc-300">Critical</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegionMap;