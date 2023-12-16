import XilinotaDatabase from '../XilinotaDatabase';
import Setting from '../models/Setting';
import SyncTargetXilinotaServer from '../SyncTargetXilinotaServer';

export default class DebugService {

	private db_: XilinotaDatabase;

	public constructor(db: XilinotaDatabase) {
		this.db_ = db;
	}

	private get db(): XilinotaDatabase {
		return this.db_;
	}

	public async clearSyncState() {
		const tableNames = [
			'item_changes',
			'deleted_items',
			'sync_items',
			'key_values',
		];

		const queries = [];
		for (const n of tableNames) {
			queries.push(`DELETE FROM ${n}`);
			queries.push(`DELETE FROM sqlite_sequence WHERE name="${n}"`); // Reset autoincremented IDs
		}

		for (let i = 0; i < 20; i++) {
			queries.push(`DELETE FROM settings WHERE key="sync.${i}.context"`);
			queries.push(`DELETE FROM settings WHERE key="sync.${i}.auth"`);
		}

		await this.db.transactionExecBatch(queries);
	}

	public async setupXilinotaServerUser(num: number) {
		const id = SyncTargetXilinotaServer.id();
		Setting.setValue('sync.target', id);
		Setting.setValue(`sync.${id}.path`, 'http://localhost:22300');
		Setting.setValue(`sync.${id}.username`, `user${num}@example.com`);
		Setting.setValue(`sync.${id}.password`, '123456');
	}

}
