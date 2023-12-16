xilinota.plugins.register({
	onStart: async function() {
		const folder = await xilinota.data.post(['folders'], null, { title: "my plugin folder" });
		await xilinota.data.post(['notes'], null, { parent_id: folder.id, title: "testing plugin!" });

		// await xilinota.commands.register({
		// 	name: 'updateCurrentNote',
		// 	label: 'Update current note via the data API',
		// 	iconName: 'fas fa-music',
		// 	execute: async () => {
		// 		const noteIds = await xilinota.workspace.selectedNoteIds();
		// 		const noteId = noteIds.length === 1 ? noteIds[0] : null;
		// 		if (!noteId) return;
		// 		console.info('Modifying current note...');
		// 		await xilinota.data.put(['notes', noteId], null, { body: "New note body " + Date.now() });
		// 	},
		// });

		// await xilinota.views.toolbarButtons.create('updateCurrentNoteButton', 'updateCurrentNote', 'editorToolbar');		
	},
});