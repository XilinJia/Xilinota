import { CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';
import { stateUtils } from '@xilinota/lib/reducer';
import ExternalEditWatcher from '@xilinota/lib/services/ExternalEditWatcher';
import Note from '@xilinota/lib/models/Note';
const bridge = require('@electron/remote').require('./bridge').default;

export const declaration: CommandDeclaration = {
	name: 'startExternalEditing',
	label: () => _('Edit in external editor'),
	iconName: 'icon-share',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteId: string = '') => {
			noteId = noteId || (stateUtils.selectedNoteId(context.state) ?? '');
			if (!noteId) return;
			try {
				const note = await Note.load(noteId);
				if (note) void ExternalEditWatcher.instance().openAndWatch(note);
			} catch (error) {
				bridge().showErrorMessageBox(_('Error opening note in editor: %s', (error as Error).message));
			}
		},
		enabledCondition: 'oneNoteSelected && !noteIsReadOnly',
	};
};
