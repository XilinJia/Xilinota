import { CommandDeclaration, CommandRuntime, CommandContext } from '@xilinota/lib/services/CommandService';
import Setting from '@xilinota/lib/models/Setting';
import { stateUtils } from '@xilinota/lib/reducer';
import { _ } from '@xilinota/lib/locale';

export const declaration: CommandDeclaration = {
	name: 'toggleEditors',
	label: () => _('Toggle editors'),
	iconName: 'fa-columns',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			// A bit of a hack, but for now don't allow changing code view
			// while a note is being saved as it will cause a problem with
			// TinyMCE because it won't have time to send its content before
			// being switch to Ace Editor.
			if (stateUtils.hasNotesBeingSaved(context.state)) return;
			Setting.toggle('editor.codeView');
		},
		enabledCondition: '!notesAreBeingSaved && oneNoteSelected',
	};
};
