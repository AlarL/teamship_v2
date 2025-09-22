import { useLobbyContext } from '@/components/lobby/provider';
import { useIntents, useBailTap, useRowTap, useLookoutSpot, getGameActions } from '@/state/actions/game-actions';
import { playerActions } from '@/state/actions/player-actions';
import TeamAlerts from '@/components/team-alerts';
import TeamSituation from '@/components/team-situation';
import ShipVitals from '@/components/ship-vitals';
import WeatherConditions from '@/components/weather-conditions';
import type { AttemptLogEntry, Role } from '@/types/teamship';
import { LEGENDS, MISSIONS } from '@/types/teamship';
import { useSnapshot } from 'valtio';
import { kmClient } from '@/services/km-client';
import useServerTimer from '@/hooks/useServerTime';
import { Anchor, ArrowLeft, ArrowRight, Waves, Eye, Zap, Settings } from 'lucide-react';
import * as React from 'react';
import { getAttemptCopy, describeAttemptOutcome } from '@/utils/attempt-copy';

function formatTimeMMSS(totalSeconds: number) {
  const m = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, '0');
  const s = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, '0');
  return `${m}:${s}`;
}

function formatDurationMs(ms: number) {
  return formatTimeMMSS(Math.max(ms, 0) / 1000);
}

function AlertsBar({ ship }: { ship: any }) {
  type Sev = 'warning' | 'critical';
  const alerts: { sev: Sev; text: string }[] = [];
  // Situation change banner (accent)
  const eventText = (() => {
    switch (ship.eventName) {
      case 'flood_spike':
        return '⚠️ Water is rising rapidly';
      case 'gust_squall':
        return '💨 Strong wind gust incoming';
      case 'cross_set':
        return '🌊 Cross current detected';
      case 'broach_risk':
        return '⚡ High heel forces building';
      case 'hull_breach':
        return '🚨 Hull breach detected';
      case 'sudden_wind_shift':
        return '🌪️ Wind direction shifting';
      case 'steering_failure':
        return '🎯 Steering drift detected';
      default:
        return null;
    }
  })();
  // Heel - progressive warnings for teamwork
  if (ship.heel > 85) alerts.push({ sev: 'critical', text: 'Ship at dangerous heel angle' });
  else if (ship.heel > 65) alerts.push({ sev: 'warning', text: 'Ship heeling heavily' });
  // Water level - critical for team coordination
  if (ship.water > 75) alerts.push({ sev: 'critical', text: 'Water level critical' });
  else if (ship.water > 50) alerts.push({ sev: 'warning', text: 'Water level rising' });
  // Health - shows consequences of poor teamwork
  if (ship.health < 30) alerts.push({ sev: 'critical', text: 'Ship structure failing' });
  else if (ship.health < 60) alerts.push({ sev: 'warning', text: 'Ship taking damage' });

  const shown = alerts.slice(0, 2);
  if (!shown.length && !eventText) return null;
  return (
    <div className="space-y-2">
      {eventText && (ship.eventUntil ?? 0) > Date.now() && (
        <div className="alert alert-accent animate-pulse py-2 px-3 text-sm">
          <span>{eventText}</span>
        </div>
      )}
      {shown.map((a, i) => (
        <div
          key={i}
          className={`alert ${a.sev === 'critical' ? 'alert-error animate-pulse' : 'alert-warning'} py-2 px-3 text-sm`}
        >
          <span>{a.text}</span>
        </div>
      ))}
    </div>
  );
}

function computeSuggestion(
  role: Role | null,
  ship: any,
  intents: any,
  windDir: number
) {
  if (!role) return '';
  const meIntent = intents[kmClient.connectionId] ?? {};
  const relSigned = (((ship.heading - windDir + 540) % 360) - 180);
  const rel = Math.abs(relSigned);
  if (role === 'helmsman') {
    const delta = Math.round(Math.abs(rel - 90));
    if (delta <= 5) return 'Good course — hold ~90° to wind';
    if (rel < 90) return `Steer ${relSigned >= 0 ? 'right' : 'left'} ${delta}°`;
    return `Steer ${relSigned >= 0 ? 'left' : 'right'} ${delta}°`;
  }
  if (role === 'sail') {
    const sailTrim: number | undefined = meIntent.sailTrim;
    const ang = Math.abs((((ship.heading - windDir + 540) % 360) - 180));
    const sailEff = 1 - Math.abs(ang - 90) / 90;
    if (typeof sailTrim === 'number') {
      const diff = Math.round((sailEff - sailTrim) * 100);
      if (Math.abs(diff) <= 5) return 'Trim good — hold';
      if (diff > 0) return `Trim +${diff}%`;
      return `Ease ${Math.abs(diff)}%`;
    }
    return 'Set trim ~to sail efficiency';
  }
  if (role === 'bailer') {
    const t1 = meIntent.bailTapAt1 ?? 0;
    const t2 = meIntent.bailTapAt2 ?? 0;
    const cadence = t1 && t2 ? (t1 - t2) / 1000 : 0;
    if (cadence) {
      const txt = cadence.toFixed(2);
      if (cadence > 0.6) return `Speed up (cadence ${txt}s)`;
      if (cadence < 0.4) return `Slow down (cadence ${txt}s)`;
      return `Good rhythm (${txt}s)`;
    }
    return 'Tap rhythm ~0.5s';
  }
  if (role === 'rower') {
    const L1 = meIntent.rowLeftTapAt1 ?? 0;
    const L2 = meIntent.rowLeftTapAt2 ?? 0;
    const R1 = meIntent.rowRightTapAt1 ?? 0;
    const R2 = meIntent.rowRightTapAt2 ?? 0;
    const last = Math.max(L1, R1);
    const prev = Math.max(L2, R2);
    const dtTap = last && prev ? (last - prev) / 1000 : 0;
    if (dtTap) {
      const txt = dtTap.toFixed(2);
      if (dtTap > 0.8) return `Increase cadence (${txt}s)`;
      if (dtTap < 0.4) return `Reduce cadence (${txt}s)`;
      return `Good alternation (${txt}s)`;
    }
    return 'Alternate left/right ~0.6s';
  }
  if (role === 'lookout') {
    return 'Spot hazards at peaks; use Focus for longer buff';
  }
  return '';
}

