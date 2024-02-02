import { CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';
import Note from '@xilinota/lib/models/Note';

export const declaration: CommandDeclaration = {
	name: 'duplicateNote',
	label: () => _('Duplicate'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, _noteIds: string[] | null = []) => {
			let noteIds = _noteIds || [];
			if (noteIds.length === 0) noteIds = context.state.selectedNoteIds;

			for (let i = 0; i < noteIds.length; i++) {
				const note = await Note.load(noteIds[i]);
				if (note) await Note.duplicate(noteIds[i], {
					uniqueTitle: _('%s - Copy', note.title),
				});
			}
		},
		enabledCondition: '!noteIsReadOnly',
	};
};
