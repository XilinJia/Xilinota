import { Database } from 'sqlite3';
import { Row } from './database';
import DatabaseDriverBase from './database-driver-base';
import shim from './shim';

export default class DatabaseDriverNode extends DatabaseDriverBase {

	private db_: Database | null = null;

	open(options: { name: string; }): Promise<null> {
		return new Promise((resolve, reject) => {
			const sqlite3 = shim.nodeSqlite().verbose();

			this.db_ = new sqlite3.Database(options.name, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (error: Error) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(null);
			});
		});
	}

	// sqliteErrorToJsError(error: { code: string; }, sql: string = '', params = null): Error {
	// 	const msg = [error.toString()];
	// 	if (sql) msg.push(sql);
	// 	if (params) msg.push(params);
	// 	const output = new Error(msg.join(': '));
	// 	if (error.code) (output as any).code = error.code;
	// 	return output;
	// }

	selectOne(sql: string, params: any = null): Promise<Row | null> {
		if (!params) params = {};
		return new Promise((resolve, reject) => {
			this.db_?.get(sql, params, (error: any, row: Row) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(row);
			});
		});
	}

	loadExtension(path: string): Promise<null> {
		return new Promise((resolve, reject) => {
			this.db_?.loadExtension(path, (error: Error | null) => {
				if (error) {
					reject(error);
				} else {
					resolve(null);
				}
			});
		});
	}

	selectAll(sql: string, params: any = null): Promise<Row[]> {
		if (!params) params = {};
		return new Promise((resolve, reject) => {
			this.db_?.all(sql, params, (error: Error, rows: Row[]) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(rows);
			});
		});
	}

	exec(sql: string, params: any = null): Promise<any> {
		if (!params) params = {};
		return new Promise((resolve, reject) => {
			this.db_?.run(sql, params, (error: Error) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(null);
			});
		});
	}

	// lastInsertId() : string | null {
	// 	throw new Error('NOT IMPLEMENTED');
	// }
}

