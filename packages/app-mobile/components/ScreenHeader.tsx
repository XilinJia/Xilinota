import React from 'react';

import { connect } from 'react-redux';
import { PureComponent } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, ScrollView, Dimensions, ViewStyle } from 'react-native';

import Icon from 'react-native-vector-icons/Ionicons';
const DialogBox = require('react-native-dialogbox').default;

import BackButtonService from '../services/back-button';
import NavService from '@xilinota/lib/services/NavService';
import { Menu, MenuOptions, MenuOption, MenuTrigger } from 'react-native-popup-menu';
import { _, _n } from '@xilinota/lib/locale';
import Setting from '@xilinota/lib/models/Setting';
import Note from '@xilinota/lib/models/Note';
import Folder from '@xilinota/lib/models/Folder';
import { themeStyle } from './global-style';
import { OnValueChangedListener } from './Dropdown';
import dialogs from '../utils/dialogs';
import { localSyncInfoFromState } from '@xilinota/lib/services/synchronizer/syncInfoUtils';
import { showMissingMasterKeyMessage } from '@xilinota/lib/services/e2ee/utils';
import { FolderEntity } from '@xilinota/lib/services/database/types';
import { State } from '@xilinota/lib/reducer';
import CustomButton from './CustomButton';
import FolderPicker from './FolderPicker';
import { PeersNote } from '@xilinota/lib/models/Peers';
// import { reg } from '@xilinota/lib/registry';
// import BaseItem from '@xilinota/lib/models/BaseItem';
// import { socketIOClient } from '../utils/socketio';

// We need this to suppress the useless warning
// https://github.com/oblador/react-native-vector-icons/issues/1465

Icon.loadFont().catch((error: any) => { console.info(error); });

// Rather than applying a padding to the whole bar, it is applied to each
// individual component (button, picker, etc.) so that the touchable areas
// are widder and to give more room to the picker component which has a larger
// default height.
const PADDING_V = 10;

type OnSelectCallbackType = () => void;
type OnPressCallback = () => void;
interface NavButtonPressEvent {
	// Name of the screen to navigate to
	screen: string;
}

export interface MenuOptionType {
	onPress: OnPressCallback;
	isDivider?: boolean;
	title: string;
	disabled?: boolean;
}

export interface FolderPickerOptions {
	enabled: boolean;
	selectedFolderId?: string;
	onValueChange?: OnValueChangedListener;
	mustSelect?: boolean;
};

type DispatchCommandType = (event: { type: string }) => void;

interface ScreenHeaderProps {
	selectedNoteIds: string[];
	noteSelectionEnabled: boolean;
	parentComponent: any;
	showUndoButton: boolean;
	undoButtonDisabled?: boolean;
	showRedoButton: boolean;
	menuOptions: MenuOptionType[];
	title?: string | null;
	folders: FolderEntity[];
	folderPickerOptions?: FolderPickerOptions;

	peerPickerOptions?: {
		enabled: boolean;
		selectedFolderId?: string;
		onValueChange?: OnValueChangedListener;
		mustSelect?: boolean;
	};

	dispatch: DispatchCommandType;
	onUndoButtonPress: OnPressCallback;
	onRedoButtonPress: OnPressCallback;
	onSaveButtonPress: OnPressCallback;
	sortButton_press?: OnPressCallback;

	showSideMenuButton?: boolean;
	showSearchButton?: boolean;
	showContextMenuButton?: boolean;
	showBackButton?: boolean;

	saveButtonDisabled?: boolean;
	showSaveButton?: boolean;

	historyCanGoBack?: boolean;
	showMissingMasterKeyMessage?: boolean;
	hasDisabledSyncItems?: boolean;
	hasDisabledEncryptionItems?: boolean;
	shouldUpgradeSyncTarget?: boolean;
	showShouldUpgradeSyncTargetMessage?: boolean;

	themeId: number;
}

interface ScreenHeaderState {
}

class ScreenHeaderComponent extends PureComponent<ScreenHeaderProps, ScreenHeaderState> {
	private cachedStyles: any;
	public dialogbox?: typeof DialogBox;

	public constructor(props: ScreenHeaderProps) {
		super(props);
		this.cachedStyles = {};
	}

