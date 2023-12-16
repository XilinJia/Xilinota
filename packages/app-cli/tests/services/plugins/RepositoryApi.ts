import RepositoryApi from '@xilinota/lib/services/plugins/RepositoryApi';
import shim from '@xilinota/lib/shim';
import { setupDatabaseAndSynchronizer, switchClient, supportDir, createTempDir } from '@xilinota/lib/testing/test-utils';

async function newRepoApi(): Promise<RepositoryApi> {
	const repo = new RepositoryApi(`${supportDir}/pluginRepo`, await createTempDir());
	await repo.initialize();
	return repo;
}

describe('services_plugins_RepositoryApi', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should get the manifests', (async () => {
		const api = await newRepoApi();
		const manifests = await api.manifests();
		expect(!!manifests.find(m => m.id === 'xilinota.plugin.ambrt.backlinksToNote')).toBe(true);
		expect(!!manifests.find(m => m.id === 'org.xilinotaapp.plugins.ToggleSidebars')).toBe(true);
	}));

	it('should search', (async () => {
		const api = await newRepoApi();

		{
			const results = await api.search('to');
			expect(results.length).toBe(2);
			expect(!!results.find(m => m.id === 'xilinota.plugin.ambrt.backlinksToNote')).toBe(true);
			expect(!!results.find(m => m.id === 'org.xilinotaapp.plugins.ToggleSidebars')).toBe(true);
		}

		{
			const results = await api.search('backlink');
			expect(results.length).toBe(1);
			expect(!!results.find(m => m.id === 'xilinota.plugin.ambrt.backlinksToNote')).toBe(true);
		}
	}));

	it('should download a plugin', (async () => {
		const api = await newRepoApi();
		const pluginPath = await api.downloadPlugin('org.xilinotaapp.plugins.ToggleSidebars');
		expect(await shim.fsDriver().exists(pluginPath)).toBe(true);
	}));

	it('should tell if a plugin can be updated', (async () => {
		const api = await newRepoApi();

		expect(await api.pluginCanBeUpdated('org.xilinotaapp.plugins.ToggleSidebars', '1.0.0', '3.0.0')).toBe(true);
		expect(await api.pluginCanBeUpdated('org.xilinotaapp.plugins.ToggleSidebars', '1.0.0', '1.0.0')).toBe(false);
		expect(await api.pluginCanBeUpdated('org.xilinotaapp.plugins.ToggleSidebars', '1.0.2', '3.0.0')).toBe(false);
		expect(await api.pluginCanBeUpdated('does.not.exist', '1.0.0', '3.0.0')).toBe(false);
	}));

});
