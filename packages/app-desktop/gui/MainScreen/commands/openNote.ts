import { CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import Note from '@xilinota/lib/models/Note';
import Folder from '@xilinota/lib/models/Folder';

export const declaration: CommandDeclaration = {
	name: 'openNote',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteId: string, hash: string = '') => {
			const note = await Note.load(noteId);
			if (!note) throw new Error(`No such note: ${noteId}`);

			const folder = await Folder.load(note.parent_id??'');
			if (!folder) throw new Error(`Note parent notebook does not exist: ${JSON.stringify(note)}`);

			context.dispatch({
				type: 'FOLDER_AND_NOTE_SELECT',
				folderId: folder.id,
				noteId: note.id,
				hash,
			});
		},
	};
};
