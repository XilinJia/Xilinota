import { CommandRuntime, CommandDeclaration } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';

export const declaration: CommandDeclaration = {
	name: 'focusElementNoteBody',
	label: () => _('Note body'),
	parentLabel: () => _('Focus'),
};

export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async () => {
			comp.editorRef.current.execCommand({ name: 'editor.focus' });
		},
		enabledCondition: 'oneNoteSelected',
	};
};
