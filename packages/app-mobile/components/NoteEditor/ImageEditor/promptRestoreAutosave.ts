import { _ } from '@xilinota/lib/locale';
import shim from '@xilinota/lib/shim';
import { Alert } from 'react-native';
import { clearAutosave, getAutosaveFilepath, readAutosave } from './autosave';

export type RestoreAutosaveCallback = (data: string)=> void;

const promptRestoreAutosave = async (onRestoreAutosave: RestoreAutosaveCallback) => {
	const autosavePath = getAutosaveFilepath();

	if (await shim.fsDriver().exists(autosavePath)) {
		const title: string = '';
		const message = _(
			'An autosaved drawing was found. Attach a copy of it to the note?',
		);

		Alert.alert(title, message, [
			{
				text: _('Discard'),
				onPress: async () => {
					await clearAutosave();
				},
			},
			{
				text: _('Attach'),
				onPress: async () => {
					const autosaveData = await readAutosave();
					await clearAutosave();

					if (autosaveData) onRestoreAutosave(autosaveData);
				},
			},
		]);
	}
};

export default promptRestoreAutosave;
