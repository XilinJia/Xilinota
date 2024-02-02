import CommandService, { CommandRuntime, CommandDeclaration } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';
import { stateUtils } from '@xilinota/lib/reducer';
import { DesktopCommandContext } from '../services/commands/types';

export const declaration: CommandDeclaration = {
	name: 'toggleExternalEditing',
	label: () => _('Toggle external editing'),
	iconName: 'icon-share',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: DesktopCommandContext, noteId: string = '') => {
			noteId = noteId || (stateUtils.selectedNoteId(context.state) ?? '');

			if (!noteId) return;

			if (context.state.watchedNoteFiles.includes(noteId)) {
				void CommandService.instance().execute('stopExternalEditing', noteId);
			} else {
				void CommandService.instance().execute('startExternalEditing', noteId);
			}
		},
		enabledCondition: 'oneNoteSelected && !noteIsReadOnly && (!modalDialogVisible || gotoAnythingVisible)',
		mapStateToTitle: (state: any) => {
			const noteId = stateUtils.selectedNoteId(state);
			return state.watchedNoteFiles.includes(noteId) ? _('Stop') : '';
		},
	};
};
