import React from 'react';

const RegionSelector = ({ regions, selectedRegion, onRegionChange, className = '' }) => {
  return (
    <div className={`space-y-2 ${className}`}>
      <label className="block text-sm font-medium text-zinc-300">
        Select Region
      </label>
      <select
        value={selectedRegion}
        onChange={(e) => onRegionChange(parseInt(e.target.value))}
        className="w-full rounded-xl bg-zinc-800/50 border border-white/10 text-white px-4 py-3 focus:outline-none focus:ring-2 focus:ring-violet-500/50 transition-all"
      >
        {regions.map((region) => (
          <option key={region.id} value={region.id}>
            {region.name}
          </option>
        ))}
      </select>
    </div>
  );
};

export default RegionSelector;