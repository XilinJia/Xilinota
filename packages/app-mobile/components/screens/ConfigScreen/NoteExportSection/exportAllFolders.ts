import Folder from '@xilinota/lib/models/Folder';
import InteropService from '@xilinota/lib/services/interop/InteropService';
import { ExportOptions, FileSystemItem, OnExportProgressCallback } from '@xilinota/lib/services/interop/types';
import shim from '@xilinota/lib/shim';

import { CachesDirectoryPath } from 'react-native-fs';
export const makeExportCacheDirectory = async () => {
	const targetDir = `${CachesDirectoryPath}/exports`;
	await shim.fsDriver().mkdir(targetDir);

	return targetDir;
};

const exportFolders = async (path: string, onProgress: OnExportProgressCallback) => {
	const folders = await Folder.all();

	const sourceFolderIds = folders.map(folder => folder.id);
	const exportOptions: ExportOptions = {
		sourceFolderIds,
		path,
		format: 'jex',
		target: FileSystemItem.File,
		onProgress,
	};

	return await InteropService.instance().export(exportOptions);
};

export default exportFolders;
