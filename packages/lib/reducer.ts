import { produce, Draft, original } from 'immer';
import pluginServiceReducer, { stateRootKey as pluginServiceStateRootKey, defaultState as pluginServiceDefaultState, State as PluginServiceState } from './services/plugins/reducer';
import shareServiceReducer, { stateRootKey as shareServiceStateRootKey, defaultState as shareServiceDefaultState, State as ShareServiceState } from './services/share/reducer';
import Note, { NotesOrder } from './models/Note';
import Folder from './models/Folder';
import BaseModel from './BaseModel';
import { Store } from 'redux';
import { ProfileConfig } from './services/profileConfig/types';
import * as ArrayUtils from './ArrayUtils';
import { BaseItemEntity, FolderEntity, NoteEntity, NoteTagEntity, TagEntity } from './services/database/types';
import { getListRendererIds } from './services/noteList/renderers';
import fastDeepEqual from 'fast-deep-equal';
const { ALL_NOTES_FILTER_ID } = require('./reserved-ids');
import { createSelectorCreator, defaultMemoize } from 'reselect';
import { Row } from './database';
// import { createCachedSelector } from 're-reselect';
const { createCachedSelector } = require('re-reselect');

const additionalReducers: any[] = [];

additionalReducers.push({
	stateRootKey: pluginServiceStateRootKey,
	defaultState: pluginServiceDefaultState,
	reducer: pluginServiceReducer,
});

additionalReducers.push({
	stateRootKey: shareServiceStateRootKey,
	defaultState: shareServiceDefaultState,
	reducer: shareServiceReducer,
});

interface StateLastSelectedNotesIds {
	Folder: any;
	Tag: any;
	Search: any;
}

interface StateClipperServer {
	startState: string;
	port: number;
}

interface StateDecryptionWorker {
	state: string;
	itemIndex: number;
	itemCount: number;
	decryptedItemCounts: any;
	decryptedItemCount: number;
	skippedItemCount: number;
}

interface StateResourceFetcher {
	toFetchCount: number;
}

interface NoteHistoryInfo {
	id?: string | null;
	parent_id?: string;
	notesParentType: string;
	selectedFolderId?: string;
	selectedTagId: string;
	selectedSearchId: string;
	searches: any[];
	selectedSmartFilterId: string;
};

export interface State {
	notes: NoteEntity[];
	noteSelectionEnabled?: boolean;
	notesSource: string;
	notesParentType: string;
	folders: FolderEntity[];
	tags: TagEntity[];
	masterKeys: any[];
	notLoadedMasterKeys: string[];
	searches: any[];
	highlightedWords: string[];
	selectedNoteIds: string[];
	selectedNoteHash: string;
	selectedFolderId: string;
	selectedTagId: string;
	selectedSearchId: string;
	selectedItemType: string;
	selectedSmartFilterId: string;
	lastSelectedNotesIds: StateLastSelectedNotesIds;
	showSideMenu: boolean;
	screens: any;
	historyCanGoBack: boolean;
	syncStarted: boolean;
	syncReport: any;
	searchQuery: string;
	settings: any;
	sharedData: any;
	appState: string;
	biometricsDone: boolean;
	hasDisabledSyncItems: boolean;
	hasDisabledEncryptionItems: boolean;
	customCss: string;
	hasLegacyTemplates: boolean;
	collapsedFolderIds: string[];
	clipperServer: StateClipperServer;
	decryptionWorker: StateDecryptionWorker;
	selectedNoteTags: NoteTagEntity[];
	resourceFetcher: StateResourceFetcher;
	backwardHistoryNotes: NoteHistoryInfo[];
	forwardHistoryNotes: NoteHistoryInfo[];
	pluginsLegacy: any;
	provisionalNoteIds: string[];
	editorNoteStatuses: any;
	isInsertingNotes: boolean;
	hasEncryptedItems: boolean;
	needApiAuth: boolean;
	profileConfig: ProfileConfig | null;
	noteListRendererIds: string[];

	// Extra reducer keys go here:
	pluginService: PluginServiceState;
	shareService: ShareServiceState;
}

export const defaultState: State = {
	notes: [],
	notesSource: '',
	notesParentType: '',
	folders: [],
	tags: [],
	masterKeys: [],
	notLoadedMasterKeys: [],
	searches: [],
	highlightedWords: [],
	selectedNoteIds: [],
	selectedNoteHash: '',
	selectedFolderId: '',
	selectedTagId: '',
	selectedSearchId: '',
	selectedSmartFilterId: '',
	selectedItemType: 'note',
	lastSelectedNotesIds: {
		Folder: {},
		Tag: {},
		Search: {},
	},
	showSideMenu: false,
	screens: {},
	historyCanGoBack: false,
	syncStarted: false,
	syncReport: {},
	searchQuery: '',
	settings: {},
	sharedData: null,
	appState: 'starting',
	biometricsDone: false,
	hasDisabledSyncItems: false,
	hasDisabledEncryptionItems: false,
	customCss: '',
	hasLegacyTemplates: false,
	collapsedFolderIds: [],
	clipperServer: {
		startState: 'idle',
		port: 0,
	},
	decryptionWorker: {
		state: 'idle',
		itemIndex: 0,
		itemCount: 0,
		decryptedItemCounts: {},
		decryptedItemCount: 0,
		skippedItemCount: 0,
	},
	selectedNoteTags: [],
	resourceFetcher: {
		toFetchCount: 0,
	},
	backwardHistoryNotes: [],
	forwardHistoryNotes: [],
	// pluginsLegacy is the original plugin system, which eventually was used only for GotoAnything.
	// GotoAnything should be refactored to part of core and when it's done the pluginsLegacy key can
	// be removed. It was originally named "plugins", then renamed "pluginsLegacy" so as not to conflict
	// with the new "plugins" key used for the new plugin system.
	pluginsLegacy: {},
	provisionalNoteIds: [],
	editorNoteStatuses: {},
	isInsertingNotes: false,
	hasEncryptedItems: false,
	needApiAuth: false,
	profileConfig: null,
	noteListRendererIds: getListRendererIds(),

	pluginService: pluginServiceDefaultState,
	shareService: shareServiceDefaultState,
};

