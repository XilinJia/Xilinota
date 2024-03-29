// import Setting from '../../models/Setting';
import BaseItem from '../../models/BaseItem';
import { SettingValues } from '../../models/settings/FileHandler';

export default (settings: SettingValues) => {
	const globalSettings: SettingValues = {};
	const localSettings: SettingValues = {};
	const Setting = BaseItem.getClass('Setting');

	for (const [k, v] of Object.entries(settings)) {
		const md = Setting.settingMetadata(k);

		if (md.isGlobal) {
			globalSettings[k] = v;
		} else {
			localSettings[k] = v;
		}
	}

	return { globalSettings, localSettings };
};
