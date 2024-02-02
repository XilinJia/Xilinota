// Helper functions to reduce the boiler plate of loading and saving profiles on
// mobile

import RNExitApp from 'react-native-exit-app';
import { Profile, ProfileConfig } from '@xilinota/lib/services/profileConfig/types';
import { loadProfileConfig as libLoadProfileConfig, saveProfileConfig as libSaveProfileConfig } from '@xilinota/lib/services/profileConfig/index';
import RNFetchBlob from 'rn-fetch-blob';


let dispatch_: Function | null = null;

export const setDispatch = (dispatch: Function): void => {
	dispatch_ = dispatch;
};

export const getProfilesRootDir = (): string => {
	return RNFetchBlob.fs.dirs.DocumentDir;
};

export const getProfilesConfigPath = (): string => {
	return `${getProfilesRootDir()}/profiles.json`;
};

// export const getResourceDir = (profile: Profile, isSubProfile: boolean) => {
// 	if (!isSubProfile) return getProfilesRootDir();
// 	return `${getProfilesRootDir()}/resources-${profile.id}`;
// };

// The suffix is for debugging only
export const getDatabaseName = (profile: Profile, isSubProfile: boolean, suffix = ''): string => {
	if (!isSubProfile) return `xilinota${suffix}.sqlite`;
	return `xilinota-${profile.id}${suffix}.sqlite`;
};

export const loadProfileConfig = async (): Promise<ProfileConfig> => {
	return libLoadProfileConfig(getProfilesConfigPath());
};

export const saveProfileConfig = async (profileConfig: ProfileConfig): Promise<void> => {
	await libSaveProfileConfig(getProfilesConfigPath(), profileConfig);
	if (dispatch_) dispatch_({
		type: 'PROFILE_CONFIG_SET',
		value: profileConfig,
	});
};

export const switchProfile = async (profileId: string): Promise<void> => {
	const config = await loadProfileConfig();
	if (config.currentProfileId === profileId) throw new Error('This profile is already active');

	config.currentProfileId = profileId;
	await saveProfileConfig(config);
	RNExitApp.exitApp();
};
