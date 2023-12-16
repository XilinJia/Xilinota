import xilinota from 'api';
import { ContentScriptType } from 'api/types';

xilinota.plugins.register({
	onStart: async function() {
		await xilinota.commands.register({
			name: 'testCommand',
			label: 'My Test Command',
			execute: async (...args) => {
				alert('Got command "testCommand" with args: ' + JSON.stringify(args));
			},
		});

		await xilinota.commands.register({
			name: 'testCommandNoArgs',
			label: 'My Test Command (no args)',
			execute: async () => {
				alert('Got command "testCommandNoArgs"');
			},
		});

		await xilinota.contentScripts.register(
			ContentScriptType.MarkdownItPlugin,
			'justtesting',
			'./markdownItTestPlugin.js'
		);

		await xilinota.contentScripts.onMessage('justtesting', (message:any) => {
			return message + '+response';
		});
	},
});
