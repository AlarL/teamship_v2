import React from 'react';

interface TimeDisplayProps {
	ms: number;
	className?: string;
}

function pad(num: number) {
	return num.toString().padStart(2, '0');
}

export const TimeDisplay: React.FC<TimeDisplayProps> = ({ ms, className }) => {
	const totalSeconds = Math.floor(ms / 1000);
	const hrs = Math.floor(totalSeconds / 3600);
	const mins = Math.floor((totalSeconds % 3600) / 60);
	const secs = totalSeconds % 60;

	const classes = ['countdown', 'font-mono', 'text-4xl', className]
		.filter(Boolean)
		.join(' ');
	const varStyle = (n: number) =>
		({ ['--value' as any]: n }) as React.CSSProperties;

	return (
		<span className={classes}>
			<span style={varStyle(hrs)} aria-live="polite" aria-label={pad(hrs)}>
				{pad(hrs)}
			</span>
			:
			<span style={varStyle(mins)} aria-live="polite" aria-label={pad(mins)}>
				{pad(mins)}
			</span>
			:
			<span style={varStyle(secs)} aria-live="polite" aria-label={pad(secs)}>
				{pad(secs)}
			</span>
		</span>
	);
};
