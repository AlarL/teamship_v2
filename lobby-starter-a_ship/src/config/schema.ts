import { z } from 'zod/v4';
import { themeSchema } from './theme';

export const schema = z.object({
	// theme
	theme: themeSchema.describe(
		'Theme colors, variables and sizes. Variables are based on DaisyUI.'
	),

	// translations
	title: z.string().default('My Game'),
	welcomeMessageMd: z.string().default('# Welcome!\nThis is my awesome game.')
});

export type Config = z.infer<typeof schema>;
