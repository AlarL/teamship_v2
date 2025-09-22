import { useLobbyContext } from '@/components/lobby/provider';
import { TimeDisplay } from '@/components/time-display';
import useServerTimer from '@/hooks/useServerTime';
import { getLobbyActions } from '@/state/actions/lobby-actions';
import { cn } from '@/utils';
import React from 'react';
import { useSnapshot } from 'valtio';

interface Props {
	className?: string;
}

const LobbySharedStateView: React.FC<React.PropsWithChildren<Props>> = ({
	className
}) => {
	const { lobbyConnected, lobbyStore } = useLobbyContext();
	const { startTimestamp, numberOfButtonPresses } = useSnapshot(
		lobbyStore.proxy
	);
	const serverTime = useServerTimer();
	const lobbyActions = getLobbyActions(lobbyStore);

	if (!lobbyConnected) {
		return (
			<div className="grid h-dvh w-full place-items-center gap-4 text-center">
				<div className="flex flex-col items-center gap-4">
					<span className="loading loading-spinner loading-lg" />
					<span className="text-lg font-semibold">Connecting to lobby...</span>
				</div>
			</div>
		);
	}

	return (
		<div
			className={cn(
				'container mx-auto flex justify-center p-4 lg:p-6',
				className
			)}
		>
			<div className="card bg-base-100 w-full max-w-screen-sm shadow-sm">
				<div className="card-body">
					<h2 className="card-title">Lobby shared state example</h2>
					<div className="mt-4 grid gap-4">
						<div className="stats shadow">
							<div className="stat">
								<div className="stat-title">Time elapsed</div>
								<div className="stat-value">
									<TimeDisplay
										ms={serverTime - startTimestamp}
										className="font-mono"
									/>
								</div>
							</div>

							<div className="stat">
								<div className="stat-title">Button presses</div>
								<div className="stat-value">{numberOfButtonPresses}</div>
							</div>
						</div>

						<button
							className="btn btn-primary"
							onClick={lobbyActions.incrementNumberOfButtonPresses}
						>
							Increment
						</button>

						<button
							className="btn"
							onClick={lobbyActions.decrementNumberOfButtonPresses}
						>
							Decrement
						</button>
					</div>
				</div>
			</div>
		</div>
	);
};

export default LobbySharedStateView;
