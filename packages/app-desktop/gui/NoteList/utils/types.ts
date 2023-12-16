import { FolderEntity, NoteEntity } from '@xilinota/lib/services/database/types';
import { ListRenderer } from '@xilinota/lib/services/plugins/api/noteListType';
import { PluginStates } from '@xilinota/lib/services/plugins/reducer';
import { Size } from '@xilinota/utils/types';
import { Dispatch } from 'redux';

export interface Props {
	themeId: any;
	selectedNoteIds: string[];
	notes: NoteEntity[];
	dispatch: Dispatch;
	watchedNoteFiles: string[];
	plugins: PluginStates;
	selectedFolderId: string;
	customCss: string;
	notesParentType: string;
	noteSortOrder: string;
	uncompletedTodosOnTop: boolean;
	showCompletedTodos: boolean;
	resizableLayoutEventEmitter: any;
	isInsertingNotes: boolean;
	folders: FolderEntity[];
	size: Size;
	searches: any[];
	selectedSearchId: string;
	highlightedWords: string[];
	provisionalNoteIds: string[];
	visible: boolean;
	focusedField: string;
	parentFolderIsReadOnly: boolean;
	listRenderer: ListRenderer;
}
