import paginationToSql from './models/utils/paginationToSql';

import Database, { Row } from './database';
import uuid from './uuid_';
import time from './time';
import XilinotaDatabase, { TableField } from './XilinotaDatabase';
import { LoadOptions, SaveOptions } from './models/utils/types';
import Logger from '@xilinota/utils/Logger';
import { SqlParams, StringOrSqlQuery } from './services/database/types';

import { Mutex } from 'async-mutex';

// New code should make use of this enum
export enum ModelType {
	Note = 1,
	Folder = 2,
	Setting = 3,
	Resource = 4,
	Tag = 5,
	NoteTag = 6,
	Search = 7,
	Alarm = 8,
	MasterKey = 9,
	ItemChange = 10,
	NoteResource = 11,
	ResourceLocalState = 12,
	Revision = 13,
	Migration = 14,
	SmartFilter = 15,
	Command = 16,
}

export interface DeleteOptions {
	idFieldName?: string;
	changeSource?: number;
	deleteChildren?: boolean;

	// By default the application tracks item deletions, so that they can be
	// applied to the remote items during synchronisation. However, in some
	// cases, we don't want this. In particular when an item is deleted via
	// sync, we don't need to track the deletion, because the operation doesn't
	// need to applied again on next sync.
	trackDeleted?: boolean;

	disableReadOnlyCheck?: boolean;
}

type NameModelTuple = [string, ModelType];

class BaseModel {

	// TODO: This ancient part of Xilinota about model types is a bit of a
	// mess and should be refactored properly.

	public static typeEnum_: (NameModelTuple)[] = [
		['TYPE_NOTE', ModelType.Note],
		['TYPE_FOLDER', ModelType.Folder],
		['TYPE_SETTING', ModelType.Setting],
		['TYPE_RESOURCE', ModelType.Resource],
		['TYPE_TAG', ModelType.Tag],
		['TYPE_NOTE_TAG', ModelType.NoteTag],
		['TYPE_SEARCH', ModelType.Search],
		['TYPE_ALARM', ModelType.Alarm],
		['TYPE_MASTER_KEY', ModelType.MasterKey],
		['TYPE_ITEM_CHANGE', ModelType.ItemChange],
		['TYPE_NOTE_RESOURCE', ModelType.NoteResource],
		['TYPE_RESOURCE_LOCAL_STATE', ModelType.ResourceLocalState],
		['TYPE_REVISION', ModelType.Revision],
		['TYPE_MIGRATION', ModelType.Migration],
		['TYPE_SMART_FILTER', ModelType.SmartFilter],
		['TYPE_COMMAND', ModelType.Command],
	];

	public static TYPE_NOTE = ModelType.Note;
	public static TYPE_FOLDER = ModelType.Folder;
	public static TYPE_SETTING = ModelType.Setting;
	public static TYPE_RESOURCE = ModelType.Resource;
	public static TYPE_TAG = ModelType.Tag;
	public static TYPE_NOTE_TAG = ModelType.NoteTag;
	public static TYPE_SEARCH = ModelType.Search;
	public static TYPE_ALARM = ModelType.Alarm;
	public static TYPE_MASTER_KEY = ModelType.MasterKey;
	public static TYPE_ITEM_CHANGE = ModelType.ItemChange;
	public static TYPE_NOTE_RESOURCE = ModelType.NoteResource;
	public static TYPE_RESOURCE_LOCAL_STATE = ModelType.ResourceLocalState;
	public static TYPE_REVISION = ModelType.Revision;
	public static TYPE_MIGRATION = ModelType.Migration;
	public static TYPE_SMART_FILTER = ModelType.SmartFilter;
	public static TYPE_COMMAND = ModelType.Command;

	public static dispatch: Function = function() { };
	private static saveMutexes_: any = {};

	private static db_: XilinotaDatabase;

	public static modelType(): ModelType {
		throw new Error('Must be overriden');
	}

