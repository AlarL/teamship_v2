import { kmClient } from '@/services/km-client';
import { generateLobbyCode } from '@/utils/lobby-code';
import { playerStore, type PlayerState } from '../stores/player-store';
import { LobbyContext } from '@/components/lobby/provider';
import type { LobbyPresence } from '@/types/teamship';
import React from 'react';

export const playerActions = {
	setDisplayName(name: string) {
		return kmClient.transact([playerStore], ([playerState]) => {
			playerState.displayName = name.trim();
		});
	},

	goTo(view: PlayerState['currentView']) {
		return kmClient.transact([playerStore], ([playerState]) => {
			playerState.currentView = view;
		});
	},
	async createNewLobby() {
		const formattedCode = generateLobbyCode();

		await kmClient.upsertLeaderboardEntry(formattedCode, 'desc', 0, {}, {});

		return formattedCode;
	},

	async joinLobby(code: string) {
		const formattedCode = code.trim().toUpperCase();

		if (!/^([A-Z]{3}-\d{3})$/.test(formattedCode)) {
			throw new Error('Invalid code format. Use e.g. ABC-123');
		}

		// If the lobby exists there will be at least one leaderboard entry
		const lobbyLeaderboard = await kmClient.listLeaderboardEntries(
			formattedCode,
			'desc'
		);

		if (!lobbyLeaderboard.total) {
			throw new Error('Lobby not found.');
		}

		// Update player's lobby id and go to role selection
		await kmClient.transact([playerStore], ([playerState]) => {
			playerState.lobbyId = formattedCode;
			playerState.currentView = 'role-select';
		});
	},

	async leaveLobby() {
		await kmClient.transact([playerStore], ([playerState]) => {
			playerState.lobbyId = null;
			playerState.currentView = 'create-or-join';
		});
	},

	async setCurrentView(view: PlayerState['currentView']) {
		await kmClient.transact([playerStore], ([playerState]) => {
			playerState.currentView = view;
		});
	}
};

// Awareness helpers (hook usage inside components)
export function useSetPresence() {
    const ctx = React.useContext(LobbyContext);
    if (!ctx) throw new Error('useSetPresence must be used within a LobbyProvider');
    const { lobbyAwareness } = ctx;
    return React.useCallback(
        (presence: Partial<LobbyPresence>) => {
            kmClient.transact([lobbyAwareness], ([aw]) => {
                const wrapper = (aw as any)[kmClient.connectionId] ?? {
                    clientId: kmClient.connectionId,
                    lastPing: Date.now(),
                    data: { displayName: '', role: null } as LobbyPresence
                };
                const current = wrapper.data as LobbyPresence;
                (aw as any)[kmClient.connectionId] = {
                    ...wrapper,
                    data: {
                        displayName: presence.displayName ?? current.displayName,
                        role: (presence as any).role ?? current.role
                    }
                };
            });
        },
        [lobbyAwareness]
    );
}
