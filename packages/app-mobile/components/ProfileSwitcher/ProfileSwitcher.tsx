import React from 'react';
import { useCallback, useMemo, useState } from 'react';
import { View, FlatList, StyleSheet, TextStyle } from 'react-native';
import createRootStyle from '../../utils/createRootStyle';
import ScreenHeader from '../ScreenHeader';
import { FAB, List } from 'react-native-paper';
import { Profile } from '@xilinota/lib/services/profileConfig/types';
import useProfileConfig from './useProfileConfig';
import { Alert } from 'react-native';
import { _ } from '@xilinota/lib/locale';
import { deleteProfileById } from '@xilinota/lib/services/profileConfig';
import { saveProfileConfig, switchProfile } from '../../services/profiles';
import { themeStyle } from '../global-style';

interface Props {
	themeId: number;
	dispatch: Function;
}

const useStyle = (themeId: number) => {
	return useMemo(() => {
		const theme = themeStyle(themeId.toString());

		return StyleSheet.create({
			...createRootStyle(themeId),
			fab: {
				position: 'absolute',
				margin: 16,
				right: 0,
				bottom: 0,
			},
			profileListItem: {
				paddingLeft: theme.margin,
				paddingRight: theme.margin,
			},
		});
	}, [themeId]);
};

export default (props: Props) => {
	const style = useStyle(props.themeId);
	const [profileConfigTime, setProfileConfigTime] = useState(Date.now());

	const profileConfig = useProfileConfig(profileConfigTime);

	const profiles = useMemo(() => {
		return profileConfig ? profileConfig.profiles : [];
	}, [profileConfig]);

	const onProfileItemPress = useCallback(async (profile: Profile) => {
		const doIt = async () => {
			try {
				await switchProfile(profile.id);
			} catch (error) {
				Alert.alert(_('Could not switch profile: %s', (error as Error).message));
			}
		};

		Alert.alert(
			_('Confirmation'),
			_('To switch the profile, the app is going to close and you will need to restart it.'),
			[
				{
					text: _('Continue'),
					onPress: () => doIt(),
					style: 'default',
				},
				{
					text: _('Cancel'),
					onPress: () => { },
					style: 'cancel',
				},
			],
		);
	}, []);

	const onEditProfile = useCallback(async (profileId: string) => {
		props.dispatch({
			type: 'NAV_GO',
			routeName: 'ProfileEditor',
			profileId: profileId,
		});
	}, [props.dispatch]);

	const onDeleteProfile = useCallback(async (profile: Profile) => {
		const doIt = async () => {
			try {
				if (!profileConfig) return;
				const newConfig = deleteProfileById(profileConfig, profile.id);
				await saveProfileConfig(newConfig);
				setProfileConfigTime(Date.now());
			} catch (error) {
				Alert.alert((error as Error).message);
			}
		};

		Alert.alert(
			_('Delete this profile?'),
			_('All data, including notes, notebooks and tags will be permanently deleted.'),
			[
				{
					text: _('Delete profile "%s"', profile.name),
					onPress: () => doIt(),
					style: 'destructive',
				},
				{
					text: _('Cancel'),
					onPress: () => { },
					style: 'cancel',
				},
			],
		);
	}, [profileConfig]);

	const renderProfileItem = (event: any) => {
		const profile = event.item as Profile;
		const titleStyle: TextStyle = { fontWeight: profileConfig && profile.id === profileConfig.currentProfileId ? 'bold' : 'normal' };
		return (
			<List.Item
				title={profile.name}
				style={style.profileListItem}
				titleStyle={titleStyle}
				left={() => <List.Icon icon="file-account-outline" />}
				key={profile.id}
				// TODO: profileId doesn't exist
				// profileId={profile.id}
				onPress={() => { void onProfileItemPress(profile); }}
				onLongPress={() => {
					Alert.alert(
						_('Configuration'),
						'',
						[
							{
								text: _('Edit'),
								onPress: () => onEditProfile(profile.id),
								style: 'default',
							},
							{
								text: _('Delete'),
								onPress: () => onDeleteProfile(profile),
								style: 'default',
							},
							{
								text: _('Close'),
								onPress: () => { },
								style: 'cancel',
							},
						],
					);
				}}
			/>
		);
	};

	return (
		<View style={style.root}>
			<ScreenHeader title={_('Profiles')} showSaveButton={false} showSideMenuButton={false} showSearchButton={false} />
			<View>
				<FlatList
					data={profiles}
					renderItem={renderProfileItem}
					keyExtractor={(profile: Profile) => profile.id}
				/>
			</View>
			<FAB
				icon="plus"
				style={style.fab}
				onPress={() => {
					props.dispatch({
						type: 'NAV_GO',
						routeName: 'ProfileEditor',
					});
				}}
			/>

		</View>
	);
};
