import xilinota from 'api';

xilinota.plugins.register({
	onStart: async function() {
		await xilinota.views.menus.create('myMenu', 'My Menu', [
			{
				commandName: "newNote",
			},
			{
				commandName: "newFolder",
			},
			{
				label: 'My sub-menu',
				submenu: [
					{
						commandName: 'print',
					},
					{
						commandName: 'setTags',
					},
				],
			},
		]);
	},
});
