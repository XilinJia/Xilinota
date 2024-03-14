/* eslint-disable no-console */
import React from 'react';
import { useMemo, useEffect, useCallback, useState, JSX } from 'react';
import { Easing, Animated, TouchableOpacity, Text, StyleSheet, ScrollView, View, Alert, Image, GestureResponderEvent } from 'react-native';
// import { Menu, MenuProvider, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';
import { connect } from 'react-redux';

// can't do: import DialogBox from 'react-native-dialogbox';
const DialogBox = require('react-native-dialogbox').default;
import Icon from 'react-native-vector-icons/Ionicons';

import Folder from '@xilinota/lib/models/Folder';
import Synchronizer from '@xilinota/lib/Synchronizer';
import NavService from '@xilinota/lib/services/NavService';
import { _ } from '@xilinota/lib/locale';
import { shared } from '@xilinota/lib/components/shared/side-menu-shared';
import { FolderEntity, FolderIcon, NoteEntity, TagEntity } from '@xilinota/lib/services/database/types';
import { AppState } from '../utils/types';
import Setting from '@xilinota/lib/models/Setting';
import { reg } from '@xilinota/lib/registry';
import { ProfileConfig } from '@xilinota/lib/services/profileConfig/types';
import { PeerSocket, PeersFolder } from '@xilinota/lib/models/Peers';
import Note from '@xilinota/lib/models/Note';
import SearchEngineUtils from '@xilinota/lib/services/searchengine/SearchEngineUtils';
import Tag from '@xilinota/lib/models/Tag';
// import SearchEngineUtils from '@xilinota/lib/services/searchengine/SearchEngineUtils';

import { themeStyle } from './global-style';
import NoteTagsDialog from './screens/NoteTagsDialog';

// We need this to suppress the useless warning
// https://github.com/oblador/react-native-vector-icons/issues/1465

Icon.loadFont().catch((error: Error) => { console.info(error); });

interface Props {
	syncStarted: boolean;
	themeId: number;
	sideMenuVisible: boolean;
	dispatch: Function;
	collapsedFolderIds: string[];
	syncReport: any;
	decryptionWorker: any;
	resourceFetcher: any;
	syncOnlyOverWifi: boolean;
	isOnMobileData: boolean;
	notesParentType: string;
	folders: FolderEntity[];
	tags: TagEntity[];
	opacity: number;
	profileConfig: ProfileConfig | null;
	inboxJopId: string;
	ftsEnabled: boolean;
	selectedNoteIds: string[];
}

const syncIconRotationValue = new Animated.Value(0);

const syncIconRotation = syncIconRotationValue.interpolate({
	inputRange: [0, 1],
	outputRange: ['0deg', '360deg'],
});

const folderIconRightMargin = 10;

let syncIconAnimation: Animated.CompositeAnimation | null = null;

