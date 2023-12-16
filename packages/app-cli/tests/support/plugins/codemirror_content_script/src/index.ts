import xilinota from 'api';
import { ContentScriptType } from 'api/types';
import { MenuItemLocation } from 'api/types';

xilinota.plugins.register({
	onStart: async function() {
		console.info('Match Highlighter started!');
		await xilinota.contentScripts.register(
			ContentScriptType.CodeMirrorPlugin,
			'matchHighlighter',
			'./xilinotaMatchHighlighter.js'
		);

		await xilinota.commands.register({
			name: 'printSomething',
			label: 'Print some random string',
			execute: async () => {
				await xilinota.commands.execute('editor.execCommand', {
					name: 'printSomething',
					args: ['Anything']
				});
			},
		});

		await xilinota.views.menuItems.create('printSomethingButton', 'printSomething', MenuItemLocation.Tools, { accelerator: 'Ctrl+Alt+Shift+U' });
	},
});
