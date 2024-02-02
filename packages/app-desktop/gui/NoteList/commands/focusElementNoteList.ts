import { CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';
import { stateUtils } from '@xilinota/lib/reducer';
import { FocusNote } from '../utils/useFocusNote';

export const declaration: CommandDeclaration = {
	name: 'focusElementNoteList',
	label: () => _('Note list'),
	parentLabel: () => _('Focus'),
};

export const runtime = (focusNote: FocusNote): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteId: string = '') => {
			noteId = noteId || (stateUtils.selectedNoteId(context.state) ?? '');
			if (!noteId) return;

			focusNote(noteId);
		},
		enabledCondition: 'noteListHasNotes',
	};
};
