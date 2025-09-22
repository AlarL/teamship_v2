import { kmClient } from '@/services/km-client';
import type { KokimokiStore } from '@kokimoki/app';
import type { LobbyState } from '../stores/lobby-store';

export function getLobbyActions(lobbyStore: KokimokiStore<LobbyState>) {
	return {
		async incrementNumberOfButtonPresses() {
			await kmClient.transact([lobbyStore], ([lobbyState]) => {
				lobbyState.numberOfButtonPresses += 1;
			});
		},

		async decrementNumberOfButtonPresses() {
			await kmClient.transact([lobbyStore], ([lobbyState]) => {
				lobbyState.numberOfButtonPresses -= 1;
			});
		}
	};
}
