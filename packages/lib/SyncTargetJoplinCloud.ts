import Setting from './models/Setting';
import Synchronizer from './Synchronizer';
import { _ } from './locale.js';
import BaseSyncTarget from './BaseSyncTarget';
import { FileApi } from './file-api';
import SyncTargetXilinotaServer, { initFileApi } from './SyncTargetXilinotaServer';

interface FileApiOptions {
	path(): string;
	userContentPath(): string;
	username(): string;
	password(): string;
}

export default class SyncTargetJoplinCloud extends BaseSyncTarget {

	public static id() {
		return 10;
	}

	public static supportsConfigCheck() {
		return SyncTargetXilinotaServer.supportsConfigCheck();
	}

	public static targetName() {
		return 'joplinCloud';
	}

	public static label() {
		return _('Joplin Cloud');
	}

	public static description() {
		return _('Xilinota\'s own sync service. Also gives access to Xilinota-specific features such as publishing notes or collaborating on notebooks with others.');
	}

	public static supportsSelfHosted(): boolean {
		return false;
	}

	public static supportsRecursiveLinkedNotes(): boolean {
		// Not currently working:
		// https://github.com/XilinJia/Xilinota/pull/6661
		// https://github.com/XilinJia/Xilinota/pull/6600
		return false;
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

	public static async checkConfig(options: FileApiOptions) {
		return SyncTargetXilinotaServer.checkConfig({
			...options,
		}, SyncTargetJoplinCloud.id());
	}

	protected async initFileApi() {
		return initFileApi(SyncTargetJoplinCloud.id(), this.logger(), {
			path: () => Setting.value('sync.10.path'),
			userContentPath: () => Setting.value('sync.10.userContentPath'),
			username: () => Setting.value('sync.10.username'),
			password: () => Setting.value('sync.10.password'),
		});
	}

	protected async initSynchronizer() {
		return new Synchronizer(this.db(), await this.fileApi(), Setting.value('appType'));
	}
}
