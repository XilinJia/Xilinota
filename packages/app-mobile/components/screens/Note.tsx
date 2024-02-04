import AsyncActionQueue from '@xilinota/lib/AsyncActionQueue';
import uuid from '@xilinota/lib/uuid_';
import Setting from '@xilinota/lib/models/Setting';
import shim from '@xilinota/lib/shim';
import UndoRedoService from '@xilinota/lib/services/UndoRedoService';
import NoteBodyViewer from '../NoteBodyViewer/NoteBodyViewer';
import checkPermissions from '../../utils/checkPermissions';
import NoteEditor from '../NoteEditor/NoteEditor';

import FileViewer from 'react-native-file-viewer';
import md5 from 'md5';
// TODO: should replace with react-native-dialog
const DialogBox = require('react-native-dialogbox').default;

import React from 'react';
import { Keyboard, View, TextInput, StyleSheet, Linking, Image, Share, NativeSyntheticEvent, TextInputSelectionChangeEventData } from 'react-native';
import { Platform, PermissionsAndroid } from 'react-native';
import { connect } from 'react-redux';
// const { MarkdownEditor } = require('@xilinota/lib/../MarkdownEditor/index.js');
import Note from '@xilinota/lib/models/Note';
import BaseItem, { unwantedCharacters } from '@xilinota/lib/models/BaseItem';
import Resource from '@xilinota/lib/models/Resource';
import Folder from '@xilinota/lib/models/Folder';
import Clipboard from '@react-native-clipboard/clipboard';
import NavService from '@xilinota/lib/services/NavService';
import BaseModel, { ModelType } from '@xilinota/lib/BaseModel';
import ActionButton from '../ActionButton';
import { fileExtension, safeFileExtension } from '@xilinota/lib/path-utils';
import Checkbox from '../checkbox';

import BackButtonService from '../../services/back-button';
import mimeUtils from '@xilinota/lib/mime-utils';

import NoteTagsDialog from './NoteTagsDialog';
import ScreenHeader, { MenuOptionType } from '../ScreenHeader';
import time from '@xilinota/lib/time';
import { _, currentLocale } from '@xilinota/lib/locale';
import { reg } from '@xilinota/lib/registry';
import ResourceFetcher from '@xilinota/lib/services/ResourceFetcher';
import BaseScreenComponent from '../base-screen';
import { themeStyle, editorFont } from '../global-style';
import dialogs from '../../utils/dialogs';
import ImageResizer from '@bam.tech/react-native-image-resizer';
import Shared from '@xilinota/lib/components/shared/note-screen-shared';
import { Asset, ImagePickerResponse, launchImageLibrary } from 'react-native-image-picker';
import SelectDateTimeDialog from '../SelectDateTimeDialog';
import ShareExtension from '../../utils/ShareExtension.js';
import CameraView from '../CameraView';
import { FolderEntity, NoteEntity, ResourceEntity } from '@xilinota/lib/services/database/types';
import Logger from '@xilinota/utils/Logger';
import ImageEditor from '../NoteEditor/ImageEditor/ImageEditor';
import promptRestoreAutosave from '../NoteEditor/ImageEditor/promptRestoreAutosave';
import isEditableResource from '../NoteEditor/ImageEditor/isEditableResource';
import VoiceTypingDialog from '../voiceTyping/VoiceTypingDialog';
import { voskEnabled } from '../../services/voiceTyping/vosk';
import { isSupportedLanguage } from '../../services/voiceTyping/vosk.android';
import { ChangeEvent as EditorChangeEvent, SelectionRangeChangeEvent, UndoRedoDepthChangeEvent } from '@xilinota/lib/editor/events';
import { PeersNote } from '@xilinota/lib/models/Peers';
import urlUtils from '@xilinota/lib/urlUtils';
import { ItemSlice, itemIsReadOnlySync } from '@xilinota/lib/models/utils/readOnly';
import ItemChange from '@xilinota/lib/models/ItemChange';
import { DocumentFileDetail } from '@xilinota/react-native-saf-x';
import { DocumentPickerResponse } from 'react-native-document-picker';
import { AppState } from '../../utils/types';

// import Vosk from 'react-native-vosk';

interface Props {
	noteId: string | null;
	noteHash: any;
	folderId: string;
	itemType: string;
	folders: FolderEntity[];
	searchQuery: string;
	themeId: number;
	editorFont: number;
	editorFontSize: number;
	toolbarEnabled: boolean;
	ftsEnabled: boolean;
	sharedData: any;
	showSideMenu: boolean;
	provisionalNoteIds: string[];
	highlightedWords: string[];
	useRichTextEditor: boolean;
	dispatch: (event: any) => void;
}

interface State {
	lastSavedNote: NoteEntity | null;
	prevSaveTime: number;
	mode: string;
	note: NoteEntity;
	folder: FolderEntity | null;
	isLoading: boolean;
	titleTextInputHeight: number;
	alarmDialogShown: boolean;
	heightBumpView: number;
	noteTagDialogShown: boolean;
	fromShare: boolean;
	showCamera: boolean;
	showImageEditor: boolean;
	loadImageEditorData: (() => any) | null;
	imageEditorResource: ResourceEntity | null;
	noteResources: Record<string, any>;
	HACK_webviewLoadingState: number;
	undoRedoButtonState: { canUndo: boolean, canRedo: boolean, };
	voiceTypingDialogShown: boolean;
	readOnly: boolean;
	newAndNoTitleChangeNoteId: string | null;
}

// const emptyArray: any[] = [];

const logger = Logger.create('screens/Note');

interface FolderPickerOptions {
	enabled: boolean;
	selectedFolderId: string | undefined;
	onValueChange: (itemValue: any) => Promise<void>
};

class NoteScreenComponent extends BaseScreenComponent<Props, State> {

	private saveActionQueues_: Record<string, AsyncActionQueue>;
	private doFocusUpdate_: boolean;
	// private saveButtonHasBeenShown_: boolean;
	private undoRedoService_: any;

	selection: { start: number; end: number; } | undefined;
	private styles_: any;
	editorRef: React.RefObject<any>;

	navHandler: () => Promise<boolean>;
	backHandler: () => Promise<boolean>;
	noteTagDialog_closeRequested: () => void;
	onJoplinLinkClick_: (msg: string) => void;
	refreshResource: (resource: any, noteBody?: string) => Promise<void>;
	menuOptionsCache_: Record<string, MenuOptionType[]> = {};
	focusUpdateIID_: string | null = null;
	folderPickerOptions_: FolderPickerOptions | undefined;
	dialogbox: any;
	// saveNoteMutex_: any;

	public static navigationOptions(): any {
		return { header: null };
	}