	public static tableName(): string {
		throw new Error('Must be overriden');
	}

	public static setDb(db: any): void {
		this.db_ = db;
	}

	// public static addModelMd(model: Row): Row[]|Row|null {
	// 	if (!model) return model;

	// 	if (Array.isArray(model)) {
	// 		const output = [];
	// 		for (let i = 0; i < model.length; i++) {
	// 			output.push(this.addModelMd(model[i]));
	// 		}
	// 		return output;
	// 	} else {
	// 		model = { ...model };
	// 		model.type_ = this.modelType();
	// 		return model;
	// 	}
	// }

	public static addModelMd(model: Row): Row {
		model = { ...model };
		model.type_ = this.modelType();
		return model;
	}

	public static addModelMds(model: Row[]): Row[] {
		const output = [];
		for (let i = 0; i < model.length; i++) {
			output.push(this.addModelMd(model[i]));
		}
		return output;
	}


	public static logger(): Logger {
		return this.db().logger();
	}

	public static useUuid(): boolean {
		return false;
	}

	public static byId(items: Row[], id: string): Row | null {
		for (let i = 0; i < items.length; i++) {
			if (items[i].id === id) return items[i];
		}
		return null;
	}

	public static defaultValues(fieldNames: string[]): Record<string, any> {
		const output: any = {};
		for (const n of fieldNames) {
			output[n] = this.db().fieldDefaultValue(this.tableName(), n);
		}
		return output;
	}

	public static modelIndexById(items: Row[], id: string): number {
		for (let i = 0; i < items.length; i++) {
			if (items[i].id === id) return i;
		}
		return -1;
	}

	public static modelsByIds(items: Row[], ids: string[]): Row[] {
		const output = [];
		for (let i = 0; i < items.length; i++) {
			if (ids.indexOf(items[i].id) >= 0) {
				output.push(items[i]);
			}
		}
		return output;
	}

	// Prefer the use of this function to compare IDs as it handles the case where
	// one ID is null and the other is "", in which case they are actually considered to be the same.
	public static idsEqual(id1: string, id2: string): boolean {
		if (!id1 && !id2) return true;
		if (!id1 && !!id2) return false;
		if (!!id1 && !id2) return false;
		return id1 === id2;
	}

	public static modelTypeToName(type: number): string {
		for (let i = 0; i < BaseModel.typeEnum_.length; i++) {
			const e = BaseModel.typeEnum_[i];
			if (e[1] === type) return e[0].substring(5).toLowerCase();
		}
		throw new Error(`Unknown model type: ${type}`);
	}

	public static modelNameToType(name: string): ModelType {
		for (let i = 0; i < BaseModel.typeEnum_.length; i++) {
			const e = BaseModel.typeEnum_[i];
			const eName = e[0].substring(5).toLowerCase();
			if (eName === name) return e[1];
		}
		throw new Error(`Unknown model name: ${name}`);
	}

	public static hasField(name: string): boolean {
		const fields = this.fieldNames();
		return fields.indexOf(name) >= 0;
	}

	public static fieldNames(withPrefix: boolean = false): string[] {
		const output = this.db().tableFieldNames(this.tableName());
		if (!withPrefix) return output;

		const p = withPrefix === true ? this.tableName() : withPrefix;
		const temp = [];
		for (let i = 0; i < output.length; i++) {
			temp.push(`${p}.${output[i]}`);
		}

		return temp;
	}

	public static fieldType(name: string, defaultValue: number = -1): number {
		const fields = this.fields();
		for (let i = 0; i < fields.length; i++) {
			if (fields[i].name === name) return fields[i].type;
		}
		if (defaultValue !== -1) return defaultValue;
		throw new Error(`Unknown field: ${name}`);
	}

	public static fields(): TableField[] {
		return this.db().tableFields(this.tableName());
	}

