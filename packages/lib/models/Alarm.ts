import BaseModel, { ModelType } from '../BaseModel';
import { NoteEntity } from '../services/database/types';
import Note from './Note';

export interface Notification {
	id: number;
	noteId: string;
	date: Date;
	title: string;
	body?: string;
}

export default class Alarm extends BaseModel {
	public static tableName() : string {
		return 'alarms';
	}

	public static modelType() : ModelType {
		return BaseModel.TYPE_ALARM;
	}

	public static byNoteId(noteId: string) {
		return this.modelSelectOne('SELECT * FROM alarms WHERE note_id = ?', [noteId]);
	}

	public static async deleteExpiredAlarms() {
		return this.db().exec('DELETE FROM alarms WHERE trigger_time <= ?', [Date.now()]);
	}

	public static async alarmIdsWithoutNotes() : Promise<string[]> {
		// https://stackoverflow.com/a/4967229/561309
		const alarms = await this.db().selectAll('SELECT alarms.id FROM alarms LEFT JOIN notes ON alarms.note_id = notes.id WHERE notes.id IS NULL');
		return alarms.map((a: any) => {
			return a.id??'';
		});
	}

	public static async makeNotification(alarm: any, note: NoteEntity|null = null): Promise<Notification> {
		if (!note) {
			note = await Note.load(alarm.note_id);
		} else if (!note.todo_due) {
			this.logger().warn('Trying to create notification for note with todo_due property - reloading note object in case we are dealing with a partial note');
			note = await Note.load(alarm.note_id);
			this.logger().warn('Reloaded note:', note);
		}

		const output: Notification = {
			id: alarm.id,
			noteId: alarm.note_id,
			date: note && note.todo_due ? new Date(note.todo_due) : new Date(0),
			title: note && note.title ? note.title.substring(0, 128) : '',
		};

		if (note && note.body) output.body = note.body.substring(0, 512);

		return output;
	}

	public static async allDue() {
		return this.modelSelectAll('SELECT * FROM alarms WHERE trigger_time >= ?', [Date.now()]);
	}
}
