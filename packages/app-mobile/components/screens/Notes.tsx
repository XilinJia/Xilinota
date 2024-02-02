import React from 'react';
import { AppState as RNAppState, View, StyleSheet, NativeEventSubscription } from 'react-native';
import { stateUtils } from '@xilinota/lib/reducer';
import { connect } from 'react-redux';
import NoteList from '../NoteList';
import Folder from '@xilinota/lib/models/Folder';
import Tag from '@xilinota/lib/models/Tag';
import Note from '@xilinota/lib/models/Note';
import Setting from '@xilinota/lib/models/Setting';
import { themeStyle } from '../global-style';

import { FolderPickerOptions, ScreenHeader } from '../ScreenHeader';
import { _ } from '@xilinota/lib/locale';
import ActionButton from '../ActionButton';
import dialogs from '../../utils/dialogs';

const DialogBox = require('react-native-dialogbox').default;

import BaseScreenComponent from '../base-screen';
import BackButtonService from '../../services/back-button';
import { AppState } from '../../utils/types';
import { FolderEntity, NoteEntity, TagEntity } from '@xilinota/lib/services/database/types';
import { Row } from '@xilinota/lib/database';

interface Props {
	notesSource: string;
	themeId: number;
	notesOrder: string;
	selectedFolderId: string;
	selectedSmartFilterId: string;
	selectedTagId: string;
	notesParentType: string;
	noteSelectionEnabled: boolean;
	visible: boolean;
	activeFolderId: string;
	folders: FolderEntity[];
	tags: TagEntity[];
	uncompletedTodosOnTop: boolean;
	showCompletedTodos: boolean;

	dispatch: (event: any) => void;

}
class NotesScreenComponent extends BaseScreenComponent<Props> {

	private onAppStateChangeSub_: NativeEventSubscription | undefined;
	private onAppStateChange_;
	private styles_: any;
	sortButton_press: () => void;
	backHandler: () => void;
	dialogbox: any;
	folderPickerOptions_: FolderPickerOptions | undefined;

	public constructor(props: Props) {
		super(props);

		this.onAppStateChange_ = async () => {
			// Force an update to the notes list when app state changes
			const newProps = { ...this.props };
			newProps.notesSource = '';
			await this.refreshNotes(newProps);
		};

		this.sortButton_press = async () => {
			const buttons = [];
			const sortNoteOptions = Setting.enumOptions('notes.sortOrder.field');

			const makeCheckboxText = function(selected: boolean, sign: string, label: string) {
				const s = sign === 'tick' ? '✓' : '⬤';
				return (selected ? `${s} ` : '') + label;
			};

			for (const field in sortNoteOptions) {
				if (!sortNoteOptions.hasOwnProperty(field)) continue;
				buttons.push({
					text: makeCheckboxText(Setting.value('notes.sortOrder.field') === field, 'bullet', sortNoteOptions[field]),
					id: { name: 'notes.sortOrder.field', value: field },
				});
			}

			buttons.push({
				text: makeCheckboxText(Setting.value('notes.sortOrder.reverse'), 'tick', `[ ${Setting.settingMetadata('notes.sortOrder.reverse').label?.()} ]`),
				id: { name: 'notes.sortOrder.reverse', value: !Setting.value('notes.sortOrder.reverse') },
			});

			buttons.push({
				text: makeCheckboxText(Setting.value('uncompletedTodosOnTop'), 'tick', `[ ${Setting.settingMetadata('uncompletedTodosOnTop').label?.()} ]`),
				id: { name: 'uncompletedTodosOnTop', value: !Setting.value('uncompletedTodosOnTop') },
			});

			buttons.push({
				text: makeCheckboxText(Setting.value('showCompletedTodos'), 'tick', `[ ${Setting.settingMetadata('showCompletedTodos').label?.()} ]`),
				id: { name: 'showCompletedTodos', value: !Setting.value('showCompletedTodos') },
			});

			const r = await dialogs.pop(this, Setting.settingMetadata('notes.sortOrder.field').label?.() ?? '', buttons) as any;
			if (!r) return;

			Setting.setValue(r.name, r.value);
		};

		this.backHandler = () => {
			if (this.dialogbox && this.dialogbox.state && this.dialogbox.state.isVisible) {
				this.dialogbox.close();
				return true;
			}
			return false;
		};
	}