	private styles() {
		const themeId = this.props.themeId;
		if (this.cachedStyles[themeId]) return this.cachedStyles[themeId];
		this.cachedStyles = {};

		const theme = themeStyle(themeId.toString());

		const styleObject: any = {
			container: {
				flexDirection: 'column',
				backgroundColor: theme.backgroundColor2,
				alignItems: 'center',
				shadowColor: '#000000',
				elevation: 5,
			},
			divider: {
				borderBottomWidth: 1,
				borderColor: theme.dividerColor,
				backgroundColor: '#0000ff',
			},
			sideMenuButton: {
				flex: 1,
				alignItems: 'center',
				backgroundColor: theme.backgroundColor2,
				paddingLeft: theme.marginLeft,
				paddingRight: 5,
				marginRight: 2,
				paddingTop: PADDING_V,
				paddingBottom: PADDING_V,
			},
			iconButton: {
				flex: 1,
				backgroundColor: theme.backgroundColor2,
				paddingLeft: 10,
				paddingRight: 10,
				paddingTop: PADDING_V,
				paddingBottom: PADDING_V,
			},
			saveButton: {
				flex: 0,
				flexDirection: 'row',
				alignItems: 'center',
				padding: 10,
				borderWidth: 1,
				borderColor: theme.colorBright2,
				borderRadius: 4,
				marginRight: 8,
			},
			saveButtonText: {
				textAlignVertical: 'center',
				color: theme.colorBright2,
				fontWeight: 'bold',
			},
			savedButtonIcon: {
				fontSize: 20,
				color: theme.colorBright2,
				width: 18,
				height: 18,
			},
			saveButtonIcon: {
				width: 18,
				height: 18,
			},
			contextMenuTrigger: {
				fontSize: 30,
				paddingLeft: 10,
				paddingRight: theme.marginRight,
				color: theme.color2,
				fontWeight: 'bold',
			},
			contextMenu: {
				backgroundColor: theme.backgroundColor2,
			},
			contextMenuItem: {
				backgroundColor: theme.backgroundColor,
			},
			contextMenuItemText: {
				flex: 1,
				textAlignVertical: 'center',
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
				paddingTop: theme.itemMarginTop,
				paddingBottom: theme.itemMarginBottom,
				color: theme.color,
				backgroundColor: theme.backgroundColor,
				fontSize: theme.fontSize,
			},
			titleText: {
				flex: 1,
				textAlignVertical: 'center',
				marginLeft: 10,
				color: theme.colorBright2,
				fontWeight: 'bold',
				fontSize: theme.fontSize,
				paddingTop: 15,
				paddingBottom: 15,
			},
			warningBox: {
				backgroundColor: '#ff9900',
				flexDirection: 'row',
				padding: theme.marginLeft,
			},
		};

		styleObject.contextMenuItemTextDisabled = {
			...styleObject.contextMenuItemText,
			opacity: 0.5,
		};

		styleObject.topIcon = { ...theme.icon };
		styleObject.topIcon.flex = 1;
		styleObject.topIcon.textAlignVertical = 'center';
		styleObject.topIcon.color = theme.colorBright2;

		styleObject.backButton = { ...styleObject.iconButton };
		styleObject.backButton.marginRight = 1;

		styleObject.backButtonDisabled = { ...styleObject.backButton, opacity: theme.disabledOpacity };
		styleObject.saveButtonDisabled = { ...styleObject.saveButton, opacity: theme.disabledOpacity };
		styleObject.iconButtonDisabled = { ...styleObject.iconButton, opacity: theme.disabledOpacity };

		this.cachedStyles[themeId] = StyleSheet.create(styleObject);
		return this.cachedStyles[themeId];
	}

	private sideMenuButton_press(): void {
		this.props.dispatch({ type: 'SIDE_MENU_TOGGLE' });
	}

	private async backButton_press(): Promise<void> {
		if (this.props.noteSelectionEnabled) {
			this.props.dispatch({ type: 'NOTE_SELECTION_END' });
		} else {
			await BackButtonService.back();
		}
	}

	private selectAllButton_press(): void {
		this.props.dispatch({ type: 'NOTE_SELECT_ALL_TOGGLE' });
	}

	private searchButton_press(): void {
		void NavService.go('Search');
	}

	private async duplicateButton_press(): Promise<void> {
		const noteIds = this.props.selectedNoteIds;

		this.props.dispatch({ type: 'NOTE_SELECTION_END' });

		try {
			// Duplicate all selected notes. ensureUniqueTitle is set to true to use the
			// original note's name as a root for the new unique identifier.
			await Note.duplicateMultipleNotes(noteIds, { ensureUniqueTitle: true });
		} catch (error) {
			alert(_n('This note could not be duplicated: %s', 'These notes could not be duplicated: %s', noteIds.length, (error as Error).message));
		}
	}

