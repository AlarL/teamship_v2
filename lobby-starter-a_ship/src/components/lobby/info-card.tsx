import useHostController from '@/hooks/useHostController';
import * as React from 'react';
import CopyButton from '../copy-button';

interface Props {
	lobbyId: string;
}

const LobbyInfoCard: React.FC<Props> = ({ lobbyId }) => {
	useHostController();

	return (
		<div className="flex w-full items-center justify-between">
			<div className="flex items-center gap-1">
				<span className="font-semibold">Share:</span>
				<div className="badge badge-primary">{lobbyId}</div>
				<CopyButton data={lobbyId} />
			</div>
		</div>
	);
};

export default LobbyInfoCard;