	public constructor(props: Props) {
		super(props);

		this.state = {
			note: Note.new(),
			mode: 'view',
			folder: null,
			lastSavedNote: null,
			prevSaveTime: 0,
			isLoading: true,
			titleTextInputHeight: 20,
			alarmDialogShown: false,
			heightBumpView: 0,
			noteTagDialogShown: false,
			fromShare: false,
			showCamera: false,
			showImageEditor: false,
			loadImageEditorData: null,
			imageEditorResource: null,
			noteResources: {},

			// HACK: For reasons I can't explain, when the WebView is present, the TextInput initially does not display (It's just a white rectangle with
			// no visible text). It will only appear when tapping it or doing certain action like selecting text on the webview. The bug started to
			// appear one day and did not go away - reverting to an old RN version did not help, undoing all
			// the commits till a working version did not help. The bug also does not happen in the simulator which makes it hard to fix.
			// Eventually, a way that "worked" is to add a 1px margin on top of the text input just after the webview has loaded, then removing this
			// margin. This forces RN to update the text input and to display it. Maybe that hack can be removed once RN is upgraded.
			// See https://github.com/XilinJia/Xilinota/issues/1057
			HACK_webviewLoadingState: 0,

			undoRedoButtonState: {
				canUndo: false,
				canRedo: false,
			},

			voiceTypingDialogShown: false,
			readOnly: false,
			newAndNoTitleChangeNoteId: null,
		};

		this.saveActionQueues_ = {};

		// this.markdownEditorRef = React.createRef(); // For focusing the Markdown editor

		this.doFocusUpdate_ = false;

		// this.saveButtonHasBeenShown_ = false;

		this.styles_ = {};

		this.editorRef = React.createRef();

		const saveDialog = async () => {
			if (this.isModified()) {
				const buttonId = await dialogs.pop(this, _('This note has been modified:'), [{ text: _('Save changes'), id: 'save' }, { text: _('Discard changes'), id: 'discard' }, { text: _('Cancel'), id: 'cancel' }]);

				if (buttonId === 'cancel') return true;
				if (buttonId === 'save') await this.saveNoteButton_press();
			}

			return false;
		};

		this.navHandler = async (): Promise<boolean> => {
			return await saveDialog();
		};

		this.backHandler = async (): Promise<boolean> => {

			if (this.isModified()) {
				console.log('Note note modified')
				await this.saveNoteButton_press();
			}

			const isProvisionalNote = this.props.provisionalNoteIds.includes(this.props.noteId ?? '');

			if (isProvisionalNote) {
				return false;
			}

			if (this.state.mode === 'edit') {
				Keyboard.dismiss();

				this.setState({
					note: { ...this.state.note },
					mode: 'view',
				});

				await this.undoRedoService_.reset();

				return true;
			}

			if (this.state.fromShare) {
				// effectively the same as NAV_BACK but NAV_BACK causes undesired behaviour in this case:
				// - share to Xilinota from some other app
				// - open Xilinota and open any note
				// - go back -- with NAV_BACK this causes the app to exit rather than just showing notes
				this.props.dispatch({
					type: 'NAV_GO',
					routeName: 'Notes',
					folderId: this.state.note.parent_id,
				});

				ShareExtension.close();
				return true;
			}

			return false;
		};

		this.noteTagDialog_closeRequested = (): void => {
			this.setState({ noteTagDialogShown: false });
		};

		this.onJoplinLinkClick_ = async (msg: string) => {
			try {
				const resourceUrlInfo = urlUtils.parseResourceUrl(msg);
				if (resourceUrlInfo) {
					const itemId = resourceUrlInfo.itemId;
					const item = await BaseItem.loadItemById(itemId);
					if (!item) throw new Error(_('No item with ID %s', itemId));

					if (item.type_ === BaseModel.TYPE_NOTE) {
						// Easier to just go back, then go to the note since
						// the Note screen doesn't handle reloading a different note

						this.props.dispatch({
							type: 'NAV_BACK',
						});

						shim.setTimeout(() => {
							this.props.dispatch({
								type: 'NAV_GO',
								routeName: 'Note',
								noteId: item.id,
								noteHash: resourceUrlInfo.hash,
							});
						}, 5);
					} else if (item.type_ === BaseModel.TYPE_RESOURCE) {
						if (!(await Resource.isReady(item))) throw new Error(_('This attachment is not downloaded or not decrypted yet.'));

						const resourcePath = Resource.fullPath(item);
						logger.info(`Opening resource: ${resourcePath}`);
						await FileViewer.open(resourcePath);
					} else {
						throw new Error(_('The Xilinota mobile app does not currently support this type of link: %s', BaseModel.modelTypeToName(item.type_)));
					}
				} else {
					if (msg.indexOf('file://') === 0) {
						throw new Error(_('Links with protocol "%s" are not supported', 'file://'));
					} else {
						Linking.openURL(msg);
					}
				}
			} catch (error) {
				dialogs.error(this, (error as Error).message);
			}
		};

		this.refreshResource = async (resource: any, noteBody: string = '') => {
			if (!noteBody && this.state.note && this.state.note.body) noteBody = this.state.note.body;
			if (!noteBody) return;

			const resourceIds = await Note.linkedResourceIds(noteBody);
			if (resourceIds.indexOf(resource.id) >= 0) {
				Shared.clearResourceCache();
				const attachedResources = await Shared.attachedResources(noteBody);
				this.setState({ noteResources: attachedResources });
			}
		};

		this.takePhoto_onPress = this.takePhoto_onPress.bind(this);
		this.cameraView_onPhoto = this.cameraView_onPhoto.bind(this);
		this.cameraView_onCancel = this.cameraView_onCancel.bind(this);
		this.properties_onPress = this.properties_onPress.bind(this);
		this.showOnMap_onPress = this.showOnMap_onPress.bind(this);
		this.onMarkForDownload = this.onMarkForDownload.bind(this);
		this.sideMenuOptions = this.sideMenuOptions.bind(this);
		this.folderPickerOptions_valueChanged = this.folderPickerOptions_valueChanged.bind(this);
		this.saveNoteButton_press = this.saveNoteButton_press.bind(this);
		this.onAlarmDialogAccept = this.onAlarmDialogAccept.bind(this);
		this.onAlarmDialogReject = this.onAlarmDialogReject.bind(this);
		this.todoCheckbox_change = this.todoCheckbox_change.bind(this);
		this.title_changeText = this.title_changeText.bind(this);
		this.undoRedoService_stackChange = this.undoRedoService_stackChange.bind(this);
		this.screenHeader_undoButtonPress = this.screenHeader_undoButtonPress.bind(this);
		this.screenHeader_redoButtonPress = this.screenHeader_redoButtonPress.bind(this);
		this.body_selectionChange = this.body_selectionChange.bind(this);
		this.body_selectionChange_rich = this.body_selectionChange_rich.bind(this);
		this.onBodyViewerLoadEnd = this.onBodyViewerLoadEnd.bind(this);
		this.onBodyViewerCheckboxChange = this.onBodyViewerCheckboxChange.bind(this);
		this.onBodyChange = this.onBodyChange.bind(this);
		this.onUndoRedoDepthChange = this.onUndoRedoDepthChange.bind(this);
		this.voiceTypingDialog_onText = this.voiceTypingDialog_onText.bind(this);
		this.voiceTypingDialog_onDismiss = this.voiceTypingDialog_onDismiss.bind(this);
	}

	private async initState(): Promise<void> {
		const isProvisionalNote = this.props.noteId ? this.props.provisionalNoteIds.includes(this.props.noteId) : true;
		const n = this.props.noteId ? await Note.load(this.props.noteId) : null;
		const note = n ?? Note.new();

		let mode = 'view';

		if (isProvisionalNote && !this.props.sharedData) {
			mode = 'edit';
			this.scheduleFocusUpdate();
		}

		const folder = note && note.parent_id ? Folder.byId(this.props.folders, note.parent_id) : null;

		this.setState({
			lastSavedNote: { ...note },
			note: note,
			mode: mode,
			folder: folder,
			isLoading: false,
			fromShare: !!this.props.sharedData,
			noteResources: await Shared.attachedResources(note && note.body ? note.body : ''),
			readOnly: BaseItem.syncShareCache ? itemIsReadOnlySync(ModelType.Note, ItemChange.SOURCE_UNSPECIFIED, note as ItemSlice, Setting.value('sync.userId'), BaseItem.syncShareCache) : false,
		});

		if (this.props.sharedData) {
			if (this.props.sharedData.title) {
				this.noteComponent_change('title', this.props.sharedData.title);
			}
			if (this.props.sharedData.text) {
				this.noteComponent_change('body', this.props.sharedData.text);
			}
			if (this.props.sharedData.resources) {
				for (let i = 0; i < this.props.sharedData.resources.length; i++) {
					const resource = this.props.sharedData.resources[i];
					await this.attachFile(
						{
							uri: resource.uri,
							type: resource.mimeType,
							name: resource.name,
						},
						'',
					);
				}
			}
		}
	};

