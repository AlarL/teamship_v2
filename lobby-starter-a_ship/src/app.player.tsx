import * as React from 'react';
import { useSnapshot } from 'valtio';
import { devtools } from 'valtio/utils';
import LobbyInfoCard from './components/lobby/info-card';
import { LobbyProvider, useLobbyContext } from './components/lobby/provider';
import { config } from './config';
import useDocumentTitle from './hooks/useDocumentTitle';
import LobbyLayout from './layouts/lobby';
import { kmEnv } from './services/km-client';
import { playerActions } from './state/actions/player-actions';
import { playerStore } from './state/stores/player-store';
import CreateOrJoinLobbyView from './views/create-or-join-lobby';
import EnterNameView from './views/enter-name-view';
import GameView from './views/game-view';
import LegendView from './views/legend-view';
import ResultsView from './views/results-view';
import RoleSelectView from './views/role-select-view';

const FinishWatcher: React.FC = () => {
	const { lobbyStore } = useLobbyContext();
	const lobbySnapshot = useSnapshot(lobbyStore.proxy);
	const shipPhase = lobbySnapshot?.ship?.phase ?? null;
	const { currentView } = useSnapshot(playerStore.proxy);

	React.useEffect(() => {
		if (shipPhase === 'finished') {
			if (currentView === 'play') {
				return; // stay in play to show Game Over overlay
			}
			if (currentView !== 'results') {
				playerActions.goTo('results');
			}
			return;
		}

		if (
			(shipPhase === 'countdown' || shipPhase === 'playing') &&
			currentView === 'results'
		) {
			playerActions.goTo('play');
		}
	}, [shipPhase, currentView]);

	return null;
};

const App: React.FC = () => {
	const { title } = config;
	const { lobbyId, currentView } = useSnapshot(playerStore.proxy);

	useDocumentTitle(title);

	React.useEffect(() => {
		const unsubscribe = devtools(playerStore.proxy, {
			name: 'player-store',
			enabled: kmEnv.dev
		});

		return () => unsubscribe?.();
	}, []);

	if (currentView === 'enter-name') return <EnterNameView />;
	if (currentView === 'create-or-join' && lobbyId === null)
		return <CreateOrJoinLobbyView />;

	return (
		<LobbyProvider lobbyId={lobbyId}>
			<FinishWatcher />
			<LobbyLayout.Root>
				<LobbyLayout.Header />
				<LobbyLayout.Main>
					{currentView === 'role-select' && <RoleSelectView />}
					{currentView === 'legend' && <LegendView />}
					{currentView === 'play' && <GameView />}
					{currentView === 'results' && <ResultsView />}
					{/* Spectator removed */}

					{/* Debug: show current state if no view matches */}
					{!['role-select', 'legend', 'play', 'results'].includes(
						currentView
					) && (
						<div className="p-4 text-center">
							<div className="alert alert-warning">
								<span>
									Debug: Unknown view "{currentView}" with lobbyId "{lobbyId}"
								</span>
							</div>
							<button
								className="btn btn-primary mt-4"
								onClick={() => playerActions.goTo('role-select')}
							>
								Go to Role Select
							</button>
						</div>
					)}
				</LobbyLayout.Main>
				<LobbyLayout.Footer>
					<LobbyInfoCard lobbyId={lobbyId} />
				</LobbyLayout.Footer>
			</LobbyLayout.Root>
		</LobbyProvider>
	);
};

export default App;
