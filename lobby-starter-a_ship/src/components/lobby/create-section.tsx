import { playerActions } from '@/state/actions/player-actions';
import * as React from 'react';

const LobbyCreateSection: React.FC = () => {
	const [isCreating, setIsCreating] = React.useState(false);

	const handleCreateLobby = React.useCallback(async () => {
		setIsCreating(true);

		try {
			const code = await playerActions.createNewLobby();
			await playerActions.joinLobby(code);
		} catch (error) {
			console.error('Failed to create lobby:', error);
		} finally {
			setIsCreating(false);
		}
	}, []);

	return (
		<section className="space-y-4">
			<h2 className="card-title">Host new game</h2>
			<button
				className="btn btn-primary btn-lg w-full"
				onClick={handleCreateLobby}
				disabled={isCreating}
			>
				{isCreating ? (
					<>
						<span className="loading loading-spinner loading-sm" />
						Creating...
					</>
				) : (
					'Host'
				)}
			</button>
		</section>
	);
};

export default LobbyCreateSection;

