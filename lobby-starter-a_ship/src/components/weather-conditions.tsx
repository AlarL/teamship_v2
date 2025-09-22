import { useLobbyContext } from '@/components/lobby/provider';
import { useSnapshot } from 'valtio';
import useServerTimer from '@/hooks/useServerTime';
import { LEGENDS, MISSIONS } from '@/types/teamship';
import { Waves, Wind, Compass, AlertTriangle, Zap, Anchor } from 'lucide-react';
import * as React from 'react';

const WeatherConditions: React.FC = () => {
  const { lobbyStore } = useLobbyContext();
  const { ship } = useSnapshot(lobbyStore.proxy) as any;
  const legend = ship.legendId ? LEGENDS[ship.legendId as keyof typeof LEGENDS] : LEGENDS.open_sea;
  const now = useServerTimer(1000);
  
  // Mission + phase context and forecast
  const mission = MISSIONS[ship.missionId || 'maiden_voyage'];
  const phaseIdx = (ship.missionPhaseIdx ?? 0) as number;
  const currentPhase = mission?.phases?.[phaseIdx];
  const nextPhase = mission?.phases?.[phaseIdx + 1];
  const secsToNext = nextPhase && ship.startTimestamp
    ? Math.max(0, Math.ceil((ship.startTimestamp + nextPhase.t - now) / 1000))
    : null;

  // Wind calculation
  const seedVal = (ship as any).seed ?? 0;
  const windDir = (legend.windDir + Math.sin(now / 1000 + seedVal) * 30 * legend.windVariance) % 360;
  const windDirR = Math.round((windDir + 360) % 360);
  const reefLabel = legend.reefSeverity <= 0 ? 'none' : legend.reefSeverity < 0.4 ? 'low' : legend.reefSeverity < 0.8 ? 'medium' : 'high';

  function describePhase(mod: any) {
    const parts: string[] = [];
    if (mod.windForce != null) {
      if (mod.windForce > 1.3) parts.push('strong winds');
      else if (mod.windForce > 1.05) parts.push('fresh breeze');
      else if (mod.windForce < 0.8) parts.push('light breeze');
      else parts.push('steady wind');
    }
    if (mod.windVariance != null) {
      if (mod.windVariance > 1.4) parts.push('gusty');
      else if (mod.windVariance < 0.8) parts.push('stable air');
    }
    if (mod.currentBias != null) {
      if (mod.currentBias > 0.07) parts.push('strong current');
      else if (mod.currentBias > 0.02) parts.push('cross current');
    }
    if (mod.reefSeverity != null) {
      if (mod.reefSeverity > 0.6) parts.push('heavy reefs');
      else if (mod.reefSeverity > 0.2) parts.push('shallow reefs');
    }
    if (mod.ingress != null && mod.ingress > 0.04) parts.push('taking on water');
    
    // Add current active event
    if (ship.eventName && (ship.eventUntil ?? 0) > now) {
      const eventMessages = {
        'gust_squall': 'GUST SQUALL',
        'flood_spike': 'FLOODING SURGE', 
        'cross_set': 'CROSS CURRENT',
        'broach_risk': 'BROACH RISK',
        'hull_breach': 'HULL BREACH',
        'sudden_wind_shift': 'WIND SHIFT',
        'steering_failure': 'STEERING ISSUE'
      };
      parts.unshift(eventMessages[ship.eventName] || ship.eventName.toUpperCase());
    }
    
    return parts.length ? parts.join(', ') : 'calm seas';
  }

  const nowDesc = currentPhase ? describePhase(currentPhase.modifiers) : '—';
  const nextDesc = nextPhase ? describePhase(nextPhase.modifiers) : null;

  // Phase timing for progress
  const phaseStart = ship.startTimestamp && currentPhase ? ship.startTimestamp + currentPhase.t : 0;
  const phaseEnd = ship.startTimestamp ? ship.startTimestamp + (nextPhase ? nextPhase.t : mission?.durationMs || 0) : 0;
  const phaseDur = Math.max(1, phaseEnd - phaseStart);
  const phaseElapsed = Math.max(0, Math.min(phaseDur, now - phaseStart));

  return (
    <div className="bg-base-100 rounded-lg p-2 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm flex items-center gap-1">
          <Waves className="w-4 h-4 text-blue-500" />
          {ship.missionPhaseName || 'Current Conditions'}
        </h3>
        <progress className="progress progress-accent w-20 h-2" value={phaseElapsed} max={phaseDur}/>
      </div>
      
      {/* Current & Forecast on one line */}
      <div className="text-sm">
        <span className="font-medium">Sea:</span> {nowDesc}
        {nextDesc && secsToNext !== null && (
          <span className="opacity-70"> • Next: {nextDesc} (~{secsToNext}s)</span>
        )}
      </div>
      
      {/* Weather Details - one line */}
      <div className="text-xs opacity-70 flex items-center gap-2">
        <div className="flex items-center gap-1">
          <Wind className="w-3 h-3 text-gray-500" />
          Wind {windDirR}° force {legend.windForce.toFixed(1)}
        </div>
        <div className="flex items-center gap-1">
          <Compass className="w-3 h-3 text-gray-500" />
          {Math.round(ship.heading)}° {ship.speed.toFixed(1)}kn
        </div>
        <div className="flex items-center gap-1">
          <AlertTriangle className="w-3 h-3 text-gray-500" />
          Heel {Math.round(ship.heel)}°
        </div>
      </div>
    </div>
  );
};

export default WeatherConditions;