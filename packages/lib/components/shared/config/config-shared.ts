import Setting from '../../../models/Setting';
import SyncTargetRegistry from '../../../SyncTargetRegistry';
import { convertValuesToFunctions } from '../../../ObjectUtils';
import { _ } from '../../../locale';

import { createSelector } from 'reselect';

import Logger from '@xilinota/utils/Logger';

const logger = Logger.create('config-shared');

// shared.onSettingsSaved = () => {};

let scheduleSaveSettingsIID: any | null = null;
let onSettingsSaved: (event: { savedSettingKeys: any; }) => void;

const init = function(comp: Record<any, any>, reg: { scheduleSync: () => any; }): void {

	if (!comp.state) comp.state = {};
	comp.state.checkSyncConfigResult = null;
	comp.state.settings = {};
	comp.state.changedSettingKeys = [];
	comp.state.showAdvancedSettings = false;

	onSettingsSaved = (event: { savedSettingKeys: any; }) => {
		const savedSettingKeys = event.savedSettingKeys;

		// After changing the sync settings we immediately trigger a sync
		// operation. This will ensure that the client gets the sync info as
		// early as possible, in particular the encryption state (encryption
		// keys, whether it's enabled, etc.). This should prevent situations
		// where the user tried to setup E2EE on the client even though it's
		// already been done on another client.
		if (savedSettingKeys.find((s: string) => s.startsWith('sync.'))) {
			logger.info('Sync settings have been changed - scheduling a sync');
			void reg.scheduleSync();
		}
	};
};

const advancedSettingsButton_click = (comp: { setState: (arg0: (state: any) => { showAdvancedSettings: boolean; }) => void; }) => {
	comp.setState((state) => {
		return { showAdvancedSettings: !state.showAdvancedSettings };
	});
};

const checkSyncConfig = async function(
	comp: Record<any, any>, settings: { [x: string]: any; }): Promise<any> {
	// comp: { state: { changedSettingKeys: string[]; settings: { [x: string]: any; }; }; setState: (arg0: { checkSyncConfigResult: any; }) => void; }, settings: { [x: string]: any; }) {

	const syncTargetId = settings['sync.target'];
	const SyncTargetClass = SyncTargetRegistry.classById(syncTargetId);

	const options = {
		...Setting.subValues(`sync.${syncTargetId}`, settings),
		...Setting.subValues('net', settings)
	};

	comp.setState({ checkSyncConfigResult: 'checking' });
	const result = await SyncTargetClass.checkConfig(convertValuesToFunctions(options));
	comp.setState({ checkSyncConfigResult: result });

	if (result.ok) {
		// Users often expect config to be auto-saved at this point, if the config check was successful
		saveSettings(comp);
	}
	return result;
};

const checkSyncConfigMessages = function(comp: Record<any, any>): string[] {
	const result = comp.state.checkSyncConfigResult;
	const output: string[] = [];

	if (result === 'checking') {
		output.push(_('Checking... Please wait.'));
	} else if (result && result.ok) {
		output.push(_('Success! Synchronisation configuration appears to be correct.'));
	} else if (result && !result.ok) {
		output.push(_('Error. Please check that URL, username, password, etc. are correct and that the sync target is accessible. The reported error was:'));
		output.push(result.errorMessage);
	}

	return output;
};

const updateSettingValue = function(comp: Record<any, any>, key: string, value: any, callback: () => void = () => { }): void {

	// if (!callback) callback = () => { };

	comp.setState((state: { settings: { [x: string]: any; }; changedSettingKeys: string[]; }) => {
		// @react-native-community/slider (4.4.0) will emit a valueChanged event
		// when the component is mounted, even though the value hasn't changed.
		// We should ignore this, otherwise it will mark the settings as
		// unsaved.
		//
		// Upstream: https://github.com/callstack/react-native-slider/issues/395
		//
		// https://github.com/XilinJia/Xilinota/issues/7503
		if (state.settings[key] === value) {
			logger.info('Trying to update a setting that has not changed - skipping it.', key, value);
			return {};
		}

		const settings = { ...state.settings };
		const changedSettingKeys = state.changedSettingKeys.slice();
		settings[key] = Setting.formatValue(key, value);
		if (changedSettingKeys.indexOf(key) < 0) changedSettingKeys.push(key);

		return {
			settings: settings,
			changedSettingKeys: changedSettingKeys,
		};
	}, callback);
};

