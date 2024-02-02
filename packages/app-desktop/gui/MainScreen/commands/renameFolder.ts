import { CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';
import Folder from '@xilinota/lib/models/Folder';
import LocalFile from '@xilinota/lib/models/LocalFiles';
const bridge = require('@electron/remote').require('./bridge').default;

export const declaration: CommandDeclaration = {
	name: 'renameFolder',
	label: () => _('Rename'),
};

export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (context: CommandContext, folderId: string = '') => {
			folderId = folderId || context.state.selectedFolderId;

			const folder = await Folder.load(folderId);

			if (folder) {
				comp.setState({
					promptOptions: {
						label: _('Rename notebook:'),
						value: folder.title,
						onClose: async (answer: string) => {
							if (answer) {
								try {
									folder.title = answer;
									if (folder.id) await LocalFile.renameFolder(folder.id, folder.title);
									await Folder.save(folder, { fields: ['title'], userSideValidation: true });
								} catch (error) {
									bridge().showErrorMessageBox((error as Error).message);
								}
							}
							comp.setState({ promptOptions: null });
						},
					},
				});
			}
		},
	};
};