	public static removeUnknownFields(model: Row): Row {
		const newModel: Row = {};
		for (const n in model) {
			if (!model.hasOwnProperty(n)) continue;
			if (!this.hasField(n) && n !== 'type_') continue;
			newModel[n] = model[n];
		}
		return newModel;
	}

	public static new(): Row {
		const fields = this.fields();
		const output: any = {};
		for (let i = 0; i < fields.length; i++) {
			const f = fields[i];
			output[f.name] = f.default;
		}
		return output;
	}

	public static modOptions(options: Record<string, any>): Record<string, any> {
		if (!options) {
			options = {};
		} else {
			options = { ...options };
		}
		if (!('isNew' in options)) options.isNew = 'auto';
		if (!('autoTimestamp' in options)) options.autoTimestamp = true;
		if (!('userSideValidation' in options)) options.userSideValidation = false;
		return options;
	}

	public static count(options: any = null): Promise<number> {
		if (!options) options = {};
		let sql = `SELECT count(*) as total FROM \`${this.tableName()}\``;
		if (options.where) sql += ` WHERE ${options.where}`;
		return this.db()
			.selectOne(sql)
			.then((r: any) => {
				return r ? r['total'] : 0;
			});
	}

	public static load(id: string, options: LoadOptions = {}): Promise<Row | null> {
		return this.loadByField('id', id, options);
	}

	public static shortId(id: string): string {
		return id.substring(0, 5);
	}

	public static loadByPartialId(partialId: string): Promise<Row[]> {
		return this.modelSelectAll(`SELECT * FROM \`${this.tableName()}\` WHERE \`id\` LIKE ?`, [`${partialId}%`]);
	}

	public static applySqlOptions(options: any, sql: string, params: SqlParams = []): { sql: string; params: any[]; } {
		if (!options) options = {};

		if (options.order && options.order.length) {
			sql += ` ORDER BY ${paginationToSql(options)}`;
		}

		if (options.limit) sql += ` LIMIT ${options.limit}`;

		return { sql: sql, params: params };
	}

	public static async allIds(options: any = null): Promise<string[]> {
		const q = this.applySqlOptions(options, `SELECT id FROM \`${this.tableName()}\``);
		const rows = await this.db().selectAll(q.sql, q.params);
		return rows.map((r: any) => r.id ?? '');
	}

	public static async all(options: any = null): Promise<Row[]> {
		if (!options) options = {};
		if (!options.fields) options.fields = '*';

		let sql = `SELECT ${this.db().escapeFields(options.fields)} FROM \`${this.tableName()}\``;
		let params: any[] = [];
		if (options.where) {
			sql += ` WHERE ${options.where}`;
			if (options.whereParams) params = params.concat(options.whereParams);
		}

		const q = this.applySqlOptions(options, sql, params);
		return this.modelSelectAll(q.sql, q.params);
	}

	public static async byIds(ids: string[], options: any = null): Promise<Row[]> {
		if (!ids.length) return [];
		if (!options) options = {};
		if (!options.fields) options.fields = '*';

		let sql = `SELECT ${this.db().escapeFields(options.fields)} FROM \`${this.tableName()}\``;
		sql += ` WHERE id IN ("${ids.join('","')}")`;
		const q = this.applySqlOptions(options, sql);
		return this.modelSelectAll(q.sql);
	}

	public static async search(options: any = null): Promise<Row[]> {
		if (!options) options = {};
		if (!options.fields) options.fields = '*';

		const conditions = options.conditions ? options.conditions.slice(0) : [];
		const params = options.conditionsParams ? options.conditionsParams.slice(0) : [];

		if (options.titlePattern) {
			const pattern = options.titlePattern.replace(/\*/g, '%');
			conditions.push('title LIKE ?');
			params.push(pattern);
		}

		if ('limit' in options && options.limit <= 0) return [];

		let sql = `SELECT ${this.db().escapeFields(options.fields)} FROM \`${this.tableName()}\``;
		if (conditions.length) sql += ` WHERE ${conditions.join(' AND ')}`;

		const query = this.applySqlOptions(options, sql, params);
		return this.modelSelectAll(query.sql, query.params);
	}

