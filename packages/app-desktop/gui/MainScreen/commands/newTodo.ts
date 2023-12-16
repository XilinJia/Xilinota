import CommandService, { CommandContext, CommandDeclaration, CommandRuntime } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';

export const declaration: CommandDeclaration = {
	name: 'newTodo',
	label: () => _('To-do'),
	iconName: 'fa-check-square',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, body = '') => {
			return CommandService.instance().execute('newNote', body, true);
		},
		enabledCondition: 'oneFolderSelected && !inConflictFolder && !folderIsReadOnly',
	};
};