	private useRichTextEditor(): boolean {
		return this.props.useRichTextEditor;
	}

	private checkToSave(): void {
		const currentDate = new Date();
		const curTime = Math.floor(currentDate.getTime() / 1000);
		const tDiff = curTime - this.state.prevSaveTime;
		if (tDiff > 60) {
			this.setState({ prevSaveTime: curTime });
			this.scheduleSave();
		}
	}

	private onBodyChange(event: EditorChangeEvent): void {
		this.noteComponent_change('body', event.value);
		this.checkToSave();
	}

	private onUndoRedoDepthChange(event: UndoRedoDepthChangeEvent): void {
		if (this.useRichTextEditor()) {
			this.setState({
				undoRedoButtonState: {
					canUndo: !!event.undoDepth,
					canRedo: !!event.redoDepth,
				},
			});
		}
	}

	private undoRedoService_stackChange(): void {
		if (!this.useRichTextEditor()) {
			this.setState({
				undoRedoButtonState: {
					canUndo: this.undoRedoService_.canUndo,
					canRedo: this.undoRedoService_.canRedo,
				},
			});
		}
	}

	private async undoRedo(type: string): Promise<void> {
		const undoState = await this.undoRedoService_[type](this.undoState());
		if (!undoState) return;

		this.setState((state: any) => {
			const newNote = { ...state.note };
			newNote.body = undoState.body;
			return {
				note: newNote,
			};
		});
	}

	private screenHeader_undoButtonPress(): void {
		if (this.useRichTextEditor()) {
			this.editorRef.current.undo();
		} else {
			void this.undoRedo('undo');
		}
	}

	private screenHeader_redoButtonPress(): void {
		if (this.useRichTextEditor()) {
			this.editorRef.current.redo();
		} else {
			void this.undoRedo('redo');
		}
	}

	public undoState(noteBody: string | null = null): {
		body: string | undefined;
	} {
		return {
			body: noteBody === null ? this.state.note.body : noteBody,
		};
	}

	public styles() {
		const themeId = this.props.themeId;
		const theme = themeStyle(themeId.toString());

		const cacheKey = [themeId, this.state.titleTextInputHeight, this.state.HACK_webviewLoadingState].join('_');

		if (this.styles_[cacheKey]) return this.styles_[cacheKey];
		this.styles_ = {};

		// TODO: Clean up these style names and nesting
		const styles: any = {
			screen: {
				flex: 1,
				backgroundColor: theme.backgroundColor,
			},
			bodyTextInput: {
				flex: 1,
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,

				// Add extra space to allow scrolling past end of document, and also to fix this:
				// https://github.com/XilinJia/Xilinota/issues/1437
				// 2020-04-20: removed bottom padding because it doesn't work properly in Android
				// Instead of being inside the scrollable area, the padding is outside thus
				// restricting the view.
				// See https://github.com/XilinJia/Xilinota/issues/3041#issuecomment-616267739
				// paddingBottom: Math.round(dimensions.height / 4),

				textAlignVertical: 'top',
				color: theme.color,
				backgroundColor: theme.backgroundColor,
				fontSize: this.props.editorFontSize,
				fontFamily: editorFont(this.props.editorFont),
			},
			noteBodyViewer: {
				flex: 1,
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
			},
			checkbox: {
				color: theme.color,
				paddingRight: 10,
				paddingLeft: theme.marginLeft,
				paddingTop: 10, // Added for iOS (Not needed for Android??)
				paddingBottom: 10, // Added for iOS (Not needed for Android??)
			},
			markdownButtons: {
				borderColor: theme.dividerColor,
				color: theme.urlColor,
			},
		};

		styles.noteBodyViewerPreview = {
			...styles.noteBodyViewer,
			borderTopColor: theme.dividerColor,
			borderTopWidth: 1,
			borderBottomColor: theme.dividerColor,
			borderBottomWidth: 1,
		};

		styles.titleContainer = {
			flex: 0,
			flexDirection: 'row',
			paddingLeft: theme.marginLeft,
			paddingRight: theme.marginRight,
			borderBottomColor: theme.dividerColor,
			borderBottomWidth: 1,
		};

		styles.titleContainerTodo = { ...styles.titleContainer };
		styles.titleContainerTodo.paddingLeft = 0;

		styles.titleTextInput = {
			flex: 1,
			marginTop: 0,
			paddingLeft: 0,
			color: theme.color,
			backgroundColor: theme.backgroundColor,
			fontWeight: 'bold',
			fontSize: theme.fontSize,
			paddingTop: 10, // Added for iOS (Not needed for Android??)
			paddingBottom: 10, // Added for iOS (Not needed for Android??)
		};

		if (this.state.HACK_webviewLoadingState === 1) styles.titleTextInput.marginTop = 1;

		this.styles_[cacheKey] = StyleSheet.create(styles);
		return this.styles_[cacheKey];
	}

	private async noteExists(noteId: string): Promise<boolean> {
		const existingNote = await Note.load(noteId);
		return !!existingNote;
	};

	// Note has been deleted while user was modifying it. In that case, we
	// just save a new note so that user can keep editing.
	private async handleNoteDeletedWhileEditing_(note: NoteEntity): Promise<NoteEntity | null> {
		if (await this.noteExists(note.id ?? '')) return null;

		reg.logger().info('Note has been deleted while it was being edited - recreating it.');

		let newNote: NoteEntity = { ...note };
		delete newNote.id;
		newNote = await Note.save(newNote);

		return newNote.id ? Note.load(newNote.id) : null;
	};

	private async saveNoteButton_press_shared(folderId: string = '', options: any = null): Promise<void> {
		options = { autoTitle: true, ...options };

		const releaseMutex = Shared.aquireNoteMutex;

		let note: NoteEntity = { ...this.state.note };

		const recreatedNote = await this.handleNoteDeletedWhileEditing_(note);
		if (recreatedNote) note = recreatedNote;

		if (folderId) {
			note.parent_id = folderId;
		} else if (!note.parent_id) {
			const activeFolderId = Setting.value('activeFolderId');
			let folder = await Folder.load(activeFolderId);
			if (!folder) folder = await Folder.defaultFolder();
			if (!folder) return releaseMutex();

			note.parent_id = folder.id ?? '';
		}

		const isProvisionalNote = note.id ? this.props.provisionalNoteIds.includes(note.id) : true;

		const saveOptions = {
			userSideValidation: true,
			fields: this.state.lastSavedNote ? BaseModel.diffObjectsFields(this.state.lastSavedNote, note) : [],
		};

		const hasAutoTitle = this.state.newAndNoTitleChangeNoteId || (isProvisionalNote && !note.title);
		if (hasAutoTitle && options.autoTitle) {
			note.title = Note.defaultTitle(note.body ?? '');
			note.title = note.title.replace(unwantedCharacters, '');
			if (saveOptions.fields && saveOptions.fields.indexOf('title') < 0) saveOptions.fields.push('title');
		}

		const savedNote = !('fields' in saveOptions) || !saveOptions.fields.length ? { ...note } : await Note.save(note, saveOptions);
		// let savedNote: NoteEntity = null;
		// if ('fields' in saveOptions && !saveOptions.fields.length) {
		// 	savedNote = { ...note };
		// } else {
		// 	await Note.save(note, saveOptions);
		// 	await Note.syncToPeers(note.id, workerEmit);
		// }

		const stateNote = this.state.note;

		// Note was reloaded while being saved.
		if (!recreatedNote && (!stateNote || stateNote.id !== savedNote.id)) return releaseMutex();

		// Re-assign any property that might have changed during saving (updated_time, etc.)
		note = { ...note, ...savedNote };

		if (stateNote.id === note.id) {
			// But we preserve the current title and body because
			// the user might have changed them between the time
			// saveNoteButton_press was called and the note was
			// saved (it's done asynchronously).
			//
			// If the title was auto-assigned above, we don't restore
			// it from the state because it will be empty there.
			if (!hasAutoTitle) note.title = stateNote.title;
			note.body = stateNote.body;
		}

		const newState: any = {
			lastSavedNote: { ...note },
			note: note,
		};

		if (isProvisionalNote && hasAutoTitle) newState.newAndNoTitleChangeNoteId = note.id;

		if (!options.autoTitle) newState.newAndNoTitleChangeNoteId = null;

		this.setState(newState);

		if (isProvisionalNote) {
			const updateGeoloc = async (): Promise<void> => {
				if (!note.id) return;
				const geoNote: NoteEntity | null = await Note.updateGeolocation(note.id);

				const stateNote = this.state.note;
				if (!stateNote || !geoNote) return;
				if (stateNote.id !== geoNote.id) return; // Another note has been loaded while geoloc was being retrieved

				// Geo-location for this note has been saved to the database however the properties
				// are is not in the state so set them now.

				const geoInfo = {
					longitude: geoNote.longitude,
					latitude: geoNote.latitude,
					altitude: geoNote.altitude,
				};

				const modNote = { ...stateNote, ...geoInfo };
				const modLastSavedNote = { ...this.state.lastSavedNote, ...geoInfo };

				this.setState({ note: modNote, lastSavedNote: modLastSavedNote });
			};

			// We don't wait because it can be done in the background
			void updateGeoloc();
		}

		releaseMutex();
	};

