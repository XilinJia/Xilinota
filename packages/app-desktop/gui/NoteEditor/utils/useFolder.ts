import { useState, useEffect } from 'react';
import Folder from '@xilinota/lib/models/Folder';
import { FolderEntity } from '@xilinota/lib/services/database/types';

interface HookDependencies {
	folderId: string;
}

export default function(dependencies: HookDependencies) : FolderEntity | null {
	const { folderId } = dependencies;
	const [folder, setFolder] = useState<FolderEntity|null>(null);

	useEffect(() => {
		let cancelled = false;

		async function loadFolder() {
			const f = await Folder.load(folderId);
			if (cancelled) return;
			setFolder(f);
		}

		void loadFolder();

		return function() {
			cancelled = true;
		};
	}, [folderId]);

	return folder;
}
