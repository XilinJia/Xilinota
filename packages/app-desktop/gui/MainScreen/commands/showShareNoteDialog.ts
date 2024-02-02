import { CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';

export const declaration: CommandDeclaration = {
	name: 'showShareNoteDialog',
	label: () => _('Publish note...'),
};

export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (context: CommandContext, _noteIds: string[] | null = []) => {
			let noteIds = _noteIds || [];
			noteIds = noteIds.length ? noteIds : context.state.selectedNoteIds;

			comp.setState({
				shareNoteDialogOptions: {
					noteIds: noteIds,
					visible: true,
				},
			});
		},
		enabledCondition: 'xilinotaServerConnected && someNotesSelected',
	};
};
