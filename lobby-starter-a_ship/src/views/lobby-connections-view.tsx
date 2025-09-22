import { useLobbyContext } from '@/components/lobby/provider';
import { cn } from '@/utils';
import React from 'react';
import { useSnapshot } from 'valtio';

interface Props {
	className?: string;
}

const LobbyConnectionsView: React.FC<React.PropsWithChildren<Props>> = ({
	className
}) => {
	const { lobbyAwareness } = useLobbyContext();
	const lobbyConnections = useSnapshot(lobbyAwareness.proxy);

	// group connections by client id
	const lobbyClients = Object.values(lobbyConnections).reduce(
		(acc, connection) => {
			if (!acc[connection.clientId]) {
				acc[connection.clientId] = connection;
			}

			return acc;
		},
		{} as Record<string, { lastPing: number; clientId: string }>
	);

	return (
		<div
			className={cn(
				'container mx-auto flex justify-center p-4 lg:p-6',
				className
			)}
		>
			<div className="card bg-base-100 w-full max-w-screen-sm shadow-sm">
				<div className="card-body">
					<h2 className="card-title">Lobby connections example</h2>

					<div className="stats shadow">
						<div className="stat">
							<div className="stat-title">Players</div>
							<div className="stat-value">
								{Object.entries(lobbyClients).length}
							</div>
						</div>
					</div>
				</div>
			</div>
		</div>
	);
};

export default LobbyConnectionsView;
