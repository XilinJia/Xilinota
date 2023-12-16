import Setting from '@xilinota/lib/models/Setting';
import { setupDatabaseAndSynchronizer, switchClient, afterEachCleanUp } from '@xilinota/lib/testing/test-utils';
import Note from '@xilinota/lib/models/Note';
import Folder from '@xilinota/lib/models/Folder';
import ItemChange from '@xilinota/lib/models/ItemChange';
import { newPluginScript, newPluginService } from '../../../testUtils';

describe('JoplinWorkspace', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	afterEach(async () => {
		await afterEachCleanUp();
	});

	test('should listen to noteChange events', async () => {
		const appState: Record<string, any> = {
			selectedNoteIds: [],
		};

		const service = newPluginService('1.4', {
			getState: () => {
				return appState;
			},
		});

		const pluginScript = newPluginScript(`			
			xilinota.plugins.register({
				onStart: async function() {
					await xilinota.workspace.onNoteChange(async (event) => {
						await xilinota.data.post(['folders'], null, { title: JSON.stringify(event) });
					});
				},
			});
		`);

		const note = await Note.save({});
		appState.selectedNoteIds.push(note.id);
		await ItemChange.waitForAllSaved();

		const plugin = await service.loadPluginFromJsBundle('', pluginScript);
		await service.runPlugin(plugin);

		await Note.save({ id: note.id, body: 'testing' });
		await ItemChange.waitForAllSaved();

		const folder = (await Folder.all())[0];

		const result: any = JSON.parse(folder.title);

		expect(result.id).toBe(note.id);
		expect(result.event).toBe(ItemChange.TYPE_UPDATE);

		await service.destroy();
	});

	test('should return the selected folder', async () => {
		const service = newPluginService();

		const pluginScript = newPluginScript(`			
			xilinota.plugins.register({
				onStart: async function() {
					const folder = await xilinota.workspace.selectedFolder();
					await xilinota.data.put(['folders', folder.id], null, { title: "changedtitle" });
				},
			});
		`);

		const folder = await Folder.save({ title: 'folder' });
		Setting.setValue('activeFolderId', folder.id);

		const plugin = await service.loadPluginFromJsBundle('', pluginScript);
		await service.runPlugin(plugin);

		const modFolder = await Folder.load(folder.id);
		expect(modFolder.title).toBe('changedtitle');
	});

});