	private async saveOneProperty(name: string, value: any): Promise<void> {
		let note: any = { ...this.state.note };

		const recreatedNote = await this.handleNoteDeletedWhileEditing_(note);
		if (recreatedNote) note = recreatedNote;

		let toSave: any = { id: note.id };
		toSave[name] = value;
		toSave = await Note.save(toSave);
		note[name] = toSave[name];

		this.setState({
			lastSavedNote: { ...note },
			note: note,
		});
	};

	private noteComponent_change(propName: string, propValue: any): void {
		const newState: any = {};

		const note: any = { ...this.state.note };
		if (propName === 'body' && this.state.newAndNoTitleChangeNoteId) {
			note.title = Note.defaultTitle(note.body);
			note.title = note.title.replace(unwantedCharacters, '');
		}
		note[propName] = propValue;
		if (propName === 'title') {
			note.title = note.title.replace(unwantedCharacters, '');
		}
		newState.note = note;

		this.setState(newState);
	};

	private toggleIsTodo_onPress(): void {
		const newNote = Note.toggleIsTodo(this.state.note);
		const newState = { note: newNote };
		this.setState(newState);

		this.scheduleSave();
	};

	private isModified(): boolean {
		if (!this.state.lastSavedNote) {
			if (!this.state.note) return false;
			else return true;
		}

		const diff: Record<string, any> = BaseModel.diffObjects(this.state.lastSavedNote, this.state.note);
		delete diff.type_;
		return !!Object.getOwnPropertyNames(diff).length;
	};

	public async requestGeoLocationPermissions(): Promise<void> {
		if (!Setting.value('trackLocation')) return;

		const response = await checkPermissions(PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION, {
			message: _('In order to associate a geo-location with the note, the app needs your permission to access your location.\n\nYou may turn off this option at any time in the Configuration screen.'),
			title: _('Permission needed'),
			buttonPositive: _('OK'),
		});

		// If the user simply pressed "Deny", we don't automatically switch it off because they might accept
		// once we show the rationale again on second try. If they press "Never again" however we switch it off.
		// https://github.com/zoontek/react-native-permissions/issues/385#issuecomment-563132396
		if (response === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN) {
			reg.logger().info('Geo-location tracking has been automatically disabled');
			Setting.setValue('trackLocation', false);
		}
	}

	public async componentDidMount(): Promise<void> {
		BackButtonService.addHandler(this.backHandler);
		NavService.addHandler(this.navHandler);

		Shared.clearResourceCache();
		Shared.installResourceHandling(this.refreshResource);

		await this.initState();

		this.undoRedoService_ = new UndoRedoService();
		this.undoRedoService_.on('stackChange', this.undoRedoService_stackChange);

		if (this.state.note && this.state.note.body && Setting.value('sync.resourceDownloadMode') === 'auto') {
			const resourceIds = await Note.linkedResourceIds(this.state.note.body);
			await ResourceFetcher.instance().markForDownload(resourceIds);
		}

		// Although it is async, we don't wait for the answer so that if permission
		// has already been granted, it doesn't slow down opening the note. If it hasn't
		// been granted, the popup will open anyway.
		void this.requestGeoLocationPermissions();
	}

	public onMarkForDownload(event: { resourceId: string }): void {
		void ResourceFetcher.instance().markForDownload(event.resourceId);
	}

	public componentDidUpdate(prevProps: { showSideMenu: boolean; }, prevState: { isLoading: boolean; showImageEditor: boolean; }): void {
		if (this.doFocusUpdate_) {
			this.doFocusUpdate_ = false;
			this.focusUpdate();
		}

		if (prevProps.showSideMenu !== this.props.showSideMenu && this.props.showSideMenu) {
			this.props.dispatch({
				type: 'NOTE_SIDE_MENU_OPTIONS_SET',
				options: this.sideMenuOptions(),
			});
		}

		if (prevState.isLoading !== this.state.isLoading && !this.state.isLoading) {
			// If there's autosave data, prompt the user to restore it.
			void promptRestoreAutosave((drawingData: string) => {
				void this.attachNewDrawing(drawingData);
			});
		}

		// Disable opening/closing the side menu with touch gestures
		// when the image editor is open.
		if (prevState.showImageEditor !== this.state.showImageEditor) {
			this.props.dispatch({
				type: 'SET_SIDE_MENU_TOUCH_GESTURES_DISABLED',
				disableSideMenuGestures: this.state.showImageEditor,
			});
		}
	}

	public componentWillUnmount(): void {
		BackButtonService.removeHandler(this.backHandler);
		NavService.removeHandler(this.navHandler);

		Shared.uninstallResourceHandling(this.refreshResource);

		if (this.state.note.id) this.saveActionQueue(this.state.note.id).processAllNow();

		// It cannot theoretically be undefined, since componentDidMount should always be called before
		// componentWillUnmount, but with React Native the impossible often becomes possible.
		if (this.undoRedoService_) this.undoRedoService_.off('stackChange', this.undoRedoService_stackChange);
	}

	private title_changeText(text: string): void {
		this.noteComponent_change('title', text);
		this.setState({ newAndNoTitleChangeNoteId: null });
		this.checkToSave();
	}

	private body_changeText(text: string): void {
		if (!this.undoRedoService_.canUndo) {
			this.undoRedoService_.push(this.undoState());
		} else {
			this.undoRedoService_.schedulePush(this.undoState());
		}
		this.noteComponent_change('body', text);
		this.checkToSave();
	}

	private body_selectionChange(event: NativeSyntheticEvent<TextInputSelectionChangeEventData>): void {
		this.selection = event.nativeEvent.selection;
	}

	private body_selectionChange_rich(_event: SelectionRangeChangeEvent): void {
		// TODO: not working
		this.selection = { start: _event.from, end: _event.to };
		// logger.warn('body_selectionChange_rich not implemented');
	}

	public makeSaveAction(): () => Promise<void> {
		return async () => {
			await this.saveNoteButton_press_shared('', null);
			await PeersNote.syncToPeers(this.state.note);
		};
	}

	public saveActionQueue(noteId: string): AsyncActionQueue {
		if (!this.saveActionQueues_[noteId]) {
			this.saveActionQueues_[noteId] = new AsyncActionQueue(500);
		}
		return this.saveActionQueues_[noteId];
	}

