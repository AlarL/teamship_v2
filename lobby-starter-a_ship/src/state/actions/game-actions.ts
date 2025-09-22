import { kmClient } from '@/services/km-client';
import type { LobbyStore } from '@/state/stores/lobby-store';
import type { LegendConfig, LobbyPresence, Role } from '@/types/teamship';
import { LEGENDS, MISSIONS } from '@/types/teamship';
import { LobbyContext } from '@/components/lobby/provider';
import React from 'react';

export function getGameActions(lobbyStore: LobbyStore) {
  return {
    setLegend(legendId: LegendConfig['id']) {
      return kmClient.transact([lobbyStore], ([s]) => {
        s.ship.legendId = legendId;
        const legend = LEGENDS[legendId];
        s.ship.distanceRemaining = legend.targetDistance;
      });
    },

    startCountdown(seconds = 3) {
      return kmClient.transact([lobbyStore], ([s]) => {
        s.ship.phase = 'countdown';
        s.ship.countdown = seconds;
      });
    },

    forceFinish() {
      return kmClient.transact([lobbyStore], ([s]) => {
        s.ship.phase = 'finished';
        s.ship.endTimestamp = kmClient.serverTimestamp();
      });
    },

    restartMission(countdownSeconds = 3) {
      return kmClient.transact([lobbyStore], ([s]) => {
        const ship = s.ship as any;
        const legend = LEGENDS[s.ship.legendId as keyof typeof LEGENDS];
        const mission = MISSIONS[s.ship.missionId || 'maiden_voyage'];
        // Increment attempts
        ship.attempts = (ship.attempts ?? 0) + 1;
        // Reset ship dynamics
        s.ship.phase = 'countdown';
        s.ship.countdown = countdownSeconds;
        s.ship.startTimestamp = 0;
        s.ship.endTimestamp = 0;
        s.ship.heading = 0;
        s.ship.angularVelocity = 0;
        s.ship.speed = 0;
        s.ship.health = 100;
        s.ship.water = 0;
        s.ship.x = 0;
        s.ship.y = 0;
        s.ship.vx = 0;
        s.ship.vy = 0;
        s.ship.heel = 0;
        s.ship.sailEff = 0;
        s.ship.distanceRemaining = legend.targetDistance;
        s.ship.coopScore = 100;
        s.ship.coopCurve = [];
        s.ship.penalties = { reefHits: 0, broaches: 0, overflow: 0 };
        s.ship.submitted = false;
        s.ship.lookoutBuffUntil = 0 as any;
        s.ship.missionPhaseIdx = 0;
        s.ship.missionPhaseName = mission?.phases?.[0]?.name || '';
        // Clear intents
        s.intents = {} as any;
      });
    }
  };
}

export function useIntents() {
  const ctx = React.useContext(LobbyContext);
  if (!ctx) throw new Error('useIntents must be used within a LobbyProvider');
  const { lobbyStore } = ctx;

  return React.useCallback(
    (patch: Partial<{
      role: Role;
      helmDelta: number;
      sailTrim: number;
      sailGustAt: number;
      lookoutAckAt: number;
      lookoutFocus: number;
    }>) => {
      return kmClient.transact([lobbyStore], ([s]) => {
        const me = s.intents[kmClient.connectionId] ?? {
          role: 'helmsman' as Role,
          updatedAt: 0,
          helmDelta: 0,
          sailTrim: 0.5
        };
        s.intents[kmClient.connectionId] = {
          ...me,
          ...patch,
          updatedAt: kmClient.serverTimestamp()
        };
      });
    },
    [lobbyStore]
  );
}

export function useLookoutSpot() {
  const ctx = React.useContext(LobbyContext);
  if (!ctx) throw new Error('useLookoutSpot must be used within a LobbyProvider');
  const { lobbyStore } = ctx;
  return React.useCallback(() => {
    return kmClient.transact([lobbyStore], ([s]) => {
      const now = kmClient.serverTimestamp();
      const me = s.intents[kmClient.connectionId] ?? { role: 'lookout', updatedAt: 0 } as any;
      s.intents[kmClient.connectionId] = {
        ...me,
        lookoutAckAt: now,
        updatedAt: now
      } as any;
    });
  }, [lobbyStore]);
}

export function useBailTap() {
  const ctx = React.useContext(LobbyContext);
  if (!ctx) throw new Error('useBailTap must be used within a LobbyProvider');
  const { lobbyStore } = ctx;
  return React.useCallback(() => {
    return kmClient.transact([lobbyStore], ([s]) => {
      const now = kmClient.serverTimestamp();
      const me = s.intents[kmClient.connectionId] ?? { role: 'bailer', updatedAt: 0 } as any;
      s.intents[kmClient.connectionId] = {
        ...me,
        bailTapAt2: me.bailTapAt1 ?? 0,
        bailTapAt1: now,
        updatedAt: now
      } as any;
    });
  }, [lobbyStore]);
}

export function useRowTap(side: 'L' | 'R') {
  const ctx = React.useContext(LobbyContext);
  if (!ctx) throw new Error('useRowTap must be used within a LobbyProvider');
  const { lobbyStore } = ctx;
  return React.useCallback(() => {
    return kmClient.transact([lobbyStore], ([s]) => {
      const now = kmClient.serverTimestamp();
      const me = s.intents[kmClient.connectionId] ?? { role: 'rower', updatedAt: 0 } as any;
      const patch: any = { ...me, updatedAt: now };
      if (side === 'L') {
        patch.rowLeftTapAt2 = me.rowLeftTapAt1 ?? 0;
        patch.rowLeftTapAt1 = now;
      } else {
        patch.rowRightTapAt2 = me.rowRightTapAt1 ?? 0;
        patch.rowRightTapAt1 = now;
      }
      s.intents[kmClient.connectionId] = patch;
    });
  }, [lobbyStore, side]);
}
