export type Role = 'helmsman' | 'sail' | 'bailer' | 'rower' | 'lookout';

export interface LobbyPresence {
  displayName: string;
  role: Role | null;
}

export interface LegendConfig {
  id: 'open_sea' | 'crosswind_reefs' | 'storm_run' | 'sinking_ship';
  name: string;
  seaDrag: number; // higher = slower turns
  windDir: number; // 0..359
  windForce: number; // 0..1
  windVariance: number; // 0..1 variability
  currentBias: number; // deg/s drift
  reefSeverity: number; // extra water ingress factor
  maxDurationMs: number;
  targetDistance: number; // meters abstract
}

export const LEGENDS: Record<LegendConfig['id'], LegendConfig> = {
  open_sea: {
    id: 'open_sea',
    name: 'Open Sea (Calm)',
    seaDrag: 0.85,
    windDir: 60,
    windForce: 0.35,
    windVariance: 0.1,
    currentBias: 0.0,
    reefSeverity: 0,
    maxDurationMs: 5 * 60 * 1000,
    targetDistance: 1000
  },
  crosswind_reefs: {
    id: 'crosswind_reefs',
    name: 'Crosswind Reefs',
    seaDrag: 0.7,
    windDir: 90,
    windForce: 0.55,
    windVariance: 0.2,
    currentBias: 0.05,
    reefSeverity: 0.5,
    maxDurationMs: 5 * 60 * 1000,
    targetDistance: 1400
  },
  storm_run: {
    id: 'storm_run',
    name: 'Storm Run',
    seaDrag: 0.6,
    windDir: 120,
    windForce: 0.9,
    windVariance: 0.35,
    currentBias: 0.08,
    reefSeverity: 0.2,
    maxDurationMs: 5 * 60 * 1000,
    targetDistance: 1200
  },
  sinking_ship: {
    id: 'sinking_ship',
    name: 'Sinking Ship Challenge',
    seaDrag: 0.9,
    windDir: 45,
    windForce: 0.45,
    windVariance: 0.3,
    currentBias: 0.03,
    reefSeverity: 0.8, // High reef damage
    maxDurationMs: 5 * 60 * 1000, // 5 minutes for focused gameplay
    targetDistance: 800 // Shorter distance but harder to reach
  }
};

export type AttemptReason = 'success' | 'timeout' | 'overflow' | 'dead';

export interface AttemptStats {
  maxWater?: number;
  minHealth?: number;
  avgCoopScore?: number;
  activePlayers?: number;
  endHealth?: number;
  endWater?: number;
  durationMs?: number;
}

export interface AttemptTeamPerformance {
  mostActive?: string;
  bestResponder?: string;
  totalSwitches?: number;
}

export interface AttemptLogEntry {
  at: number;
  finishedAt: number;
  distLeft: number;
  reason: AttemptReason;
  stats?: AttemptStats;
  teamPerf?: AttemptTeamPerformance;
}

export interface IntentsByConn {
  [connectionId: string]: {
    role: Role;
    updatedAt: number; // server timestamp
    // Helmsman
    helmDelta: number; // -1..1 left/right
    // Sail Trimmer
    sailTrim: number; // 0..1
    sailGustAt?: number; // timestamp of last gust tap
    // Bailer
    bailTapAt1?: number; // last tap
    bailTapAt2?: number; // previous tap
    // Rower
    rowLeftTapAt1?: number;
    rowLeftTapAt2?: number;
    rowRightTapAt1?: number;
    rowRightTapAt2?: number;
    // Lookout
    lookoutAckAt?: number; // last spot press
    lookoutFocus?: number; // 0..1 extends buff
  };
}