function SituationPanel() {
  const { lobbyStore } = useLobbyContext();
  const { ship } = useSnapshot(lobbyStore.proxy) as any;
  const legend = LEGENDS[ship.legendId as keyof typeof LEGENDS];
  const now = useServerTimer(1000);
  const seedVal = (ship as any).seed ?? 0;
  const windDir = (legend.windDir + Math.sin(now / 1000 + seedVal) * 30 * legend.windVariance) % 360;
  const windDirR = Math.round((windDir + 360) % 360);
  const reefLabel = legend.reefSeverity <= 0 ? 'none' : legend.reefSeverity < 0.4 ? 'low' : legend.reefSeverity < 0.8 ? 'medium' : 'high';
  const missionDur = (MISSIONS[ship.missionId || 'maiden_voyage']?.durationMs || legend.maxDurationMs);
  const timeLeft = Math.max(0, Math.ceil((missionDur - (now - (ship.startTimestamp || now))) / 1000));
  const timeLeftMMSS = formatTimeMMSS(timeLeft);
  const distLeft = Math.max(0, Math.round(ship.distanceRemaining));

  // Mission + phase context and forecast
  const mission = MISSIONS[ship.missionId || 'maiden_voyage'];
  const phaseIdx = (ship.missionPhaseIdx ?? 0) as number;
  const currentPhase = mission?.phases?.[phaseIdx];
  const nextPhase = mission?.phases?.[phaseIdx + 1];
  const secsToNext = nextPhase && ship.startTimestamp
    ? Math.max(0, Math.ceil((ship.startTimestamp + nextPhase.t - now) / 1000))
    : null;

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
    <div className="card bg-base-100 shadow-sm">
      <div className="card-body space-y-2 py-3">
        <div className="text-sm font-semibold">Mission: {mission?.name || '—'}</div>
        <div className="text-sm">
          <span className="font-medium">Phase:</span> {ship.missionPhaseName || '—'}
        </div>
        <progress className="progress progress-accent w-full" value={phaseElapsed} max={phaseDur}></progress>
        <div className="text-sm">
          <span className="font-medium">Sea now:</span> {nowDesc}
          {nextDesc && (
            <>
              <span className="opacity-60"> • </span>
              <span className="font-medium">Forecast:</span> {nextDesc}
              {secsToNext !== null && <span className="opacity-60"> in ~{secsToNext}s</span>}
            </>
          )}
        </div>
        <div className="text-sm opacity-80">Weather: Wind {windDirR} deg, force {legend.windForce.toFixed(2)}; current {legend.currentBias.toFixed(2)} deg/s; reefs {reefLabel}</div>
        <div className="text-sm opacity-80">Ship: Heading {Math.round(ship.heading)} deg, speed {ship.speed.toFixed(1)}, heel {Math.round(ship.heel)} deg, water {Math.round(ship.water)}%</div>
        <div className="text-sm opacity-80">Objective: {distLeft} m to go; course {legend.name}; time {timeLeftMMSS}</div>
      </div>
    </div>
  );
}

function RoleCallout({ role }: { role: Role | null }) {
  const { lobbyStore } = useLobbyContext();
  const { ship, intents } = useSnapshot(lobbyStore.proxy) as any;
  const legend = LEGENDS[ship.legendId as keyof typeof LEGENDS];
  const now = useServerTimer(500);
  const seedVal = (ship as any).seed ?? 0;
  const windDir = (legend.windDir + Math.sin(now / 1000 + seedVal) * 30 * legend.windVariance) % 360;
  const text = computeSuggestion(role, ship, intents, windDir);
  if (!role || !text) return null;
  return (
    <div className="alert alert-primary shadow-sm">
      <span className="text-base font-semibold">{text}</span>
    </div>
  );
}

const ROLE_LABELS: Record<Role, string> = {
  helmsman: 'Helmsman',
  sail: 'Sail Trimmer',
  bailer: 'Bailer',
  rower: 'Rower',
  lookout: 'Lookout'
};

