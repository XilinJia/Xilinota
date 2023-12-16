import { CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';
import Folder from '@xilinota/lib/models/Folder';
import Note from '@xilinota/lib/models/Note';
import { PeersNote } from '@xilinota/lib/models/Peers';

export const declaration: CommandDeclaration = {
	name: 'moveToFolder',
	label: () => _('Move to'),
};

export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (context: CommandContext, noteIds: string[] = null) => {
			noteIds = noteIds || context.state.selectedNoteIds;

			const folders: any[] = await Folder.sortFolderTree();
			const startFolders: any[] = [];
			const maxDepth = 15;

			const addOptions = (folders: any[], depth: number) => {
				for (let i = 0; i < folders.length; i++) {
					const folder = folders[i];
					startFolders.push({ key: folder.id, value: folder.id, label: folder.title, indentDepth: depth });
					if (folder.children) addOptions(folder.children, (depth + 1) < maxDepth ? depth + 1 : maxDepth);
				}
			};

			addOptions(folders, 0);

			comp.setState({
				promptOptions: {
					label: _('Move to:'),
					inputType: 'dropdown',
					value: '',
					autocomplete: startFolders,
					onClose: async (answer: any) => {
						if (answer) {
							for (let i = 0; i < noteIds.length; i++) {
								await Note.moveToFolder(noteIds[i], answer.value);
								await PeersNote.moveOnPeers(noteIds[i]);
							}
						}
						comp.setState({ promptOptions: null });
					},
				},
			});
		},
		enabledCondition: 'someNotesSelected && !noteIsReadOnly',
	};
};
