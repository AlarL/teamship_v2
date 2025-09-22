import type { AttemptReason } from '@/types/teamship';

export type AttemptCopy = {
	title: string;
	body: string;
	tone: 'success' | 'warning' | 'error';
	emoji: string;
};

export const ATTEMPT_COPY: Record<AttemptReason, AttemptCopy> = {
	success: {
		title: 'Mission Complete',
		body: 'Your coordination paid off — take a breather before sailing again.',
		tone: 'success',
		emoji: '🎉'
	},
	timeout: {
		title: 'Time Ran Out',
		body: 'The destination was just out of reach. Try tightening teamwork for another run.',
		tone: 'warning',
		emoji: '⏰'
	},
	overflow: {
		title: 'Laev uppus',
		body: 'Laev täitus veega. Rohkem bailereid ja kiirem reageerimine hoiavad selle pinnal.',
		tone: 'error',
		emoji: '🌊'
	},
	dead: {
		title: 'Laev uppus',
		body: 'Kere andis järele. Jälgige kriitilisi hoiatusi ja hoidke meeskond aktiivsena.',
		tone: 'error',
		emoji: '💥'
	}
};

export function getAttemptCopy(reason: AttemptReason): AttemptCopy {
	return ATTEMPT_COPY[reason];
}

export function describeAttemptOutcome(reason: AttemptReason, distLeft: number): string {
	switch (reason) {
		case 'timeout':
			return distLeft > 500
				? 'Team moved too slowly — tighten coordination.'
				: 'Almost there — needed a little more time.';
		case 'overflow':
			return 'Ship filled with water — bailers needed quicker support.';
		case 'dead':
			return 'Hull damage sank the ship — react faster to critical warnings.';
		default:
			return 'Excellent teamwork! Mission completed successfully.';
	}
}
