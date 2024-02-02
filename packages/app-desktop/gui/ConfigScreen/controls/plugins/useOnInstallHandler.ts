import { useCallback } from 'react';
import PluginService, { defaultPluginSetting, PluginSettings } from '@xilinota/lib/services/plugins/PluginService';
import { produce } from 'immer';
import { _ } from '@xilinota/lib/locale';
import Logger from '@xilinota/utils/Logger';
import { ItemEvent } from './PluginBox';

const logger = Logger.create('useOnInstallHandler');

export interface OnPluginSettingChangeEvent {
	value: PluginSettings;
}

type OnPluginSettingChangeHandler = (event: OnPluginSettingChangeEvent) => void;


export default function(setInstallingPluginIds: Function, pluginSettings: PluginSettings, repoApi: Function, onPluginSettingsChange: OnPluginSettingChangeHandler, isUpdate: boolean) {
	return useCallback(async (event: ItemEvent) => {
		const pluginId = event.item.manifest.id;

		setInstallingPluginIds((prev: any) => {
			return {
				...prev, [pluginId]: true,
			};
		});

		let installError = null;

		try {
			if (isUpdate) {
				await PluginService.instance().updatePluginFromRepo(repoApi(), pluginId);
			} else {
				await PluginService.instance().installPluginFromRepo(repoApi(), pluginId);
			}
		} catch (error) {
			installError = error;
			logger.error(error);
		}

		if (!installError) {
			const newSettings = produce(pluginSettings, (draft: PluginSettings) => {
				draft[pluginId] = defaultPluginSetting();
				if (isUpdate) {
					if (pluginSettings[pluginId]) {
						draft[pluginId].enabled = pluginSettings[pluginId].enabled;
					}
					draft[pluginId].hasBeenUpdated = true;
				}
			});

			onPluginSettingsChange({ value: newSettings });
		}

		setInstallingPluginIds((prev: any) => {
			return {
				...prev, [pluginId]: false,
			};
		});

		if (installError instanceof Error) alert(_('Could not install plugin: %s', installError.message));

	}, [pluginSettings, onPluginSettingsChange]);
}