	public static modelSelectOne(sql: string, params: SqlParams = []): Promise<Row | null> {
		return this.db()
			.selectOne(sql, params)
			.then((model: Row | null) => {
				return model ? this.filter(this.addModelMd(model)) : null;
			});
	}

	public static modelSelectAll(sql: string, params: SqlParams = []): Promise<Row[]> {
		return this.db()
			.selectAll(sql, params)
			.then((models: Row[]) => {
				return this.filterArray(this.addModelMds(models));
			});
	}

	public static loadByField(fieldName: string, fieldValue: any, options: LoadOptions = {}): Promise<Row | null> {
		if (!('caseInsensitive' in options)) options.caseInsensitive = false;
		if (!options.fields) options.fields = '*';
		let sql = `SELECT ${this.db().escapeFields(options.fields)} FROM \`${this.tableName()}\` WHERE \`${fieldName}\` = ?`;
		if (options.caseInsensitive) sql += ' COLLATE NOCASE';
		return this.modelSelectOne(sql, [fieldValue]);
	}

	public static loadByFields(fields: Record<string, any>, options: LoadOptions = {}): Promise<Row | null> {
		if (!('caseInsensitive' in options)) options.caseInsensitive = false;
		if (!options.fields) options.fields = '*';
		const whereSql = [];
		const params: SqlParams = [];
		for (const fieldName in fields) {
			whereSql.push(`\`${fieldName}\` = ?`);
			params.push(fields[fieldName]);
		}
		let sql = `SELECT ${this.db().escapeFields(options.fields)} FROM \`${this.tableName()}\` WHERE ${whereSql.join(' AND ')}`;
		if (options.caseInsensitive) sql += ' COLLATE NOCASE';
		return this.modelSelectOne(sql, params);
	}

	public static loadByTitle(title: string): Promise<Row | null> {
		return this.modelSelectOne(`SELECT * FROM \`${this.tableName()}\` WHERE \`title\` = ?`, [title]);
	}

	public static diffObjects(oldModel: Row, newModel: Row): Record<string, any> {
		const output: Record<string, any> = {};
		const fields: string[] = this.diffObjectsFields(oldModel, newModel);
		for (let i = 0; i < fields.length; i++) {
			output[fields[i]] = newModel[fields[i]];
		}
		if ('type_' in newModel) output.type_ = newModel.type_;
		return output;
	}

	public static diffObjectsFields(oldModel: Row, newModel: Row): string[] {
		const output = [];
		for (const n in newModel) {
			if (!newModel.hasOwnProperty(n)) continue;
			if (n === 'type_') continue;
			if (!(n in oldModel) || newModel[n] !== oldModel[n]) {
				output.push(n);
			}
		}
		return output;
	}

	public static modelsAreSame(oldModel: Row, newModel: Row): boolean {
		const diff = this.diffObjects(oldModel, newModel);
		delete diff.type_;
		return !Object.getOwnPropertyNames(diff).length;
	}

	public static saveMutex(modelOrId: Row | string): { acquire: () => any; } {
		const noLockMutex = {
			acquire: function(): any {
				return null;
			},
		};

		if (!modelOrId) return noLockMutex;

		const modelId = typeof modelOrId === 'string' ? modelOrId : modelOrId.id;

		if (!modelId) return noLockMutex;

		let mutex = BaseModel.saveMutexes_[modelId];
		if (mutex) return mutex;

		mutex = new Mutex();
		BaseModel.saveMutexes_[modelId] = mutex;
		return mutex;
	}