	private async deleteButton_press(): Promise<void> {
		// Dialog needs to be displayed as a child of the parent component, otherwise
		// it won't be visible within the header component.
		const noteIds = this.props.selectedNoteIds;

		const msg = await Note.deleteMessage(noteIds);
		if (!msg) return;

		const ok = await dialogs.confirm(this.props.parentComponent, msg);
		if (!ok) return;

		this.props.dispatch({ type: 'NOTE_SELECTION_END' });

		try {
			await Note.batchDelete(noteIds);
			await PeersNote.batchDeleteOnPeers(noteIds);
		} catch (error) {
			alert(_n('This note could not be deleted: %s', 'These notes could not be deleted: %s', noteIds.length, (error as Error).message));
		}
	}

	private menu_select(value: OnSelectCallbackType): void {
		if (typeof value === 'function') {
			value();
		}
	}

	private warningBox_press(event: NavButtonPressEvent): void {
		void NavService.go(event.screen);
	}

	private renderWarningBox(screen: string, message: string): React.JSX.Element {
		return (
			<TouchableOpacity key={screen} style={this.styles().warningBox} onPress={() => this.warningBox_press({ screen: screen })} activeOpacity={0.8}>
				<Text style={{ flex: 1 }}>{message}</Text>
			</TouchableOpacity>
		);
	}

