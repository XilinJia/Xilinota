import xilinota from 'api';
import { ToolbarButtonLocation } from 'api/types';
import { writeFile } from 'fs-extra';

xilinota.plugins.register({
	onStart: async function() {
		await xilinota.commands.register({
			name: 'makeThumbnail',
			execute: async () => {
				// ---------------------------------------------------------------
				// Get the current note
				// ---------------------------------------------------------------

				const noteIds = await xilinota.workspace.selectedNoteIds();
				if (noteIds.length !== 1) return;
				const noteId = noteIds[0];

				// ---------------------------------------------------------------
				// Get the top resource in that note (if any)
				// ---------------------------------------------------------------

				const result = await xilinota.data.get(['notes', noteId, 'resources']);
				if (result.items.length <= 0) return;
				const resource = result.items[0];
				
				// ---------------------------------------------------------------
				// Create an image object and resize it
				// ---------------------------------------------------------------
				
				const imageHandle = await xilinota.imaging.createFromResource(resource.id);
				const resizedImageHandle = await xilinota.imaging.resize(imageHandle, { width: 100 });
			
				// ---------------------------------------------------------------
				// Convert the image to a resource and add it to the note
				// ---------------------------------------------------------------

				const newResource = await xilinota.imaging.toJpgResource(resizedImageHandle, { title: "Thumbnail" });
				await xilinota.commands.execute('insertText', '\n![](:/' + newResource.id + ')');

				// ---------------------------------------------------------------
				// Free up the image objects at the end
				// ---------------------------------------------------------------

				await xilinota.imaging.free(imageHandle);
				await xilinota.imaging.free(resizedImageHandle);
			},
		});

		await xilinota.views.toolbarButtons.create('makeThumbnailButton', 'makeThumbnail', ToolbarButtonLocation.EditorToolbar);
	},
});
