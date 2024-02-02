import { CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';
import bridge from '../../../services/bridge';
import Folder from '@xilinota/lib/models/Folder';
import { PeersFolder } from '@xilinota/lib/models/Peers';
import { substrWithEllipsis } from '@xilinota/lib/string-utils';

export const declaration: CommandDeclaration = {
	name: 'deleteFolder',
	label: () => _('Delete notebook'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, folderId: string = '') => {
			if (!folderId) folderId = context.state.selectedFolderId;

			const folder = await Folder.load(folderId);
			if (!folder) throw new Error(`No such folder: ${folderId}`);

			let deleteMessage = _('Delete notebook "%s"?\n\nAll notes and sub-notebooks within this notebook will also be deleted.', substrWithEllipsis(folder.title??'', 0, 32));
			if (folderId === context.state.settings['sync.10.inboxId']) {
				deleteMessage = _('Delete the Inbox notebook?\n\nIf you delete the inbox notebook, any email that\'s recently been sent to it may be lost.');
			}

			const ok = bridge().showConfirmMessageBox(deleteMessage);
			if (!ok) return;
			void PeersFolder.deleteOnPeers(folderId);
			await Folder.delete(folderId);
		},
		enabledCondition: '!folderIsReadOnly',
	};
};
