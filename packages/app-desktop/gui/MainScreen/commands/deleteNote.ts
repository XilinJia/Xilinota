import { CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';
import Note from '@xilinota/lib/models/Note';
import bridge from '../../../services/bridge';
import { PeersNote } from '@xilinota/lib/models/Peers';

export const declaration: CommandDeclaration = {
	name: 'deleteNote',
	label: () => _('Delete note'),
	iconName: 'fa-times',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteIds: string[] = null) => {
			if (noteIds === null) noteIds = context.state.selectedNoteIds;

			if (!noteIds.length) return;

			const msg = await Note.deleteMessage(noteIds);
			if (!msg) return;

			const ok = bridge().showConfirmMessageBox(msg, {
				buttons: [_('Delete'), _('Cancel')],
				defaultId: 1,
			});

			if (!ok) return;
			await Note.batchDelete(noteIds);
			await PeersNote.batchDeleteOnPeers(noteIds);
		},
		enabledCondition: '!noteIsReadOnly',
	};
};
