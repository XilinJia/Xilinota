import { CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import RevisionService from '@xilinota/lib/services/RevisionService';

export const declaration: CommandDeclaration = {
	name: 'restoreNoteRevision',
	label: 'Restore a note from history',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, noteId: string, reverseRevIndex = 0) => {
			try {
				const note = await RevisionService.instance().restoreNoteById(noteId, reverseRevIndex);
				alert(RevisionService.instance().restoreSuccessMessage(note));
			} catch (error) {
				alert((error as Error).message);
			}
		},
	};
};
