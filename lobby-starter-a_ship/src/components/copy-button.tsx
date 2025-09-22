import { cn } from '@/utils';
import * as React from 'react';

const COPY_TIMEOUT = 2000;

interface CopyButtonProps {
	data: string;
	className?: string;
}

const CopyButton: React.FC<CopyButtonProps> = ({ data, className }) => {
	const [copied, setCopied] = React.useState(false);

	const handleCopy = React.useCallback(async () => {
		if (!data.length || copied) return;

		try {
			await navigator.clipboard.writeText(data);
			setCopied(true);
			setTimeout(() => setCopied(false), COPY_TIMEOUT);
		} catch (error) {
			console.error('Failed to copy text:', error);
		}
	}, [data, copied]);

	return (
		<div className="flex items-center gap-2">
			<button
				className={cn(
					'btn btn-outline btn-xs text-primary border-primary hover:bg-primary hover:text-base-100 px-2 py-1 font-semibold transition-all duration-150',
					copied && 'text-success border-success hover:bg-success',
					className
				)}
				title="Copy code"
				disabled={!data.length}
				onClick={handleCopy}
			>
				{copied ? 'Copied!' : 'Copy'}
			</button>
		</div>
	);
};

export default CopyButton;

