"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shared = void 0;
const Setting_1 = __importDefault(require("../../../models/Setting"));
const SyncTargetRegistry_1 = __importDefault(require("../../../SyncTargetRegistry"));
const ObjectUtils_1 = require("../../../ObjectUtils");
const locale_1 = require("../../../locale");
const reselect_1 = require("reselect");
const Logger_1 = __importDefault(require("@xilinota/utils/Logger"));
const logger = Logger_1.default.create('config-shared');
// shared.onSettingsSaved = () => {};
let scheduleSaveSettingsIID = null;
let onSettingsSaved;
const init = function (comp, reg) {
    if (!comp.state)
        comp.state = {};
    comp.state.checkSyncConfigResult = null;
    comp.state.settings = {};
    comp.state.changedSettingKeys = [];
    comp.state.showAdvancedSettings = false;
    onSettingsSaved = (event) => {
        const savedSettingKeys = event.savedSettingKeys;
        // After changing the sync settings we immediately trigger a sync
        // operation. This will ensure that the client gets the sync info as
        // early as possible, in particular the encryption state (encryption
        // keys, whether it's enabled, etc.). This should prevent situations
        // where the user tried to setup E2EE on the client even though it's
        // already been done on another client.
        if (savedSettingKeys.find((s) => s.startsWith('sync.'))) {
            logger.info('Sync settings have been changed - scheduling a sync');
            void reg.scheduleSync();
        }
    };
};
const advancedSettingsButton_click = (comp) => {
    comp.setState((state) => {
        return { showAdvancedSettings: !state.showAdvancedSettings };
    });
};
const checkSyncConfig = function (comp, settings) {
    return __awaiter(this, void 0, void 0, function* () {
        // comp: { state: { changedSettingKeys: string[]; settings: { [x: string]: any; }; }; setState: (arg0: { checkSyncConfigResult: any; }) => void; }, settings: { [x: string]: any; }) {
        const syncTargetId = settings['sync.target'];
        const SyncTargetClass = SyncTargetRegistry_1.default.classById(syncTargetId);
        const options = Object.assign(Object.assign({}, Setting_1.default.subValues(`sync.${syncTargetId}`, settings)), Setting_1.default.subValues('net', settings));
        comp.setState({ checkSyncConfigResult: 'checking' });
        const result = yield SyncTargetClass.checkConfig((0, ObjectUtils_1.convertValuesToFunctions)(options));
        comp.setState({ checkSyncConfigResult: result });
        if (result.ok) {
            // Users often expect config to be auto-saved at this point, if the config check was successful
            saveSettings(comp);
        }
        return result;
    });
};
const checkSyncConfigMessages = function (comp) {
    const result = comp.state.checkSyncConfigResult;
    const output = [];
    if (result === 'checking') {
        output.push((0, locale_1._)('Checking... Please wait.'));
    }
    else if (result && result.ok) {
        output.push((0, locale_1._)('Success! Synchronisation configuration appears to be correct.'));
    }
    else if (result && !result.ok) {
        output.push((0, locale_1._)('Error. Please check that URL, username, password, etc. are correct and that the sync target is accessible. The reported error was:'));
        output.push(result.errorMessage);
    }
    return output;
};
const updateSettingValue = function (comp, key, value, callback = () => { }) {
    // if (!callback) callback = () => { };
    comp.setState((state) => {
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
        const settings = Object.assign({}, state.settings);
        const changedSettingKeys = state.changedSettingKeys.slice();
        settings[key] = Setting_1.default.formatValue(key, value);
        if (changedSettingKeys.indexOf(key) < 0)
            changedSettingKeys.push(key);
        return {
            settings: settings,
            changedSettingKeys: changedSettingKeys,
        };
    }, callback);
};
const scheduleSaveSettings = function (comp) {
    if (scheduleSaveSettingsIID)
        clearTimeout(scheduleSaveSettingsIID);
    scheduleSaveSettingsIID = setTimeout(() => {
        scheduleSaveSettingsIID = null;
        saveSettings(comp);
    }, 100);
};
const saveSettings = function (comp) {
    // comp: { state: { changedSettingKeys: string[]; settings: { [x: string]: any;}; }; setState: (arg0: { changedSettingKeys: never[]; }) => void; }) {
    const savedSettingKeys = comp.state.changedSettingKeys.slice();
    for (const key in comp.state.settings) {
        if (!comp.state.settings.hasOwnProperty(key))
            continue;
        if (comp.state.changedSettingKeys.indexOf(key) < 0)
            continue;
        Setting_1.default.setValue(key, comp.state.settings[key]);
    }
    comp.setState({ changedSettingKeys: [] });
    onSettingsSaved({ savedSettingKeys });
};
const settingsToComponents = function (comp, device, settings) {
    const keys = Setting_1.default.keys(true, device);
    const settingComps = [];
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (!Setting_1.default.isPublic(key))
            continue;
        const md = Setting_1.default.settingMetadata(key);
        if (md.show && !md.show(settings))
            continue;
        const settingComp = comp.settingToComponent(key, settings[key]);
        if (!settingComp)
            continue;
        settingComps.push(settingComp);
    }
    return settingComps;
};
const deviceSelector = (state) => state.device;
const settingsSelector = (state) => state.settings;
const settingsSections = (0, reselect_1.createSelector)(deviceSelector, settingsSelector, (device, settings) => {
    const keys = Setting_1.default.keys(true, device);
    const metadatas = [];
    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        if (!Setting_1.default.isPublic(key))
            continue;
        const md = Setting_1.default.settingMetadata(key);
        if (md.show && !md.show(settings))
            continue;
        metadatas.push(md);
    }
    const output = Setting_1.default.groupMetadatasBySections(metadatas);
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
    const syncTargetIsJoplinCloud = settings['sync.target'] === SyncTargetRegistry_1.default.nameToId('joplinCloud');
    if (syncTargetIsJoplinCloud) {
        output.push({
            name: 'joplinCloud',
            metadatas: [],
            isScreen: true,
        });
    }
    const order = Setting_1.default.sectionOrder();
    output.sort((a, b) => {
        const o1 = order.indexOf(a.name);
        const o2 = order.indexOf(b.name);
        return o1 < o2 ? -1 : +1;
    });
    return output;
});
const settingsToComponents2 = function (comp, device, settings, selectedSectionName = '') {
    const sectionComps = [];
    const sections = exports.shared.settingsSections({ device, settings });
    for (let i = 0; i < sections.length; i++) {
        const section = sections[i];
        const sectionComp = comp.sectionToComponent(section.name, section, settings, selectedSectionName === section.name);
        if (!sectionComp)
            continue;
        sectionComps.push(sectionComp);
    }
    return sectionComps;
};
exports.shared = {
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
};
//# sourceMappingURL=config-shared.js.map