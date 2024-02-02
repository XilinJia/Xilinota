// TODO: This is a driver for better-sqlite3. It may be interesting to use it instead
// of node-sqlite because it breaks all the time when we try to compile any app.
// The performance improvement probably won't matter.
//
// The issue however is that better-sqlite3 uses the option SQLITE_DQS=0, which
// disallows using double quotes around strings, and that's what we're using
// everywhere. So the only way to make it work would be to do a custom
// compilation, as described there, and set SQLITE_DQS=1:
//
// https://github.com/JoshuaWise/better-sqlite3/blob/master/docs/compilation.md

import Database from 'better-sqlite3';
import DatabaseDriverBase from './database-driver-base';
import { Row } from './database';

interface Options {
	name: string;
}

export default class DatabaseDriverBetterSqlite extends DatabaseDriverBase {

	private db_: Database.Database | null = null;

	public open(options: Options): any {
		this.db_ = new Database(options.name);
	}

	// public sqliteErrorToJsError(error: any, sql: string = '', params: any[] = []) {
	// 	console.error(error.toString(), ' ---- ', sql, params);

	// 	const msg = [error.toString()];
	// 	if (sql) msg.push(sql);
	// 	if (params) msg.push(params);
	// 	const output: any = new Error(msg.join(': '));
	// 	if (error.code) output.code = error.code;
	// 	return output;
	// }

	public async selectOne(sql: string, params: any = []): Promise<Row | null> {
		return this.db_?.prepare(sql).get(params ? params : []) as Row | null;
	}

	public async selectAll(sql: string, params: any = []): Promise<Row[]> {
		return this.db_?.prepare(sql).all(params ? params : []) as Row[];
	}

	public async exec(sql: string, params: any[] = []): Promise<any> {
		return this.db_?.prepare(sql).run(params ? params : []);
	}

	// public lastInsertId() {
	// 	throw new Error('NOT IMPLEMENTED');
	// }
}
