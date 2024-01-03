import { utils, CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';
import Setting from '@xilinota/lib/models/Setting';
import Note from '@xilinota/lib/models/Note';

export const declaration: CommandDeclaration = {
	name: 'newNote',
	label: () => _('Note'),
	iconName: 'fa-file',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, body = '', isTodo = false) => {
			const folderId = Setting.value('activeFolderId');
			if (!folderId) return;

			const defaultValues = Note.previewFieldsWithDefaultValues({ includeTimestamps: false });

			let newNote = {
				...defaultValues, parent_id: folderId,
				is_todo: isTodo ? 1 : 0,
				body: body,
			};

			newNote = await Note.save(newNote, { provisional: true });

			void Note.updateGeolocation(newNote.id);

			utils.store.dispatch({
				type: 'NOTE_SELECT',
				id: newNote.id,
			});
		},
		enabledCondition: 'oneFolderSelected && !inConflictFolder && !folderIsReadOnly',
	};
};
