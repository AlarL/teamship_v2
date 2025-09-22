import { useLobbyContext } from '@/components/lobby/provider';
import { useSnapshot } from 'valtio';
import useServerTimer from '@/hooks/useServerTime';
import * as React from 'react';

interface VitalTrend {
  value: number;
  change: number;
  trend: 'rising' | 'falling' | 'stable';
}

const ShipVitals: React.FC = () => {
  const { lobbyStore } = useLobbyContext();
  const { ship } = useSnapshot(lobbyStore.proxy);
  const [waterHistory, setWaterHistory] = React.useState<number[]>([]);
  const [healthHistory, setHealthHistory] = React.useState<number[]>([]);
  
  // Track trends
  React.useEffect(() => {
    setWaterHistory(prev => [...prev.slice(-4), ship.water]); // Keep last 5 values
    setHealthHistory(prev => [...prev.slice(-4), ship.health]);
  }, [ship.water, ship.health]);
  
  const getVitalTrend = (history: number[]): VitalTrend => {
    if (history.length < 2) return { value: history[0] || 0, change: 0, trend: 'stable' };
    
    const current = history[history.length - 1];
    const previous = history[history.length - 2];
    const change = current - previous;
    
    return {
      value: current,
      change,
      trend: Math.abs(change) < 0.5 ? 'stable' : change > 0 ? 'rising' : 'falling'
    };
  };
  
  const waterTrend = getVitalTrend(waterHistory);
  const healthTrend = getVitalTrend(healthHistory);
  
  const getWaterStatus = (water: number, trend: string) => {
    if (water >= 90) return { level: 'critical', text: 'FLOODING!', color: 'text-error' };
    if (water >= 75) return { level: 'danger', text: 'HIGH', color: 'text-warning' };
    if (water >= 50) return { level: 'warning', text: 'RISING', color: 'text-info' };
    return { level: 'ok', text: 'OK', color: 'text-success' };
  };
  
  const getHealthStatus = (health: number, trend: string) => {
    if (health <= 10) return { level: 'critical', text: 'CRITICAL!', color: 'text-error' };
    if (health <= 25) return { level: 'danger', text: 'DAMAGED', color: 'text-warning' };
    if (health <= 50) return { level: 'warning', text: 'WORN', color: 'text-info' };
    return { level: 'ok', text: 'GOOD', color: 'text-success' };
  };
  
  const waterStatus = getWaterStatus(ship.water, waterTrend.trend);
  const healthStatus = getHealthStatus(ship.health, healthTrend.trend);
  
  const getTrendIcon = (trend: string, change: number) => {
    if (trend === 'rising') return change > 2 ? '⬆️' : '↗️';
    if (trend === 'falling') return change < -2 ? '⬇️' : '↘️';
    return '➡️';
  };

  return (
    <div className="bg-base-100 rounded-lg p-2">
      {/* Compact Status Line */}
      <div className="flex items-center justify-between text-sm font-medium mb-2">
        <div className={`${healthStatus.color}`}>
          ⚡ {Math.round(ship.health)}% {getTrendIcon(healthTrend.trend, healthTrend.change)} {healthStatus.text}
        </div>
        <div className={`${waterStatus.color}`}>
          💧 {Math.round(ship.water)}% {getTrendIcon(waterTrend.trend, waterTrend.change)} {waterStatus.text}
        </div>
        <div className="text-info">
          🚢 {ship.speed.toFixed(1)}kn
        </div>
      </div>
      
      {/* Compact Progress Bars */}
      <div className="space-y-1">
        <div className="w-full bg-base-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-500 ${
              ship.health > 50 ? 'bg-success' : 
              ship.health > 25 ? 'bg-warning' : 'bg-error'
            }`}
            style={{ width: `${ship.health}%` }}
          />
        </div>
        <div className="w-full bg-base-200 rounded-full h-2">
          <div 
            className={`h-2 rounded-full transition-all duration-300 ${
              ship.water >= 90 ? 'bg-error' :
              ship.water >= 75 ? 'bg-warning' : 'bg-info'
            }`}
            style={{ width: `${ship.water}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default ShipVitals;