	public styles(): any {
		if (!this.styles_) this.styles_ = {};
		const themeId = this.props.themeId;
		const cacheKey = themeId;

		if (this.styles_[cacheKey]) return this.styles_[cacheKey];
		this.styles_ = {};

		const styles = {
			noteList: {
				flex: 1,
			},
		};

		this.styles_[cacheKey] = StyleSheet.create(styles);
		return this.styles_[cacheKey];
	}

	public async componentDidMount(): Promise<void> {
		BackButtonService.addHandler(this.backHandler);
		await this.refreshNotes();
		this.onAppStateChangeSub_ = RNAppState.addEventListener('change', this.onAppStateChange_);
	}

	public async componentWillUnmount(): Promise<void> {
		if (this.onAppStateChangeSub_) this.onAppStateChangeSub_.remove();
		BackButtonService.removeHandler(this.backHandler);
	}

	public async componentDidUpdate(prevProps: any): Promise<void> {
		if (prevProps.notesOrder !== this.props.notesOrder || prevProps.selectedFolderId !== this.props.selectedFolderId || prevProps.selectedTagId !== this.props.selectedTagId || prevProps.selectedSmartFilterId !== this.props.selectedSmartFilterId || prevProps.notesParentType !== this.props.notesParentType) {
			await this.refreshNotes(this.props);
		}
	}

	public async refreshNotes(props: Props = this.props): Promise<void> {
		const options = {
			order: props.notesOrder,
			uncompletedTodosOnTop: props.uncompletedTodosOnTop,
			showCompletedTodos: props.showCompletedTodos,
			caseInsensitive: true,
		};

		const parent = this.parentItem(props);
		if (!parent) return;

		const source = JSON.stringify({
			options: options,
			parentId: parent.id,
		});

		if (source === props.notesSource) return;
		// TODO: need to handle virtual notebook
		let notes: NoteEntity[] = [];
		if (props.notesParentType === 'Folder') {
			notes = await Note.previews(props.selectedFolderId, options);
		} else if (props.notesParentType === 'Tag') {
			notes = await Tag.notes(props.selectedTagId, options);
		} else if (props.notesParentType === 'SmartFilter') {
			notes = await Note.previews('', options);
		}

		this.props.dispatch({
			type: 'NOTE_UPDATE_ALL',
			notes: notes,
			notesSource: source,
		});
	}

	public newNoteNavigate = async (folderId: string, isTodo: boolean): Promise<void> => {
		try {
			const newNote = await Note.save({
				parent_id: folderId,
				is_todo: isTodo ? 1 : 0,
			}, { provisional: true });

			this.props.dispatch({
				type: 'NAV_GO',
				routeName: 'Note',
				noteId: newNote.id,
			});
		} catch (error) {
			alert(_('Cannot create a new note: %s', (error as Error).message));
		}
	};

	public parentItem(props: Props = this.props): Row | null {

		let output = null;
		if (props.notesParentType === 'Folder') {
			output = Folder.byId(props.folders, props.selectedFolderId);
		} else if (props.notesParentType === 'Tag') {
			output = Tag.byId(props.tags, props.selectedTagId);
		} else if (props.notesParentType === 'SmartFilter') {
			output = { id: this.props.selectedSmartFilterId, title: _('All notes') };
		} else {
			return null;
			// throw new Error('Invalid parent type: ' + props.notesParentType);
		}
		return output;
	}

