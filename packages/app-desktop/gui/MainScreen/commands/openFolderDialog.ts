import { CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';

export interface Options {
	isNew?: boolean;
	folderId?: string;
	parentId?: string;
}

export const declaration: CommandDeclaration = {
	name: 'openFolderDialog',
	label: () => _('Edit'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, options: Options = {}) => {
			options = {
				isNew: false,
				...options,
			};

			if (options.isNew && !('parentId' in options)) throw new Error('parentId mst be specified when creating a new folder');
			if (!options.isNew && !('folderId' in options)) throw new Error('folderId property is required');

			context.dispatch({
				type: 'DIALOG_OPEN',
				name: 'editFolder',
				isOpen: true,
				props: {
					folderId: options.folderId,
					parentId: options.parentId,
				},
			});
		},
		enabledCondition: '!folderIsReadOnly',
	};
};
