import { CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import Setting from '@xilinota/lib/models/Setting';
import { openFileWithExternalEditor } from '@xilinota/lib/services/ExternalEditWatcher/utils';
import bridge from '../services/bridge';
import { _ } from '@xilinota/lib/locale';

export const declaration: CommandDeclaration = {
	name: 'editProfileConfig',
	label: () => _('Edit profile configuration...'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (_context: CommandContext) => {
			await openFileWithExternalEditor(`${Setting.value('rootProfileDir')}/profiles.json`, bridge());
		},
		enabledCondition: 'hasMultiProfiles',
	};
};
