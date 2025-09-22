import { playerActions } from '@/state/actions/player-actions';
import { cn } from '@/utils';
import * as React from 'react';

const LobbyJoinSection: React.FC = () => {
	const [joinCode, setJoinCode] = React.useState('');
	const [joinError, setJoinError] = React.useState<string | null>(null);
	const [isJoining, setIsJoining] = React.useState(false);

	const isDisabled = joinCode.trim().length < 7 || isJoining;

	const handleInputChange = React.useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const value = e.target.value.toUpperCase();
			setJoinCode(value);
		},
		[]
	);

	const handleJoinLobby = React.useCallback(async () => {
		if (!joinCode.trim()) return;

		setIsJoining(true);
		setJoinError(null);

		try {
			await playerActions.joinLobby(joinCode);
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : 'Failed to join lobby.';

			setJoinError(errorMessage);
		} finally {
			setIsJoining(false);
		}
	}, [joinCode]);

	const handleKeyDown = React.useCallback(
		(e: React.KeyboardEvent) => {
			if (isDisabled || e.key !== 'Enter') return;

			handleJoinLobby();
		},
		[isDisabled, handleJoinLobby]
	);

	return (
		<section className="space-y-4">
			<h2 className="card-title">Join existing game</h2>
			<div className="grid w-full grid-cols-[1fr_auto] gap-2">
				<input
					className={cn('input input-lg', { 'input-error': !!joinError })}
					type="text"
					value={joinCode}
					onChange={handleInputChange}
					onKeyDown={handleKeyDown}
					placeholder="Enter code..."
					maxLength={7}
					autoCapitalize="characters"
					autoCorrect="off"
					spellCheck={false}
					disabled={isJoining}
				/>

				<button
					className="btn btn-lg btn-primary"
					onClick={handleJoinLobby}
					disabled={isDisabled}
				>
					{isJoining ? (
						<>
							<span className="loading loading-spinner loading-sm" />
							Join
						</>
					) : (
						'Join'
					)}
				</button>
			</div>

			{joinError && (
				<div role="alert" className="alert alert-error">
					<span>{joinError}</span>
				</div>
			)}
		</section>
	);
};

export default LobbyJoinSection;
