import React, { useState, useEffect } from 'react';
import { useQuery, gql } from '@apollo/client';
import RegionSelector from '../components/dashboard/RegionSelector';
import WeatherCard from '../components/dashboard/WeatherCard';
import HourlyForecast from '../components/dashboard/HourlyForecast';
import GridImpactHeatMap from '../components/dashboard/GridImpactHeatMap';
import RegionComparison from '../components/dashboard/RegionComparison';
import AlertPanel from '../components/dashboard/AlertPanel';
import RegionMap from '../components/maps/RegionMap';

const MULTI_REGION_WEATHER = gql`
  query MultiRegionWeather($regionIds: [Int!]!) {
    multiRegionWeather(regionIds: $regionIds) {
      gridRegionId
      regionName
      currentWeather {
        temperature
        windSpeed
        precipitation
        humidity
      }
      forecast24h {
        timestamp
        temperature
        windSpeed
        precipitation
        condition
      }
      gridImpact {
        stressIndex
        outageProbability
        severity
        affectedSubstations {
          substationId
          substationName
          riskLevel
          predictedLoad
        }
      }
      alerts {
        id
        severity
        title
        message
        timestamp
        recommendations
      }
    }
  }
`;

const GRID_REGIONS = gql`
  query GridRegions {
    gridRegions {
      gridRegionId
      regionName
      utilityProvider
      currentCapacity
      peakDemand
    }
  }
`;