function TeamRoster() {
  const { lobbyAwareness, lobbyStore } = useLobbyContext();
  const presence = useSnapshot(lobbyAwareness.proxy) as any;
  const { intents } = useSnapshot(lobbyStore.proxy) as any;
  
  const teamMembers = Object.entries(presence)
    .map(([connId, p]: any) => ({ 
      connId,
      name: (p?.data?.displayName || `Player-${connId.slice(-4)}`).trim(), 
      role: p?.data?.role as Role | null,
      intent: intents?.[connId] 
    }));
    
  if (!teamMembers.length) return null;
  
  const getActivityStatus = (role: Role | null, intent: any) => {
    if (!role || !intent) return '💤 idle';
    const now = Date.now();
    const lastUpdate = intent.updatedAt || 0;
    const timeSinceUpdate = now - lastUpdate;
    
    if (timeSinceUpdate > 3000) return '💤 idle';
    
    switch (role) {
      case 'helmsman':
        return intent.helmDelta ? 
          `🚢 ${intent.helmDelta > 0 ? 'starboard' : 'port'}` : '⚓ holding';
      case 'sail':
        return intent.sailGustAt && (now - intent.sailGustAt < 2000) ? 
          '🌪️ gust!' : `⛵ trim ${Math.round((intent.sailTrim || 0) * 100)}%`;
      case 'bailer':
        const bailInterval = intent.bailTapAt1 && intent.bailTapAt2 ? 
          (intent.bailTapAt1 - intent.bailTapAt2) / 1000 : 0;
        return bailInterval > 0 ? `💧 ${bailInterval.toFixed(1)}s` : '💧 bailing';
      case 'rower':
        const lastRow = Math.max(intent.rowLeftTapAt1 || 0, intent.rowRightTapAt1 || 0);
        return (now - lastRow < 1000) ? '🚣‍♀️ rowing' : '🚣‍♀️ ready';
      case 'lookout':
        return intent.lookoutAckAt && (now - intent.lookoutAckAt < 2000) ? 
          '👁️ spotted!' : `👁️ focus ${Math.round((intent.lookoutFocus || 0) * 100)}%`;
      default:
        return '❓ unknown';
    }
  };
  
  return (
    <div className="space-y-2">
      <h4 className="font-semibold text-sm">🧑‍🤝‍🧑 Team Activity ({teamMembers.length})</h4>
      <div className="grid gap-2">
        {teamMembers.map((member, i) => (
          <div key={`${member.connId}-${i}`} className="flex items-center justify-between p-2 bg-base-200 rounded text-sm">
            <div className="flex items-center gap-2">
              <span className="font-medium">{member.name}</span>
              <div className="badge badge-sm">
                {member.role ? ROLE_LABELS[member.role].split(' ')[0] : 'No Role'}
              </div>
            </div>
            <div className="text-xs opacity-70">
              {getActivityStatus(member.role, member.intent)}
            </div>
          </div>
        ))}
        
        {/* Debug info */}
        {teamMembers.length === 0 && (
          <div className="text-center text-sm opacity-50">
            No players detected. Check your connection.
          </div>
        )}
      </div>
    </div>
  );
}

function HUD() {
  const { lobbyStore } = useLobbyContext();
  const { ship } = useSnapshot(lobbyStore.proxy);
  const legend = LEGENDS[ship.legendId as keyof typeof LEGENDS];
  const now = useServerTimer(1000);
  const missionDur2 = (MISSIONS[ship.missionId || 'maiden_voyage']?.durationMs || legend.maxDurationMs);
  const timeLeft = Math.max(0, Math.ceil((missionDur2 - (now - (ship.startTimestamp || now))) / 1000));
  return (
    <div className="hud-compact grid grid-cols-3 gap-1 text-center text-xs">
      <div className="stat bg-base-100 p-2">
        <div className="stat-title text-xs opacity-70">Health</div>
        <div className="stat-value text-success text-sm">{Math.round(ship.health)}</div>
      </div>
      <div className="stat bg-base-100 p-2">
        <div className="stat-title text-xs opacity-70">Speed</div>
        <div className="stat-value text-sm">{ship.speed.toFixed(1)}</div>
      </div>
      <div className="stat bg-base-100 p-2">
        <div className="stat-title text-xs opacity-70">Progress</div>
        <div className="stat-value text-sm">{Math.max(0, 100 - Math.round((ship.distanceRemaining / legend.targetDistance) * 100))}%</div>
      </div>
      <div className="stat bg-base-100 p-2">
        <div className="stat-title text-xs opacity-70">Heading</div>
        <div className="stat-value text-sm">{Math.round(ship.heading)} deg</div>
      </div>
      <div className="stat bg-base-100 p-2">
        <div className="stat-title text-xs opacity-70">Heel</div>
        <div className="stat-value text-sm">{Math.round(ship.heel)} deg</div>
      </div>
      <div className="stat bg-base-100 p-2">
        <div className="stat-title text-xs opacity-70">Coop</div>
        <div className="stat-value text-sm">{Math.round(ship.coopScore)}</div>
      </div>
      <div className="stat bg-base-100 p-2">
        <div className="stat-title text-xs opacity-70">Water</div>
        <div className="stat-value text-sm">{Math.round(ship.water)}</div>
      </div>
      <div className="stat bg-base-100 p-2">
        <div className="stat-title text-xs opacity-70">Time</div>
        <div className="stat-value text-sm">{timeLeft}s</div>
      </div>
    </div>
  );
}