for (const additionalReducer of additionalReducers) {
	(defaultState as any)[additionalReducer.stateRootKey] = additionalReducer.defaultState;
}

let store_: Store<any> | null = null;

export function setStore(v: Store<any>): void {
	store_ = v;
}

export function store(): Store<any> | null {
	return store_;
}

export const MAX_HISTORY = 200;

const derivedStateCache_: Record<string, NotesOrder[]> = {};

// Allows, for a given state, to return the same derived
// objects, to prevent unecessary updates on calling components.
const cacheEnabledOutput = (key: string, output: NotesOrder[]): NotesOrder[] => {
	key = `${key}_${JSON.stringify(output)}`;
	if (derivedStateCache_[key]) return derivedStateCache_[key];

	derivedStateCache_[key] = output;
	return derivedStateCache_[key];
};

const createShallowArrayEqualSelector = createSelectorCreator(
	defaultMemoize,
	(prev: any[], next: any[]) => {
		if (prev.length !== next.length) return false;
		for (let i = 0; i < prev.length; i++) {
			if (prev[i] !== next[i]) return false;
		}
		return true;
	},
);

const selectArrayShallow = createCachedSelector(
	(state: any) => state.array,
	(array: any[]) => array,
)({
	keySelector: (_state: any, cacheKey: any) => {
		return cacheKey;
	},
	selectorCreator: createShallowArrayEqualSelector,
});

class StateUtils {

	// Given an input array, this selector ensures that the same array is returned
	// if its content hasn't changed.
	public selectArrayShallow(props: any, cacheKey: any) {
		// TODO: strange thing related to re-reselect import
		return selectArrayShallow(props, cacheKey);
		// return selectArrayShallow(cacheKey);
	}

	public oneNoteSelected(state: State): boolean {
		return state.selectedNoteIds.length === 1;
	}

	public notesOrder(stateSettings: Record<string, string>) {
		if (stateSettings['notes.sortOrder.field'] === 'order') {
			return cacheEnabledOutput('notesOrder', [
				{
					by: 'order',
					dir: 'DESC',
				},
				{
					by: 'user_created_time',
					dir: 'DESC',
				},
			]);
		} else {
			return cacheEnabledOutput('notesOrder', [
				{
					by: stateSettings['notes.sortOrder.field'],
					dir: stateSettings['notes.sortOrder.reverse'] ? 'DESC' : 'ASC',
				},
			]);
		}
	}

	public foldersOrder(stateSettings: Record<string, string>) {
		return cacheEnabledOutput('foldersOrder', [
			{
				by: stateSettings['folders.sortOrder.field'],
				dir: stateSettings['folders.sortOrder.reverse'] ? 'DESC' : 'ASC',
			},
		]);
	}

	public hasNotesBeingSaved(state: State): boolean {
		for (const id in state.editorNoteStatuses) {
			if (state.editorNoteStatuses[id] === 'saving') return true;
		}
		return false;
	}

	public parentItem(state: State): { type: string; id: string; } | null {
		const t = state.notesParentType;
		let id = null;
		if (t === 'Folder') id = state.selectedFolderId;
		if (t === 'Tag') id = state.selectedTagId;
		if (t === 'Search') id = state.selectedSearchId;
		if (!t || !id) return null;
		return { type: t, id: id };
	}

	public lastSelectedNoteIds(state: State): string[] {
		const parent = this.parentItem(state);
		if (!parent) return [];
		const output = (state.lastSelectedNotesIds as any)[parent.type][parent.id];
		return output ? output : [];
	}

	public selectedNote(state: State): NoteEntity | null {
		const noteId = this.selectedNoteId(state);
		return noteId ? BaseModel.byId(state.notes, noteId) : null;
	}

	public selectedNoteId(state: State): string | null {
		return state.selectedNoteIds.length ? state.selectedNoteIds[0] : null;
	}

}

export const stateUtils: StateUtils = new StateUtils();

function arrayHasEncryptedItems(array: { encryption_applied?: number }[]): boolean {
	for (let i = 0; i < array.length; i++) {
		if (array[i].encryption_applied) return true;
	}
	return false;
}

function stateHasEncryptedItems(state: State): boolean {
	if (arrayHasEncryptedItems(state.notes)) return true;
	if (arrayHasEncryptedItems(state.folders)) return true;
	if (arrayHasEncryptedItems(state.tags)) return true;
	return false;
}

function folderSetCollapsed(draft: Draft<State>, action: { id: string; collapsed: boolean; }): void {
	const collapsedFolderIds = draft.collapsedFolderIds.slice();
	const idx = collapsedFolderIds.indexOf(action.id);

	if (action.collapsed) {
		if (idx >= 0) return;
		collapsedFolderIds.push(action.id);
	} else {
		if (idx < 0) return;
		collapsedFolderIds.splice(idx, 1);
	}

	draft.collapsedFolderIds = collapsedFolderIds;
}

