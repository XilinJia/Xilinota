import versionInfo from './versionInfo';
import { reg } from './registry';
import { Plugins } from './services/plugins/PluginService';
import Plugin from './services/plugins/Plugin';

jest.mock('./registry');

const mockedVersion = jest.fn(() => 'test');
const mockedDb = { version: mockedVersion };

const packageInfo = {
	'name': 'Xilinota',
	'version': '2.10.5',
	'description': 'Xilinota for Desktop',
	'repository': {
		'type': 'git',
		'url': 'git+https://github.com/XilinJia/Xilinota.git',
	},
	'author': 'Laurent Cozic',
	'license': 'AGPL-3.0-or-later',
	'bugs': {
		'url': 'https://github.com/XilinJia/Xilinota/issues',
	},
	'homepage': 'https://github.com/XilinJia/Xilinota#readme',
	'build': {
		'appId': 'ac.mdiq.xilinota-desktop',
	},
	'git': {
		'branch': 'dev',
		'hash': '1b527f2bb',
	},
};

describe('getPluginLists', () => {

	beforeAll(() => {
		(reg.db as jest.Mock).mockReturnValue(mockedDb);
	});

	beforeEach(() => {
		jest.clearAllMocks();
	});

	it('should not list any plugin when no plugin is installed', () => {
		const v = versionInfo(packageInfo, {});
		expect(v.body).toMatch(/Revision:\s[a-z0-9]{3,}\s\([a-zA-Z0-9-_/.]{1,}\)$/);
		expect(v.message).toMatch(/Revision:\s[a-z0-9]{3,}\s\([a-zA-Z0-9-_/.]{1,}\)$/);
	});

	it('should list one plugin', () => {
		const plugin: Plugin = new Plugin(
			'',
			{
				manifest_version: 1,
				id: '1',
				name: 'Plugin1',
				version: '1',
				app_min_version: '1' },
			'',
			() => {},
			'',
		);

		const plugins: Plugins = {};
		plugins[plugin.manifest.id] = plugin;

		const v = versionInfo(packageInfo, plugins);
		expect(v.body).toMatch(/\n\nPlugin1: 1/);
		expect(v.message).toMatch(/\n\nPlugin1: 1/);
	});

	it('should show a list of three plugins', () => {
		const plugins: Plugins = {};
		for (let i = 1; i <= 3; i++) {
			const plugin: Plugin = new Plugin(
				'',
				{
					manifest_version: i,
					id: i.toString(),
					name: `Plugin${i}`,
					version: '1',
					app_min_version: '1' },
				'',
				() => {},
				'',
			);
			plugins[plugin.manifest.id] = plugin;
		}

		const v = versionInfo(packageInfo, plugins);

		expect(v.body).toMatch(/\n\nPlugin1: 1\nPlugin2: 1\nPlugin3: 1/);
		expect(v.message).toMatch(/\n\nPlugin1: 1\nPlugin2: 1\nPlugin3: 1/);
	});

	it('should show an abridged list of plugins in message and the full list in body', () => {
		const plugins: Plugins = {};
		for (let i = 1; i <= 21; i++) {
			const plugin: Plugin = new Plugin(
				'',
				{
					manifest_version: i,
					id: i.toString(),
					name: `Plugin${i}`,
					version: '1',
					app_min_version: '1' },
				'',
				() => {},
				'',
			);

			plugins[plugin.manifest.id] = plugin;
		}

		const v = versionInfo(packageInfo, plugins);

		const body = '\n';
		for (let i = 1; i <= 21; i++) {
			body.concat(`\nPlugin${i}: 1`);
		}
		expect(v.body).toMatch(new RegExp(body));

		const message = '\n';
		for (let i = 1; i <= 20; i++) {
			message.concat(`\nPlugin${i}: 1`);
		}
		message.concat('\n...');
		expect(v.message).toMatch(new RegExp(message));
	});
});