	public static releaseSaveMutex(modelOrId: string | Row, release: Function): Function {
		if (!release) return release;
		if (!modelOrId) return release();

		const modelId = typeof modelOrId === 'string' ? modelOrId : modelOrId.id;

		if (!modelId) return release();

		const mutex = BaseModel.saveMutexes_[modelId];
		if (!mutex) return release();

		delete BaseModel.saveMutexes_[modelId];
		return release();
	}

	public static saveQuery(o: Row, options: any): Record<string, any> {
		let temp: Row = {};
		const fieldNames = this.fieldNames();
		for (let i = 0; i < fieldNames.length; i++) {
			const n = fieldNames[i];
			if (n in o) temp[n] = o[n];
		}

		// Remove fields that are not in the `fields` list, if provided.
		// Note that things like update_time, user_updated_time will still
		// be part of the final list of fields if autoTimestamp is on.
		// id also will stay.
		if (!options.isNew && options.fields) {
			const filtered: any = {};
			for (const k in temp) {
				if (!temp.hasOwnProperty(k)) continue;
				if (k !== 'id' && options.fields.indexOf(k) < 0) continue;
				filtered[k] = temp[k];
			}
			temp = filtered;
		}

		o = temp;

		let modelId = temp.id;
		let query: Record<string, any>;

		const timeNow = time.unixMs();

		if (options.autoTimestamp && this.hasField('updated_time')) {
			o.updated_time = timeNow;
		}

		// The purpose of user_updated_time is to allow the user to manually set the time of a note (in which case
		// options.autoTimestamp will be `false`). However note that if the item is later changed, this timestamp
		// will be set again to the current time.
		//
		// The technique to modify user_updated_time while keeping updated_time current (so that sync can happen) is to
		// manually set updated_time when saving and to set autoTimestamp to false, for example:
		// Note.save({ id: "...", updated_time: Date.now(), user_updated_time: 1436342618000 }, { autoTimestamp: false })
		if (options.autoTimestamp && this.hasField('user_updated_time')) {
			o.user_updated_time = timeNow;
		}

		if (options.isNew) {
			if (this.useUuid() && !o.id) {
				modelId = uuid.create();
				o.id = modelId;
			}

			if (!o.created_time && this.hasField('created_time')) {
				o.created_time = timeNow;
			}

			if (!o.user_created_time && this.hasField('user_created_time')) {
				o.user_created_time = o.created_time ? o.created_time : timeNow;
			}

			if (!o.user_updated_time && this.hasField('user_updated_time')) {
				o.user_updated_time = o.updated_time ? o.updated_time : timeNow;
			}

			query = Database.insertQuery(this.tableName(), o);
		} else {
			const where = { id: o.id };
			const temp = { ...o };
			delete temp.id;

			query = Database.updateQuery(this.tableName(), temp, where);
		}

		query.id = modelId;
		query.modObject = o;

		return query;
	}

	public static userSideValidation(o: Row): void {
		if (o.id && !o.id.match(/^[a-f0-9]{32}$/)) {
			throw new Error('Validation error: ID must a 32-characters lowercase hexadecimal string');
		}

		const timestamps = ['user_updated_time', 'user_created_time'];
		for (const k of timestamps) {
			if ((k in o) && (typeof o[k] !== 'number' || isNaN(o[k]) || o[k] < 0)) throw new Error('Validation error: user_updated_time and user_created_time must be numbers greater than 0');
		}
	}

