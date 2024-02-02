import { _ } from '@xilinota/lib/locale';
import Setting from '@xilinota/lib/models/Setting';
import { CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import restart from '../services/restart';

export const declaration: CommandDeclaration = {
	name: 'toggleSafeMode',
	label: () => _('Toggle safe mode'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext, enabled: boolean = false) => {
			enabled = enabled ? enabled : !Setting.value('isSafeMode');
			Setting.setValue('isSafeMode', enabled);
			await Setting.saveAll();
			await restart();
		},
	};
};
