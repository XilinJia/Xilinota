import { Row } from '@xilinota/lib/database';
import DatabaseDriverBase from '@xilinota/lib//database-driver-base';
import SQLite, { SQLError, SQLiteDatabase } from 'react-native-sqlite-storage';

export default class DatabaseDriverReactNative extends DatabaseDriverBase {
	private lastInsertId_: string | null;
	private db_: SQLite.SQLiteDatabase | null = null;

	constructor() {
		super();
		this.lastInsertId_ = null;
	}

	open(options: any): Promise<null> {
		// SQLite.DEBUG(true);
		return new Promise((resolve, reject) => {
			SQLite.openDatabase({ name: options.name },
				(db: SQLiteDatabase) => {
					this.db_ = db;
					resolve(null);
				},
				(error: SQLError) => {
					reject(error);
				},
			);
		});
	}

	// sqliteErrorToJsError(error: Error, _sql: string = '', _params = null): Error {
	// 	return error;
	// }

	selectOne(sql: string, params: any = null): Promise<Row | null> {
		return new Promise((resolve, reject) => {
			this.db_?.executeSql(sql, params,
				// TODO: how to really call this?
				(r: any) => {
					resolve(r.rows.length ? r.rows.item(0) : null);
				},
				(_tx, error: SQLError) => {
					reject(error);
				},
			);
		});
	}

	selectAll(sql: string, params = null): Promise<Row[]> {
		return this.exec(sql, params).then((r: any) => {
			const output = [];
			for (let i = 0; i < r.rows.length; i++) {
				output.push(r.rows.item(i));
			}
			return output;
		});
	}

	loadExtension(path: string) {
		throw new Error(`No extension support for ${path} in react-native-sqlite-storage`);
	}

	exec(sql: string, params: any = null): Promise<any> {
		return new Promise((resolve, reject) => {
			this.db_?.executeSql(
				sql,
				params,
				(r: any): void => {
					// TODO: how to really call this?
					if ('insertId' in r) this.lastInsertId_ = r.insertId;
					resolve(r);
				},
				(_tx, error: SQLError) => {
					reject(error);
				},
			);
		});
	}

	lastInsertId() {
		return this.lastInsertId_;
	}
}

// module.exports = { DatabaseDriverReactNative };
