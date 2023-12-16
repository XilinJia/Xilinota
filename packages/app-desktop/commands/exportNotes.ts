import { CommandRuntime, CommandDeclaration } from '@xilinota/lib/services/CommandService';
import InteropService from '@xilinota/lib/services/interop/InteropService';
import { ExportOptions, FileSystemItem } from '@xilinota/lib/services/interop/types';

export const declaration: CommandDeclaration = {
	name: 'exportNotes',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: any, noteIds: string[], format: string, targetDirectoryPath: string) => {
			const exportOptions: ExportOptions = {
				path: targetDirectoryPath,
				format: format,
				target: FileSystemItem.Directory,
				sourceNoteIds: noteIds,
			};

			return InteropService.instance().export(exportOptions);
		},
	};
};