function removeAdjacentDuplicates(items: NoteHistoryInfo[]): NoteHistoryInfo[] {
	return items.filter((item: NoteHistoryInfo, idx: number) => (idx >= 1) ? items[idx - 1].id !== item.id : true);
}

// When deleting a note, tag or folder
function handleItemDelete(draft: Draft<State>, action: { type: string | number; id: string; }): void {
	const map: Record<string, any[]> = {
		FOLDER_DELETE: ['folders', 'selectedFolderId', true],
		NOTE_DELETE: ['notes', 'selectedNoteIds', false],
		TAG_DELETE: ['tags', 'selectedTagId', true],
		SEARCH_DELETE: ['searches', 'selectedSearchId', true],
	};

	const listKey = map[action.type][0];
	const selectedItemKey = map[action.type][1];
	const isSingular = map[action.type][2];

	const selectedItemKeys = isSingular ? [(draft as any)[selectedItemKey]] : (draft as any)[selectedItemKey];
	const isSelected = selectedItemKeys.includes(action.id);

	const items = (draft as any)[listKey];
	const newItems = [];
	let newSelectedIndexes: number[] = [];

	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		if (isSelected) {
			// the selected item is deleted so select the following item
			// if multiple items are selected then just use the first one
			if (selectedItemKeys[0] === item.id) {
				newSelectedIndexes.push(newItems.length);
			}
		} else {
			// the selected item/s is not deleted so keep it selected
			if (selectedItemKeys.includes(item.id)) {
				newSelectedIndexes.push(newItems.length);
			}
		}
		if (item.id === action.id) {
			continue;
		}
		newItems.push(item);
	}

	if (newItems.length === 0) {
		newSelectedIndexes = []; // no remaining items so no selection

	} else if (newSelectedIndexes.length === 0) {
		newSelectedIndexes.push(0); // no selection exists so select the top

	} else {
		// when the items at end of list are deleted then select the end
		for (let i = 0; i < newSelectedIndexes.length; i++) {
			if (newSelectedIndexes[i] >= newItems.length) {
				newSelectedIndexes = [newItems.length - 1];
				break;
			}
		}
	}

	(draft as any)[listKey] = newItems;

	const newIds = [];
	for (let i = 0; i < newSelectedIndexes.length; i++) {
		newIds.push(newItems[newSelectedIndexes[i]].id);
	}
	(draft as any)[selectedItemKey] = isSingular ? newIds[0] : newIds;

	if ((newIds.length === 0) && draft.notesParentType !== 'Folder') {
		draft.notesParentType = 'Folder';
	}
}

function updateOneItem(draft: Draft<State>, action: { type: string; item: { id: string }; }, keyName = ''): void {
	let itemsKey = '';
	if (keyName) { itemsKey = keyName; }
	else {
		if (action.type === 'TAG_UPDATE_ONE') itemsKey = 'tags';
		if (action.type === 'FOLDER_UPDATE_ONE') itemsKey = 'folders';
		if (action.type === 'MASTERKEY_UPDATE_ONE') itemsKey = 'masterKeys';
	}

	const newItems = (draft as any)[itemsKey].slice();
	const item = action.item;

	let found = false;
	for (let i = 0; i < newItems.length; i++) {
		const n = newItems[i];
		if (n.id === item.id) {
			newItems[i] = { ...newItems[i], ...item };
			found = true;
			break;
		}
	}

	if (!found) newItems.push(item);

	(draft as any)[itemsKey] = newItems;
}

function updateSelectedNotesFromExistingNotes(draft: Draft<State>): void {
	const newSelectedNoteIds = [];
	for (const selectedNoteId of draft.selectedNoteIds) {
		for (const n of draft.notes) {
			if (n.id === selectedNoteId) {
				newSelectedNoteIds.push(n.id);
			}
		}
	}
	if (JSON.stringify(draft.selectedNoteIds) === JSON.stringify(newSelectedNoteIds)) return;
	draft.selectedNoteIds = newSelectedNoteIds;
}

function defaultNotesParentType(draft: Draft<State>, exclusion: string): string {
	let newNotesParentType = '';

	if (exclusion !== 'SmartFilter' && draft.selectedSmartFilterId) {
		newNotesParentType = 'SmartFilter';
	} else if (exclusion !== 'Folder' && draft.selectedFolderId) {
		newNotesParentType = 'Folder';
	} else if (exclusion !== 'Tag' && draft.selectedTagId) {
		newNotesParentType = 'Tag';
	} else if (exclusion !== 'Search' && draft.selectedSearchId) {
		newNotesParentType = 'Search';
	}

	return newNotesParentType;
}

export type NotesParentType = 'Folder' | 'Tag' | 'SmartFilter';

export interface NotesParent {
	type: NotesParentType;
	selectedItemId: string;
}

export const serializeNotesParent = (n: NotesParent) => {
	return JSON.stringify(n);
};

export const parseNotesParent = (s: string, activeFolderId: string): NotesParent => {
	const defaultValue: NotesParent = {
		type: 'Folder',
		selectedItemId: activeFolderId,
	};

	if (!s) return defaultValue;

	try {
		const parsed = JSON.parse(s);
		return parsed;
	} catch (error) {
		return defaultValue;
	}
};

export const getNotesParent = (state: State): NotesParent => {
	let type = state.notesParentType as NotesParentType;
	let selectedItemId = '';

	if (type === 'Folder') {
		selectedItemId = state.selectedFolderId;
	} else if (type === 'Tag') {
		selectedItemId = state.selectedTagId;
	} else if (type === 'SmartFilter') {
		selectedItemId = state.selectedSmartFilterId;
	} else {
		type = 'Folder';
		selectedItemId = state.selectedFolderId;
	}

	return { type, selectedItemId };
};