	public static async save(o: Row, options: SaveOptions = {}): Promise<Row> {
		// When saving, there's a mutex per model ID. This is because the model returned from this function
		// is basically its input `o` (instead of being read from the database, for performance reasons).
		// This works well in general except if that model is saved simultaneously in two places. In that
		// case, the output won't be up-to-date and would cause for example display issues with out-dated
		// notes being displayed. This was an issue when notes were being synchronised while being decrypted
		// at the same time.

		const mutexRelease = await this.saveMutex(o).acquire();
		options = this.modOptions(options);
		const isNew = this.isNew(o, options);
		options.isNew = isNew;

		// Diff saving is an optimisation which takes a new version of the item and an old one,
		// do a diff and save only this diff. IMPORTANT: When using this make sure that both
		// models have been normalised using ItemClass.filter()
		const isDiffSaving = options && options.oldItem && !options.isNew;

		if (isDiffSaving) {
			const newObject = BaseModel.diffObjects(options.oldItem, o);
			newObject.type_ = o.type_;
			newObject.id = o.id;
			o = newObject;
		}

		o = this.filter(o);

		if (options.userSideValidation) {
			this.userSideValidation(o);
		}

		let queries = [];
		const saveQuery = this.saveQuery(o, options);
		const modelId = saveQuery.id;

		queries.push(saveQuery);

		if (options.nextQueries && options.nextQueries.length) {
			queries = queries.concat(options.nextQueries);
		}

		let output = null;

		try {
			await this.db().transactionExecBatch(queries as StringOrSqlQuery[]);

			o = { ...o };
			if (modelId) o.id = modelId;
			if ('updated_time' in saveQuery.modObject) o.updated_time = saveQuery.modObject.updated_time;
			if ('created_time' in saveQuery.modObject) o.created_time = saveQuery.modObject.created_time;
			if ('user_updated_time' in saveQuery.modObject) o.user_updated_time = saveQuery.modObject.user_updated_time;
			if ('user_created_time' in saveQuery.modObject) o.user_created_time = saveQuery.modObject.user_created_time;
			o = this.addModelMd(o);

			if (isDiffSaving) {
				for (const n in options.oldItem) {
					if (!options.oldItem.hasOwnProperty(n)) continue;
					if (n in o) continue;
					o[n] = options.oldItem[n];
				}
			}

			output = this.filter(o);
		} finally {
			this.releaseSaveMutex(o, mutexRelease);
		}

		return output;
	}

	public static isNew(object: Row, options: SaveOptions): boolean {
		if (options && 'isNew' in options) {
			// options.isNew can be "auto" too
			if (options.isNew === true) return true;
			if (options.isNew === false) return false;
		}

		return !object.id;
	}

	public static filterArray(models: Row[]): Row[] {
		const output = [];
		for (let i = 0; i < models.length; i++) {
			output.push(this.filter(models[i]));
		}
		return output;
	}

	public static filter(model: Row): Row {

		const output = { ...model };
		for (const n in output) {
			if (!output.hasOwnProperty(n)) continue;

			// The SQLite database doesn't have booleans so cast everything to int
			if (output[n] === true) {
				output[n] = 1;
			} else if (output[n] === false) {
				output[n] = 0;
			} else {
				const t = this.fieldType(n, Database.TYPE_UNKNOWN);
				if (t === Database.TYPE_INT) {
					output[n] = !n ? 0 : parseInt(output[n], 10);
				}
			}
		}

		return output;
	}

	public static delete(id: string): Promise<any> {
		if (!id) throw new Error('Cannot delete object without an ID');
		return this.db().exec(`DELETE FROM ${this.tableName()} WHERE id = ?`, [id]);
	}

	public static async batchDelete(ids: string[], options: DeleteOptions = {}): Promise<void> {
		if (!ids.length) return;
		options = this.modOptions(options);
		const idFieldName = options.idFieldName ? options.idFieldName : 'id';
		const sql = `DELETE FROM ${this.tableName()} WHERE ${idFieldName} IN ("${ids.join('","')}")`;
		await this.db().exec(sql);
	}

	public static db(): XilinotaDatabase {
		if (!this.db_) throw new Error('Accessing database before it has been initialised');
		return this.db_;
	}

	// static isReady() {
	// 	return !!this.db_;
	// }
}

for (let i = 0; i < BaseModel.typeEnum_.length; i++) {
	const e = BaseModel.typeEnum_[i];
	(BaseModel as any)[e[0]] = e[1];
}

export default BaseModel;
