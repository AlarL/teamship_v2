import { config } from '@/config';
import { cn } from '@/utils';
import React from 'react';
import Markdown from 'react-markdown';

interface Props {
	className?: string;
}

const WelcomeMessageView: React.FC<React.PropsWithChildren<Props>> = ({
	className
}) => {
	return (
		<div
			className={cn(
				'container mx-auto flex justify-center p-4 lg:p-6',
				className
			)}
		>
			<div className="card bg-base-100 w-full max-w-screen-sm shadow-sm">
				<div className="card-body prose">
					<Markdown>{config.welcomeMessageMd}</Markdown>
				</div>
			</div>
		</div>
	);
};

export default WelcomeMessageView;