export interface ShipState {
  phase: 'lobby' | 'countdown' | 'playing' | 'finished';
  legendId: LegendConfig['id'];
  missionId?: string; // mission identifier
  missionPhaseIdx?: number; // current phase index
  missionPhaseName?: string; // current phase label
  // Dynamic situation events
  eventName?: 'gust_squall' | 'flood_spike' | 'cross_set' | 'broach_risk' | 'hull_breach' | 'sudden_wind_shift' | 'steering_failure' | null;
  eventUntil?: number; // server time when event ends
  lastEventAt?: number; // last event start time
  countdown: number; // seconds remaining during countdown
  startTimestamp: number; // server time when playing started
  endTimestamp: number; // when finished
  // Ship dynamics
  heading: number; // 0..359
  angularVelocity: number; // deg/s
  speed: number; // 0..10
  health: number; // 0..100
  water: number; // 0..100
  x: number; // position x (abstract meters)
  y: number; // position y
  vx: number; // velocity x
  vy: number; // velocity y
  heel: number; // 0..100 roll/heel
  sailEff: number; // 0..1 instantaneous
  distanceRemaining: number; // counts down to 0
  coopScore: number; // 0..100
  coopCurve?: Array<[number, number]>; // [serverTime, score]
  penalties?: { reefHits: number; broaches: number; overflow: number };
  submitted?: boolean; // leaderboard submitted
  // Team buffs
  lookoutBuffUntil?: number; // if set, team-wide “clear window” buff active until this server time
  // Attempts log
  attempts?: number;
  attemptLog?: AttemptLogEntry[];
  // Team analytics for post-game analysis
  teamAnalytics?: {
    // Individual player tracking
    playerStats?: { [connectionId: string]: {
      displayName?: string;
      totalActiveTime: number; // ms spent actively playing
      rolesSwitched: number; // how many times they changed roles
      rolesPlayedLog: Array<{ role: Role | null; startTime: number; endTime?: number }>; // detailed role timeline
      actionsPerformed: number; // total button presses/inputs
      effectivenessScore: number; // 0-100 based on action timing and quality
      criticalMoments: Array<{ time: number; event: string; responded: boolean; responseTime?: number }>; // key events and responses
    }};
    // Team coordination metrics
    teamwork: {
      simultaneousActions: number; // times multiple people acted at once during events
      roleBalance: number; // 0-100 how evenly roles were distributed
      communicationScore: number; // based on coordinated responses to events
      criticalFailures: Array<{ time: number; event: string; reason: string }>; // moments when team failed to respond
    };
    // Mission progression analytics
    progression: {
      phasesCompleted: number;
      averageHealthPerPhase: number[];
      averageWaterPerPhase: number[];
      eventsEncountered: number;
      eventsHandledWell: number;
      timeSpentInDanger: number; // ms with health<30 or water>80
    };
  }; 
}

// Mission system
export interface MissionPhase {
  t: number; // time (ms since start) when this phase becomes active
  name: string; // short label to show in HUD
  modifiers: {
    windForce?: number; // multiplier (e.g., 1.2)
    windVariance?: number; // multiplier (e.g., 1.5)
    currentBias?: number; // additive (deg/s)
    reefSeverity?: number; // additive (0..1)
    ingress?: number; // additive to base ingress per tick
    heelRisk?: number; // multiplier to heel target (e.g., 1.2)
  };
}

export interface Mission {
  id: string;
  name: string;
  durationMs: number; // target run duration
  phases: MissionPhase[]; // must be sorted by t ascending
}

