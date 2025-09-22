import { kmClient, kmEnv } from '@/services/km-client';
import React, { type ReactNode } from 'react';
import { themeVarMappings, type Config } from '../config';

interface AppImports {
	player: () => Promise<{ default: React.ComponentType }>;
	dev: () => Promise<{
		default: React.ComponentType<{ nPlayerWindows: number }>;
	}>;
}

interface LaunchOptions {
	nPlayerWindows: number;
}

async function waitForSubscriptions(): Promise<void> {
	const startTime = Date.now();
	await new Promise<void>((resolve) => {
		let checks = 0;
		const checkInterval = setInterval(() => {
			let allJoined = true;

			// eslint-disable-next-line @typescript-eslint/ban-ts-comment
			// @ts-ignore
			for (const subscription of kmClient._subscriptionsByName.values()) {
				if (!subscription.joined) {
					allJoined = false;
					break;
				}
			}

			if (allJoined || ++checks > 100) {
				clearInterval(checkInterval);
				resolve();
			}
		}, 10);
	});

	if (!kmEnv.test) {
		const time = Date.now() - startTime;
		if (time < 3000) {
			await new Promise<void>((resolve) => setTimeout(resolve, 3000 - time));
		}
	}
}

function setupTheme(config: Config): void {
	if (config.theme) {
		themeVarMappings.forEach(([cssVar, configKey]) => {
			const value = config.theme?.[configKey];
			if (value) {
				document.documentElement.style.setProperty(cssVar, value);
			}
		});
	}
}

async function prepareComponent(
	config: Config,
	appImports: AppImports,
	renderComponent: (component: ReactNode) => void
): Promise<void> {
	let App: React.ComponentType = (await appImports.player()).default;

	await waitForSubscriptions();
	document.getElementById('connecting')?.remove();
	setupTheme(config);
	renderComponent(<App />);
}

export async function launchApp(
	config: Config,
	appImports: AppImports,
	renderComponent: (component: ReactNode) => void,
	options: LaunchOptions = { nPlayerWindows: 3 }
): Promise<void> {
	if (!kmEnv.dev) {
		kmClient.connect().then(async () => {
			if (kmEnv.test && kmEnv.clientContext) {
				// eslint-disable-next-line @typescript-eslint/ban-ts-comment
				// @ts-ignore
				kmClient._clientContext = JSON.parse(kmEnv.clientContext);
			}

			await prepareComponent(config, appImports, renderComponent);
		});

		if (kmEnv.test) {
			setTimeout(() => {
				window.postMessage({ clientKey: 'test' }, '*');
			});
		}
		return;
	}

	console.log('URL:', window.location.href);

	const url = new URL(window.location.href);
	const key = url.searchParams.get('key');
	const contextBase64 = url.searchParams.get('context');

	if (!key) {
		const Dev = (await appImports.dev()).default;
		document.getElementById('connecting')?.remove();
		renderComponent(<Dev nPlayerWindows={options.nPlayerWindows} />);
	} else {
		console.log = console.log.bind(console, `[${key}]`);

		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		kmClient._clientTokenKey = `KM_TOKEN/${key}`;

		await kmClient.connect();

		const context = contextBase64 ? JSON.parse(atob(contextBase64)) : {};
		// eslint-disable-next-line @typescript-eslint/ban-ts-comment
		// @ts-ignore
		kmClient._clientContext = context;

		await prepareComponent(config, appImports, renderComponent);
	}
}
