import { Row } from './database';
import { SqlParams } from './services/database/types';

export default class DatabaseDriverBase {
	[key: string]: any;

	open(_options: { name: any; }): Promise<null> {
		throw ('base driver open not implemented');
	}

	sqliteErrorToJsError(error: Error & { code: string; }, sql: string = '', params: SqlParams | null = null): Error {
		const msg = [error.message];
		if (sql) msg.push(sql);
		if (params) msg.push(params.toString());
		const output = new Error(msg.join(': '));
		if (error.code) (output as any).code = error.code;
		return output;
	}

	selectOne(_sql: string, _params: any = null): Promise<Row | null> {
		throw ('base driver selectOne not implemented');
	}

	loadExtension(_path: string) {
		throw ('base driver loadExtension not implemented');
	}

	selectAll(_sql: string, _params: any = null): Promise<Row[]> {
		throw ('base driver selectAll not implemented');
	}

	exec(_sql: string, _params: any = null): Promise<any> {
		throw ('base driver selectAll not implemented');
	}

	lastInsertId(): string | null {
		throw new Error('NOT IMPLEMENTED');
	}
}