function HelmsmanControls() {
  const setIntent = useIntents();
  const [turning, setTurning] = React.useState<'left' | 'right' | null>(null);
  const [feedback, setFeedback] = React.useState('');
  const { lobbyStore } = useLobbyContext();
  const { ship } = useSnapshot(lobbyStore.proxy) as any;
  const legend = LEGENDS[ship.legendId as keyof typeof LEGENDS];
  const now = useServerTimer(500);
  const seedVal = (ship as any).seed ?? 0;
  const windDir = (legend.windDir + Math.sin(now / 1000 + seedVal) * 30 * legend.windVariance) % 360;
  
  const handleTurn = (direction: 'left' | 'right', isActive: boolean) => {
    if (isActive) {
      setTurning(direction);
      setIntent({ helmDelta: direction === 'left' ? -1 : 1 });
      
      // Calculate steering effectiveness
      const relSigned = (((ship.heading - windDir + 540) % 360) - 180);
      const rel = Math.abs(relSigned);
      const targetAngle = 90; // Optimal beam reach angle
      const angleError = Math.abs(rel - targetAngle);
      
      if (angleError <= 5) {
        setFeedback('🎯 PERFECT COURSE!');
      } else if (angleError <= 15) {
        setFeedback('⚡ Good heading');
      } else if (angleError <= 30) {
        const correction = relSigned >= 0 ? 
          (rel < targetAngle ? 'more starboard' : 'ease to port') : 
          (rel < targetAngle ? 'more port' : 'ease to starboard');
        setFeedback(`🧭 Try ${correction}`);
      } else {
        setFeedback('⚠️ Major course correction needed');
      }
      
      setTimeout(() => setFeedback(''), 2000);
    } else {
      setTurning(null);
      setIntent({ helmDelta: 0 });
    }
  };

  return (
    <div className="space-y-3">
      {feedback && (
        <div className={`text-center text-sm font-bold p-2 rounded ${
          feedback.includes('PERFECT') ? 'text-success bg-success/10 animate-pulse' :
          feedback.includes('Good') ? 'text-info bg-info/10' :
          feedback.includes('Try') ? 'text-warning bg-warning/10' :
          'text-error bg-error/10'
        }`}>
          {feedback}
        </div>
      )}
      
      <div className="text-center text-sm">
        <span className="font-medium">Current heading: {Math.round(ship.heading)}°</span>
        <span className="ml-3 opacity-70">Wind: {Math.round(windDir)}°</span>
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <button 
          className={`btn text-lg h-20 transition-all duration-150 active:scale-95 font-bold shadow-lg ${
            turning === 'left' ? 'btn-error animate-pulse' : 'btn-error btn-outline'
          }`}
          onTouchStart={() => handleTurn('left', true)} 
          onTouchEnd={() => handleTurn('left', false)}
          onMouseDown={() => handleTurn('left', true)} 
          onMouseUp={() => handleTurn('left', false)}
          style={{ minHeight: '5rem' }}
        >
          ← PORT
        </button>
        <button 
          className={`btn text-lg h-20 transition-all duration-150 active:scale-95 font-bold shadow-lg ${
            turning === 'right' ? 'btn-success animate-pulse' : 'btn-success btn-outline'
          }`}
          onTouchStart={() => handleTurn('right', true)} 
          onTouchEnd={() => handleTurn('right', false)}
          onMouseDown={() => handleTurn('right', true)} 
          onMouseUp={() => handleTurn('right', false)}
          style={{ minHeight: '5rem' }}
        >
          STARBOARD →
        </button>
      </div>
      
      <div className="text-center text-xs opacity-60">
        Target: ~90° to wind for optimal speed
      </div>
    </div>
  );
}

function Slider({ label, onChange, value }: { label: string; onChange: (v: number) => void; value?: number }) {
  return (
    <div className="space-y-1">
      <div className="text-sm opacity-80">{label}</div>
      <input
        type="range"
        min={0}
        max={100}
        defaultValue={Math.round((value ?? 0.5) * 100)}
        className="range range-primary"
        onChange={(e) => onChange(Number(e.target.value) / 100)}
      />
    </div>
  );
}

