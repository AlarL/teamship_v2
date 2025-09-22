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
		title: 'Ship Flooded',
		body: 'The ship filled with water. More bailers and faster reactions are needed to keep it afloat.',
		tone: 'error',
		emoji: '🌊'
	},
	dead: {
		title: 'Ship Wrecked',
		body: 'The hull gave way. Monitor critical warnings and keep the team active.',
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
