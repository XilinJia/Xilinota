import CommandService, { CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';
import { profileIdByIndex } from '@xilinota/lib/services/profileConfig';

export const declaration: CommandDeclaration = {
	name: 'switchProfile2',
	label: () => _('Switch to profile %d', 2),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			await CommandService.instance().execute('switchProfile', profileIdByIndex(context.state.profileConfig, 1));
		},
	};
};
