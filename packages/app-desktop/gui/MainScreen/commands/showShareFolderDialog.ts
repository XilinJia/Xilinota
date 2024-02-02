import { CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';

export const declaration: CommandDeclaration = {
	name: 'showShareFolderDialog',
	label: () => _('Share notebook...'),
};

export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (context: CommandContext, folderId: string = '') => {
			folderId = folderId || context.state.selectedFolderId;

			comp.setState({
				shareFolderDialogOptions: {
					folderId,
					visible: true,
				},
			});
		},
		enabledCondition: 'xilinotaServerConnected && joplinCloudAccountType != 1 && (folderIsShareRootAndOwnedByUser || !folderIsShared)',
	};
};
