import BaseItem from './BaseItem';
import BaseModel, { ModelType } from '../BaseModel';
import { NoteTagEntity } from '../services/database/types';

export default class NoteTag extends BaseItem {
	public static tableName() : string {
		return 'note_tags';
	}

	public static modelType() : ModelType {
		return BaseModel.TYPE_NOTE_TAG;
	}

	public static async byNoteIds(noteIds: string[]) : Promise<NoteTagEntity[]> {
		if (!noteIds.length) return [];
		return this.modelSelectAll(`SELECT * FROM note_tags WHERE note_id IN ("${noteIds.join('","')}")`);
	}

	public static async tagIdsByNoteId(noteId: string) : Promise<string[]> {
		const rows = await this.db().selectAll('SELECT tag_id FROM note_tags WHERE note_id = ?', [noteId]);
		const output: string[] = [];
		for (let i = 0; i < rows.length; i++) {
			if (rows[i].tag_id) output.push(rows[i].tag_id);
		}
		return output;
	}
}
