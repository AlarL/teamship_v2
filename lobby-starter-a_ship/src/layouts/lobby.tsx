import { useLobbyContext } from '@/components/lobby/provider';
import QuickRoleSwitcher from '@/components/quick-role-switcher';
import { useSnapshot } from 'valtio';
import { playerStore } from '@/state/stores/player-store';
import { playerActions } from '@/state/actions/player-actions';
import * as React from 'react';

const LobbyLayoutRoot: React.FC<React.PropsWithChildren> = ({ children }) => {
	const { lobbyConnected } = useLobbyContext();

	if (!lobbyConnected) {
		return (
			<div className="flex h-dvh flex-col items-center justify-center">
				<span className="loading loading-spinner loading-lg text-primary mb-4" />
				<span className="text-lg font-semibold">Connecting to lobby...</span>
			</div>
		);
	}

	return (
		<main className="bg-base-200 grid min-h-dvh grid-rows-[auto_1fr_auto]">
			{children}
		</main>
	);
};

const LobbyHeader: React.FC = () => {
	const { currentView } = useSnapshot(playerStore.proxy);
	const showRoleSwitcher = currentView === 'play';

	const handleExitClick = () => {
		playerActions.leaveLobby();
	};

	return (
		<header className="navbar bg-base-100 shadow-sm">
			<div className="container mx-auto flex flex-wrap items-center justify-between px-4 gap-4">
				<div className="font-bold">TeamShip</div>
				
				{showRoleSwitcher && (
					<div className="flex-1 flex justify-center">
						<QuickRoleSwitcher />
					</div>
				)}

				<button 
					className="btn btn-sm btn-outline text-error border-error hover:bg-error hover:text-white"
					onClick={handleExitClick}
					title="Exit to Lobby"
				>
					✕ Exit
				</button>
			</div>
		</header>
	);
};

const LobbyMain: React.FC<React.PropsWithChildren> = ({ children }) => {
	return <main className="flex items-center">{children}</main>;
};

const LobbyFooter: React.FC<React.PropsWithChildren> = ({ children }) => {
	return (
    <footer className="footer bg-base-100 text-base-content p-4">
			{children}
		</footer>
	);
};

const LobbyLayout = {
	Root: LobbyLayoutRoot,
	Header: LobbyHeader,
	Main: LobbyMain,
	Footer: LobbyFooter
};

export default LobbyLayout;
