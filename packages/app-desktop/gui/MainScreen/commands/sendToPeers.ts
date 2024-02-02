import { CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';
import { PeersNote } from '@xilinota/lib/models/Peers';

export const declaration: CommandDeclaration = {
	name: 'sendToPeers',
	label: () => _('Send to peers'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, _noteIds: string[] | null = []) => {
			let noteIds = _noteIds || []
			if (!noteIds.length) noteIds = context.state.selectedNoteIds;
			await PeersNote.sendToPeers(noteIds);
		},
		enabledCondition: '!noteIsReadOnly',
	};
};
