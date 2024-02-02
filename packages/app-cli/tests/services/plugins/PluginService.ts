import PluginRunner from '../../../app/services/plugins/PluginRunner';
import PluginService from '@xilinota/lib/services/plugins/PluginService';
import { ContentScriptType } from '@xilinota/lib/services/plugins/api/types';
import MdToHtml from '@xilinota/renderer/MdToHtml';
import shim from '@xilinota/lib/shim';
import Setting from '@xilinota/lib/models/Setting';
import * as fs from 'fs-extra';
import Note from '@xilinota/lib/models/Note';
import Folder from '@xilinota/lib/models/Folder';
import { expectNotThrow, setupDatabaseAndSynchronizer, switchClient, expectThrow, createTempDir, supportDir } from '@xilinota/lib/testing/test-utils';
import { newPluginScript } from '../../testUtils';

const testPluginDir = `${supportDir}/plugins`;

function newPluginService(appVersion = '1.4') {
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
			getState: () => {},
		},
	);
	return service;
}

describe('services_PluginService', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should load and run a simple plugin', (async () => {
		const service = newPluginService();
		await service.loadAndRunPlugins([`${testPluginDir}/simple`], {});

		expect(() => service.pluginById('org.xilinotaapp.plugins.Simple')).not.toThrowError();

		const allFolders = await Folder.all();
		expect(allFolders.length).toBe(1);
		expect(allFolders[0].title).toBe('my plugin folder');

		const allNotes = await Note.all();
		expect(allNotes.length).toBe(1);
		expect(allNotes[0].title).toBe('testing plugin!');
		expect(allNotes[0].parent_id).toBe(allFolders[0].id);
	}));

	it('should load and run a simple plugin and handle trailing slash', (async () => {
		const service = newPluginService();
		await service.loadAndRunPlugins([`${testPluginDir}/simple/`], {});
		expect(() => service.pluginById('org.xilinotaapp.plugins.Simple')).not.toThrowError();
	}));

	it('should load and run a plugin that uses external packages', (async () => {
		const service = newPluginService();
		await service.loadAndRunPlugins([`${testPluginDir}/withExternalModules`], {});
		expect(() => service.pluginById('org.xilinotaapp.plugins.ExternalModuleDemo')).not.toThrowError();

		const allFolders = await Folder.all();
		expect(allFolders.length).toBe(1);

		// If you have an error here, it might mean you need to run `npm i` from
		// the "withExternalModules" folder. Not clear exactly why.
		expect(allFolders[0].title).toBe('  foo');
	}));

	it('should load multiple plugins from a directory', (async () => {
		const service = newPluginService();
		await service.loadAndRunPlugins(`${testPluginDir}/multi_plugins`, {});

		const plugin1 = service.pluginById('org.xilinotaapp.plugins.MultiPluginDemo1');
		const plugin2 = service.pluginById('org.xilinotaapp.plugins.MultiPluginDemo2');
		expect(!!plugin1).toBe(true);
		expect(!!plugin2).toBe(true);

		const allFolders = await Folder.all();
		expect(allFolders.length).toBe(2);
		expect(allFolders.map((f: any) => f.title).sort().join(', ')).toBe('multi - simple1, multi - simple2');
	}));

	it('should load plugins from JS bundles', (async () => {
		const service = newPluginService();

		const plugin = await service.loadPluginFromJsBundle('/tmp', `
			/* xilinota-manifest:
			{
				"id": "org.xilinotaapp.plugins.JsBundleTest",
				"manifest_version": 1,
				"app_min_version": "1.4",
				"name": "JS Bundle test",
				"description": "JS Bundle Test plugin",
				"version": "1.0.0",
				"author": "Laurent Cozic",
				"homepage_url": "https://xilinotaapp.org"
			}
			*/

			xilinota.plugins.register({
				onStart: async function() {
					await xilinota.data.post(['folders'], null, { title: "my plugin folder" });
				},
			});
		`);

		await service.runPlugin(plugin);

		expect(plugin.manifest.manifest_version).toBe(1);
		expect(plugin.manifest.name).toBe('JS Bundle test');

		const allFolders = await Folder.all();
		expect(allFolders.length).toBe(1);
	}));

	it('should load plugins from JS bundle files', (async () => {
		const service = newPluginService();
		await service.loadAndRunPlugins(`${testPluginDir}/jsbundles`, {});
		expect(!!service.pluginById('org.xilinotaapp.plugins.JsBundleDemo')).toBe(true);
		expect((await Folder.all()).length).toBe(1);
	}));

	it('should load plugins from JPL archive', (async () => {
		const service = newPluginService();
		await service.loadAndRunPlugins([`${testPluginDir}/jpl_test/org.xilinotaapp.FirstJplPlugin.jpl`], {});
		expect(!!service.pluginById('org.xilinotaapp.FirstJplPlugin')).toBe(true);
		expect((await Folder.all()).length).toBe(1);
	}));

	it('should validate JS bundles', (async () => {
		const invalidJsBundles = [
			`
				/* xilinota-manifest:
				{
					"not_a_valid_manifest_at_all": 1
				}
				*/

				xilinota.plugins.register({
					onStart: async function() {},
				});
			`, `
				/* xilinota-manifest:
				*/

				xilinota.plugins.register({
					onStart: async function() {},
				});
			`, `
				xilinota.plugins.register({
					onStart: async function() {},
				});
			`, '',
		];

		const service = newPluginService();

		for (const jsBundle of invalidJsBundles) {
			await expectThrow(async () => await service.loadPluginFromJsBundle('/tmp', jsBundle));
		}
	}));

	it('should register a Markdown-it plugin', (async () => {
		const tempDir = await createTempDir();

		const contentScriptPath = `${tempDir}/markdownItTestPlugin.js`;
		const contentScriptCssPath = `${tempDir}/markdownItTestPlugin.css`;
		await shim.fsDriver().copy(`${testPluginDir}/markdownItTestPlugin.js`, contentScriptPath);
		await shim.fsDriver().copy(`${testPluginDir}/content_script/src/markdownItTestPlugin.css`, contentScriptCssPath);

		const service = newPluginService();

		const plugin = await service.loadPluginFromJsBundle(tempDir, `
			/* xilinota-manifest:
			{
				"id": "org.xilinotaapp.plugin.MarkdownItPluginTest",
				"manifest_version": 1,
				"app_min_version": "1.4",
				"name": "JS Bundle test",
				"description": "JS Bundle Test plugin",
				"version": "1.0.0",
				"author": "Laurent Cozic",
				"homepage_url": "https://xilinotaapp.org"
			}
			*/

			xilinota.plugins.register({
				onStart: async function() {
					await xilinota.contentScripts.register('markdownItPlugin', 'justtesting', './markdownItTestPlugin.js');
				},
			});
		`);

		await service.runPlugin(plugin);

		const contentScripts = plugin.contentScriptsByType(ContentScriptType.MarkdownItPlugin);
		expect(contentScripts.length).toBe(1);
		expect(!!contentScripts[0].path).toBe(true);

		const contentScript = contentScripts[0];

		const mdToHtml = new MdToHtml();
		const module = require(contentScript.path).default;
		mdToHtml.loadExtraRendererRule(contentScript.id, tempDir, module({}));

		const result = await mdToHtml.render([
			'```justtesting',
			'something',
			'```',
		].join('\n'));

		const asset = result.pluginAssets.find(a => a.name === 'justtesting/markdownItTestPlugin.css');
		const assetContent: string = asset ? await shim.fsDriver().readFile(asset.path, 'utf8') : '';

		expect(assetContent.includes('.just-testing')).toBe(true);
		expect(assetContent.includes('background-color: rgb(202, 255, 255)')).toBe(true);
		expect(result.html.includes('JUST TESTING: something')).toBe(true);

		await shim.fsDriver().remove(tempDir);
	}));

	it('should enable and disable plugins depending on what app version they support', (async () => {
		const pluginScript = `
			/* xilinota-manifest:
			{
				"id": "org.xilinotaapp.plugins.PluginTest",
				"manifest_version": 1,
				"app_min_version": "1.4",
				"name": "JS Bundle test",
				"version": "1.0.0"
			}
			*/

			xilinota.plugins.register({
				onStart: async function() { },
			});
		`;

		const testCases = [
			['1.4', true],
			['1.5', true],
			['2.0', true],
			['1.3', false],
			['0.9', false],
		];

		for (const testCase of testCases) {
			const [appVersion, hasNoError] = testCase;
			const service = newPluginService(appVersion as string);
			const plugin = await service.loadPluginFromJsBundle('', pluginScript);

			if (hasNoError) {
				await expectNotThrow(() => service.runPlugin(plugin));
			} else {
				await expectThrow(() => service.runPlugin(plugin));
			}
		}
	}));

	it('should install a plugin', (async () => {
		const service = newPluginService();
		const pluginPath = `${testPluginDir}/jpl_test/org.xilinotaapp.FirstJplPlugin.jpl`;
		await service.installPlugin(pluginPath);
		const installedPluginPath = `${Setting.value('pluginDir')}/org.xilinotaapp.FirstJplPlugin.jpl`;
		expect(await fs.pathExists(installedPluginPath)).toBe(true);
	}));

	it('should rename the plugin archive to the right name', (async () => {
		const tempDir = await createTempDir();
		const service = newPluginService();
		const pluginPath = `${testPluginDir}/jpl_test/org.xilinotaapp.FirstJplPlugin.jpl`;
		const tempPath = `${tempDir}/something.jpl`;
		await shim.fsDriver().copy(pluginPath, tempPath);
		const installedPluginPath = `${Setting.value('pluginDir')}/org.xilinotaapp.FirstJplPlugin.jpl`;
		await service.installPlugin(tempPath);
		expect(await fs.pathExists(installedPluginPath)).toBe(true);
	}));

	it('should create the data directory', (async () => {
		const pluginScript = newPluginScript(`
			xilinota.plugins.register({
				onStart: async function() {
					const dataDir = await xilinota.plugins.dataDir();
					xilinota.data.post(['folders'], null, { title: JSON.stringify(dataDir) });
				},
			});
		`);

		const expectedPath = `${Setting.value('pluginDataDir')}/org.xilinotaapp.plugins.PluginTest`;
		expect(await fs.pathExists(expectedPath)).toBe(false);

		const service = newPluginService();
		const plugin = await service.loadPluginFromJsBundle('', pluginScript);
		await service.runPlugin(plugin);

		expect(await fs.pathExists(expectedPath)).toBe(true);

		const folders = await Folder.all();
		expect(JSON.parse(folders[0].title??'')).toBe(expectedPath);
	}));

});