function SailControls() {
  const setIntent = useIntents();
  const [trimLevel, setTrimLevel] = React.useState(50);
  const [feedback, setFeedback] = React.useState('');
  const { lobbyStore } = useLobbyContext();
  const { ship } = useSnapshot(lobbyStore.proxy) as any;
  const legend = LEGENDS[ship.legendId as keyof typeof LEGENDS];
  const now = useServerTimer(500);
  const seedVal = (ship as any).seed ?? 0;
  const windDir = (legend.windDir + Math.sin(now / 1000 + seedVal) * 30 * legend.windVariance) % 360;
  
  const adjustTrim = (delta: number) => {
    const newLevel = Math.max(0, Math.min(100, trimLevel + delta));
    setTrimLevel(newLevel);
    setIntent({ sailTrim: newLevel / 100 });
    
    // Calculate sail trim effectiveness
    const ang = Math.abs((((ship.heading - windDir + 540) % 360) - 180));
    const optimalSailEff = 1 - Math.abs(ang - 90) / 90;
    const currentTrim = newLevel / 100;
    const trimError = Math.abs(optimalSailEff - currentTrim);
    
    if (trimError <= 0.05) {
      setFeedback('🎯 PERFECT TRIM!');
    } else if (trimError <= 0.15) {
      setFeedback('⚡ Good sail setting');
    } else if (trimError <= 0.3) {
      const adjustment = optimalSailEff > currentTrim ? 'trim more' : 'ease sail';
      setFeedback(`🧭 Try ${adjustment}`);
    } else {
      setFeedback('⚠️ Major trim adjustment needed');
    }
    
    setTimeout(() => setFeedback(''), 1800);
  };
  
  const handleGust = () => {
    setIntent({ sailGustAt: Date.now() });
    setFeedback('🌪️ GUST HANDLED!');
    setTimeout(() => setFeedback(''), 1000);
  };

  return (
    <div className="space-y-3">
      {feedback && (
        <div className={`text-center text-sm font-bold p-2 rounded ${
          feedback.includes('PERFECT') || feedback.includes('HANDLED') ? 'text-success bg-success/10 animate-pulse' :
          feedback.includes('Good') ? 'text-info bg-info/10' :
          feedback.includes('Try') ? 'text-warning bg-warning/10' :
          'text-error bg-error/10'
        }`}>
          {feedback}
        </div>
      )}
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Sail Trim</span>
          <span className="font-mono">{trimLevel}%</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button 
            className="btn btn-outline h-12 active:scale-95"
            onClick={() => adjustTrim(-20)}
          >
            Ease -
          </button>
          <button 
            className="btn btn-outline h-12 active:scale-95"
            onClick={() => adjustTrim(-5)}
          >
            Fine -
          </button>
          <button 
            className="btn btn-outline h-12 active:scale-95"
            onClick={() => adjustTrim(5)}
          >
            Fine +
          </button>
        </div>
        <button 
          className="btn btn-outline h-12 w-full active:scale-95"
          onClick={() => adjustTrim(20)}
        >
          Trim Hard +
        </button>
      </div>
      
      <button 
        className="btn btn-accent text-lg h-16 w-full transition-all duration-150 active:scale-95" 
        onClick={handleGust}
        style={{ minHeight: '4rem' }}
      >
        <Zap className="w-5 h-5 inline mr-1" />GUST RESPONSE!
      </button>
      
      <div className="text-center text-xs opacity-60">
        Match trim to wind angle for max efficiency
      </div>
    </div>
  );
}

function LookoutControls() {
  const setIntent = useIntents();
  const spot = useLookoutSpot();
  const [focusLevel, setFocusLevel] = React.useState(50);
  const [spotCount, setSpotCount] = React.useState(0);
  const [feedback, setFeedback] = React.useState('');
  const [lastSpotTime, setLastSpotTime] = React.useState(0);
  const { lobbyStore } = useLobbyContext();
  const { ship } = useSnapshot(lobbyStore.proxy) as any;
  
  const adjustFocus = (delta: number) => {
    const newLevel = Math.max(0, Math.min(100, focusLevel + delta));
    setFocusLevel(newLevel);
    setIntent({ lookoutFocus: newLevel / 100 });
    
    // Focus level feedback
    if (newLevel >= 80) {
      setFeedback('🔍 LASER FOCUS!');
    } else if (newLevel >= 60) {
      setFeedback('👁️ Sharp focus');
    } else if (newLevel >= 40) {
      setFeedback('🌊 Balanced watch');
    } else {
      setFeedback('🌌 Wide scan mode');
    }
    
    setTimeout(() => setFeedback(''), 1200);
  };
  
  const handleSpot = () => {
    const now = Date.now();
    const timeSinceLastSpot = now - lastSpotTime;
    
    spot();
    setSpotCount(prev => prev + 1);
    setLastSpotTime(now);
    
    // Spot timing feedback
    if (ship.eventName && (ship.eventUntil ?? 0) > now) {
      setFeedback('🎯 CRITICAL SPOT! Event spotted!');
    } else if (timeSinceLastSpot < 5000) {
      setFeedback('⚡ Good vigilance!');
    } else if (timeSinceLastSpot < 10000) {
      setFeedback('👁️ Hazard spotted');
    } else {
      setFeedback('🚨 Stay alert - long gap!');
    }
    
    setTimeout(() => setFeedback(''), 1500);
  };

  return (
    <div className="space-y-3">
      {feedback && (
        <div className={`text-center text-sm font-bold p-2 rounded ${
          feedback.includes('LASER') || feedback.includes('CRITICAL') ? 'text-success bg-success/10 animate-pulse' :
          feedback.includes('Good') || feedback.includes('Sharp') ? 'text-info bg-info/10' :
          feedback.includes('alert') ? 'text-warning bg-warning/10' :
          'text-primary bg-primary/10'
        }`}>
          {feedback}
        </div>
      )}
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Focus Level</span>
          <span className="font-mono">{focusLevel}%</span>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button 
            className="btn btn-outline h-12 active:scale-95"
            onClick={() => adjustFocus(-25)}
          >
            Wide -
          </button>
          <button 
            className="btn btn-outline h-12 active:scale-95"
            onClick={() => { setFocusLevel(50); setIntent({ lookoutFocus: 0.5 }); }}
          >
            Reset
          </button>
          <button 
            className="btn btn-outline h-12 active:scale-95"
            onClick={() => adjustFocus(25)}
          >
            Sharp +
          </button>
        </div>
      </div>
      
      <button 
        className="btn btn-info text-xl h-20 w-full transition-all duration-150 active:scale-95 font-bold" 
        onClick={handleSpot}
        style={{ minHeight: '5rem' }}
      >
        <Eye className="w-6 h-6 mb-1" /><br/>SPOT HAZARD!<br/>
        <span className="text-sm opacity-80">Spotted: {spotCount}</span>
      </button>
      
      <div className="text-center text-xs opacity-60">
        Higher focus = longer team buff • Spot during events for best effect
      </div>
    </div>
  );
}