function changeSelectedFolder(draft: Draft<State>, action: { folderId?: string; id: string; }, options: any = null): void {
	if (!options) options = {};
	draft.selectedFolderId = 'folderId' in action && action.folderId ? action.folderId : action.id;
	if (!draft.selectedFolderId) {
		draft.notesParentType = defaultNotesParentType(draft, 'Folder');
	} else {
		draft.notesParentType = 'Folder';
	}

	if (options.clearSelectedNoteIds) draft.selectedNoteIds = [];
}

function recordLastSelectedNoteIds(draft: Draft<State>, noteIds: string[]): void {
	const newOnes: any = { ...draft.lastSelectedNotesIds };
	const parent = stateUtils.parentItem(draft);
	if (!parent) return;

	newOnes[parent.type] = { ...newOnes[parent.type] };
	newOnes[parent.type][parent.id] = noteIds.slice();

	draft.lastSelectedNotesIds = newOnes;
}

function changeSelectedNotes(draft: Draft<State>, action: { type: string; id: string; ids?: string[]; noteId?: string; index?: number; hash?: string; }, options: any = null): void {
	if (!options) options = {};

	let noteIds: string[] = [];
	if (action.id) noteIds = [action.id];
	if (action.ids) noteIds = action.ids;
	if (action.noteId) noteIds = [action.noteId];
	if (action.index) {
		const n = draft.notes[action.index];
		if (n && n.id) noteIds = [n.id];
	}
	if (action.type === 'NOTE_SELECT') {
		if (JSON.stringify(draft.selectedNoteIds) === JSON.stringify(noteIds)) return;
		draft.selectedNoteIds = noteIds;
		draft.selectedNoteHash = action.hash ? action.hash : '';
	} else if (action.type === 'NOTE_SELECT_ADD') {
		if (!noteIds.length) return;
		draft.selectedNoteIds = ArrayUtils.unique(draft.selectedNoteIds.concat(noteIds));
	} else if (action.type === 'NOTE_SELECT_REMOVE') {
		if (!noteIds.length) return; // Nothing to unselect
		if (draft.selectedNoteIds.length <= 1) return; // Cannot unselect the last note

		const newSelectedNoteIds = [];
		for (let i = 0; i < draft.selectedNoteIds.length; i++) {
			const id = draft.selectedNoteIds[i];
			if (noteIds.indexOf(id) >= 0) continue;
			newSelectedNoteIds.push(id);
		}
		draft.selectedNoteIds = newSelectedNoteIds;
	} else if (action.type === 'NOTE_SELECT_TOGGLE') {
		if (!noteIds.length) return;

		if (draft.selectedNoteIds.indexOf(noteIds[0]) >= 0) {
			changeSelectedNotes(draft, { type: 'NOTE_SELECT_REMOVE', id: noteIds[0] });
		} else {
			changeSelectedNotes(draft, { type: 'NOTE_SELECT_ADD', id: noteIds[0] });
		}
	} else {
		throw new Error('Unreachable');
	}

	recordLastSelectedNoteIds(draft, draft.selectedNoteIds);
}

function removeItemFromArray(array: any[], property: any, value: any): any[] {
	for (let i = 0; i !== array.length; ++i) {
		const currentItem = array[i];
		if (currentItem[property] === value) {
			array = array.slice();
			array.splice(i, 1);
			break;
		}
	}
	return array;
}

const getContextFromHistory = (ctx: any) => {
	const result: any = {};
	result.notesParentType = ctx.notesParentType;
	if (result.notesParentType === 'Folder') {
		result.selectedFolderId = ctx.selectedFolderId;
	} else if (result.notesParentType === 'Tag') {
		result.selectedTagId = ctx.selectedTagId;
	} else if (result.notesParentType === 'Search') {
		result.selectedSearchId = ctx.selectedSearchId;
		result.searches = ctx.searches;
	} else if (result.notesParentType === 'SmartFilter') {
		result.selectedSmartFilterId = ctx.selectedSmartFilterId;
	}
	return result;
};

function getNoteHistoryInfo(state: State): NoteHistoryInfo | null {
	const selectedNoteIds = state.selectedNoteIds;
	const notes = state.notes;
	if (selectedNoteIds && selectedNoteIds.length > 0) {
		const currNote = notes.find(note => note.id === selectedNoteIds[0]);
		if (currNote) {
			return {
				id: currNote.id,
				parent_id: currNote.parent_id,
				notesParentType: state.notesParentType,
				selectedFolderId: state.selectedFolderId,
				selectedTagId: state.selectedTagId,
				selectedSearchId: state.selectedSearchId,
				searches: state.searches,
				selectedSmartFilterId: state.selectedSmartFilterId,
			};
		}
	}
	return null;
}

