import CommandService, { CommandContext, CommandDeclaration, CommandRuntime } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';

export const declaration: CommandDeclaration = {
	name: 'newSubFolder',
	label: () => _('New sub-notebook'),
	iconName: 'fa-book',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, parentId: string = '') => {
			parentId = parentId || context.state.selectedFolderId;
			return CommandService.instance().execute('newFolder', parentId);
		},
		enabledCondition: '!folderIsReadOnly',
	};
};