export const MISSIONS: Record<string, Mission> = {
  maiden_voyage: {
    id: 'maiden_voyage',
    name: 'Maiden Voyage',
    durationMs: 5 * 60 * 1000,
    phases: [
      { t: 0, name: 'Calm Start', modifiers: { windForce: 0.9, windVariance: 0.7, reefSeverity: 0.05 } },
      { t: 15_000, name: 'Gentle Breeze', modifiers: { windForce: 1.0, windVariance: 0.8, reefSeverity: 0.1 } },
      { t: 30_000, name: 'Light Chop', modifiers: { ingress: 0.03, reefSeverity: 0.2, windForce: 1.1 } },
      { t: 60_000, name: 'Steady Wind', modifiers: { windForce: 1.2, windVariance: 1.0, heelRisk: 1.1 } },
      { t: 90_000, name: 'Cross Current', modifiers: { currentBias: 0.05, windForce: 1.25 } },
      { t: 120_000, name: 'Moderate Seas', modifiers: { reefSeverity: 0.4, ingress: 0.04, windVariance: 1.2 } },
      { t: 160_000, name: 'Rising Wind', modifiers: { windForce: 1.4, windVariance: 1.3, heelRisk: 1.2 } },
      { t: 200_000, name: 'Squall Approach', modifiers: { windForce: 1.5, windVariance: 1.4, heelRisk: 1.25, ingress: 0.05 } },
      { t: 240_000, name: 'Storm Building', modifiers: { windForce: 1.6, windVariance: 1.5, heelRisk: 1.3, reefSeverity: 0.5 } },
      { t: 270_000, name: 'Final Challenge', modifiers: { windForce: 1.65, windVariance: 1.6, heelRisk: 1.35, reefSeverity: 0.6 } }
    ]
  },
  channel_dash: {
    id: 'channel_dash',
    name: 'Channel Dash',
    durationMs: 5 * 60 * 1000,
    phases: [
      { t: 0, name: 'Steady Start', modifiers: { windForce: 1.0 } },
      { t: 22_000, name: 'Channel Entry', modifiers: { reefSeverity: 0.2, ingress: 0.02 } },
      { t: 45_000, name: 'Beam Wind', modifiers: { windForce: 1.15, windVariance: 1.1 } },
      { t: 75_000, name: 'First Narrows', modifiers: { currentBias: 0.06, reefSeverity: 0.3 } },
      { t: 105_000, name: 'Mid Channel', modifiers: { windVariance: 1.3, ingress: 0.03 } },
      { t: 140_000, name: 'Reef Section', modifiers: { reefSeverity: 0.5, ingress: 0.04 } },
      { t: 175_000, name: 'Wind Funnel', modifiers: { windForce: 1.35, heelRisk: 1.2 } },
      { t: 210_000, name: 'Gusty Stretch', modifiers: { windForce: 1.4, windVariance: 1.4, heelRisk: 1.25 } },
      { t: 240_000, name: 'Channel Exit', modifiers: { windForce: 1.45, windVariance: 1.5, currentBias: 0.08 } },
      { t: 270_000, name: 'Final Sprint', modifiers: { windForce: 1.5, windVariance: 1.6, heelRisk: 1.3 } }
    ]
  },
  survival_challenge: {
    id: 'survival_challenge',
    name: 'Survival Challenge',
    durationMs: 5 * 60 * 1000,
    phases: [
      { t: 0, name: 'Initial Damage', modifiers: { ingress: 0.08, reefSeverity: 0.3 } },
      { t: 30_000, name: 'Water Rising', modifiers: { ingress: 0.12, reefSeverity: 0.4, windForce: 1.1 } },
      { t: 60_000, name: 'Hull Stress', modifiers: { ingress: 0.15, heelRisk: 1.2, windVariance: 1.3 } },
      { t: 90_000, name: 'Structural Issues', modifiers: { ingress: 0.18, reefSeverity: 0.6, windForce: 1.25 } },
      { t: 120_000, name: 'Critical State', modifiers: { ingress: 0.22, heelRisk: 1.3, windVariance: 1.4 } },
      { t: 150_000, name: 'Emergency Measures', modifiers: { ingress: 0.26, reefSeverity: 0.7, windForce: 1.35 } },
      { t: 180_000, name: 'Ship Failing', modifiers: { ingress: 0.30, heelRisk: 1.4, windVariance: 1.6 } },
      { t: 210_000, name: 'Desperate Times', modifiers: { ingress: 0.34, reefSeverity: 0.8, windForce: 1.45 } },
      { t: 240_000, name: 'Final Minutes', modifiers: { ingress: 0.38, heelRisk: 1.5, windVariance: 1.7 } },
      { t: 270_000, name: 'Last Chance', modifiers: { ingress: 0.42, reefSeverity: 0.9, windForce: 1.55 } }
    ]
  }
};