function handleHistory(draft: Draft<State>, action: { type?: string; id: string; note?: NoteEntity; folderId?: string; ids?: string[]; noteId?: string; index?: number; hash?: any; }): void {
	const currentNote = getNoteHistoryInfo(draft);
	switch (action.type) {
		case 'HISTORY_BACKWARD': {
			const note = draft.backwardHistoryNotes[draft.backwardHistoryNotes.length - 1];
			if (currentNote && (draft.forwardHistoryNotes.length === 0 || currentNote.id !== draft.forwardHistoryNotes[draft.forwardHistoryNotes.length - 1].id)) {
				draft.forwardHistoryNotes = draft.forwardHistoryNotes.concat(currentNote).slice(-MAX_HISTORY);
			}

			// type has no effect in changeSelectedFolder
			// changeSelectedFolder(draft, { ...action, type: 'FOLDER_SELECT', folderId: note.parent_id??'' });
			changeSelectedFolder(draft, { ...action, folderId: note.parent_id ?? '' });
			if (note.id) changeSelectedNotes(draft, { ...action, type: 'NOTE_SELECT', noteId: note.id });

			const ctx = draft.backwardHistoryNotes[draft.backwardHistoryNotes.length - 1];
			Object.assign(draft, getContextFromHistory(ctx));

			draft.backwardHistoryNotes.pop();
			break;
		}
		case 'HISTORY_FORWARD': {
			const note = draft.forwardHistoryNotes[draft.forwardHistoryNotes.length - 1];

			if (currentNote && (draft.backwardHistoryNotes.length === 0 || currentNote.id !== draft.backwardHistoryNotes[draft.backwardHistoryNotes.length - 1].id)) {
				draft.backwardHistoryNotes = draft.backwardHistoryNotes.concat(currentNote).slice(-MAX_HISTORY);
			}

			// type has no effect in changeSelectedFolder
			// changeSelectedFolder(draft, { ...action, type: 'FOLDER_SELECT', folderId: note.parent_id });
			changeSelectedFolder(draft, { ...action, folderId: note.parent_id });
			if (note.id) changeSelectedNotes(draft, { ...action, type: 'NOTE_SELECT', noteId: note.id });

			const ctx = draft.forwardHistoryNotes[draft.forwardHistoryNotes.length - 1];
			Object.assign(draft, getContextFromHistory(ctx));


			draft.forwardHistoryNotes.pop();
			break;
		}
		case 'NOTE_SELECT':
			if (currentNote && action.id !== currentNote.id) {
				draft.forwardHistoryNotes = [];
				draft.backwardHistoryNotes = draft.backwardHistoryNotes.concat(currentNote).slice(-MAX_HISTORY);
			}
			// History should be free from duplicates.
			if (draft.backwardHistoryNotes && draft.backwardHistoryNotes.length > 0 &&
				action.id === draft.backwardHistoryNotes[draft.backwardHistoryNotes.length - 1].id) {
				draft.backwardHistoryNotes.pop();
			}
			break;
		case 'TAG_SELECT':
		case 'FOLDER_AND_NOTE_SELECT':
		case 'FOLDER_SELECT':
			if (currentNote) {
				if (draft.forwardHistoryNotes.length) draft.forwardHistoryNotes = [];
				draft.backwardHistoryNotes = draft.backwardHistoryNotes.concat(currentNote).slice(-MAX_HISTORY);
			}
			break;
		case 'NOTE_UPDATE_ONE': {
			const modNote = action.note;

			draft.backwardHistoryNotes = draft.backwardHistoryNotes.map(note => {
				if (modNote && note.id === modNote.id) {
					return { ...note, parent_id: modNote.parent_id, selectedFolderId: modNote.parent_id };
				}
				return note;
			});

			draft.forwardHistoryNotes = draft.forwardHistoryNotes.map(note => {
				if (modNote && note.id === modNote.id) {
					return { ...note, parent_id: modNote.parent_id, selectedFolderId: modNote.parent_id };
				}
				return note;
			});

			break;
		}
		case 'SEARCH_UPDATE':
			if (currentNote && (draft.backwardHistoryNotes.length === 0 ||
				draft.backwardHistoryNotes[draft.backwardHistoryNotes.length - 1].id !== currentNote.id)) {
				if (draft.forwardHistoryNotes.length) draft.forwardHistoryNotes = [];
				draft.backwardHistoryNotes = draft.backwardHistoryNotes.concat(currentNote).slice(-MAX_HISTORY);
			}
			break;
		case 'FOLDER_DELETE':
			draft.backwardHistoryNotes = draft.backwardHistoryNotes.filter(note => note.parent_id !== action.id);
			draft.forwardHistoryNotes = draft.forwardHistoryNotes.filter(note => note.parent_id !== action.id);

			draft.backwardHistoryNotes = removeAdjacentDuplicates(draft.backwardHistoryNotes);
			draft.forwardHistoryNotes = removeAdjacentDuplicates(draft.forwardHistoryNotes);
			break;
		case 'NOTE_DELETE': {
			draft.backwardHistoryNotes = draft.backwardHistoryNotes.filter(note => note.id !== action.id);
			draft.forwardHistoryNotes = draft.forwardHistoryNotes.filter(note => note.id !== action.id);

			draft.backwardHistoryNotes = removeAdjacentDuplicates(draft.backwardHistoryNotes);
			draft.forwardHistoryNotes = removeAdjacentDuplicates(draft.forwardHistoryNotes);

			// Fix the case where after deletion the currently selected note is also the latest in history
			const selectedNoteIds = draft.selectedNoteIds;
			if (selectedNoteIds.length && draft.backwardHistoryNotes.length && draft.backwardHistoryNotes[draft.backwardHistoryNotes.length - 1].id === selectedNoteIds[0]) {
				draft.backwardHistoryNotes = draft.backwardHistoryNotes.slice(0, draft.backwardHistoryNotes.length - 1);
			}
			if (selectedNoteIds.length && draft.forwardHistoryNotes.length && draft.forwardHistoryNotes[draft.forwardHistoryNotes.length - 1].id === selectedNoteIds[0]) {
				draft.forwardHistoryNotes = draft.forwardHistoryNotes.slice(0, draft.forwardHistoryNotes.length - 1);
			}
			break;
		}
	}
}


