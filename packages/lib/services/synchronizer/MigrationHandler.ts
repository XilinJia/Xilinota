import LockHandler, { LockClientType, LockType } from './LockHandler';
import { Dirnames } from './utils/types';
import BaseService from '../BaseService';
import migration1 from './migrations/1';
import migration2 from './migrations/2';
import migration3 from './migrations/3';
import Setting from '../../models/Setting';
import XilinotaError from '../../XilinotaError';
import { FileApi } from '../../file-api';
import XilinotaDatabase from '../../XilinotaDatabase';
import { fetchSyncInfo, SyncInfo } from './syncInfoUtils';
const { sprintf } = require('sprintf-js');

export type MigrationFunction = (api: FileApi, db: XilinotaDatabase)=> Promise<void>;

// To add a new migration:
// - Add the migration logic in ./migrations/VERSION_NUM.js
// - Add the file to the array below.
// - Set Setting.syncVersion to VERSION_NUM in models/Setting.js
// - Add tests in synchronizer_migrationHandler
const migrations: MigrationFunction[] = [
	null,
	migration1,
	migration2,
	migration3,
];

interface SyncTargetInfo {
	version: number;
}

export default class MigrationHandler extends BaseService {

	private api_: FileApi = null;
	private lockHandler_: LockHandler = null;
	private clientType_: LockClientType;
	private clientId_: string;
	private db_: XilinotaDatabase;

	public constructor(api: FileApi, db: XilinotaDatabase, lockHandler: LockHandler, clientType: LockClientType, clientId: string) {
		super();
		this.api_ = api;
		this.db_ = db;
		this.lockHandler_ = lockHandler;
		this.clientType_ = clientType;
		this.clientId_ = clientId;
	}

	public async fetchSyncTargetInfo(): Promise<SyncTargetInfo> {
		const syncTargetInfoText = await this.api_.get('info.json');

		// Returns version 0 if the sync target is empty
		let output: SyncTargetInfo = { version: 0 };

		if (syncTargetInfoText) {
			output = JSON.parse(syncTargetInfoText);
			if (!output.version) throw new Error('Missing "version" field in info.json');
		} else {
			const oldVersion = await this.api_.get('.sync/version.txt');
			if (oldVersion) output = { version: 1 };
		}

		return output;
	}

	private serializeSyncTargetInfo(info: SyncTargetInfo) {
		return JSON.stringify(info);
	}

	public async checkCanSync(remoteInfo: SyncInfo = null) {
		remoteInfo = remoteInfo || await fetchSyncInfo(this.api_);
		const supportedSyncTargetVersion = Setting.value('syncVersion');

		if (remoteInfo.version) {
			if (remoteInfo.version > supportedSyncTargetVersion) {
				throw new XilinotaError(sprintf('Sync version of the target (%d) is greater than the version supported by the app (%d). Please upgrade your app.', remoteInfo.version, supportedSyncTargetVersion), 'outdatedClient');
			} else if (remoteInfo.version < supportedSyncTargetVersion) {
				throw new XilinotaError(sprintf('Sync version of the target (%d) is lower than the version supported by the app (%d). Please upgrade the sync target.', remoteInfo.version, supportedSyncTargetVersion), 'outdatedSyncTarget');
			}
		}
	}

	public async upgrade(targetVersion = 0) {
		const supportedSyncTargetVersion = Setting.value('syncVersion');
		const syncTargetInfo = await this.fetchSyncTargetInfo();

		if (syncTargetInfo.version > supportedSyncTargetVersion) {
			throw new XilinotaError(sprintf('Sync version of the target (%d) is greater than the version supported by the app (%d). Please upgrade your app.', syncTargetInfo.version, supportedSyncTargetVersion), 'outdatedClient');
		}

		// if (supportedSyncTargetVersion !== migrations.length - 1) {
		// 	// Sanity check - it means a migration has been added by syncVersion has not be incremented or vice-versa,
		// 	// so abort as it can cause strange issues.
		// 	throw new XilinotaError('Application error: mismatch between max supported sync version and max migration number: ' + supportedSyncTargetVersion + ' / ' + (migrations.length - 1));
		// }

		// Special case for version 1 because it didn't have the lock folder and without
		// it the lock handler will break. So we create the directory now.
		// Also if the sync target version is 0, it means it's a new one so we need the
		// lock folder first before doing anything else.
		// Temp folder is needed too to get remoteDate() call to work.
		if (syncTargetInfo.version === 0 || syncTargetInfo.version === 1) {
			this.logger().info('MigrationHandler: Sync target version is 0 or 1 - creating "locks" and "temp" directory:', syncTargetInfo);
			await this.api_.mkdir(Dirnames.Locks);
			await this.api_.mkdir(Dirnames.Temp);
		}

		this.logger().info('MigrationHandler: Acquiring exclusive lock');
		const exclusiveLock = await this.lockHandler_.acquireLock(LockType.Exclusive, this.clientType_, this.clientId_, {
			clearExistingSyncLocksFromTheSameClient: true,
			timeoutMs: 1000 * 30,
		});

		let autoLockError = null;
		this.lockHandler_.startAutoLockRefresh(exclusiveLock, (error: any) => {
			autoLockError = error;
		});

		this.logger().info('MigrationHandler: Acquired exclusive lock:', exclusiveLock);

		try {
			for (let newVersion = syncTargetInfo.version + 1; newVersion < migrations.length; newVersion++) {
				if (targetVersion && newVersion > targetVersion) break;

				const fromVersion = newVersion - 1;

				this.logger().info(`MigrationHandler: Migrating from version ${fromVersion} to version ${newVersion}`);

				const migration = migrations[newVersion];
				if (!migration) continue;

				try {
					if (autoLockError) throw autoLockError;
					await migration(this.api_, this.db_);
					if (autoLockError) throw autoLockError;

					// For legacy support. New migrations should set the sync
					// target info directly as needed.
					if ([1, 2].includes(newVersion)) {
						await this.api_.put('info.json', this.serializeSyncTargetInfo({
							...syncTargetInfo,
							version: newVersion,
						}));
					}

					this.logger().info(`MigrationHandler: Done migrating from version ${fromVersion} to version ${newVersion}`);
				} catch (error) {
					error.message = `Could not upgrade from version ${fromVersion} to version ${newVersion}: ${error.message}`;
					throw error;
				}
			}
		} finally {
			this.logger().info('MigrationHandler: Releasing exclusive lock');
			this.lockHandler_.stopAutoLockRefresh(exclusiveLock);
			await this.lockHandler_.releaseLock(LockType.Exclusive, this.clientType_, this.clientId_);
		}
	}

}
