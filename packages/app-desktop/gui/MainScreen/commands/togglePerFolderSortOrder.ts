import { CommandContext, CommandDeclaration, CommandRuntime } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';
import PerFolderSortOrderService from '../../../services/sortOrder/PerFolderSortOrderService';

export const declaration: CommandDeclaration = {
	name: 'togglePerFolderSortOrder',
	label: () => _('Toggle own sort order'),
};

export const runtime = (): CommandRuntime => {
	return {
		enabledCondition: 'oneFolderSelected',

		execute: async (_context: CommandContext, folderId?: string, own?: boolean) => {
			PerFolderSortOrderService.set(folderId, own);
		},
	};
};
