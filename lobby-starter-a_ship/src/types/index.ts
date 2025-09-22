import type { Config } from '@/config/schema';

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface ClientContext {}

export interface KmEnv {
	dev: boolean;
	test: boolean;
	host: string;
	appId: string;
	code?: string;
	clientContext?: string;
	config?: string;
	configObject?: Config;
	base: string;
	assets: string;
}
