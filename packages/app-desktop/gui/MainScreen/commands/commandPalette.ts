import CommandService, { CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';
import { UiType } from './gotoAnything';

export const declaration: CommandDeclaration = {
	name: 'commandPalette',
	label: () => _('Command palette...'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext) => {
			void CommandService.instance().execute('gotoAnything', UiType.CommandPalette);
		},
	};
};
