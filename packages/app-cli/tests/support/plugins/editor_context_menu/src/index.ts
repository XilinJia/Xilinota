import xilinota from 'api';
import { MenuItemLocation } from 'api/types';

xilinota.plugins.register({
	onStart: async function() {
		await xilinota.commands.register({
			name: 'sayHi',
			label: 'Say Hi',
			execute: async () => {
				await xilinota.commands.execute('replaceSelection', 'hi!');
			},
		});

		await xilinota.views.menuItems.create('myContextMenuItem', 'sayHi', MenuItemLocation.EditorContextMenu);
	},
});
