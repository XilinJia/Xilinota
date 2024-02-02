import { CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';
const bridge = require('@electron/remote').require('./bridge').default;

export const declaration: CommandDeclaration = {
	name: 'print',
	label: () => _('Print'),
	iconName: 'fa-file',
};

export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (context: CommandContext, _noteIds: string[]|null = []) => {
			let noteIds = _noteIds || [];
			noteIds = noteIds.length ? noteIds : context.state.selectedNoteIds;

			try {
				if (noteIds.length !== 1) throw new Error(_('Only one note can be printed at a time.'));
				await comp.printTo_('printer', { noteId: noteIds[0] });
			} catch (error) {
				bridge().showErrorMessageBox((error as Error).message);
			}
		},
		enabledCondition: 'someNotesSelected',
	};
};
