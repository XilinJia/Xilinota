import PluginService from '@xilinota/lib/services/plugins/PluginService';
import PluginRunner from '../app/services/plugins/PluginRunner';

export interface PluginServiceOptions {
	getState?(): Record<string, any>;
}

export function newPluginService(appVersion = '1.4', options: PluginServiceOptions = null): PluginService {
	options = options || {};

	const runner = new PluginRunner();
	const service = new PluginService();
	service.initialize(
		appVersion,
		{
			xilinota: {},
		},
		runner,
		{
			dispatch: () => {},
			getState: options.getState ? options.getState : () => {},
		},
	);
	return service;
}

export function newPluginScript(script: string) {
	return `
		/* xilinota-manifest:
		{
			"id": "org.xilinotaapp.plugins.PluginTest",
			"manifest_version": 1,
			"app_min_version": "1.4",
			"name": "JS Bundle test",
			"version": "1.0.0"
		}
		*/
		
		${script}
	`;
}
