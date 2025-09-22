import { z } from 'zod/v4';

export const themeVarMappings = [
	['--km-color-base-100', 'colorBase100'],
	['--km-color-base-200', 'colorBase200'],
	['--km-color-base-300', 'colorBase300'],
	['--km-color-base-content', 'colorBaseContent'],
	['--km-color-primary', 'colorPrimary'],
	['--km-color-primary-content', 'colorPrimaryContent'],
	['--km-color-secondary', 'colorSecondary'],
	['--km-color-secondary-content', 'colorSecondaryContent'],
	['--km-color-accent', 'colorAccent'],
	['--km-color-accent-content', 'colorAccentContent'],
	['--km-color-neutral', 'colorNeutral'],
	['--km-color-neutral-content', 'colorNeutralContent'],
	['--km-color-info', 'colorInfo'],
	['--km-color-info-content', 'colorInfoContent'],
	['--km-color-success', 'colorSuccess'],
	['--km-color-success-content', 'colorSuccessContent'],
	['--km-color-warning', 'colorWarning'],
	['--km-color-warning-content', 'colorWarningContent'],
	['--km-color-error', 'colorError'],
	['--km-color-error-content', 'colorErrorContent'],
	['--km-radius-selector', 'radiusSelector'],
	['--km-radius-field', 'radiusField'],
	['--km-radius-box', 'radiusBox'],
	['--km-size-selector', 'sizeSelector'],
	['--km-size-field', 'sizeField'],
	['--km-border', 'border'],
	['--km-depth', 'depth'],
	['--km-noise', 'noise']
] as const;

export const themeSchema = z.object({
	colorBase100: z
		.string()
		.default('oklch(100% 0 0)')
		.describe('Base surface color of page, used for blank backgrounds'),
	colorBase200: z
		.string()
		.default('oklch(97% 0 0)')
		.describe('Base color, darker shade, used to create elevations'),
	colorBase300: z
		.string()
		.default('oklch(92% 0 0)')
		.describe('Base color, even more darker shade, used for elevated surfaces'),
	colorBaseContent: z
		.string()
		.default('oklch(20% 0 0)')
		.describe('Foreground content color to use on base colors'),
	colorPrimary: z
		.string()
		.default('oklch(85% 0.199 91.936)')
		.describe('Primary brand color, the main color of your brand'),
	colorPrimaryContent: z
		.string()
		.default('oklch(42% 0.095 57.708)')
		.describe('Foreground content color to use on primary color'),
	colorSecondary: z
		.string()
		.default('oklch(75% 0.183 55.934)')
		.describe('Secondary brand color, optional secondary color of your brand'),
	colorSecondaryContent: z
		.string()
		.default('oklch(40% 0.123 38.172)')
		.describe('Foreground content color to use on secondary color'),
	colorAccent: z
		.string()
		.default('oklch(0% 0 0)')
		.describe('Accent brand color, optional accent color of your brand'),
	colorAccentContent: z
		.string()
		.default('oklch(100% 0 0)')
		.describe('Foreground content color to use on accent color'),
	colorNeutral: z
		.string()
		.default('oklch(37% 0.01 67.558)')
		.describe('Neutral dark color, for not-saturated parts of UI'),
	colorNeutralContent: z
		.string()
		.default('oklch(92% 0.003 48.717)')
		.describe('Foreground content color to use on neutral color'),
	colorInfo: z
		.string()
		.default('oklch(74% 0.16 232.661)')
		.describe('Info color, for informative/helpful messages'),
	colorInfoContent: z
		.string()
		.default('oklch(39% 0.09 240.876)')
		.describe('Foreground content color to use on info color'),
	colorSuccess: z
		.string()
		.default('oklch(76% 0.177 163.223)')
		.describe('Success color, for success/safe messages'),
	colorSuccessContent: z
		.string()
		.default('oklch(37% 0.077 168.94)')
		.describe('Foreground content color to use on success color'),
	colorWarning: z
		.string()
		.default('oklch(82% 0.189 84.429)')
		.describe('Warning color, for warning/caution messages'),
	colorWarningContent: z
		.string()
		.default('oklch(41% 0.112 45.904)')
		.describe('Foreground content color to use on warning color'),
	colorError: z
		.string()
		.default('oklch(70% 0.191 22.216)')
		.describe('Error color, for error/danger/destructive messages'),
	colorErrorContent: z
		.string()
		.default('oklch(39% 0.141 25.723)')
		.describe('Foreground content color to use on error color'),
	radiusSelector: z
		.string()
		.default('1rem')
		.describe(
			'Border radius for selectors (checkbox, toggle, badge). Preferred values: 0rem, 0.25rem, 0.5rem, 1rem, 2rem'
		),
	radiusField: z
		.string()
		.default('0.5rem')
		.describe(
			'Border radius for fields (button, input, select, tab). Preferred values: 0rem, 0.25rem, 0.5rem, 1rem, 2rem'
		),
	radiusBox: z
		.string()
		.default('1rem')
		.describe(
			'Border radius for boxes (card, modal, alert). Preferred values: 0rem, 0.25rem, 0.5rem, 1rem, 2rem'
		),
	sizeSelector: z
		.string()
		.default('0.25rem')
		.describe(
			'Base size of selectors (checkbox, toggle, badge). Default: 0.25rem. Use 0.28125 or 0.3125 for larger, 0.21875 or 0.1875 for smaller selectors'
		),
	sizeField: z
		.string()
		.default('0.25rem')
		.describe(
			'Base size of fields (button, input, select, tab). Default: 0.25rem. Use 0.28125 or 0.3125 for larger, 0.21875 or 0.1875 for smaller fields'
		),
	border: z
		.string()
		.default('1px')
		.describe(
			'Border width of all components. Default: 1px. Use 1.5px or 2px for thicker, 0.5px for thinner borders'
		),
	depth: z
		.enum(['0', '1'])
		.default('1')
		.describe(
			'Depth of all components, used for shadow. Only 0 or 1. Adds a shadow and subtle 3D depth effect'
		),
	noise: z
		.enum(['0', '1'])
		.default('0')
		.describe('Adds a subtle noise (grain) effect to components. Only 0 or 1.')
});