function BailerControls() {
  const tap = useBailTap();
  const [lastTap, setLastTap] = React.useState(0);
  const [rhythm, setRhythm] = React.useState<number[]>([]);
  const [feedback, setFeedback] = React.useState('');
  const [effectLevel, setEffectLevel] = React.useState(0);
  
  const handleTap = () => {
    const now = Date.now();
    if (lastTap > 0) {
      const interval = now - lastTap;
      setRhythm(prev => [...prev.slice(-2), interval]); // Keep last 3 intervals
    }
    setLastTap(now);
    tap();
  };
  
  const avgRhythm = rhythm.length > 0 ? rhythm.reduce((a, b) => a + b, 0) / rhythm.length : 0;
  const rhythmQuality = avgRhythm > 0 ? 
    (avgRhythm < 400 ? 'Too Fast!' : avgRhythm < 600 ? 'Perfect!' : avgRhythm < 800 ? 'Good' : 'Too Slow') : '';

  return (
    <div className="space-y-3">
      {rhythmQuality && (
        <div className={`text-center text-sm font-bold p-2 rounded ${
          rhythmQuality === 'Perfect!' ? 'text-success bg-success/10 animate-pulse' : 
          rhythmQuality.includes('Too') ? 'text-error bg-error/10' : 'text-info bg-info/10'
        }`}>
          {rhythmQuality === 'Perfect!' ? '💪 PERFECT PUMPING!' : 
           rhythmQuality === 'Good' ? '👍 Good rhythm' :
           rhythmQuality.includes('Too') ? `⚠️ ${rhythmQuality}` : rhythmQuality}
          <br/>
          <span className="text-xs opacity-70">
            {avgRhythm > 0 ? `${(avgRhythm/1000).toFixed(1)}s rhythm` : ''}
            {rhythmQuality === 'Perfect!' ? ' • Water pumping effectively!' : 
             rhythmQuality.includes('Too') ? ' • Adjust your timing!' : ''}
          </span>
        </div>
      )}
      
      <button 
        className="btn btn-warning text-xl h-32 w-full transition-all duration-100 active:scale-95 active:btn-error font-bold" 
        onClick={handleTap}
        style={{ minHeight: '8rem' }}
      >
        💧 BAIL! 💧<br/>
        <span className="text-sm opacity-80">Tap rhythm ~0.5s</span>
      </button>
    </div>
  );
}