	public scheduleSave(): void {
		if (this.state.note.id) this.saveActionQueue(this.state.note.id).push(this.makeSaveAction());
	}

	private async saveNoteButton_press(folderId: string = ''): Promise<void> {
		await this.saveNoteButton_press_shared(folderId, null);
		await PeersNote.syncToPeers(this.state.note);
		Keyboard.dismiss();
	}

	private async deleteNote_onPress(): Promise<void> {
		const note = this.state.note;
		if (!note.id) return;

		const ok = await dialogs.confirm(this, _('Delete note?'));
		if (!ok) return;

		const folderId = note.parent_id;

		await Note.delete(note.id);
		await PeersNote.deleteOnPeers(note.id);

		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Notes',
			folderId: folderId,
		});
	}

	private async pickDocuments(): Promise<DocumentFileDetail[] | DocumentPickerResponse[] | null> {
		const result = await shim.fsDriver().pickDocument({ multiple: true });
		if (!result) {
			console.info('pickDocuments: user has cancelled');
		}
		return result;
	}

	public async imageDimensions(uri: string) {
		return new Promise((resolve, reject) => {
			Image.getSize(
				uri,
				(width: number, height: number) => {
					resolve({ width: width, height: height });
				},
				(error: Error) => {
					reject(error);
				},
			);
		});
	}

	public async resizeImage(localFilePath: string, targetPath: string, mimeType: string): Promise<boolean> {
		const maxSize = Resource.IMAGE_MAX_DIMENSION;
		const dimensions: any = await this.imageDimensions(localFilePath);
		reg.logger().info('resizeImage: Original dimensions ', dimensions);

		const saveOriginalImage = async () => {
			await shim.fsDriver().copy(localFilePath, targetPath);
			return true;
		};
		const saveResizedImage = async () => {
			dimensions.width = maxSize;
			dimensions.height = maxSize;
			reg.logger().info('resizeImage: New dimensions ', dimensions);

			const format = mimeType === 'image/png' ? 'PNG' : 'JPEG';
			reg.logger().debug(`Resizing image ${localFilePath}`);
			const resizedImage = await ImageResizer.createResizedImage(
				localFilePath,
				dimensions.width,
				dimensions.height,
				format,
				85, // quality
				undefined, // rotation
				undefined, // outputPath
				true, // keep metadata
			);

			const resizedImagePath = resizedImage.uri;
			reg.logger().debug('Resized image ', resizedImagePath);
			reg.logger().info(`Moving ${resizedImagePath} => ${targetPath}`);

			await shim.fsDriver().copy(resizedImagePath, targetPath);

			try {
				await shim.fsDriver().unlink(resizedImagePath);
			} catch (error) {
				reg.logger().warn('Error when unlinking cached file: ', error);
			}
			return true;
		};

		const canResize = dimensions.width > maxSize || dimensions.height > maxSize;
		if (canResize) {
			const resizeLargeImages = Setting.value('imageResizing');
			if (resizeLargeImages === 'alwaysAsk') {
				const userAnswer = await dialogs.pop(this, `${_('You are about to attach a large image (%dx%d pixels). Would you like to resize it down to %d pixels before attaching it?', dimensions.width, dimensions.height, maxSize)}\n\n${_('(You may disable this prompt in the options)')}`, [
					{ text: _('Yes'), id: 'yes' },
					{ text: _('No'), id: 'no' },
					{ text: _('Cancel'), id: 'cancel' },
				]);
				if (userAnswer === 'yes') return await saveResizedImage();
				if (userAnswer === 'no') return await saveOriginalImage();
				if (userAnswer === 'cancel') return false;
			} else if (resizeLargeImages === 'alwaysResize') {
				return await saveResizedImage();
			}
		}

		return await saveOriginalImage();
	}

	public async attachFile(pickerResponse: { uri?: string, name?: string | null, type?: string | null }, fileType: string): Promise<ResourceEntity | null> {
		if (!pickerResponse) {
			// User has cancelled
			return null;
		}

		const localFilePath = Platform.select({
			android: pickerResponse.uri,
			ios: decodeURI(pickerResponse.uri ?? ''),
		});
		if (!localFilePath) {
			logger.warn('attachFile failed as localFilePath is undefined');
			return null;
		}

		let mimeType = pickerResponse.type;

		if (!mimeType) {
			const ext = fileExtension(localFilePath);
			mimeType = mimeUtils.fromFileExtension(ext);
		}

		if (!mimeType && fileType === 'image') {
			// Assume JPEG if we couldn't determine the file type. It seems to happen with the image picker
			// when the file path is something like content://media/external/images/media/123456
			// If the image is not a JPEG, something will throw an error below, but there's a good chance
			// it will work.
			reg.logger().info('Missing file type and could not detect it - assuming image/jpg');
			mimeType = 'image/jpg';
		}

		reg.logger().debug(`Got file: ${mimeType} ${localFilePath}`);

		let resource: ResourceEntity = Resource.new();
		resource.id = uuid.create();
		if (mimeType) resource.mime = mimeType;
		if ('name' in pickerResponse) {
			resource.title = pickerResponse.name ? pickerResponse.name : '';
			resource.file_extension = safeFileExtension(fileExtension(pickerResponse.name ? pickerResponse.name : localFilePath));
		}
		if (!resource.mime) resource.mime = 'application/octet-stream';

		const targetPath = Resource.fullPath(resource);

		try {
			if (mimeType === 'image/jpeg' || mimeType === 'image/jpg' || mimeType === 'image/png') {
				const done = await this.resizeImage(localFilePath, targetPath, mimeType);
				if (!done) return null;
			} else {
				if (fileType === 'image' && mimeType !== 'image/svg+xml') {
					dialogs.error(this, _('Unsupported image type: %s', mimeType));
					return null;
				} else {
					await shim.fsDriver().copy(localFilePath, targetPath);
					const stat = await shim.fsDriver().stat(targetPath);

					if (stat && stat.size >= 200 * 1024 * 1024) {
						await shim.fsDriver().remove(targetPath);
						throw new Error('Resources larger than 200 MB are not currently supported as they may crash the mobile applications. The issue is being investigated and will be fixed at a later time.');
					}
				}
			}
		} catch (error) {
			reg.logger().warn('Could not attach file:', error);
			await dialogs.error(this, (error as Error).message);
			return null;
		}

		const itDoes = await shim.fsDriver().waitTillExists(targetPath);
		if (!itDoes) throw new Error(`Resource file was not created: ${targetPath}`);

		const fileStat = await shim.fsDriver().stat(targetPath);
		resource.size = fileStat?.size ?? 0;

		resource = await Resource.save(resource, { isNew: true });

		const resourceTag = Resource.markdownTag(resource);

		const newNote = { ...this.state.note };

		if (this.state.mode === 'edit') {
			let newText = '';

			if (this.selection) {
				newText = `\n${resourceTag}\n`;
				if (newNote.body) {
					const prefix = newNote.body.substring(0, this.selection.start);
					const suffix = newNote.body.substring(this.selection.end);
					newNote.body = `${prefix}${newText}${suffix}`;
				}
			} else {
				newText = `\n${resourceTag}`;
				newNote.body = `${newNote.body}\n${newText}`;
			}

			if (this.useRichTextEditor()) {
				// The beta editor needs to be explicitly informed of changes
				// to the note's body
				this.editorRef.current.insertText(newText);
			}
		} else {
			newNote.body += `\n${resourceTag}`;
		}

		this.setState({ note: newNote });

		this.refreshResource(resource, newNote.body);

		this.scheduleSave();

		return resource;
	}

	private async attachPhoto_onPress(): Promise<void> {
		// the selection Limit should be specfied. I think 200 is enough?
		const response: ImagePickerResponse = await launchImageLibrary({ mediaType: 'photo', includeBase64: false, selectionLimit: 200 });

		if (response.errorCode) {
			reg.logger().warn('Got error from picker', response.errorCode);
			return;
		}

		if (response.didCancel) {
			reg.logger().info('User cancelled picker');
			return;
		}
		if (!response.assets) return;
		for (const asset of response.assets) {
			await this.attachFile(asset, 'image');
		}
	}

	private takePhoto_onPress(): void {
		this.setState({ showCamera: true });
	}

	private cameraView_onPhoto(data: any): void {
		void this.attachFile(
			{
				uri: data.uri,
				type: 'image/jpg',
			},
			'image',
		);

		this.setState({ showCamera: false });
	}

	private cameraView_onCancel(): void {
		this.setState({ showCamera: false });
	}

	private async attachNewDrawing(svgData: string): Promise<ResourceEntity | null> {
		const filePath = `${Setting.value('resourceDir')}/saved-drawing.xilinota.svg`;
		await shim.fsDriver().writeFile(filePath, svgData, 'utf8');
		logger.info('Saved new drawing to', filePath);

		return await this.attachFile({
			uri: filePath,
			name: _('Drawing'),
		}, 'image');
	}

	private drawPicture_onPress = async (): Promise<void> => {
		// Create a new empty drawing and attach it now.
		const resource = await this.attachNewDrawing('');

		this.setState({
			showImageEditor: true,
			loadImageEditorData: null,
			imageEditorResource: resource,
		});
	};

	private async updateDrawing(svgData: string): Promise<void> {
		let resource: ResourceEntity | null = this.state.imageEditorResource;

		if (!resource) {
			throw new Error('No resource is loaded in the editor');
		}

		const resourcePath = Resource.fullPath(resource);

		const filePath = resourcePath;
		await shim.fsDriver().writeFile(filePath, svgData, 'utf8');
		logger.info('Saved drawing to', filePath);

		resource = await Resource.save(resource, { isNew: false });
		await this.refreshResource(resource);
	}

	private onSaveDrawing = async (svgData: string): Promise<void> => {
		await this.updateDrawing(svgData);
	};

	private onCloseDrawing = (): void => {
		this.setState({ showImageEditor: false });
	};

	private async editDrawing(item: BaseItem): Promise<void> {
		const filePath = Resource.fullPath(item);
		this.setState({
			showImageEditor: true,
			loadImageEditorData: async () => {
				return await shim.fsDriver().readFile(filePath);
			},
			imageEditorResource: item,
		});
	}

	private onEditResource = async (message: string): Promise<void> => {
		const messageData = /^edit:(.*)$/.exec(message);
		if (!messageData) {
			throw new Error('onEditResource: Error: Invalid message');
		}

		const resourceId = messageData[1];

		const resource = await BaseItem.loadItemById(resourceId);
		await Resource.requireIsReady(resource);

		if (isEditableResource(resource.mime)) {
			await this.editDrawing(resource);
		} else {
			throw new Error(_('Unable to edit resource of type %s', resource.mime));
		}
	};

	private async attachFile_onPress(): Promise<void> {
		const response = await this.pickDocuments();
		if (!response) return;
		for (const asset of response) {
			await this.attachFile(asset, 'all');
		}
	}

	private tags_onPress(): void {
		if (!this.state.note || !this.state.note.id) return;

		this.setState({ noteTagDialogShown: true });
	}

	private async share_onPress(): Promise<void> {
		await Share.share({
			message: `${this.state.note.title}\n\n${this.state.note.body}`,
			title: this.state.note.title,
		});
	}

	private properties_onPress(): void {
		this.props.dispatch({ type: 'SIDE_MENU_OPEN' });
	}

	public async onAlarmDialogAccept(date: Date): Promise<void> {
		const response = await checkPermissions(PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS);

		// The POST_NOTIFICATIONS permission isn't supported on Android API < 33.
		// (If unsupported, returns NEVER_ASK_AGAIN).
		// On earlier releases, notifications should work without this permission.
		if (response === PermissionsAndroid.RESULTS.DENIED) {
			logger.warn('POST_NOTIFICATIONS permission was not granted');
			return;
		}

		const newNote = { ...this.state.note };
		newNote.todo_due = date ? date.getTime() : 0;

		await this.saveOneProperty('todo_due', date ? date.getTime() : 0);

		this.setState({ alarmDialogShown: false });
	}

	public onAlarmDialogReject(): void {
		this.setState({ alarmDialogShown: false });
	}

	private async showOnMap_onPress(): Promise<void> {
		if (!this.state.note.id) return;

		const note = await Note.load(this.state.note.id);
		if (!note) return;
		try {
			const url = Note.geolocationUrl(note);
			Linking.openURL(url);
		} catch (error) {
			this.props.dispatch({ type: 'SIDE_MENU_CLOSE' });
			await dialogs.error(this, (error as Error).message);
		}
	}

	private async showSource_onPress(): Promise<void> {
		if (!this.state.note.id) return;

		const note = await Note.load(this.state.note.id);
		if (!note) return;
		try {
			if (note.source_url) Linking.openURL(note.source_url);
		} catch (error) {
			await dialogs.error(this, (error as Error).message);
		}
	}

	private copyMarkdownLink_onPress(): void {
		const note = this.state.note;
		Clipboard.setString(Note.markdownTag(note));
	}

	public sideMenuOptions(): ({
		title: string;
		isDivider?: undefined;
		onPress?: undefined;
	} | {
		isDivider: boolean;
		title?: undefined;
		onPress?: undefined;
	} | {
		title: string;
		onPress: () => void;
		isDivider?: undefined;
	})[] {
		const note = this.state.note;
		if (!note) return [];

		const output = [];

		const createdDateString = time.formatMsToLocal(note.user_created_time ?? 0);
		const updatedDateString = time.formatMsToLocal(note.user_updated_time ?? 0);

		output.push({ title: _('Created: %s', createdDateString) });
		output.push({ title: _('Updated: %s', updatedDateString) });
		output.push({ isDivider: true });

		output.push({
			title: _('View on map'),
			onPress: () => {
				void this.showOnMap_onPress();
			},
		});
		if (note.source_url) {
			output.push({
				title: _('Go to source URL'),
				onPress: () => {
					void this.showSource_onPress();
				},
			});
		}

		return output;
	}

	public async showAttachMenu(): Promise<void> {
		// If the keyboard is editing a WebView, the standard Keyboard.dismiss()
		// may not work. As such, we also need to call hideKeyboard on the editorRef
		this.editorRef.current?.hideKeyboard();

		const buttons = [];

		// On iOS, it will show "local files", which means certain files saved from the browser
		// and the iCloud files, but it doesn't include photos and images from the CameraRoll
		//
		// On Android, it will depend on the phone, but usually it will allow browing all files and photos.
		buttons.push({ text: _('Attach file'), id: 'attachFile' });

		// Disabled on Android because it doesn't work due to permission issues, but enabled on iOS
		// because that's only way to browse photos from the camera roll.
		if (Platform.OS === 'ios') buttons.push({ text: _('Attach photo'), id: 'attachPhoto' });
		buttons.push({ text: _('Take photo'), id: 'takePhoto' });

		const buttonId = await dialogs.pop(this, _('Choose an option'), buttons);

		if (buttonId === 'takePhoto') this.takePhoto_onPress();
		if (buttonId === 'attachFile') void this.attachFile_onPress();
		if (buttonId === 'attachPhoto') void this.attachPhoto_onPress();
	}

	public menuOptions(): MenuOptionType[] {
		const note = this.state.note;
		const isTodo = note && !!note.is_todo;
		const isSaved = note && note.id;
		const readOnly = this.state.readOnly;

		const cacheKey: string = md5([isTodo, isSaved].join('_'));
		if (!this.menuOptionsCache_) this.menuOptionsCache_ = {};

		if (this.menuOptionsCache_[cacheKey]) return this.menuOptionsCache_[cacheKey];

		const output: MenuOptionType[] = [];

		// The file attachement modules only work in Android >= 5 (Version 21)
		// https://github.com/react-community/react-native-image-picker/issues/606

		// As of 2020-10-13, support for attaching images from the gallery is removed
		// as the package react-native-image-picker has permission issues. It's still
		// possible to attach files, which has often a similar UI, with thumbnails for
		// images so normally it should be enough.
		let canAttachPicture = true;
		if (Platform.OS === 'android' && Platform.Version < 21) canAttachPicture = false;
		if (canAttachPicture) {
			output.push({
				title: _('Attach...'),
				onPress: () => this.showAttachMenu(),
				disabled: readOnly,
			});
		}

		output.push({
			title: _('Draw picture'),
			onPress: () => this.drawPicture_onPress(),
			disabled: readOnly,
		});

		if (isTodo) {
			output.push({
				title: _('Set alarm'),
				onPress: () => {
					this.setState({ alarmDialogShown: true });
				},
				disabled: readOnly,
			});
		}

		output.push({
			title: _('Share'),
			onPress: () => {
				void this.share_onPress();
			},
			disabled: readOnly,
		});

		// Voice typing is enabled only for French language and on Android for now
		if (voskEnabled && shim.mobilePlatform() === 'android' && isSupportedLanguage(currentLocale())) {
			output.push({
				title: _('Voice typing...'),
				onPress: () => {
					// this.voiceRecording_onPress();
					this.setState({ voiceTypingDialogShown: true });
				},
				disabled: readOnly,
			});
		}

		if (isSaved) {
			output.push({
				title: _('Tags'),
				onPress: () => {
					this.tags_onPress();
				},
			});
		}
		output.push({
			title: isTodo ? _('Convert to note') : _('Convert to todo'),
			onPress: () => {
				this.toggleIsTodo_onPress();
			},
			disabled: readOnly,
		});
		if (isSaved) {
			output.push({
				title: _('Copy Markdown link'),
				onPress: () => {
					this.copyMarkdownLink_onPress();
				},
			});
		}
		output.push({
			title: _('Properties'),
			onPress: () => {
				this.properties_onPress();
			},
		});
		output.push({
			title: _('Delete'),
			onPress: () => {
				void this.deleteNote_onPress();
			},
			disabled: readOnly,
		});

		this.menuOptionsCache_ = {};
		this.menuOptionsCache_[cacheKey] = output;

		return output;
	}

	private async todoCheckbox_change(checked: boolean): Promise<void> {
		await this.saveOneProperty('todo_completed', checked ? time.unixMs() : 0);
	}

	public scheduleFocusUpdate(): void {
		if (this.focusUpdateIID_) shim.clearTimeout(this.focusUpdateIID_);

		this.focusUpdateIID_ = shim.setTimeout(() => {
			this.focusUpdateIID_ = null;
			this.focusUpdate();
		}, 100);
	}

	public focusUpdate(): void {
		if (this.focusUpdateIID_) shim.clearTimeout(this.focusUpdateIID_);
		this.focusUpdateIID_ = null;

		if (!this.state.note) return;
		// let fieldToFocus = this.state.note.is_todo ? 'title' : 'body';
		// if (this.state.mode === 'view') fieldToFocus = '';

		// TODO: Property 'focus' does not exist on type 'ReactInstance'.
		//   Property 'focus' does not exist on type 'Component<any, {}, any>'
		// if (fieldToFocus === 'title' && this.refs.titleTextField) {
		// 	this.refs.titleTextField.focus();
		// }

		// if (fieldToFocus === 'body' && this.markdownEditorRef.current) {
		// 	if (this.markdownEditorRef.current) {
		// 		this.markdownEditorRef.current.focus();
		// 	}
		// }
	}

	private async folderPickerOptions_valueChanged(itemValue: any): Promise<void> {
		const note = this.state.note;
		const isProvisionalNote = this.props.provisionalNoteIds.includes(note.id ?? '');

		if (isProvisionalNote) {
			await this.saveNoteButton_press(itemValue);
		} else {
			if (note.id) {
				await Note.moveToFolder(note.id, itemValue);
				await PeersNote.moveOnPeers(note.id);
			}
		}

		note.parent_id = itemValue;

		const folder = await Folder.load(note.parent_id ?? '');

		this.setState({
			lastSavedNote: { ...note },
			note: note,
			folder: folder,
		});
	}

	public folderPickerOptions() {
		const options = {
			enabled: !this.state.readOnly,
			selectedFolderId: this.state.folder && this.state.folder.id ? this.state.folder.id : undefined,
			onValueChange: this.folderPickerOptions_valueChanged,
		};

		if (this.folderPickerOptions_ && options.selectedFolderId === this.folderPickerOptions_.selectedFolderId) return this.folderPickerOptions_;

		this.folderPickerOptions_ = options;
		return this.folderPickerOptions_;
	}

	public onBodyViewerLoadEnd(): void {
		shim.setTimeout(() => {
			this.setState({ HACK_webviewLoadingState: 1 });
			shim.setTimeout(() => {
				this.setState({ HACK_webviewLoadingState: 0 });
			}, 50);
		}, 5);
	}

	public onBodyViewerCheckboxChange(newBody: string): void {
		void this.saveOneProperty('body', newBody);
	}

	private voiceTypingDialog_onText(text: string): void {
		if (this.state.mode === 'view') {
			const newNote: NoteEntity = { ...this.state.note };
			newNote.body = `${newNote.body} ${text}`;
			this.setState({ note: newNote });
			this.scheduleSave();
		} else {
			if (this.useRichTextEditor()) {
				// We add a space so that if the feature is used twice in a row,
				// the sentences are not stuck to each others.
				this.editorRef.current.insertText(`${text} `);
			} else {
				logger.warn('Voice typing is not supported in plaintext editor');
			}
		}
	}

	private voiceTypingDialog_onDismiss(): void {
		this.setState({ voiceTypingDialogShown: false });
	}

	public render(): React.JSX.Element {
		if (this.state.isLoading) {
			return (
				<View style={this.styles().screen}>
					<ScreenHeader />
				</View>
			);
		}

		const theme = themeStyle(this.props.themeId.toString());
		const note: NoteEntity = this.state.note;
		const isTodo = !!Number(note.is_todo);

		if (this.state.showCamera) {
			// themeId doesn't exist in CameraView
			// return <CameraView themeId={this.props.themeId} style={{ flex: 1 }} onPhoto={this.cameraView_onPhoto} onCancel={this.cameraView_onCancel} />;
			return <CameraView style={{ flex: 1 }} onPhoto={this.cameraView_onPhoto} onCancel={this.cameraView_onCancel} />;
		} else if (this.state.showImageEditor) {
			return <ImageEditor
				loadInitialSVGData={this.state.loadImageEditorData}
				themeId={this.props.themeId}
				onSave={this.onSaveDrawing}
				onExit={this.onCloseDrawing}
			/>;
		}

		// Currently keyword highlighting is supported only when FTS is available.
		const keywords = this.props.searchQuery && !!this.props.ftsEnabled ? this.props.highlightedWords : [];

		let bodyComponent = null;
		if (this.state.mode === 'view') {
			// Note: as of 2018-12-29 it's important not to display the viewer if the note body is empty,
			// to avoid the HACK_webviewLoadingState related bug.
			bodyComponent =
				!note || !note.body || !note.body.trim() ? null : (
					<NoteBodyViewer
						onXilinotaLinkClick={this.onJoplinLinkClick_}
						style={this.styles().noteBodyViewer}
						// Extra bottom padding to make it possible to scroll past the
						// action button (so that it doesn't overlap the text)
						paddingBottom={150}
						noteBody={note.body}
						noteMarkupLanguage={note.markup_language ?? 0}
						noteResources={this.state.noteResources}
						highlightedKeywords={keywords}
						themeId={this.props.themeId}
						noteHash={this.props.noteHash}
						onCheckboxChange={this.onBodyViewerCheckboxChange}
						onMarkForDownload={this.onMarkForDownload}
						onRequestEditResource={this.onEditResource}
						onLoadEnd={this.onBodyViewerLoadEnd}
					/>
				);
		} else {
			// Note: In theory ScrollView can be used to provide smoother scrolling of the TextInput.
			// However it causes memory or rendering issues on older Android devices, probably because
			// the whole text input has to be in memory for the scrollview to work. So we keep it as
			// a plain TextInput for now.
			// See https://github.com/XilinJia/Xilinota/issues/3041

			// IMPORTANT: The TextInput selection is unreliable and cannot be used in a controlled component
			// context. In other words, the selection should be considered read-only. For example, if the seleciton
			// is saved to the state in onSelectionChange and the current text in onChangeText, then set
			// back in `selection` and `value` props, it will mostly work. But when typing fast, sooner or
			// later the real selection will be different from what is stored in the state, thus making
			// the cursor jump around. Eg, when typing "abcdef", it will do this:
			//     abcd|
			//     abcde|
			//     abcde|f

			if (!this.useRichTextEditor()) {
				bodyComponent = (
					<TextInput
						autoCapitalize="sentences"
						style={this.styles().bodyTextInput}
						ref="noteBodyTextField"
						multiline={true}
						value={note.body}
						onChangeText={(text: string) => this.body_changeText(text)}
						onSelectionChange={this.body_selectionChange}
						blurOnSubmit={false}
						selectionColor={theme.textSelectionColor}
						keyboardAppearance={theme.keyboardAppearance}
						placeholder={_('Add body')}
						placeholderTextColor={theme.colorFaded}
					// need some extra padding for iOS so that the keyboard won't cover last line of the note
					// see https://github.com/XilinJia/Xilinota/issues/3607
					// paddingBottom doesn't exist??
					// paddingBottom={Platform.OS === 'ios' ? 40 : 0}
					/>
				);
			} else {
				const editorStyle = this.styles().bodyTextInput;

				bodyComponent = <NoteEditor
					ref={this.editorRef}
					toolbarEnabled={this.props.toolbarEnabled}
					themeId={this.props.themeId}
					initialText={note.body ?? ''}
					initialSelection={this.selection}
					onChange={this.onBodyChange}
					onSelectionChange={this.body_selectionChange_rich}
					onUndoRedoDepthChange={this.onUndoRedoDepthChange}
					onAttach={() => this.showAttachMenu()}
					readOnly={this.state.readOnly}
					style={{
						...editorStyle,
						paddingLeft: 0,
						paddingRight: 0,
					}}
					contentStyle={{
						// Apply padding to the editor's content, but not the toolbar.
						paddingLeft: editorStyle.paddingLeft,
						paddingRight: editorStyle.paddingRight,
					}}
				/>;
			}
		}

		const renderActionButton = (): React.JSX.Element | null => {
			if (this.state.voiceTypingDialogShown) return null;

			const editButton = {
				label: _('Edit'),
				icon: 'create',
				onPress: () => {
					this.setState({ mode: 'edit' });

					this.doFocusUpdate_ = true;
				},
			};

			if (this.state.mode === 'edit') return null;

			return <ActionButton mainButton={editButton} />;
		};

		// Save button is not really needed anymore with the improved save logic
		const showSaveButton = false; // this.state.mode === 'edit' || this.isModified() || this.saveButtonHasBeenShown_;
		const saveButtonDisabled = true;	// !this.isModified();

		// if (showSaveButton) this.saveButtonHasBeenShown_ = true;

		const titleContainerStyle = isTodo ? this.styles().titleContainerTodo : this.styles().titleContainer;

		const dueDate = Note.dueDateObject(note);

		const titleComp = (
			<View style={titleContainerStyle}>
				{isTodo && <Checkbox style={this.styles().checkbox} checked={!!Number(note.todo_completed)} onChange={this.todoCheckbox_change} />}
				<TextInput
					ref="titleTextField"
					underlineColorAndroid="#ffffff00"
					autoCapitalize="sentences"
					style={this.styles().titleTextInput}
					value={note.title}
					onChangeText={this.title_changeText}
					selectionColor={theme.textSelectionColor}
					keyboardAppearance={theme.keyboardAppearance}
					placeholder={_('Add title')}
					placeholderTextColor={theme.colorFaded}
					editable={!this.state.readOnly}
				/>
			</View>
		);

		const noteTagDialog = !this.state.noteTagDialogShown ? null : <NoteTagsDialog onCloseRequested={this.noteTagDialog_closeRequested} />;

		const renderVoiceTypingDialog = () => {
			if (!this.state.voiceTypingDialogShown) return null;
			return <VoiceTypingDialog locale={currentLocale()} onText={this.voiceTypingDialog_onText} onDismiss={this.voiceTypingDialog_onDismiss} />;
		};

		return (
			<View style={this.rootStyle(this.props.themeId).root}>
				<ScreenHeader
					folderPickerOptions={this.folderPickerOptions()}
					menuOptions={this.menuOptions()}
					showSaveButton={showSaveButton}
					saveButtonDisabled={saveButtonDisabled}
					onSaveButtonPress={this.saveNoteButton_press}
					showSideMenuButton={false}
					showSearchButton={false}
					showUndoButton={(this.state.undoRedoButtonState.canUndo || this.state.undoRedoButtonState.canRedo) && this.state.mode === 'edit'}
					showRedoButton={this.state.undoRedoButtonState.canRedo && this.state.mode === 'edit'}
					undoButtonDisabled={!this.state.undoRedoButtonState.canUndo && this.state.undoRedoButtonState.canRedo}
					onUndoButtonPress={this.screenHeader_undoButtonPress}
					onRedoButtonPress={this.screenHeader_redoButtonPress}
					title={this.state.folder ? this.state.folder.title : ''}
				/>
				{titleComp}
				{bodyComponent}
				{renderActionButton()}
				{renderVoiceTypingDialog()}

				<SelectDateTimeDialog themeId={this.props.themeId} shown={this.state.alarmDialogShown} date={dueDate} onAccept={this.onAlarmDialogAccept} onReject={this.onAlarmDialogReject} />

				<DialogBox
					ref={(dialogbox: any) => {
						this.dialogbox = dialogbox;
					}}
				/>
				{noteTagDialog}
			</View>
		);
	}
}

const NoteScreen = connect((state: AppState) => {
	return {
		noteId: state.selectedNoteIds.length ? state.selectedNoteIds[0] : null,
		noteHash: state.selectedNoteHash,
		folderId: state.selectedFolderId,
		itemType: state.selectedItemType,
		folders: state.folders,
		searchQuery: state.searchQuery,
		themeId: state.settings.theme,
		editorFont: state.settings['style.editor.fontFamily'],
		editorFontSize: state.settings['style.editor.fontSize'],
		toolbarEnabled: state.settings['editor.mobile.toolbarEnabled'],
		ftsEnabled: state.settings['db.ftsEnabled'],
		sharedData: state.sharedData,
		showSideMenu: state.showSideMenu,
		provisionalNoteIds: state.provisionalNoteIds,
		highlightedWords: state.highlightedWords,

		// What we call "beta editor" in this component is actually the (now
		// default) CodeMirror editor. That should be refactored to make it less
		// confusing.
		useRichTextEditor: !state.settings['editor.usePlainText'],
	};
})(NoteScreenComponent);

export default NoteScreen;
