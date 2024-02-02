import FileApiDriverXilinotaServer from './file-api-driver-xilinotaServer';
import Setting from './models/Setting';
import Synchronizer from './Synchronizer';
import { _ } from './locale.js';
import XilinotaServerApi from './XilinotaServerApi';
import BaseSyncTarget from './BaseSyncTarget';
import { FileApi } from './file-api';
import Logger from '@xilinota/utils/Logger';
import XilinotaError from './XilinotaError';

const staticLogger = Logger.create('SyncTargetXilinotaServer');

interface FileApiOptions {
	path(): string;
	userContentPath(): string;
	username(): string;
	password(): string;
}

export async function newFileApi(id: number, options: FileApiOptions) {
	const apiOptions = {
		baseUrl: () => options.path(),
		userContentBaseUrl: () => options.userContentPath(),
		username: () => options.username(),
		password: () => options.password(),
		env: Setting.value('env'),
	};

	const api = new XilinotaServerApi(apiOptions);
	const driver = new FileApiDriverXilinotaServer(api);
	const fileApi = new FileApi('', driver);
	fileApi.setSyncTargetId(id);
	await fileApi.initialize();
	return fileApi;
}

export async function initFileApi(syncTargetId: number, logger: Logger, options: FileApiOptions) {
	const fileApi = await newFileApi(syncTargetId, options);
	fileApi.setLogger(logger);
	return fileApi;
}

export default class SyncTargetXilinotaServer extends BaseSyncTarget {

	public static id() {
		return 9;
	}

	public static supportsConfigCheck() {
		return true;
	}

	public static targetName() {
		return 'xilinotaServer';
	}

	public static description() {
		return 'Besides synchronisation and improved performances, Xilinota Server also gives access to Xilinota-specific sharing features.';
	}

	public static label() {
		return `${_('Xilinota Server')} (Beta)`;
	}

	public async isAuthenticated() {
		return true;
	}

	public static requiresPassword() {
		return true;
	}

	public async fileApi(): Promise<FileApi> {
		return super.fileApi();
	}

	public static async checkConfig(options: FileApiOptions, syncTargetId: number = -1) {
		const output = {
			ok: false,
			errorMessage: '',
		};

		syncTargetId = syncTargetId === -1 ? SyncTargetXilinotaServer.id() : syncTargetId;

		let fileApi = null;
		try {
			fileApi = await newFileApi(syncTargetId, options);
			fileApi.requestRepeatCount_ = 0;
		} catch (error) {
			// If there's an error it's probably an application error, but we
			// can't proceed anyway, so exit.
			if (error instanceof XilinotaError) {
				output.errorMessage = error.message;
				if (error.code) output.errorMessage += ` (Code ${error.code})`;
			}
			return output;
		}

		// First we try to fetch info.json. It may not be present if it's a new
		// sync target but otherwise, if it is, and it's valid, we know the
		// credentials are valid. We do this test first because it will work
		// even if account upload is disabled. And we need such account to
		// successfully login so that they can fix it by deleting extraneous
		// notes or resources.
		try {
			const r = await fileApi.get('info.json');
			if (r) {
				const parsed = JSON.parse(r);
				if (parsed) {
					output.ok = true;
					return output;
				}
			}
		} catch (error) {
			// Ignore because we'll use the next test to check for sure if it
			// works or not.
			staticLogger.warn('Could not fetch or parse info.json:', error);
		}

		// This is a more generic test, which writes a file and tries to read it
		// back.
		try {
			await fileApi.put('testing.txt', 'testing');
			const result = await fileApi.get('testing.txt');
			if (result !== 'testing') throw new Error(`Could not access data on server "${options.path()}"`);
			await fileApi.delete('testing.txt');
			output.ok = true;
		} catch (error) {
			if (error instanceof XilinotaError) {
				output.errorMessage = error.message;
				if (error.code) output.errorMessage += ` (Code ${error.code})`;
			}
		}

		return output;
	}

	protected async initFileApi() {
		return initFileApi(SyncTargetXilinotaServer.id(), this.logger()!, {
			path: () => Setting.value('sync.9.path'),
			userContentPath: () => Setting.value('sync.9.userContentPath'),
			username: () => Setting.value('sync.9.username'),
			password: () => Setting.value('sync.9.password'),
		});
	}

	protected async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}
}