const scheduleSaveSettings = function(comp: any): void {
	if (scheduleSaveSettingsIID) clearTimeout(scheduleSaveSettingsIID);

	scheduleSaveSettingsIID = setTimeout(() => {
		scheduleSaveSettingsIID = null;
		saveSettings(comp);
	}, 100);
};

const saveSettings = function(comp: Record<any, any>): void {
	// comp: { state: { changedSettingKeys: string[]; settings: { [x: string]: any;}; }; setState: (arg0: { changedSettingKeys: never[]; }) => void; }) {

	const savedSettingKeys = comp.state.changedSettingKeys.slice();

	for (const key in comp.state.settings) {
		if (!comp.state.settings.hasOwnProperty(key)) continue;
		if (comp.state.changedSettingKeys.indexOf(key) < 0) continue;
		Setting.setValue(key, comp.state.settings[key]);
	}

	comp.setState({ changedSettingKeys: [] });

	onSettingsSaved({ savedSettingKeys });
};

const settingsToComponents = function(comp: { settingToComponent: (arg0: any, arg1: any) => any; }, device: any, settings: { [x: string]: any; }) {
	const keys = Setting.keys(true, device);
	const settingComps = [];

	for (let i = 0; i < keys.length; i++) {
		const key = keys[i];
		if (!Setting.isPublic(key)) continue;

		const md = Setting.settingMetadata(key);
		if (md.show && !md.show(settings)) continue;

		const settingComp = comp.settingToComponent(key, settings[key]);
		if (!settingComp) continue;
		settingComps.push(settingComp);
	}

	return settingComps;
};

const deviceSelector = (state: { device: any; }) => state.device;
const settingsSelector = (state: { settings: any; }) => state.settings;

const settingsSections = createSelector(
	deviceSelector,
	settingsSelector,
	(device: any, settings: { [x: string]: any; }) => {

		const keys = Setting.keys(true, device);
		const metadatas = [];

		for (let i = 0; i < keys.length; i++) {
			const key = keys[i];
			if (!Setting.isPublic(key)) continue;

			const md = Setting.settingMetadata(key);
			if (md.show && !md.show(settings)) continue;

			metadatas.push(md);
		}

		const output = Setting.groupMetadatasBySections(metadatas);

		output.push({
			name: 'encryption',
			metadatas: [],
			isScreen: true,
		});

		output.push({
			name: 'server',
			metadatas: [],
			isScreen: true,
		});

		output.push({
			name: 'keymap',
			metadatas: [],
			isScreen: true,
		});

		// Ideallly we would also check if the user was able to synchronize
		// but we don't have a way of doing that besides making a request to Joplin Cloud
		const syncTargetIsJoplinCloud = settings['sync.target'] === SyncTargetRegistry.nameToId('joplinCloud');
		if (syncTargetIsJoplinCloud) {
			output.push({
				name: 'joplinCloud',
				metadatas: [],
				isScreen: true,
			});
		}

		const order = Setting.sectionOrder();

		output.sort((a: { name: any; }, b: { name: any; }) => {
			const o1 = order.indexOf(a.name);
			const o2 = order.indexOf(b.name);
			return o1 < o2 ? -1 : +1;
		});

		return output;
	},
);

const settingsToComponents2 = function(comp: { sectionToComponent: (arg0: any, arg1: any, arg2: any, arg3: boolean) => any; }, device: any, settings: any, selectedSectionName = '') {
	const sectionComps = [];
	const sections = shared.settingsSections({ device, settings });

	for (let i = 0; i < sections.length; i++) {
		const section = sections[i];
		const sectionComp = comp.sectionToComponent(section.name, section, settings, selectedSectionName === section.name);
		if (!sectionComp) continue;
		sectionComps.push(sectionComp);
	}

	return sectionComps;
};

export const shared = {
	init,
	advancedSettingsButton_click,
	checkSyncConfig,
	checkSyncConfigMessages,
	updateSettingValue,
	scheduleSaveSettings,
	saveSettings,
	settingsToComponents,
	settingsSections,
	settingsToComponents2,
}