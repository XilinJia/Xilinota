import { CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';
import { stateUtils } from '@xilinota/lib/reducer';
import ExternalEditWatcher from '@xilinota/lib/services/ExternalEditWatcher';

export const declaration: CommandDeclaration = {
	name: 'stopExternalEditing',
	label: () => _('Stop external editing'),
	iconName: 'fa-stop',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteId: string = null) => {
			noteId = noteId || stateUtils.selectedNoteId(context.state);
			void ExternalEditWatcher.instance().stopWatching(noteId);
		},
		enabledCondition: 'oneNoteSelected && !noteIsReadOnly',
	};
};
