import { CommandRuntime, CommandDeclaration } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';
import bridge from '../services/bridge';
import Setting from '@xilinota/lib/models/Setting';

export const declaration: CommandDeclaration = {
	name: 'openProfileDirectory',
	label: () => _('Open profile directory'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async () => {
			void bridge().openItem(Setting.value('profileDir'));
		},
	};
};