	public render(): React.JSX.Element {
		const themeId = this.props.themeId;
		function sideMenuButton(styles: any, onPress: OnPressCallback): React.JSX.Element {
			return (
				<TouchableOpacity
					onPress={onPress}

					accessibilityLabel={_('Sidebar')}
					accessibilityHint={_('Show/hide the sidebar')}
					accessibilityRole="button">
					<View style={styles.sideMenuButton}>
						<Icon name="menu" style={styles.topIcon} />
					</View>
				</TouchableOpacity>
			);
		}

		function backButton(styles: any, onPress: OnPressCallback, disabled: boolean): React.JSX.Element {
			return (
				<TouchableOpacity
					onPress={onPress}
					disabled={disabled}

					accessibilityLabel={_('Back')}
					accessibilityRole="button">
					<View style={disabled ? styles.backButtonDisabled : styles.backButton}>
						<Icon
							name="arrow-back"
							style={styles.topIcon}
						/>
					</View>
				</TouchableOpacity>
			);
		}

		function saveButton(
			styles: any, onPress: OnPressCallback, disabled: boolean, show: boolean,
		): React.JSX.Element | null {
			if (!show) return null;

			const icon = disabled ? <Icon name="checkmark" style={styles.savedButtonIcon} /> : <Image style={styles.saveButtonIcon} source={require('./SaveIcon.png')} />;

			return (
				<TouchableOpacity
					onPress={onPress}
					disabled={disabled}
					style={{ padding: 0 }}

					accessibilityLabel={_('Save changes')}
					accessibilityRole="button">
					<View style={disabled ? styles.saveButtonDisabled : styles.saveButton}>{icon}</View>
				</TouchableOpacity>
			);
		}

		interface TopButtonOptions {
			visible: boolean;
			iconName: string;
			disabled?: boolean;
			description: string;
			onPress: OnPressCallback;
		}
		const renderTopButton = (options: TopButtonOptions): React.JSX.Element | null => {
			if (!options.visible) return null;

			const icon = <Icon name={options.iconName} style={this.styles().topIcon} />;
			const viewStyle = options.disabled ? this.styles().iconButtonDisabled : this.styles().iconButton;

			return (
				<CustomButton
					onPress={options.onPress}
					style={{ padding: 0 }}
					themeId={themeId}
					disabled={!!options.disabled}
					description={options.description}
					contentStyle={viewStyle}
				>
					{icon}
				</CustomButton>
			);
		};

		const renderUndoButton = (): React.JSX.Element | null => {
			return renderTopButton({
				iconName: 'arrow-undo-circle-sharp',
				description: _('Undo'),
				onPress: this.props.onUndoButtonPress,
				visible: this.props.showUndoButton,
				disabled: this.props.undoButtonDisabled,
			});
		};

		const renderRedoButton = (): React.JSX.Element | null => {
			return renderTopButton({
				iconName: 'arrow-redo-circle-sharp',
				description: _('Redo'),
				onPress: this.props.onRedoButtonPress,
				visible: this.props.showRedoButton,
			});
		};

		function selectAllButton(styles: any, onPress: OnPressCallback): React.JSX.Element {
			return (
				<CustomButton
					onPress={onPress}

					themeId={themeId}
					description={_('Select all')}
					contentStyle={styles.iconButton}
				>
					<Icon name="checkmark-circle-outline" style={styles.topIcon} />
				</CustomButton>
			);
		}

		function searchButton(styles: any, onPress: OnPressCallback): React.JSX.Element {
			return (
				<CustomButton
					onPress={onPress}

					description={_('Search')}
					themeId={themeId}
					contentStyle={styles.iconButton}
				>
					<Icon name="search" style={styles.topIcon} />
				</CustomButton>
			);
		}

		function deleteButton(styles: any, onPress: OnPressCallback, disabled: boolean): React.JSX.Element {
			return (
				<CustomButton
					onPress={onPress}
					disabled={disabled}

					themeId={themeId}
					description={_('Delete')}
					accessibilityHint={
						disabled ? '' : _('Delete selected notes')
					}
					contentStyle={disabled ? styles.iconButtonDisabled : styles.iconButton}
				>
					<Icon name="trash" style={styles.topIcon} />
				</CustomButton>
			);
		}

		function duplicateButton(styles: any, onPress: OnPressCallback, disabled: boolean): React.JSX.Element {
			return (
				<CustomButton
					onPress={onPress}
					disabled={disabled}

					themeId={themeId}
					description={_('Duplicate')}
					accessibilityHint={
						disabled ? '' : _('Duplicate selected notes')
					}
					contentStyle={disabled ? styles.iconButtonDisabled : styles.iconButton}
				>
					<Icon name="copy" style={styles.topIcon} />
				</CustomButton>
			);
		}

		function sortButton(styles: any, onPress: OnPressCallback): React.JSX.Element {
			return (
				<TouchableOpacity
					onPress={onPress}

					accessibilityLabel={_('Sort notes by')}
					accessibilityRole="button">
					<View style={styles.iconButton}>
						<Icon name="filter-outline" style={styles.topIcon} />
					</View>
				</TouchableOpacity>
			);
		}

		let key = 0;
		const menuOptionComponents = [];

		if (!this.props.noteSelectionEnabled) {
			for (let i = 0; i < this.props.menuOptions.length; i++) {
				const o = this.props.menuOptions[i];

				if (o.isDivider) {
					menuOptionComponents.push(<View key={`menuOption_${key++}`} style={this.styles().divider} />);
				} else {
					menuOptionComponents.push(
						<MenuOption value={o.onPress} key={`menuOption_${key++}`} style={this.styles().contextMenuItem} disabled={!!o.disabled}>
							<Text style={o.disabled ? this.styles().contextMenuItemTextDisabled : this.styles().contextMenuItemText}>{o.title}</Text>
						</MenuOption>,
					);
				}
			}

			if (menuOptionComponents.length) {
				menuOptionComponents.push(<View key={`menuOption_${key++}`} style={this.styles().divider} />);
			}
		} else {
			menuOptionComponents.push(
				<MenuOption value={() => this.deleteButton_press()} key={'menuOption_delete'} style={this.styles().contextMenuItem}>
					<Text style={this.styles().contextMenuItemText}>{_('Delete')}</Text>
				</MenuOption>,
			);

			menuOptionComponents.push(
				<MenuOption value={() => this.duplicateButton_press()} key={'menuOption_duplicate'} style={this.styles().contextMenuItem}>
					<Text style={this.styles().contextMenuItemText}>{_('Duplicate')}</Text>
				</MenuOption>,
			);
		}

		const moveToFolderComponent = (disabled: boolean): React.JSX.Element => {
			const folderPickerOptions = this.props.folderPickerOptions;

			if (folderPickerOptions && folderPickerOptions.enabled) {
				return (
					<FolderPicker
						themeId={themeId}
						disabled={disabled}
						selectedFolderId={'selectedFolderId' in folderPickerOptions ? folderPickerOptions.selectedFolderId : ''}
						onValueChange={async (folderId) => {
							// If onValueChange is specified, use this as a callback, otherwise do the default
							// which is to take the selectedNoteIds from the state and move them to the
							// chosen folder.

							if (folderPickerOptions.onValueChange) {
								folderPickerOptions.onValueChange(folderId);
								return;
							}
							if (!folderId) return;
							const noteIds = this.props.selectedNoteIds;
							if (!noteIds.length) return;

							if (folderId === 'ToPeers') {
								await PeersNote.sendToPeers(noteIds);
							} else {
								const folder = await Folder.load(folderId);
								if (!folder) return;
								const ok = noteIds.length > 1 ? await dialogs.confirm(this.props.parentComponent, _('Move %d notes to notebook "%s"?', noteIds.length, folder.title)) : true;
								if (!ok) return;

								this.props.dispatch({ type: 'NOTE_SELECTION_END' });

								try {
									for (let i = 0; i < noteIds.length; i++) {
										await Note.moveToFolder(noteIds[i], folderId);
										await PeersNote.moveOnPeers(noteIds[i]);
									}
								} catch (error) {
									alert(_n('This note could not be moved: %s', 'These notes could not be moved: %s', noteIds.length, (error as Error).message));
								}
							}
						}}
						mustSelect={!!folderPickerOptions.mustSelect}
						folders={this.props.folders}
					/>
				);
			} else {
				const title = 'title' in this.props && this.props.title ? this.props.title : '';
				return <Text ellipsizeMode={'tail'} numberOfLines={1} style={this.styles().titleText}>{title}</Text>;
			}
		};

		// const sendToPeersComponent = (disabled: boolean) => {
		// 	const peerPickerOptions = this.props.peerPickerOptions;

		// 	if (peerPickerOptions && peerPickerOptions.enabled) {
		// 		return (
		// 			<FolderPicker
		// 				themeId={themeId}
		// 				disabled={disabled}
		// 				selectedFolderId={'selectedFolderId' in peerPickerOptions ? peerPickerOptions.selectedFolderId : null}
		// 				onValueChange={async (folderId) => {
		// 					// If onValueChange is specified, use this as a callback, otherwise do the default
		// 					// which is to take the selectedNoteIds from the state and move them to the
		// 					// chosen folder.

		// 					if (peerPickerOptions.onValueChange) {
		// 						peerPickerOptions.onValueChange(folderId);
		// 						return;
		// 					}
		// 					if (!folderId) return;
		// 					const noteIds = this.props.selectedNoteIds;
		// 					if (!noteIds.length) return;

		// 					if (folderId === 'AllPeers') {
		// 						await Note.sendToPeers(noteIds, workerEmit);
		// 					} else {
		// 						const folder = await Folder.load(folderId);

		// 						const ok = noteIds.length > 1 ? await dialogs.confirm(this.props.parentComponent, _('Move %d notes to notebook "%s"?', noteIds.length, folder.title)) : true;
		// 						if (!ok) return;

		// 						this.props.dispatch({ type: 'NOTE_SELECTION_END' });

		// 						try {
		// 							for (let i = 0; i < noteIds.length; i++) {
		// 								await Note.moveToFolder(noteIds[i], folderId);
		// 								await Note.moveOnPeers(noteIds[i], workerEmit);
		// 							}
		// 						} catch (error) {
		// 							alert(_n('This note could not be moved: %s', 'These notes could not be moved: %s', noteIds.length, error.message));
		// 						}
		// 					}
		// 				}}
		// 				mustSelect={!!peerPickerOptions.mustSelect}
		// 				folders={this.props.folders}
		// 			/>
		// 		);
		// 	} else {
		// 		const title = 'title' in this.props && this.props.title !== null ? this.props.title : '';
		// 		return <Text ellipsizeMode={'tail'} numberOfLines={1} style={this.styles().titleText}>{title}</Text>;
		// 	}
		// };

		const warningComps: React.JSX.Element[] = [];

		if (this.props.showMissingMasterKeyMessage) warningComps.push(this.renderWarningBox('EncryptionConfig', _('Press to set the decryption password.')));
		if (this.props.hasDisabledSyncItems) warningComps.push(this.renderWarningBox('Status', _('Some items cannot be synchronised. Press for more info.')));
		if (this.props.shouldUpgradeSyncTarget && this.props.showShouldUpgradeSyncTargetMessage !== false) warningComps.push(this.renderWarningBox('UpgradeSyncTarget', _('The sync target needs to be upgraded. Press this banner to proceed.')));

		if (this.props.hasDisabledEncryptionItems) {
			warningComps.push(this.renderWarningBox('Status', _('Some items cannot be decrypted.')));
		}

		const showSideMenuButton = !!this.props.showSideMenuButton && !this.props.noteSelectionEnabled;
		const showSelectAllButton = this.props.noteSelectionEnabled;
		const showSearchButton = !!this.props.showSearchButton && !this.props.noteSelectionEnabled;
		const showContextMenuButton = this.props.showContextMenuButton !== false;
		const showBackButton = !!this.props.noteSelectionEnabled || this.props.showBackButton !== false;

		let backButtonDisabled = !this.props.historyCanGoBack;
		if (this.props.noteSelectionEnabled) backButtonDisabled = false;
		const headerItemDisabled = !(this.props.selectedNoteIds.length > 0);

		const moveComp = moveToFolderComponent(headerItemDisabled);
		// const sendComp = sendToPeersComponent(headerItemDisabled);
		const sideMenuComp = !showSideMenuButton ? null : sideMenuButton(this.styles(), () => this.sideMenuButton_press());
		const backButtonComp = !showBackButton ? null : backButton(this.styles(), () => this.backButton_press(), backButtonDisabled);
		const selectAllButtonComp = !showSelectAllButton ? null : selectAllButton(this.styles(), () => this.selectAllButton_press());
		const searchButtonComp = !showSearchButton ? null : searchButton(this.styles(), () => this.searchButton_press());
		const deleteButtonComp = this.props.noteSelectionEnabled ? deleteButton(this.styles(), () => this.deleteButton_press(), headerItemDisabled) : null;
		const duplicateButtonComp = this.props.noteSelectionEnabled ? duplicateButton(this.styles(), () => this.duplicateButton_press(), headerItemDisabled) : null;
		const sortButtonComp = !this.props.noteSelectionEnabled && this.props.sortButton_press ? sortButton(this.styles(), () => this.props.sortButton_press ? this.props.sortButton_press() : null) : null;
		const windowHeight = Dimensions.get('window').height - 50;

		const contextMenuStyle: ViewStyle = {
			paddingTop: PADDING_V,
			paddingBottom: PADDING_V,
		};

		// HACK: if this button is removed during selection mode, the header layout is broken, so for now just make it 1 pixel large (normally it should be hidden)
		if (this.props.noteSelectionEnabled) contextMenuStyle.width = 1;

		const menuComp =
			!menuOptionComponents.length || !showContextMenuButton ? null : (
				<Menu onSelect={value => this.menu_select(value)} style={this.styles().contextMenu}>
					<MenuTrigger style={contextMenuStyle}>
						<View accessibilityLabel={_('Actions')}>
							<Icon name="ellipsis-vertical" style={this.styles().contextMenuTrigger} />
						</View>
					</MenuTrigger>
					<MenuOptions>
						<ScrollView style={{ maxHeight: windowHeight }}>{menuOptionComponents}</ScrollView>
					</MenuOptions>
				</Menu>
			);

		return (
			<View style={this.styles().container}>
				<View style={{ flexDirection: 'row', alignItems: 'center' }}>
					{sideMenuComp}
					{backButtonComp}
					{renderUndoButton()}
					{renderRedoButton()}
					{saveButton(
						this.styles(),
						() => {
							if (this.props.onSaveButtonPress) this.props.onSaveButtonPress();
						},
						this.props.saveButtonDisabled === true,
						this.props.showSaveButton === true,
					)}
					{moveComp}
					{/* {sendComp} */}
					{selectAllButtonComp}
					{searchButtonComp}
					{deleteButtonComp}
					{duplicateButtonComp}
					{sortButtonComp}
					{menuComp}
				</View>
				{warningComps}
				<DialogBox
					ref={(dialogbox: typeof DialogBox) => {
						this.dialogbox = dialogbox;
					}}
				/>
			</View>
		);
	}

	public static defaultProps: Partial<ScreenHeaderProps> = {
		menuOptions: [],
	};
}

const ScreenHeader = connect((state: State) => {
	const syncInfo = localSyncInfoFromState(state);

	return {
		historyCanGoBack: state.historyCanGoBack,
		locale: state.settings.locale,
		folders: state.folders,
		themeId: state.settings.theme,
		hasDisabledEncryptionItems: state.hasDisabledEncryptionItems,
		noteSelectionEnabled: state.noteSelectionEnabled ?? false,
		selectedNoteIds: state.selectedNoteIds,
		showMissingMasterKeyMessage: showMissingMasterKeyMessage(syncInfo, state.notLoadedMasterKeys),
		hasDisabledSyncItems: state.hasDisabledSyncItems,
		shouldUpgradeSyncTarget: state.settings['sync.upgradeState'] === Setting.SYNC_UPGRADE_STATE_SHOULD_DO,
	};
})(ScreenHeaderComponent);

export default ScreenHeader;
export { ScreenHeader };
