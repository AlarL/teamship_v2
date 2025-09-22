import { kmClient } from '@/services/km-client';

export interface PlayerState {
	lobbyId: string | null;
	displayName: string;
	currentView:
		| 'enter-name'
		| 'create-or-join'
		| 'role-select'
		| 'legend'
		| 'play'
		| 'results';
}

const initialState: PlayerState = {
	lobbyId: null,
	displayName: '',
	currentView: 'enter-name'
};

export const playerStore = kmClient.localStore<PlayerState>(
	'player',
	initialState
);
