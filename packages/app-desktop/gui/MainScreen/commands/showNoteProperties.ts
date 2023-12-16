import CommandService, { CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';
import { stateUtils } from '@xilinota/lib/reducer';

export const declaration: CommandDeclaration = {
	name: 'showNoteProperties',
	label: () => _('Note properties'),
	iconName: 'icon-info',
};

export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteId: string = null) => {
			noteId = noteId || stateUtils.selectedNoteId(context.state);

			comp.setState({
				notePropertiesDialogOptions: {
					noteId: noteId,
					visible: true,
					onRevisionLinkClick: () => {
						void CommandService.instance().execute('showRevisions');
					},
				},
			});
		},
		enabledCondition: 'oneNoteSelected',
	};
};
