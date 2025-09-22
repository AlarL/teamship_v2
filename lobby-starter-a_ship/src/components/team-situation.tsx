import { useLobbyContext } from '@/components/lobby/provider';
import { useSnapshot } from 'valtio';
import useServerTimer from '@/hooks/useServerTime';
import { LEGENDS, MISSIONS } from '@/types/teamship';
import * as React from 'react';

const TeamSituation: React.FC = () => {
  const { lobbyStore } = useLobbyContext();
  const { ship } = useSnapshot(lobbyStore.proxy);
  const now = useServerTimer(1000);
  const legend = ship.legendId ? LEGENDS[ship.legendId as keyof typeof LEGENDS] : LEGENDS.open_sea;
  
  // Mission context
  const mission = MISSIONS[ship.missionId || 'maiden_voyage'];
  const currentPhase = mission?.phases?.[ship.missionPhaseIdx ?? 0];
  const nextPhase = mission?.phases?.[(ship.missionPhaseIdx ?? 0) + 1];
  
  // Time calculations
  const missionDur = (MISSIONS[ship.missionId || 'maiden_voyage']?.durationMs || legend.maxDurationMs);
  const timeLeft = Math.max(0, Math.ceil((missionDur - (now - (ship.startTimestamp || now))) / 1000));
  const timeLeftMin = Math.floor(timeLeft / 60);
  const timeLeftSec = timeLeft % 60;
  
  const secsToNextPhase = nextPhase && ship.startTimestamp
    ? Math.max(0, Math.ceil((ship.startTimestamp + nextPhase.t - now) / 1000))
    : null;
  
  // Distance and progress
  const distLeft = Math.max(0, Math.round(ship.distanceRemaining));
  const progressPct = Math.max(0, 100 - Math.round((ship.distanceRemaining / legend.targetDistance) * 100));
  
  // Wind and conditions
  const seedVal = (ship as any).seed ?? 0;
  const windDir = (legend.windDir + Math.sin(now / 1000 + seedVal) * 30 * legend.windVariance) % 360;
  const windDirR = Math.round((windDir + 360) % 360);
  
  // Situation assessment
  const getSituationStatus = () => {
    const issues = [];
    if (ship.health < 50) issues.push('damaged');
    if (ship.water > 70) issues.push('flooding');
    if (ship.heel > 60) issues.push('unstable');
    if (ship.speed < 3) issues.push('slow');
    
    if (issues.length === 0) return { text: 'All systems good', color: 'text-success', icon: '✅' };
    if (issues.length === 1) return { text: `Ship ${issues[0]}`, color: 'text-warning', icon: '⚠️' };
    return { text: `Multiple issues: ${issues.join(', ')}`, color: 'text-error', icon: '🚨' };
  };
  
  const situationStatus = getSituationStatus();
  
  // Wind assessment
  const getWindStatus = () => {
    const force = legend.windForce;
    if (force > 0.8) return { text: 'Strong winds', color: 'text-warning', icon: '💨' };
    if (force > 0.5) return { text: 'Fresh breeze', color: 'text-info', icon: '🌬️' };
    if (force > 0.3) return { text: 'Light winds', color: 'text-success', icon: '🍃' };
    return { text: 'Calm conditions', color: 'text-primary', icon: '😴' };
  };
  
  const windStatus = getWindStatus();

  return (
    <div className="bg-base-100 rounded-lg p-2 space-y-2">
      <div className="flex items-center justify-between">
        <h3 className="font-bold text-sm">🧭 Mission • {timeLeftMin}:{timeLeftSec.toString().padStart(2, '0')} left</h3>
        <div className="text-xs font-mono">{progressPct}% ({distLeft}m)</div>
      </div>
      
      {/* Status & Progress on one line */}
      <div className="flex items-center justify-between text-sm">
        <div className={`font-medium ${situationStatus.color}`}>
          {situationStatus.icon} {situationStatus.text}
        </div>
        <div className={`font-medium ${windStatus.color}`}>
          {windStatus.icon} {windStatus.text}
        </div>
      </div>
      
      {/* Compact Progress Bar */}
      <div className="w-full bg-base-200 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-info to-success h-2 rounded-full transition-all duration-1000"
          style={{ width: `${progressPct}%` }}
        />
      </div>
      
      {/* Current Phase & Forecast */}
      <div className="space-y-2">
        {currentPhase && (
          <div className="bg-base-200 rounded p-2">
            <div className="text-xs font-medium">
              📍 Current: {ship.missionPhaseName || currentPhase.name}
            </div>
            <div className="text-xs opacity-70">
              {getPhaseDescription(currentPhase.modifiers)}
            </div>
          </div>
        )}
        
        {nextPhase && secsToNextPhase && secsToNextPhase < 60 && (
          <div className="bg-accent/10 border border-accent/20 rounded p-2 animate-pulse">
            <div className="text-xs font-medium text-accent">
              🔮 Coming in {secsToNextPhase}s: {nextPhase.name}
            </div>
            <div className="text-xs opacity-70">
              {getPhaseDescription(nextPhase.modifiers)}
            </div>
          </div>
        )}
      </div>
      
      {/* Quick Reference */}
      <div className="text-xs opacity-60 border-t pt-2">
        Wind: {windDirR}° • Force: {(legend.windForce * 100).toFixed(0)}% • 
        Heading: {Math.round(ship.heading)}° • Speed: {ship.speed.toFixed(1)}kn
      </div>
    </div>
  );
};

// Helper function to describe phase modifiers
function getPhaseDescription(modifiers: any): string {
  const parts: string[] = [];
  
  if (modifiers.windForce && modifiers.windForce > 1.3) parts.push('strong winds');
  else if (modifiers.windForce && modifiers.windForce < 0.8) parts.push('light winds');
  
  if (modifiers.windVariance && modifiers.windVariance > 1.4) parts.push('gusty');
  if (modifiers.currentBias && modifiers.currentBias > 0.05) parts.push('cross current');
  if (modifiers.reefSeverity && modifiers.reefSeverity > 0.4) parts.push('reef hazards');
  if (modifiers.ingress && modifiers.ingress > 0.04) parts.push('taking water');
  if (modifiers.heelRisk && modifiers.heelRisk > 1.2) parts.push('unstable seas');
  
  return parts.length > 0 ? parts.join(', ') : 'steady conditions';
}

export default TeamSituation;
