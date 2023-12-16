import { CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';
import { createNewProfile, saveProfileConfig } from '@xilinota/lib/services/profileConfig';
import Setting from '@xilinota/lib/models/Setting';
import restart from '../../../services/restart';

export const declaration: CommandDeclaration = {
	name: 'addProfile',
	label: () => _('Create new profile...'),
};

export const runtime = (comp: any): CommandRuntime => {
	return {
		execute: async (context: CommandContext) => {
			comp.setState({
				promptOptions: {
					label: _('Profile name:'),
					buttons: ['create', 'cancel'],
					value: '',
					onClose: async (answer: string) => {
						if (answer) {
							const { newConfig, newProfile } = createNewProfile(context.state.profileConfig, answer);
							newConfig.currentProfileId = newProfile.id;
							await saveProfileConfig(`${Setting.value('rootProfileDir')}/profiles.json`, newConfig);
							await restart();
						}

						comp.setState({ promptOptions: null });
					},
				},
			});
		},
	};
};