const Dashboard = () => {
  const [selectedRegion, setSelectedRegion] = useState(1);
  const [selectedRegionsForComparison, setSelectedRegionsForComparison] = useState([1]);
  const [showComparison, setShowComparison] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  const { data: regionsData } = useQuery(GRID_REGIONS);
  const { data: weatherData, loading, error } = useQuery(MULTI_REGION_WEATHER, {
    variables: { regionIds: showComparison ? selectedRegionsForComparison : [selectedRegion] },
    pollInterval: 60000, // Refresh every minute
  });

  const regions = regionsData?.gridRegions || [];
  const currentRegionData = weatherData?.multiRegionWeather?.find(
    r => r.gridRegionId === selectedRegion
  );

  const handleToggleComparisonRegion = (regionId) => {
    setSelectedRegionsForComparison(prev => {
      if (prev.includes(regionId)) {
        return prev.filter(id => id !== regionId);
      } else if (prev.length < 3) {
        return [...prev, regionId];
      }
      return prev;
    });
  };

  const handleDismissAlert = (alertId) => {
    setDismissedAlerts(prev => [...prev, alertId]);
  };

  const activeAlerts = currentRegionData?.alerts?.filter(
    alert => !dismissedAlerts.includes(alert.id)
  ) || [];

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="text-rose-400 text-xl">Error loading data: {error.message}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-zinc-900/80 border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white">Weather Impact Dashboard</h1>
              <p className="text-sm text-zinc-400 mt-1">Real-time grid monitoring & predictions</p>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={() => setShowComparison(!showComparison)}
                className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                  showComparison
                    ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/30'
                    : 'bg-white/5 text-zinc-300 hover:bg-white/10'
                }`}
              >
                {showComparison ? '📊 Comparison Mode' : '📍 Single Region'}
              </button>
              <div className="w-10 h-10 rounded-full bg-violet-500 flex items-center justify-center text-white font-semibold">
                U
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">
        {/* Region Selector */}
        {!showComparison && (
          <RegionSelector
            regions={regions}
            selectedRegion={selectedRegion}
            onRegionChange={setSelectedRegion}
          />
        )}

        {/* Alerts */}
        {activeAlerts.length > 0 && !showComparison && (
          <AlertPanel alerts={activeAlerts} onDismiss={handleDismissAlert} />
        )}

        {/* Main Content */}
        {!showComparison ? (
          <>
            {/* Weather Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <WeatherCard
                title="Temperature"
                value={currentRegionData?.currentWeather?.temperature?.toFixed(1) || '--'}
                unit="°C"
                icon="🌡️"
                trend={{ direction: 'stable', value: '0%' }}
              />
              <WeatherCard
                title="Wind Speed"
                value={currentRegionData?.currentWeather?.windSpeed?.toFixed(1) || '--'}
                unit="m/s"
                icon="💨"
                trend={{ direction: 'up', value: '5%' }}
              />
              <WeatherCard
                title="Precipitation"
                value={currentRegionData?.currentWeather?.precipitation?.toFixed(1) || '--'}
                unit="mm"
                icon="🌧️"
                trend={{ direction: 'down', value: '2%' }}
              />
              <WeatherCard
                title="Grid Stress"
                value={currentRegionData?.gridImpact?.stressIndex || '--'}
                unit="%"
                icon="⚡"
                severity={
                  currentRegionData?.gridImpact?.severity === 'CRITICAL' ? 'danger' :
                  currentRegionData?.gridImpact?.severity === 'HIGH' ? 'warning' :
                  'normal'
                }
                trend={{ direction: 'stable', value: '0%' }}
              />
            </div>

            {/* Map and Hourly Forecast */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <RegionMap
                regions={regions}
                selectedRegion={selectedRegion}
                onRegionClick={setSelectedRegion}
                showHeatMap={true}
                gridImpacts={weatherData?.multiRegionWeather?.map(r => ({
                  regionId: r.gridRegionId,
                  severity: r.gridImpact?.severity || 'LOW'
                })) || []}
              />
              <HourlyForecast
                forecasts={currentRegionData?.forecast24h?.slice(0, 12).map(f => ({
                  time: new Date(f.timestamp).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
                  temp: f.temperature?.toFixed(0),
                  precipitation: Math.round((f.precipitation || 0) * 10),
                  windSpeed: f.windSpeed?.toFixed(1),
                  condition: f.condition || 'cloudy'
                })) || []}
              />
            </div>

            {/* Grid Impact Heat Map */}
            <GridImpactHeatMap
              impacts={currentRegionData?.gridImpact?.affectedSubstations?.map(s => ({
                substationId: s.substationId,
                substationName: s.substationName,
                severity: s.riskLevel,
                predictedLoad: s.predictedLoad?.toFixed(1) || '--',
                stressIndex: Math.round(Math.random() * 100),
                outageProbability: Math.round(Math.random() * 30)
              })) || []}
              onSubstationClick={(impact) => console.log('Substation clicked:', impact)}
            />
          </>
        ) : (
          /* Comparison Mode */
          <RegionComparison
            regions={regions}
            selectedRegions={selectedRegionsForComparison}
            onToggleRegion={handleToggleComparisonRegion}
            comparisonData={[
              {
                name: 'Temperature',
                showDelta: true,
                values: Object.fromEntries(
                  weatherData?.multiRegionWeather?.map(r => [
                    r.gridRegionId,
                    {
                      value: `${r.currentWeather?.temperature?.toFixed(1) || '--'}°C`,
                      delta: Math.round((Math.random() - 0.5) * 10)
                    }
                  ]) || []
                )
              },
              {
                name: 'Wind Speed',
                showDelta: true,
                values: Object.fromEntries(
                  weatherData?.multiRegionWeather?.map(r => [
                    r.gridRegionId,
                    {
                      value: `${r.currentWeather?.windSpeed?.toFixed(1) || '--'} m/s`,
                      delta: Math.round((Math.random() - 0.5) * 10)
                    }
                  ]) || []
                )
              },
              {
                name: 'Grid Stress',
                showDelta: false,
                values: Object.fromEntries(
                  weatherData?.multiRegionWeather?.map(r => [
                    r.gridRegionId,
                    {
                      value: `${r.gridImpact?.stressIndex || '--'}%`,
                      delta: null
                    }
                  ]) || []
                )
              },
              {
                name: 'Outage Risk',
                showDelta: false,
                values: Object.fromEntries(
                  weatherData?.multiRegionWeather?.map(r => [
                    r.gridRegionId,
                    {
                      value: `${r.gridImpact?.outageProbability?.toFixed(1) || '--'}%`,
                      delta: null
                    }
                  ]) || []
                )
              }
            ]}
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;