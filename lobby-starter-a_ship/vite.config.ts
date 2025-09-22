import { kokimokiKitPlugin } from '@kokimoki/kit';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';
import { defineConfig } from 'vite';
import topLevelAwait from 'vite-plugin-top-level-await';
import wasm from 'vite-plugin-wasm';
import { schema } from './src/config/schema';

export default defineConfig({
	plugins: [
		tailwindcss(),
		react(),
		wasm(),
		topLevelAwait(),
		kokimokiKitPlugin({
			conceptId: '',
			schema,
			deployCodes: [
				{
					name: 'player',
					description: 'Link for players',
					clientContext: {}
				}
			],
			defaultProjectConfigPath: './default.config.yaml',
			defaultProjectStylePath: './kokimoki.style.css'
		})
	],
	resolve: {
		alias: {
			'@': resolve(process.cwd(), './src')
		}
	},
	experimental: {
		renderBuiltUrl(filename, { hostType }) {
			if (hostType === 'js') {
				return {
					runtime: `window.__toAssetsUrl(${JSON.stringify(filename)})`
				};
			}

			return { relative: true };
		}
	}
});