const reducer = produce((draft: Draft<State> = defaultState, action: any) => {

	// const reducer = (state:State = defaultState, action:any) => {
	// if (!['SIDE_MENU_OPEN_PERCENT'].includes(action.type)) console.info('Action', action.type, action);

	// let newState = state;

	// NOTE_DELETE requires post processing
	if (action.type !== 'NOTE_DELETE') {
		handleHistory(draft, action);
	}

	try {
		switch (action.type) {

			case 'NOTE_SELECT':
			case 'NOTE_SELECT_ADD':
			case 'NOTE_SELECT_REMOVE':
			case 'NOTE_SELECT_TOGGLE':
				changeSelectedNotes(draft, action);
				break;
			case 'NOTE_SELECT_EXTEND':
				{
					if (!draft.selectedNoteIds.length) {
						draft.selectedNoteIds = [action.id];
					} else {
						const selectRangeId1 = draft.selectedNoteIds[draft.selectedNoteIds.length - 1];
						const selectRangeId2 = action.id;
						if (selectRangeId1 === selectRangeId2) {
							// Nothing
						} else {
							const newSelectedNoteIds = draft.selectedNoteIds.slice();
							let selectionStarted = false;
							for (let i = 0; i < draft.notes.length; i++) {
								const id = draft.notes[i].id;
								if (!id) continue;
								if (!selectionStarted && (id === selectRangeId1 || id === selectRangeId2)) {
									selectionStarted = true;
									if (newSelectedNoteIds.indexOf(id) < 0) newSelectedNoteIds.push(id);
									continue;
								} else if (selectionStarted && (id === selectRangeId1 || id === selectRangeId2)) {
									if (newSelectedNoteIds.indexOf(id) < 0) newSelectedNoteIds.push(id);
									break;
								}

								if (selectionStarted && newSelectedNoteIds.indexOf(id) < 0) {
									newSelectedNoteIds.push(id);
								}
							}
							draft.selectedNoteIds = newSelectedNoteIds;
						}
					}
				}
				break;

			case 'NOTE_SELECT_ALL':
				draft.selectedNoteIds = draft.notes.map((n: NoteEntity) => n.id ?? '');
				break;

			case 'NOTE_SELECT_ALL_TOGGLE': {
				const allSelected = draft.notes.every((n: NoteEntity) => n.id && draft.selectedNoteIds.includes(n.id));
				if (allSelected) {
					draft.selectedNoteIds = [];
				} else {
					draft.selectedNoteIds = draft.notes.map(n => n.id ?? '');
				}
				break;
			}

			case 'SMART_FILTER_SELECT':
				draft.notesParentType = 'SmartFilter';
				draft.selectedSmartFilterId = action.id;
				break;

			case 'FOLDER_SELECT':
				changeSelectedFolder(draft, action, { clearSelectedNoteIds: true });
				break;

			case 'FOLDER_AND_NOTE_SELECT':
				{
					changeSelectedFolder(draft, action);
					const noteSelectAction = { ...action, type: 'NOTE_SELECT' };
					changeSelectedNotes(draft, noteSelectAction);
				}
				break;

			case 'SETTING_UPDATE_ALL':
				draft.settings = action.settings;
				break;

			case 'SETTING_UPDATE_ONE':
				{
					const newSettings = { ...draft.settings };
					newSettings[action.key] = action.value;
					draft.settings = newSettings;
				}
				break;

			case 'NOTE_PROVISIONAL_FLAG_CLEAR':
				{
					const newIds = ArrayUtils.removeElement(draft.provisionalNoteIds, action.id);
					if (newIds !== draft.provisionalNoteIds) {
						draft.provisionalNoteIds = newIds;
					}
				}
				break;

			// Replace all the notes with the provided array
			case 'NOTE_UPDATE_ALL':
				draft.notes = action.notes;
				draft.notesSource = action.notesSource;
				updateSelectedNotesFromExistingNotes(draft);
				break;

			// Insert the note into the note list if it's new, or
			// update it within the note array if it already exists.
			case 'NOTE_UPDATE_ONE':
				{
					const modNote = action.note;
					const isViewingAllNotes = (draft.notesParentType === 'SmartFilter' && draft.selectedSmartFilterId === ALL_NOTES_FILTER_ID);
					const isViewingConflictFolder = draft.notesParentType === 'Folder' && draft.selectedFolderId === Folder.conflictFolderId();

					const noteIsInFolder = function(note: NoteEntity, folderId: string) {
						if (note.is_conflict && isViewingConflictFolder) return true;
						if (!('parent_id' in modNote) || note.parent_id === folderId) return true;
						return false;
					};

					let movedNotePreviousIndex = 0;
					let noteFolderHasChanged = false;
					let newNotes = draft.notes.slice();
					let found = false;
					for (let i = 0; i < newNotes.length; i++) {
						const n = newNotes[i];
						if (n.id === modNote.id) {
							if (n.is_conflict && !modNote.is_conflict) {
								// Note was a conflict but was moved outside of
								// the conflict folder
								newNotes.splice(i, 1);
								noteFolderHasChanged = true;
								movedNotePreviousIndex = i;
							} else if (isViewingAllNotes || noteIsInFolder(modNote, n.parent_id ?? '')) {
								// Note is still in the same folder
								// Merge the properties that have changed (in modNote) into
								// the object we already have.
								newNotes[i] = { ...newNotes[i] };

								for (const n in modNote) {
									if (!modNote.hasOwnProperty(n)) continue;
									(newNotes[i] as any)[n] = modNote[n];
								}
							} else {
								// Note has moved to a different folder
								newNotes.splice(i, 1);
								noteFolderHasChanged = true;
								movedNotePreviousIndex = i;
							}
							found = true;
							break;
						}
					}

					// Note was not found - if the current folder is the same as the note folder,
					// add it to it.
					if (!found) {
						if (isViewingAllNotes || noteIsInFolder(modNote, draft.selectedFolderId)) {
							newNotes.push(modNote);
						}
					}

					// newNotes = Note.sortNotes(newNotes, draft.notesOrder, draft.settings.uncompletedTodosOnTop);
					newNotes = Note.sortNotes(newNotes, stateUtils.notesOrder(draft.settings), draft.settings.uncompletedTodosOnTop);
					draft.notes = newNotes;

					if (noteFolderHasChanged) {
						let newIndex = movedNotePreviousIndex;
						if (newIndex >= newNotes.length) newIndex = newNotes.length - 1;
						if (!newNotes.length) newIndex = -1;
						const newId = newNotes[newIndex].id;
						draft.selectedNoteIds = newId && newIndex >= 0 ? [newId] : [];
					}

					if (!action.ignoreProvisionalFlag) {
						let newProvisionalNoteIds = draft.provisionalNoteIds;

						if (action.provisional) {
							newProvisionalNoteIds = newProvisionalNoteIds.slice();
							newProvisionalNoteIds.push(modNote.id);
						} else {
							const idx = newProvisionalNoteIds.indexOf(modNote.id);
							if (idx >= 0) {
								newProvisionalNoteIds = newProvisionalNoteIds.slice();
								newProvisionalNoteIds.splice(idx, 1);
							}
						}

						draft.provisionalNoteIds = newProvisionalNoteIds;
					}
				}
				break;

			case 'NOTE_DELETE':

				{
					handleItemDelete(draft, action);

					const idx = draft.provisionalNoteIds.indexOf(action.id);
					if (idx >= 0) {
						const t = draft.provisionalNoteIds.slice();
						t.splice(idx, 1);
						draft.provisionalNoteIds = t;
					}
				}
				break;

			case 'NOTE_IS_INSERTING_NOTES':

				if (draft.isInsertingNotes !== action.value) {
					draft.isInsertingNotes = action.value;
				}
				break;

			case 'TAG_DELETE':
				handleItemDelete(draft, action);
				draft.selectedNoteTags = removeItemFromArray(draft.selectedNoteTags, 'id', action.id);
				break;

			case 'FOLDER_UPDATE_ALL':
				draft.folders = action.items;
				break;

			case 'FOLDER_SET_COLLAPSED':
				folderSetCollapsed(draft, action);
				break;

			case 'FOLDER_TOGGLE':
				if (draft.collapsedFolderIds.indexOf(action.id) >= 0) {
					folderSetCollapsed(draft, { collapsed: false, ...action });
				} else {
					folderSetCollapsed(draft, { collapsed: true, ...action });
				}
				break;

			case 'FOLDER_SET_COLLAPSED_ALL':
				draft.collapsedFolderIds = action.ids.slice();
				break;

			case 'TAG_UPDATE_ALL':
				if (!fastDeepEqual(original(draft.tags), action.items)) {
					draft.tags = action.items;
				}
				break;

			case 'TAG_SELECT':

				if (draft.selectedTagId !== action.id || draft.notesParentType !== 'Tag') {
					draft.selectedTagId = action.id;
					if (!action.id) {
						draft.notesParentType = defaultNotesParentType(draft, 'Tag');
					} else {
						draft.notesParentType = 'Tag';
					}
					draft.selectedNoteIds = [];
				}
				break;

			case 'TAG_UPDATE_ONE':
				{
					// We only want to update the selected note tags if the tag belongs to the currently open note
					const selectedNoteHasTag = !!draft.selectedNoteTags.find(tag => tag.id === action.item.id);
					updateOneItem(draft, action);
					if (selectedNoteHasTag) updateOneItem(draft, action, 'selectedNoteTags');
				}
				break;

			case 'NOTE_TAG_REMOVE':
				{
					updateOneItem(draft, action, 'tags');
					const tagRemoved = action.item;
					draft.selectedNoteTags = removeItemFromArray(draft.selectedNoteTags, 'id', tagRemoved.id);
				}
				break;

			case 'EDITOR_NOTE_STATUS_SET':

				{
					draft.editorNoteStatuses[action.id] = action.status;
				}
				break;

			case 'EDITOR_NOTE_STATUS_REMOVE':

				{
					delete draft.editorNoteStatuses[action.id];
				}
				break;

			case 'FOLDER_UPDATE_ONE':
			case 'MASTERKEY_UPDATE_ONE':
				updateOneItem(draft, action);
				break;

			case 'FOLDER_DELETE':
				handleItemDelete(draft, action);
				break;

			// case 'MASTERKEY_UPDATE_ALL':
			// 	draft.masterKeys = action.items;
			// 	break;

			case 'MASTERKEY_SET_NOT_LOADED':
				draft.notLoadedMasterKeys = action.ids;
				break;

			case 'MASTERKEY_ADD_NOT_LOADED':
				{
					if (draft.notLoadedMasterKeys.indexOf(action.id) < 0) {
						const keys = draft.notLoadedMasterKeys.slice();
						keys.push(action.id);
						draft.notLoadedMasterKeys = keys;
					}
				}
				break;

			case 'MASTERKEY_REMOVE_NOT_LOADED':
				{
					const ids = action.id ? [action.id] : action.ids;
					for (let i = 0; i < ids.length; i++) {
						const id = ids[i];
						const index = draft.notLoadedMasterKeys.indexOf(id);
						if (index >= 0) {
							const keys = draft.notLoadedMasterKeys.slice();
							keys.splice(index, 1);
							draft.notLoadedMasterKeys = keys;
						}
					}
				}
				break;

			case 'CONTAINS_LEGACY_TEMPLATES':
				draft.hasLegacyTemplates = true;
				break;

			case 'SYNC_STARTED':
				draft.syncStarted = true;
				break;

			case 'SYNC_COMPLETED':
				draft.syncStarted = false;
				break;

			case 'SYNC_REPORT_UPDATE':
				draft.syncReport = action.report;
				break;

			case 'SEARCH_QUERY':
				draft.searchQuery = action.query.trim();
				break;

			case 'SEARCH_ADD':
				{
					const searches = draft.searches.slice();
					searches.push(action.search);
					draft.searches = searches;
				}
				break;

			case 'SEARCH_UPDATE':
				{
					const searches = draft.searches.slice();
					let found = false;
					for (let i = 0; i < searches.length; i++) {
						if (searches[i].id === action.search.id) {
							searches[i] = { ...action.search };
							found = true;
							break;
						}
					}

					if (!found) searches.push(action.search);

					draft.notesParentType = 'Search';
					draft.searches = searches;
				}
				break;

			case 'SEARCH_DELETE':
				handleItemDelete(draft, action);
				break;

			case 'SEARCH_SELECT':
				draft.selectedSearchId = action.id;
				if (!action.id) {
					draft.notesParentType = defaultNotesParentType(draft, 'Search');
				} else {
					draft.notesParentType = 'Search';
				}
				draft.selectedNoteIds = [];
				break;
			case 'SET_HIGHLIGHTED':
				draft.highlightedWords = action.words;
				break;

			case 'APP_STATE_SET':
				draft.appState = action.state;
				break;

			case 'BIOMETRICS_DONE_SET':
				draft.biometricsDone = action.value;
				break;

			case 'SYNC_HAS_DISABLED_SYNC_ITEMS':
				draft.hasDisabledSyncItems = true;
				break;

			case 'ENCRYPTION_HAS_DISABLED_ITEMS':
				draft.hasDisabledEncryptionItems = action.value;
				break;

			case 'CLIPPER_SERVER_SET':
				{
					const clipperServer = { ...draft.clipperServer };
					if ('startState' in action) clipperServer.startState = action.startState;
					if ('port' in action) clipperServer.port = action.port;
					draft.clipperServer = clipperServer;
				}
				break;

			case 'DECRYPTION_WORKER_SET':
				{
					const decryptionWorker = { ...draft.decryptionWorker };
					for (const n in action) {
						if (!action.hasOwnProperty(n) || n === 'type') continue;
						(decryptionWorker as any)[n] = action[n];
					}
					draft.decryptionWorker = decryptionWorker;
				}
				break;

			case 'RESOURCE_FETCHER_SET':
				{
					const rf = { ...action };
					delete rf.type;
					draft.resourceFetcher = rf;
				}
				break;

			case 'CUSTOM_CSS_APPEND':
				draft.customCss += action.css;
				break;

			case 'SET_NOTE_TAGS':
				if (!fastDeepEqual(original(draft.selectedNoteTags), action.items)) {
					draft.selectedNoteTags = action.items;
				}
				break;

			case 'PLUGINLEGACY_DIALOG_SET':
				{
					if (!action.pluginName) throw new Error('action.pluginName not specified');
					const newPluginsLegacy = { ...draft.pluginsLegacy };
					const newPlugin = draft.pluginsLegacy[action.pluginName] ? { ...draft.pluginsLegacy[action.pluginName] } : {};
					if ('open' in action) newPlugin.dialogOpen = action.open;
					if ('userData' in action) newPlugin.userData = action.userData;
					newPluginsLegacy[action.pluginName] = newPlugin;
					draft.pluginsLegacy = newPluginsLegacy;
				}
				break;

			case 'API_NEED_AUTH_SET':
				draft.needApiAuth = action.value;
				break;

			case 'PROFILE_CONFIG_SET':
				draft.profileConfig = action.value;
				break;

			case 'NOTE_LIST_RENDERER_ADD':
				{
					const noteListRendererIds = draft.noteListRendererIds.slice();
					if (noteListRendererIds.includes(action.value)) throw new Error(`Note list renderer is already registered: ${action.value}`);
					noteListRendererIds.push(action.value);
					draft.noteListRendererIds = noteListRendererIds;
				}
				break;

		}
	} catch (error) {
		if (error instanceof Error) error.message = `In reducer: ${error.message} Action: ${JSON.stringify(action)}`;
		throw error;
	}

	if (action.type.indexOf('NOTE_UPDATE') === 0 || action.type.indexOf('FOLDER_UPDATE') === 0 || action.type.indexOf('TAG_UPDATE') === 0) {
		draft.hasEncryptedItems = stateHasEncryptedItems(draft);
	}

	if (action.type === 'NOTE_DELETE') {
		handleHistory(draft, action);
	}

	for (const additionalReducer of additionalReducers) {
		additionalReducer.reducer(draft, action);
	}

	// if (Setting.value('env') === 'dev') {
	// 	return Object.freeze(newState);
	// } else {
	// 	return newState;
	// }

	return draft;
});

export default reducer;
