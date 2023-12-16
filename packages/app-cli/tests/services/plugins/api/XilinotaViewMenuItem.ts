import KeymapService from '@xilinota/lib/services/KeymapService';
import { setupDatabaseAndSynchronizer, switchClient, afterEachCleanUp } from '@xilinota/lib/testing/test-utils';
import { newPluginScript, newPluginService } from '../../../testUtils';

describe('XilinotaViewMenuItem', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	afterEach(async () => {
		await afterEachCleanUp();
	});

	test('should register commands with the keymap service', async () => {
		const service = newPluginService();

		KeymapService.instance().initialize();

		const pluginScript = newPluginScript(`			
			xilinota.plugins.register({
				onStart: async function() {
					await xilinota.commands.register({
						name: 'testCommand1',
						label: 'My Test Command 1',
						iconName: 'fas fa-music',
						execute: async () => {},
					});

					await xilinota.views.menuItems.create('myMenuItem1', 'testCommand1', 'tools', { accelerator: 'CmdOrCtrl+Alt+Shift+B' });

					await xilinota.commands.register({
						name: 'testCommand2',
						label: 'My Test Command 2',
						iconName: 'fas fa-music',
						execute: async () => {},
					});

					await xilinota.views.menuItems.create('myMenuItem2', 'testCommand2', 'tools');
				},
			});
		`);

		const plugin = await service.loadPluginFromJsBundle('', pluginScript);
		await service.runPlugin(plugin);

		const commandNames = KeymapService.instance().getCommandNames();

		expect(commandNames.includes('testCommand1')).toBe(true);
		expect(commandNames.includes('testCommand2')).toBe(true);

		await service.destroy();
	});

});
