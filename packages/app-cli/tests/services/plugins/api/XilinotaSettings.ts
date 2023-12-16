import Setting from '@xilinota/lib/models/Setting';
import { waitForFolderCount, setupDatabaseAndSynchronizer, switchClient, afterEachCleanUp } from '@xilinota/lib/testing/test-utils';
import Folder from '@xilinota/lib/models/Folder';
import { newPluginScript, newPluginService } from '../../../testUtils';

describe('XilinotaSettings', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	afterEach(async () => {
		await afterEachCleanUp();
	});

	test('should listen to setting change event', async () => {
		const service = newPluginService();

		const pluginScript = newPluginScript(`
			xilinota.plugins.register({
				onStart: async function() {
					await xilinota.settings.registerSettings({
						'myCustomSetting1': {
							value: 1,
							type: 1,
							public: true,
							label: 'My Custom Setting 1',
						},
						'myCustomSetting2': {
							value: 2,
							type: 1,
							public: true,
							label: 'My Custom Setting 2',
						}
					})

					xilinota.settings.onChange((event) => {
						xilinota.data.post(['folders'], null, { title: JSON.stringify(event.keys) });
					});
				},
			});
		`);

		const plugin = await service.loadPluginFromJsBundle('', pluginScript);
		await service.runPlugin(plugin);

		Setting.setValue('plugin-org.xilinotaapp.plugins.PluginTest.myCustomSetting1', 111);
		Setting.setValue('plugin-org.xilinotaapp.plugins.PluginTest.myCustomSetting2', 222);

		// Also change a global setting, to verify that the plugin doesn't get
		// notifications for non-plugin related events.
		Setting.setValue('locale', 'fr_FR');

		Setting.emitScheduledChangeEvent();

		await waitForFolderCount(1);

		const folder = (await Folder.all())[0];

		const settingNames: string[] = JSON.parse(folder.title);
		settingNames.sort();

		expect(settingNames.join(',')).toBe('myCustomSetting1,myCustomSetting2');

		await service.destroy();
	});

	test('should allow registering multiple settings', async () => {
		const service = newPluginService();

		const pluginScript = newPluginScript(`
			xilinota.plugins.register({
				onStart: async function() {
					await xilinota.settings.registerSettings({
						'myCustomSetting1': {
							value: 1,
							type: 1,
							public: true,
							label: 'My Custom Setting 1',
						},
						'myCustomSetting2': {
							value: 2,
							type: 1,
							public: true,
							label: 'My Custom Setting 2',
						}
					})
				},
			});
		`);
		const plugin = await service.loadPluginFromJsBundle('', pluginScript);
		await service.runPlugin(plugin);

		expect(Setting.value('plugin-org.xilinotaapp.plugins.PluginTest.myCustomSetting1')).toBe(1);
		expect(Setting.value('plugin-org.xilinotaapp.plugins.PluginTest.myCustomSetting2')).toBe(2);

		await service.destroy();
	});
});