	public folderPickerOptions(): FolderPickerOptions {
		const options: FolderPickerOptions = {
			enabled: this.props.noteSelectionEnabled,
			mustSelect: true,
		};

		if (this.folderPickerOptions_ && options.enabled === this.folderPickerOptions_.enabled) return this.folderPickerOptions_;

		this.folderPickerOptions_ = options;
		return this.folderPickerOptions_;
	}

	public render() {
		const parent: FolderEntity | null = this.parentItem();
		const theme = themeStyle(this.props.themeId.toString());

		const rootStyle = {
			flex: 1,
			backgroundColor: theme.backgroundColor,
		};

		if (!this.props.visible) {
			rootStyle.flex = 0.001; // This is a bit of a hack but it seems to work fine - it makes the component invisible but without unmounting it
		}

		const title = parent ? parent.title : null;
		if (!parent) {
			return (
				<View style={rootStyle}>
					<ScreenHeader title={title} showSideMenuButton={true} showBackButton={false} />
				</View>
			);
		}
		const icon = Folder.unserializeIcon(parent.icon ?? '');
		const iconString = icon ? `${icon.emoji} ` : '';

		let buttonFolderId = this.props.selectedFolderId !== Folder.conflictFolderId() ? this.props.selectedFolderId : null;
		if (!buttonFolderId) buttonFolderId = this.props.activeFolderId;

		const addFolderNoteButtons = !!buttonFolderId;
		const thisComp = this;

		const makeActionButtonComp = () => {
			if (addFolderNoteButtons && this.props.folders.length > 0) {
				const buttons = [];
				buttons.push({
					label: _('To-do'),
					onPress: () => {
						const isTodo = true;
						if (buttonFolderId) void this.newNoteNavigate(buttonFolderId, isTodo);
					},
					color: '#9b59b6',
					icon: 'checkbox-outline',
				});

				buttons.push({
					label: _('Note'),
					onPress: () => {
						const isTodo = false;
						if (buttonFolderId) void this.newNoteNavigate(buttonFolderId, isTodo);
					},
					color: '#9b59b6',
					icon: 'document',
				});
				return <ActionButton buttons={buttons} />;
			}
			return null;
		};

		const actionButtonComp = this.props.noteSelectionEnabled || !this.props.visible ? null : makeActionButtonComp();

		// Ensure that screen readers can't focus the notes list when it isn't visible.
		// accessibilityElementsHidden is used on iOS and importantForAccessibility is used
		// on Android.
		const accessibilityHidden = !this.props.visible;

		return (
			<View
				style={rootStyle}

				accessibilityElementsHidden={accessibilityHidden}
				importantForAccessibility={accessibilityHidden ? 'no-hide-descendants' : undefined}
			>
				<ScreenHeader title={iconString + title} showBackButton={false} parentComponent={thisComp} sortButton_press={this.sortButton_press} folderPickerOptions={this.folderPickerOptions()} showSearchButton={true} showSideMenuButton={true} />
				<NoteList />
				{actionButtonComp}
				<DialogBox
					ref={(dialogbox: any) => {
						this.dialogbox = dialogbox;
					}}
				/>
			</View>
		);
	}
}

const NotesScreen = connect((state: AppState) => {
	return {
		folders: state.folders,
		tags: state.tags,
		activeFolderId: state.settings.activeFolderId,
		selectedFolderId: state.selectedFolderId,
		selectedNoteIds: state.selectedNoteIds,
		selectedTagId: state.selectedTagId,
		selectedSmartFilterId: state.selectedSmartFilterId,
		notesParentType: state.notesParentType,
		notes: state.notes,
		notesSource: state.notesSource,
		uncompletedTodosOnTop: state.settings.uncompletedTodosOnTop,
		showCompletedTodos: state.settings.showCompletedTodos,
		themeId: state.settings.theme,
		noteSelectionEnabled: state.noteSelectionEnabled,
		notesOrder: stateUtils.notesOrder(state.settings),
	};
})(NotesScreenComponent as any);

export default NotesScreen as any;
