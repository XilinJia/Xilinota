import { Dispatch } from 'redux';
import Folder from './models/Folder';
import Setting from './models/Setting';
import { FolderEntity } from './services/database/types';
import shim from './shim';

export default class FoldersScreenUtils {
	static refreshCalls_: boolean[] = [];
	static scheduleRefreshFoldersIID_ = null;
	static dispatch: Function;

	static async allForDisplay(options = {}): Promise<FolderEntity[]> {
		const orderDir = Setting.value('folders.sortOrder.reverse') ? 'DESC' : 'ASC';

		const folderOptions = {
			caseInsensitive: true,
			order: [
				{
					by: 'title',
					dir: orderDir,
				},
			],
			...options,
		};

		let folders = await Folder.all(folderOptions);

		if (Setting.value('folders.sortOrder.field') === 'last_note_user_updated_time') {
			folders = await Folder.orderByLastModified(folders, orderDir);
		}

		if (Setting.value('showNoteCounts')) {
			await Folder.addNoteCounts(folders,
				Setting.value('showCompletedTodos'));
		}

		return folders;
	}

	static async refreshFolders(): Promise<void> {
		FoldersScreenUtils.refreshCalls_.push(true);
		try {
			const folders = await this.allForDisplay({ includeConflictFolder: true });

			// TODO: it's reported that this has a middleware serialization issue
			this.dispatch({
				type: 'FOLDER_UPDATE_ALL',
				items: folders,
			});
		} finally {
			FoldersScreenUtils.refreshCalls_.pop();
		}
	}

	static scheduleRefreshFolders(): void {
		if (this.scheduleRefreshFoldersIID_) shim.clearTimeout(this.scheduleRefreshFoldersIID_);
		this.scheduleRefreshFoldersIID_ = shim.setTimeout(() => {
			this.scheduleRefreshFoldersIID_ = null;
			this.refreshFolders();
		}, 1000);
	}

	static async cancelTimers(): Promise<unknown> {
		if (this.scheduleRefreshFoldersIID_) {
			shim.clearTimeout(this.scheduleRefreshFoldersIID_);
			this.scheduleRefreshFoldersIID_ = null;
		}
		return new Promise((resolve) => {
			const iid = shim.setInterval(() => {
				if (!FoldersScreenUtils.refreshCalls_.length) {
					shim.clearInterval(iid);
					resolve(null);
				}
			}, 100);
		});
	}
}

// FoldersScreenUtils.refreshCalls_ = [];

// module.exports = { FoldersScreenUtils };
