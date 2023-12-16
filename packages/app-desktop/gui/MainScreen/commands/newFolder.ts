import CommandService, { CommandContext, CommandDeclaration, CommandRuntime } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';
import { Options } from './openFolderDialog';

export const declaration: CommandDeclaration = {
	name: 'newFolder',
	label: () => _('New notebook'),
	iconName: 'fa-book',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, parentId: string = null) => {
			const options: Options = {
				isNew: true,
				parentId: parentId,
			};

			void CommandService.instance().execute('openFolderDialog', options);
		},
		enabledCondition: '!folderIsReadOnly',
	};
};
