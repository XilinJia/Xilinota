import xilinota from 'api';
import { MenuItemLocation } from 'api/types';

xilinota.plugins.register({
	onStart: async function() {
		xilinota.commands.register({
			name: 'concatSelectedNotes',
			label: 'Concatenate selected notes into one',
			iconName: 'fas fa-music',
			execute: async () => {
				const noteIds = await xilinota.workspace.selectedNoteIds();
				const newNoteBody = [];
				let parentId = null;

				for (const noteId of noteIds) {
					const note = await xilinota.data.get(['notes', noteId], { fields: ['title', 'body', 'parent_id']});
					newNoteBody.push([
						'# ' + note.title,
						'',
						note.body,
					].join('\n'));

					if (!parentId) parentId = note.parent_id;
				}

				const newNote = {
					title: 'Concatenated note',
					body: newNoteBody.join('\n\n'),
					parent_id: parentId,
				};

				await xilinota.data.post(['notes'], null, newNote);
			},
		});

		xilinota.views.menuItems.create('concatSelectedNotes', MenuItemLocation.Context);
	},
});
