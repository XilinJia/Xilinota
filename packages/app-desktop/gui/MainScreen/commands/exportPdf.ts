import { CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import shim from '@xilinota/lib/shim';
import InteropServiceHelper from '../../../InteropServiceHelper';
import { _ } from '@xilinota/lib/locale';
import Note from '@xilinota/lib/models/Note';
const bridge = require('@electron/remote').require('./bridge').default;

export const declaration: CommandDeclaration = {
	name: 'exportPdf',
	label: () => `PDF - ${_('PDF File')}`,
};

export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (context: CommandContext, _noteIds: string[]|null = []) => {
			let noteIds = _noteIds || []
			try {
				noteIds = noteIds.length ? noteIds : context.state.selectedNoteIds;

				if (!noteIds.length) throw new Error('No notes selected for pdf export');

				let path = null;
				if (noteIds.length === 1) {
					path = await bridge().showSaveDialog({
						filters: [{ name: _('PDF File'), extensions: ['pdf'] }],
						defaultPath: await InteropServiceHelper.defaultFilename(noteIds[0], 'pdf'),
					});
				} else {
					path = await bridge().showOpenDialog({
						properties: ['openDirectory', 'createDirectory'],
					});
				}

				if (!path) return;

				for (let i = 0; i < noteIds.length; i++) {
					const note = await Note.load(noteIds[i]);

					let pdfPath = '';

					if (noteIds.length === 1) {
						pdfPath = path;
					} else {
						if (note && note.id) {
							const n = await InteropServiceHelper.defaultFilename(note.id, 'pdf');
							pdfPath = await shim.fsDriver().findUniqueFilename(`${path}/${n}`);
						}
					}

					await comp.printTo_('pdf', { path: pdfPath, noteId: note ? note.id : ''});
				}
			} catch (error) {
				console.error(error);
				bridge().showErrorMessageBox((error as Error).message);
			}
		},

		enabledCondition: 'someNotesSelected',
	};
};