function RowerControls() {
  const tapL = useRowTap('L');
  const tapR = useRowTap('R');
  const [lastSide, setLastSide] = React.useState<'L' | 'R' | null>(null);
  const [strokeCount, setStrokeCount] = React.useState(0);
  const [lastStrokeTime, setLastStrokeTime] = React.useState(0);
  const [strokeHistory, setStrokeHistory] = React.useState<{side: 'L' | 'R', time: number}[]>([]);
  const [feedback, setFeedback] = React.useState('');
  
  const handleRow = (side: 'L' | 'R') => {
    const now = Date.now();
    
    if (side === 'L') tapL();
    if (side === 'R') tapR();
    
    // Calculate rowing effectiveness
    setStrokeHistory(prev => [...prev.slice(-3), {side, time: now}]);
    
    if (lastStrokeTime > 0) {
      const interval = now - lastStrokeTime;
      const isAlternating = strokeHistory.length > 0 && strokeHistory[strokeHistory.length - 1].side !== side;
      
      // Optimal rhythm is ~400ms with alternation
      const rhythmScore = Math.max(0, 1 - Math.abs(interval - 400) / 400);
      const alternationBonus = isAlternating ? 1 : 0.3;
      const effectiveness = rhythmScore * alternationBonus;
      
      if (effectiveness > 0.8) {
        setFeedback('🚀 POWERFUL STROKE!');
      } else if (effectiveness > 0.6) {
        setFeedback('💪 Good rowing');
      } else if (effectiveness > 0.3) {
        setFeedback(isAlternating ? '⚡ Good alternation' : '↔️ Try alternating sides');
      } else {
        setFeedback('⚠️ Adjust rhythm & alternate');
      }
      
      setTimeout(() => setFeedback(''), 1500);
    } else {
      setFeedback('🚣‍♀️ Start rowing rhythm!');
      setTimeout(() => setFeedback(''), 1000);
    }
    
    setLastSide(side);
    setStrokeCount(prev => prev + 1);
    setLastStrokeTime(now);
    
    // Reset highlight after 300ms
    setTimeout(() => setLastSide(null), 300);
  };

  return (
    <div className="space-y-3">
      {feedback && (
        <div className={`text-center text-sm font-bold p-2 rounded ${
          feedback.includes('POWERFUL') ? 'text-success bg-success/10 animate-pulse' :
          feedback.includes('Good') || feedback.includes('alternation') ? 'text-info bg-info/10' :
          'text-warning bg-warning/10'
        }`}>
          {feedback}
        </div>
      )}
      
      <div className="text-center text-sm">
        <span className="font-medium">Strokes: {strokeCount}</span>
        {lastSide && (
          <span className="ml-3 text-accent">
            {lastSide === 'L' ? '← Port stroke!' : 'Starboard stroke! →'}
          </span>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-4">
        <button 
          className={`btn text-lg h-24 transition-all duration-150 active:scale-95 font-bold shadow-lg ${
            lastSide === 'L' ? 'btn-info animate-pulse' : 'btn-info btn-outline'
          }`}
          onClick={() => handleRow('L')}
          style={{ minHeight: '6rem' }}
        >
          <ArrowLeft className="w-5 h-5 mb-1" /><br/>PORT
        </button>
        <button 
          className={`btn text-lg h-24 transition-all duration-150 active:scale-95 font-bold shadow-lg ${
            lastSide === 'R' ? 'btn-secondary animate-pulse' : 'btn-secondary btn-outline'
          }`}
          onClick={() => handleRow('R')}
          style={{ minHeight: '6rem' }}
        >
          <ArrowRight className="w-5 h-5 mb-1" /><br/>STARBOARD
        </button>
      </div>
      
      <div className="text-center text-xs opacity-60">
        Alternate left-right ~0.6s rhythm
      </div>
    </div>
  );
}

function ControlsForRole({ role }: { role: Role }) {
  switch (role) {
    case 'helmsman':
      return <HelmsmanControls />;
    case 'sail':
      return <SailControls />;
    case 'bailer':
      return <BailerControls />;
    case 'rower':
      return <RowerControls />;
    case 'lookout':
      return <LookoutControls />;
    default:
      return null;
  }
}

const GameView: React.FC = () => {
  const { lobbyStore, lobbyAwareness } = useLobbyContext();
  const { ship, hostConnectionId } = useSnapshot(lobbyStore.proxy) as any;
  const presence = useSnapshot(lobbyAwareness.proxy) as any;
  const actions = React.useMemo(() => getGameActions(lobbyStore), [lobbyStore]);
  const me = presence[kmClient.connectionId]?.data ?? null;
  const myRole = me?.role ?? null;
  const legend = ship.legendId ? LEGENDS[ship.legendId as keyof typeof LEGENDS] : LEGENDS.open_sea;
  const attemptLog = (Array.isArray(ship.attemptLog) ? ship.attemptLog : []) as AttemptLogEntry[];
  const lastAttempt: AttemptLogEntry | null = attemptLog.length > 0 ? attemptLog[attemptLog.length - 1] : null;
  const showGameOver = ship.phase === 'finished' && !!lastAttempt;
  const isHost = hostConnectionId === kmClient.connectionId;
  const attemptCopy = lastAttempt ? getAttemptCopy(lastAttempt.reason) : null;
  const attemptStats = lastAttempt?.stats;
  const attemptDurationMs = lastAttempt ? (attemptStats?.durationMs ?? (lastAttempt.finishedAt - lastAttempt.at)) : 0;
  const attemptDurationLabel = formatDurationMs(attemptDurationMs);
  const outcomeDetail = lastAttempt ? describeAttemptOutcome(lastAttempt.reason, lastAttempt.distLeft) : null;
  const remainingDistance = lastAttempt ? Math.max(0, Math.round(lastAttempt.distLeft)) : 0;
  const distanceValue = !lastAttempt
    ? '--'
    : lastAttempt.reason === 'success'
    ? 'Goal reached'
    : `${remainingDistance} m`;
  const summaryTiles: Array<{ label: string; value: string }> = lastAttempt
    ? [
        {
          label: 'Lowest Health',
          value: `${Math.round(attemptStats?.minHealth ?? ship.health)}%`
        },
        {
          label: 'Peak Water',
          value: `${Math.round(attemptStats?.maxWater ?? ship.water)}%`
        },
        {
          label: 'Avg Teamwork',
          value: attemptStats?.avgCoopScore != null ? Math.round(attemptStats.avgCoopScore).toString() : '--'
        },
        {
          label: 'Active Players',
          value: (attemptStats?.activePlayers ?? 0).toString()
        },
        {
          label: 'End Health',
          value: `${Math.round(attemptStats?.endHealth ?? ship.health)}%`
        },
        {
          label: 'Distance Left',
          value: distanceValue
        }
      ]
    : [];

  const handleViewSummary = React.useCallback(() => {
    playerActions.goTo('results');
  }, []);

  const handleRetry = React.useCallback(async () => {
    try {
      await actions.restartMission(3);
    } catch (err) {
      console.error('Failed to restart mission', err);
    }
  }, [actions]);

  return (
    <div className="container mx-auto p-2 lg:p-4 min-h-full">
      {showGameOver && attemptCopy && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-base-300/80 px-4">
          <div className="card bg-base-100 max-w-md w-full shadow-xl border border-base-200">
            <div className="card-body space-y-4">
              <div className="space-y-1 text-center">
                <div className="text-4xl">{attemptCopy.emoji}</div>
                <h3 className={`text-2xl font-bold ${
                  attemptCopy.tone === 'success' ? 'text-success' : attemptCopy.tone === 'warning' ? 'text-warning' : 'text-error'
                }`}>
                  {attemptCopy.title}
                </h3>
                <p className="text-sm opacity-80">{attemptCopy.body}</p>
              </div>

              <div className="space-y-3 text-sm">
                <div className="bg-base-200 rounded-lg p-3 text-left space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-wide">
                    <span>Mission Outcome</span>
                    <span className="badge badge-outline">{attemptDurationLabel}</span>
                  </div>
                  {outcomeDetail && <div className="text-sm">{outcomeDetail}</div>}
                  {remainingDistance > 0 && (
                    <div className="text-xs opacity-60">
                      {remainingDistance} m short of the objective
                    </div>
                  )}
                </div>

                {summaryTiles.length > 0 && (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {summaryTiles.map(tile => (
                      <div key={tile.label} className="bg-base-200 rounded p-2 text-center">
                        <div className="font-bold">{tile.value}</div>
                        <div className="text-xs opacity-70">{tile.label}</div>
                      </div>
                    ))}
                  </div>
                )}

                {lastAttempt?.teamPerf?.mostActive && (
                  <div className="bg-base-200 rounded p-2 text-xs text-center">
                    <span className="font-semibold">Most Active:</span> {lastAttempt.teamPerf.mostActive}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <button
                  className="btn btn-primary w-full"
                  onClick={handleViewSummary}
                >
                  View Mission Stats
                </button>
                {isHost ? (
                  <button
                    className="btn btn-accent w-full"
                    onClick={handleRetry}
                  >
                    🔄 Play Again
                  </button>
                ) : (
                  <div className="alert alert-info text-sm">
                    <div className="flex items-center gap-2">
                      <div className="loading loading-spinner loading-sm" />
                      <span>Waiting for the Captain to launch the next attempt…</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      <div className="mx-auto max-w-screen-sm space-y-4 pb-4">
        {/* Critical Alerts */}
        {ship.phase === 'countdown' && (
          <div className="alert alert-info text-lg font-bold animate-pulse">
            <span>🚀 Starting in {Math.ceil(ship.countdown)}...</span>
          </div>
        )}
        
        {/* Live Alerts */}
        <AlertsBar ship={ship} />
        <TeamAlerts />

        {/* 1. SHIP STATUS - Water level, Speed, Progress */}
        <ShipVitals />
        
        {/* 2. WEATHER & PHASE INFO */}
        <WeatherConditions />
        
        {/* 3. MISSION STATUS */}
        <TeamSituation />
        
        {/* Role Guidance */}
        <RoleCallout role={myRole} />
        
        {/* 4. ROLE TOOLS - Main Controls with Distinct Colors */}
        <div className="card bg-gradient-to-br from-orange-50 to-yellow-50 shadow-lg border-2 border-orange-300">
          <div className="card-body p-4">
            <div className="flex flex-col gap-3 mb-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="text-xl font-bold text-orange-800 flex items-center gap-2">
                  <Settings className="w-5 h-5" />
                  {myRole ? `${ROLE_LABELS[myRole]} Controls` : 'Your Controls'}
                </h3>
                {myRole && (
                  <div className="badge badge-warning badge-lg font-bold">
                    {myRole.toUpperCase()}
                  </div>
                )}
              </div>
            </div>
            
            {myRole ? (
              <div className="min-h-[12rem]">
                <ControlsForRole role={myRole} />
              </div>
            ) : (
              <div className="text-center space-y-4 py-8">
                <div className="text-lg font-medium text-orange-700 flex items-center justify-center gap-2">
                  <Anchor className="w-5 h-5" />
                  No role selected
                </div>
                <div className="text-sm opacity-70">
                  Select a role to join your station.
                </div>
                <button
                  className="btn btn-warning btn-lg font-bold"
                  onClick={() => playerActions.goTo('role-select')}
                >
                  <Anchor className="w-4 h-4 mr-2" />Open Role Selection
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* 5. TEAM ACTIVITIES */}
        <details className="collapse collapse-arrow bg-base-100">
          <summary className="collapse-title font-medium">
            👥 Team Activities & Details
          </summary>
          <div className="collapse-content space-y-4 pt-2">
            <TeamRoster />
          </div>
        </details>
      </div>
    </div>
  );
};

export default GameView;
