import { CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';
import { stateUtils } from '@xilinota/lib/reducer';
import Note from '@xilinota/lib/models/Note';

export const declaration: CommandDeclaration = {
	name: 'showNoteContentProperties',
	label: () => _('Statistics...'),
};

export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteId: string = '') => {
			noteId = noteId || (stateUtils.selectedNoteId(context.state) ?? '');
			if (!noteId) return;

			const note = await Note.load(noteId);
			if (note) {
				comp.setState({
					noteContentPropertiesDialogOptions: {
						visible: true,
						text: note.body,
						markupLanguage: note.markup_language,
					},
				});
			}
		},

		enabledCondition: 'oneNoteSelected',
	};
};
