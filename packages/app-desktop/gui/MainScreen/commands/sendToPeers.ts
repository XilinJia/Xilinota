import { CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';
import { PeersNote } from '@xilinota/lib/models/Peers';

export const declaration: CommandDeclaration = {
	name: 'sendToPeers',
	label: () => _('Send to peers'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteIds: string[] = null) => {
			if (noteIds === null) noteIds = context.state.selectedNoteIds;
			await PeersNote.sendToPeers(noteIds);
		},
		enabledCondition: '!noteIsReadOnly',
	};
};
