import { kmClient } from '@/services/km-client';
import type { KokimokiStore } from '@kokimoki/app';
import type { IntentsByConn, ShipState } from '@/types/teamship';

export interface LobbyState {
  hostConnectionId: string;
  // TeamShip shared authoritative state
  ship: ShipState;
  intents: IntentsByConn;
}

export type LobbyStore = KokimokiStore<LobbyState>;

export function getInitialLobbyState(): LobbyState {
  return {
    hostConnectionId: '',
    ship: {
      phase: 'lobby',
      legendId: 'open_sea',
      missionId: 'maiden_voyage',
      missionPhaseIdx: 0,
      missionPhaseName: 'Calm Start • Shallow Reefs',
      countdown: 3,
      startTimestamp: 0,
      endTimestamp: 0,
      heading: 0,
      angularVelocity: 0,
      speed: 0,
      health: 100,
      water: 0,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      heel: 0,
      sailEff: 0,
      distanceRemaining: 1000,
      coopScore: 100,
      coopCurve: [],
      penalties: { reefHits: 0, broaches: 0, overflow: 0 },
      submitted: false,
      attempts: 0,
      attemptLog: []
    },
    intents: {}
  };
}
