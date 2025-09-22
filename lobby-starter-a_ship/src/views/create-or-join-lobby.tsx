import LobbyCreateSection from '@/components/lobby/create-section';
import LobbyJoinSection from '@/components/lobby/join-section';
import { cn } from '@/utils';
import * as React from 'react';

interface CreateOrJoinLobbyViewProps {
	className?: string;
}

const CreateOrJoinLobbyView: React.FC<CreateOrJoinLobbyViewProps> = ({
	className
}) => {
	return (
		<div
			className={cn('grid min-h-dvh place-items-center p-4 lg:p-6', className)}
		>
			<div className="card bg-base-100 max-w-96 shadow-sm">
				<div className="card-body space-y-6">
					<LobbyCreateSection />
					<div className="divider">OR</div>
					<LobbyJoinSection />
				</div>
			</div>
		</div>
	);
};

export default CreateOrJoinLobbyView;