const SideMenuContentComponent = (props: Props): JSX.Element => {
	const alwaysShowFolderIcons = useMemo(() => Folder.shouldShowFolderIcons(props.folders), [props.folders]);

	const styles_ = useMemo(() => {
		const theme = themeStyle(props.themeId.toString());

		const styles: any = {
			menu: {
				// flex: 1,
				backgroundColor: theme.backgroundColor,
			},
			button: {
				flex: 1,
				flexDirection: 'row',
				height: 36,
				alignItems: 'center',
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
			},
			buttonText: {
				flex: 1,
				color: theme.color,
				paddingLeft: 10,
				fontSize: theme.fontSize,
			},
			syncStatus: {
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				color: theme.colorFaded,
				fontSize: theme.fontSizeSmaller,
				flex: 0,
			},
			sidebarIcon: {
				fontSize: 22,
				color: theme.color,
			},
		};

		styles.folderButton = { ...styles.button };
		styles.folderButton.paddingLeft = 0;
		styles.folderButtonText = { ...styles.buttonText, paddingLeft: 0 };
		styles.folderButtonSelected = { ...styles.folderButton };
		styles.folderButtonSelected.backgroundColor = theme.selectedColor;
		styles.folderIcon = { ...theme.icon };
		styles.folderIcon.color = theme.colorFaded; // '#0072d5';
		styles.folderIcon.paddingTop = 3;

		styles.sideButton = { ...styles.button, flex: 0 };
		styles.sideButtonSelected = { ...styles.sideButton, backgroundColor: theme.selectedColor };
		styles.sideButtonText = { ...styles.buttonText };

		styles.emptyFolderIcon = { ...styles.sidebarIcon, marginRight: folderIconRightMargin, width: 21 };

		return StyleSheet.create(styles);
	}, [props.themeId]);

	const allNotesButton_press = (): void => {
		props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		props.dispatch({
			type: 'NAV_GO',
			routeName: 'Notes',
			smartFilterId: 'c3176726992c11e9ac940492261af972',
		});
	};

	const renderFolderIcon = (theme: any, folderIcon: FolderIcon): JSX.Element | null => {
		if (!folderIcon) {
			if (alwaysShowFolderIcons) {
				return <Icon name="folder-outline" style={styles_.emptyFolderIcon} />;
			} else {
				return null;
			}
		}

		if (folderIcon.type === 1) { // FolderIconType.Emoji
			return <Text style={{ fontSize: theme.fontSize, marginRight: folderIconRightMargin, width: 20 }}>{folderIcon.emoji}</Text>;
		} else if (folderIcon.type === 2) { // FolderIconType.DataUrl
			return <Image style={{ width: 20, height: 20, marginRight: folderIconRightMargin, resizeMode: 'contain' }} source={{ uri: folderIcon.dataUrl }} />;
		} else {
			throw new Error(`Unsupported folder icon type: ${folderIcon.type}`);
		}
	};

	// const renderNoteCount = (count: number) => {
	// 	return count ? <StyledNoteCount className="note-count-label">{count}</StyledNoteCount> : null;
	// };

	const makeDivider = (key: string): JSX.Element => {
		const theme = themeStyle(props.themeId.toString());
		return <View style={{ marginTop: 15, marginBottom: 15, flex: -1, borderBottomWidth: 1, borderBottomColor: theme.dividerColor }} key={key}></View>;
	};

	const [folderExpanded, setFolderExpanded] = useState(true);
	const folderButton_press = (): void => {
		setFolderExpanded(!folderExpanded);
		console.log('folderButton_press folderButton_press', folderExpanded);
	};

	const renderSidebarButton = (key: string, title: string, iconName: string,
		onPressHandler: ((event: GestureResponderEvent) => void) | null = null, selected = false): JSX.Element => {

		let icon = <Icon name={iconName} style={styles_.sidebarIcon} />;

		if (key === 'synchronize_button') {
			icon = <Animated.View style={{ transform: [{ rotate: syncIconRotation }] }}>{icon}</Animated.View>;
		}

		const content = (
			<View key={key} style={selected ? styles_.sideButtonSelected : styles_.sideButton}>
				{icon}
				<Text style={styles_.sideButtonText}>{title}</Text>
			</View>
		);

		if (!onPressHandler) return content;

		return (
			<TouchableOpacity key={key} onPress={onPressHandler}>
				{content}
			</TouchableOpacity>
		);
	};

	const theme = themeStyle(props.themeId.toString());

	const folder_press = (folder: FolderEntity): void => {
		props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		props.dispatch({
			type: 'NAV_GO',
			routeName: 'Notes',
			folderId: folder.id,
		});
	};

	const folder_longPress = async (folderOrAll: FolderEntity | string): Promise<void> => {
		if (folderOrAll === 'all') return;

		const folder = folderOrAll as FolderEntity;

		const generateFolderDeletion = (): void => {
			const folderDeletion = (message: string) => {
				Alert.alert('', message, [
					{
						text: _('OK'),
						onPress: () => {
							if (folder.id) {
								void PeersFolder.deleteOnPeers(folder.id);
								void Folder.delete(folder.id);
							}
						},
					},
					{
						text: _('Cancel'),
						onPress: () => { },
						style: 'cancel',
					},
				]);
			};

			if (folder.id === props.inboxJopId) {
				return folderDeletion(
					_('Delete the Inbox notebook?\n\nIf you delete the inbox notebook, any email that\'s recently been sent to it may be lost.'),
				);
			}
			return folderDeletion(_('Delete notebook "%s"?\n\nAll notes and sub-notebooks within this notebook will also be deleted.', folder.title));
		};

		const generateFolderSend = (): void => {
			const folderSend = (message: string) => {
				Alert.alert('', message, [
					{
						text: _('OK'),
						onPress: async () => {
							if (folder.id) await PeersFolder.sendToPeers(folder.id);
						},
					},
					{
						text: _('Cancel'),
						onPress: () => { },
						style: 'cancel',
					},
				]);
			};

			// if (folder.id === props.inboxJopId) {
			// 	return folderSend(
			// 		_('Delete the Inbox notebook?\n\nIf you delete the inbox notebook, any email that\'s recently been sent to it may be lost.'),
			// 	);
			// }
			return folderSend(_('Send notebook "%s"?\n\nAll notes and sub-notebooks within this notebook will also be sent.', folder.title));
		};

		const handleEdit = (): void => {
			props.dispatch({ type: 'SIDE_MENU_CLOSE' });

			props.dispatch({
				type: 'NAV_GO',
				routeName: 'Folder',
				folderId: folder.id,
			});
		};

		// // const SimpleMenu = () => {
		// return (
		// 	<MenuProvider>
		// 		<Menu>
		// 			<MenuTrigger
		// 				text="Click for Option menu"
		// 				customStyles={{
		// 					triggerWrapper: {
		// 						top: -20,
		// 					},
		// 				}}
		// 			/>
		// 			<MenuOptions>
		// 				<MenuOption onSelect={() => handleEdit} text="Edit" />
		// 				{!folder.parent_id && <MenuOption onSelect={() => generateFolderSend} text="Send" />}
		// 				<MenuOption onSelect={() => generateFolderDeletion()} text="Delete" />
		// 			</MenuOptions>
		// 		</Menu>
		// 	</MenuProvider>
		// );
		// // };

		const buttonConfig: {
			text: string;
			onPress: () => void;
			style: 'default' | 'cancel' | 'destructive' | undefined;
		}[] = [
				{
					text: _('Edit'),
					onPress: () => {
						handleEdit();
					},
					style: 'default',
				},
			];
		if (!folder.parent_id && PeerSocket.broadcaster) {
			buttonConfig.push({
				text: _('Send'),
				onPress: generateFolderSend,
				style: 'default',
			});
		}
		buttonConfig.push({
			text: _('Delete'),
			onPress: generateFolderDeletion,
			style: 'destructive',
		});
		buttonConfig.push({
			text: _('Cancel'),
			onPress: () => { },
			style: 'cancel',
		});
		Alert.alert(
			'',
			_('Notebook: %s', folder.title),
			buttonConfig,
			{
				cancelable: true,
			},
		);
	};

	const folder_togglePress = (folder: FolderEntity): void => {
		props.dispatch({
			type: 'FOLDER_TOGGLE',
			id: folder.id,
		});
	};

	const renderFolderItem = (folder: FolderEntity, selected: boolean, hasChildren: boolean, depth: number): JSX.Element => {

		const theme = themeStyle(props.themeId.toString());
		const folderButtonStyle: Record<string, any> = {
			flex: 1,
			flexDirection: 'row',
			height: 36,
			alignItems: 'center',
			paddingRight: theme.marginRight,
			paddingLeft: 10,
		};

		if (selected) folderButtonStyle.backgroundColor = theme.selectedColor;
		folderButtonStyle.paddingRight = theme.marginRight;
		folderButtonStyle.paddingLeft = depth * 10 + theme.marginLeft;

		const iconWrapperStyle: Record<string, any> = { paddingLeft: 10, paddingRight: 10 };
		if (selected) iconWrapperStyle.backgroundColor = theme.selectedColor;

		// let iconWrapper = null;

		const collapsed = folder.id ? props.collapsedFolderIds.indexOf(folder.id) >= 0 : false;
		const iconName = collapsed ? 'chevron-down' : 'chevron-up';
		const iconComp = <Icon name={iconName} style={styles_.folderIcon} />;

		const iconWrapper: JSX.Element = (
			<TouchableOpacity
				style={iconWrapperStyle}
				// folderid={folder.id}
				onPress={() => {
					if (hasChildren) folder_togglePress(folder);
				}}

				accessibilityLabel={collapsed ? _('Expand') : _('Collapse')}
				accessibilityRole="togglebutton"
			>
				{iconComp}
			</TouchableOpacity>
		);

		const folderIcon = Folder.unserializeIcon(folder.icon ?? '');

		return (
			<View key={folder.id} style={{ flex: 1, flexDirection: 'row' }}>
				<TouchableOpacity
					style={{ flex: 1 }}
					onPress={() => {
						folder_press(folder);
					}}
					onLongPress={() => {
						void folder_longPress(folder);
					}}
				>
					<View style={folderButtonStyle}>
						{folderIcon ? renderFolderIcon(theme, folderIcon) : null}
						<Text numberOfLines={1} style={styles_.folderButtonText}>
							{Folder.displayTitle(folder)}
						</Text>
					</View>
				</TouchableOpacity>
				{iconWrapper}
			</View>
		);
	};

	const [tagExpanded, setTagExpanded] = useState(true);
	const tagButton_press = (): void => {
		setTagExpanded(!tagExpanded);
		// console.log('tagButton_press tagExpanded', tagExpanded);
	};

	const tagItem_press = (tag: TagEntity): void => {
		props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		props.dispatch({
			type: 'NAV_GO',
			routeName: 'Notes',
			tagId: tag.id,
		});
	};

	const refreshSearch = async (query: string = ''): Promise<NoteEntity[]> => {
		let notes: NoteEntity[] = [];
		if (query) {
			if (props.ftsEnabled) {

				// console.log('refreshSearch ftsEnabled');
				notes = await SearchEngineUtils.notesForQuery(query, true);
			} else {
				const p = query.split(' ');
				const temp = [];
				for (let i = 0; i < p.length; i++) {
					const t = p[i].trim();
					if (!t) continue;
					temp.push(t);
				}
				notes = await Note.previews('', {
					anywherePattern: `*${temp.join('*')}*`,
				});
			}
		}
		// setState({ notes: notes });
		return notes;
	};

	const tagItem_longPress = async (tag: TagEntity): Promise<void> => {

		const generateTagDeletion = async (): Promise<void> => {
			const tagDeletion = (message: string) => {
				Alert.alert('', message, [
					{
						text: _('OK'),
						onPress: () => {
							if (tag.id) void Tag.delete(tag.id);
						},
					},
					{
						text: _('Cancel'),
						onPress: () => { },
						style: 'cancel',
					},
				]);
			};

			return tagDeletion(_('Delete tag "%s"?', tag.title));
		};

		const goVirtual = async (): Promise<void> => {
			const notes = await refreshSearch(tag.title);

			props.dispatch({
				type: 'NAV_GO',
				routeName: 'Notes',
				Virtual: { parent: tag.title, notes: notes },
			});
		};

		const buttonConfig: {
			text: string;
			onPress: () => void;
			style: 'default' | 'cancel' | 'destructive' | undefined;
		}[] = [
				{
					text: _('Virtual'),
					onPress: async () => {
						await goVirtual();
					},
					style: 'default',
				},
			];
		buttonConfig.push({
			text: _('Delete'),
			onPress: generateTagDeletion,
			style: 'destructive',
		});
		buttonConfig.push({
			text: _('Cancel'),
			onPress: async () => { },
			style: 'cancel',
		});
		Alert.alert(
			'',
			_('Tag: %s', tag.title),
			buttonConfig,
			{
				cancelable: true,
			},
		);
	};

	const renderTag = (tag: TagEntity): JSX.Element => {
		const tagButtonStyle: Record<string, any> = {
			flexDirection: 'row',
			height: 20,
			alignItems: 'center',
			paddingRight: theme.marginRight,
			paddingLeft: 5,
		};
		const buttonTextStyle: Record<string, any> = {
			color: theme.color,
			fontSize: theme.fontSize,
		};

		return (
			<View key={tag.id} style={{ margin: 5, padding: 5 }}>
				<TouchableOpacity
					onPress={() => {
						tagItem_press(tag);
					}}
					onLongPress={async () => await tagItem_longPress(tag)}
				>
					<View style={tagButtonStyle}>
						<Text style={buttonTextStyle}>{tag.title}</Text>
					</View>
				</TouchableOpacity>
			</View>
		);
	};

	const folderTagHeader = (key: string, title: string, iconName: string,
		onPressHandler: ((event: GestureResponderEvent) => void) | null = null): JSX.Element => {

		const buttonText = {
			color: theme.color,
			paddingLeft: 10,
			fontSize: theme.fontSize,
		};

		const icon = <Icon name={iconName} style={styles_.sidebarIcon} />;
		const content = (
			<View key={key} style={styles_.sideButton}>
				{icon}
				<Text style={buttonText}>{title}</Text>
			</View>
		);

		if (!onPressHandler) return content;

		return (
			<TouchableOpacity key={key} onPress={onPressHandler}>
				{content}
			</TouchableOpacity>
		);
	};

	const folderHeader = folderTagHeader('folder_header', 'Notebooks', 'folder', folderButton_press);
	const newFolderButton_press = (): void => {
		props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		props.dispatch({
			type: 'NAV_GO',
			routeName: 'Folder',
			folderId: null,
		});
	};

	const folderHeaderComb = (): JSX.Element => {
		return (
			<View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
				{folderHeader}
				{folderTagHeader('newFolder_button', _(''), 'add', newFolderButton_press)}
			</View>
		);
	};

	let folderItems: JSX.Element[] = [];
	if (props.folders.length) {
		const result = shared.renderFolders(props, renderFolderItem);
		folderItems = result.items;
	}

	const [noteTagDialogShown, setNoteTagDialogShown] = useState(false);
	const noteTagDialog_closeRequested = (): void => {
		setNoteTagDialogShown(false);
	};
	const noteTagDialog = !noteTagDialogShown ? null : <NoteTagsDialog onCloseRequested={noteTagDialog_closeRequested} />;

	const newTagButton_press = (): void => {
		props.selectedNoteIds = [];
		setNoteTagDialogShown(true);
	};
	const tagHeader = folderTagHeader('tag_button', _('Tags'), 'pricetag', tagButton_press);
	const tagHeaderComb = (): JSX.Element => {
		return (
			<View style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between' }}>
				{tagHeader}
				{folderTagHeader('newTag_button', _(''), 'add', newTagButton_press)}
			</View>
		);
	};

	let tagItems: JSX.Element[] = [];
	// reg.logger().info('SideMenuContentComponent tagExpanded', tagExpanded);
	if (props.tags.length) {
		const result = shared.renderTags(props, renderTag);
		tagItems = result.items;
	}

	const tagItemsView = (): JSX.Element => {
		return (
			<ScrollView contentContainerStyle={{ flexDirection: 'row', flexWrap: 'wrap' }}>
				{tagItems.map((item, index) => (
					<View key={index}>
						{item}
					</View>
				))}
			</ScrollView>
		);
	};

	useEffect(() => {
		if (props.syncStarted) {
			syncIconAnimation = Animated.loop(
				Animated.timing(syncIconRotationValue, {
					toValue: 1,
					duration: 3000,
					easing: Easing.linear,
					useNativeDriver: false,
				}),
			);

			syncIconAnimation.start();
		} else {
			if (syncIconAnimation) syncIconAnimation.stop();
			syncIconAnimation = null;
		}
	}, [props.syncStarted]);

	const performSync = useCallback(async (): Promise<"cancel" | "sync" | "init" | "auth" | "error"> => {
		const action = props.syncStarted ? 'cancel' : 'start';

		if (!Setting.value('sync.target')) {
			props.dispatch({
				type: 'SIDE_MENU_CLOSE',
			});

			props.dispatch({
				type: 'NAV_GO',
				routeName: 'Config',
				sectionName: 'sync',
			});

			return 'init';
		}

		if (!(await reg.syncTarget().isAuthenticated())) {
			if (reg.syncTarget().authRouteName()) {
				props.dispatch({
					type: 'NAV_GO',
					routeName: reg.syncTarget().authRouteName(),
				});
				return 'auth';
			}

			reg.logger().error('Not authenticated with sync target - please check your credentials.');
			return 'error';
		}

		let sync = null;
		try {
			sync = await reg.syncTarget().synchronizer();
		} catch (error) {
			reg.logger().error('Could not initialise synchroniser: ');
			reg.logger().error(error);
			const err = error as Error;
			err.message = `Could not initialise synchroniser: ${err.message}`;
			props.dispatch({
				type: 'SYNC_REPORT_UPDATE',
				report: { errors: [err] },
			});
			return 'error';
		}

		if (action === 'cancel') {
			void sync.cancel();
			return 'cancel';
		} else {
			void reg.scheduleSync(0);
			return 'sync';
		}
	}, [props.syncStarted, props.dispatch]);

	const synchronize_press = useCallback(async (): Promise<void> => {
		const actionDone = await performSync();
		if (actionDone === 'auth') props.dispatch({ type: 'SIDE_MENU_CLOSE' });
	}, [performSync, props.dispatch]);

	const renderSyncButton = (items: JSX.Element[]): void => {
		const lines = Synchronizer.reportToLines(props.syncReport);
		const syncReportText = lines.join('\n');

		let decryptionReportText = '';
		if (props.decryptionWorker && props.decryptionWorker.state !== 'idle' && props.decryptionWorker.itemCount) {
			decryptionReportText = _('Decrypting items: %d/%d', props.decryptionWorker.itemIndex + 1, props.decryptionWorker.itemCount);
		}

		let resourceFetcherText = '';
		if (props.resourceFetcher && props.resourceFetcher.toFetchCount) {
			resourceFetcherText = _('Fetching resources: %d/%d', props.resourceFetcher.fetchingCount, props.resourceFetcher.toFetchCount);
		}

		const fullReport = [];
		if (syncReportText) fullReport.push(syncReportText);
		if (resourceFetcherText) fullReport.push(resourceFetcherText);
		if (decryptionReportText) fullReport.push(decryptionReportText);

		items.push(renderSidebarButton('synchronize_button', !props.syncStarted ? _('Synchronise') : _('Cancel'), 'sync', synchronize_press));

		if (fullReport.length) {
			items.push(
				<Text key="sync_report" style={styles_.syncStatus}>
					{fullReport.join('\n')}
				</Text>,
			);
		}

		if (props.syncOnlyOverWifi && props.isOnMobileData) {
			items.push(
				<Text key="net_info" style={styles_.syncStatus}>
					{_('Mobile data - auto-sync disabled')}
				</Text>,
			);
		}
	};

	const switchProfileButton_press = (): void => {
		props.dispatch({ type: 'SIDE_MENU_CLOSE' });

		props.dispatch({
			type: 'NAV_GO',
			routeName: 'ProfileSwitcher',
		});
	};

	const configButton_press = (): void => {
		props.dispatch({ type: 'SIDE_MENU_CLOSE' });
		void NavService.go('Config');
	};

	const renderBottomPanel = (): JSX.Element => {
		const theme = themeStyle(props.themeId.toString());

		const items = [];

		items.push(makeDivider('divider_1'));

		// items.push(renderSidebarButton('newFolder_button', _('New Notebook'), 'folder-open', newFolderButton_press));

		if (props.profileConfig && props.profileConfig.profiles.length > 1) {
			items.push(renderSidebarButton('switchProfile_button', _('Switch profile'), 'people-circle-outline', switchProfileButton_press));
		}

		items.push(renderSidebarButton('config_button', _('Configuration'), 'settings', configButton_press));

		if (Setting.value('sync.target') > 0) {
			items.push(makeDivider('divider_2'));
			renderSyncButton(items);
		}
		return <View style={{ flex: 0, flexDirection: 'column', paddingBottom: theme.marginBottom }}>{items}</View>;
	};

	const renderAllNotes = renderSidebarButton('all_notes', _('All notes'), 'document', allNotesButton_press, props.notesParentType === 'SmartFilter');

	// HACK: inner height of ScrollView doesn't appear to be calculated correctly when
	// using padding. So instead creating blank elements for padding bottom and top.

	const isHidden = !props.sideMenuVisible;

	const style = {
		flex: 1,
		borderRightWidth: 1,
		borderRightColor: theme.dividerColor,
		backgroundColor: theme.backgroundColor,

		// Have the UI reflect whether the View is hidden to the screen reader.
		// This way, there will be visual feedback if isHidden is incorrect.
		opacity: isHidden ? 0.5 : undefined,
	};

	// Note: iOS uses accessibilityElementsHidden and Android uses importantForAccessibility
	//       to hide elements from the screenreader.
	// {/* <DialogBox
	// 	ref={(_dialogbox: any) => {
	// 		// dialogbox = _dialogbox;
	// 	}}
	// /> */}

	return (
		<View
			style={style}
			accessibilityElementsHidden={isHidden}
			importantForAccessibility={isHidden ? 'no-hide-descendants' : undefined}
		>
			<View style={{ flex: 1, opacity: props.opacity }}>
				<View style={{ height: theme.marginTop }} key="bottom_top_hack" />
				{renderAllNotes}
				{makeDivider('divider_all')}
				<ScrollView scrollsToTop={false} style={styles_.menu}>
					{folderHeaderComb()}
					{folderExpanded ? folderItems : null}
					{makeDivider('divider_all')}
					{tagHeaderComb()}
					{tagExpanded ? tagItemsView() : null}
				</ScrollView>
				{renderBottomPanel()}
			</View>
			{noteTagDialog}
		</View>
	);
};

export default connect((state: AppState) => {
	return {
		folders: state.folders,
		tags: state.tags,
		syncStarted: state.syncStarted,
		syncReport: state.syncReport,
		selectedFolderId: state.selectedFolderId,
		selectedTagId: state.selectedTagId,
		notesParentType: state.notesParentType,
		locale: state.settings.locale,
		themeId: state.settings.theme,
		sideMenuVisible: state.showSideMenu,
		// Don't do the opacity animation as it means re-rendering the list multiple times
		// opacity: state.sideMenuOpenPercent,
		collapsedFolderIds: state.collapsedFolderIds,
		decryptionWorker: state.decryptionWorker,
		resourceFetcher: state.resourceFetcher,
		isOnMobileData: state.isOnMobileData,
		syncOnlyOverWifi: state.settings['sync.mobileWifiOnly'],
		profileConfig: state.profileConfig,
		inboxJopId: state.settings['sync.10.inboxId'],
		ftsEnabled: state.settings['db.ftsEnabled'],
		selectedNoteIds: state.selectedNoteIds,
	};
})(SideMenuContentComponent);
