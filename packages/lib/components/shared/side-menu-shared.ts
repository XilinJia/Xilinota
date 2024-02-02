import Folder from '../../models/Folder';
import BaseModel from '../../BaseModel';
import { FolderEntity, TagEntity } from '../../services/database/types';

function folderHasChildren_(folders: FolderEntity[], folderId: string): boolean {
	for (let i = 0; i < folders.length; i++) {
		const folder = folders[i];
		if (folder.parent_id === folderId) return true;
	}
	return false;
}

function folderIsVisible(folders: FolderEntity[], folderId: string, collapsedFolderIds: string[]): boolean {
	if (!collapsedFolderIds || !collapsedFolderIds.length) return true;

	while (true) {
		const folder = BaseModel.byId(folders, folderId);
		if (!folder) throw new Error(`No folder with id ${folderId}`);
		if (!folder.parent_id) return true;
		if (collapsedFolderIds.indexOf(folder.parent_id) >= 0) return false;
		folderId = folder.parent_id;
	}
}

function renderFoldersRecursive_(
	props: { folders: FolderEntity[]; collapsedFolderIds: string[]; selectedFolderId?: string; notesParentType: string; },
	renderItem: (arg0: FolderEntity, arg1: boolean, arg2: boolean, arg3: number) => React.JSX.Element,
	items: React.JSX.Element[],
	parentId: string,
	depth: number,
	order: string[]): { items: React.JSX.Element[]; order: string[]; } {

	const folders = props.folders;
	for (let i = 0; i < folders.length; i++) {
		const folder = folders[i];
		if (!Folder.idsEqual(folder.parent_id ?? '', parentId)) continue;
		if (!folder.id || !folderIsVisible(props.folders, folder.id, props.collapsedFolderIds)) continue;

		const hasChildren = folderHasChildren_(folders, folder.id);
		order.push(folder.id);
		items.push(renderItem(folder, !!props.selectedFolderId && props.selectedFolderId === folder.id && props.notesParentType === 'Folder', hasChildren, depth));
		if (hasChildren) {
			const result = renderFoldersRecursive_(props, renderItem, items, folder.id, depth + 1, order);
			items = result.items;
			order = result.order;
		}
	}

	return {
		items: items,
		order: order,
	};
}

interface RenderFoldersProps {
	folders: FolderEntity[];
	collapsedFolderIds: string[];
	selectedFolderId?: string;
	notesParentType: string;
}

const renderFolders = function(props: RenderFoldersProps,
	renderItem: (arg0: FolderEntity, arg1: boolean, arg2: boolean, arg3: number) => any): { items: React.JSX.Element[]; order: string[]; } {

	return renderFoldersRecursive_(props, renderItem, [], '', 0, []);
};

const renderTags = function(props: { tags: TagEntity[]; selectedTagId?: string; notesParentType: string; },
	renderItem: (arg0: FolderEntity, arg1: boolean) => React.JSX.Element): { items: React.JSX.Element[]; order: string[]; } {

	const tags = props.tags.slice();
	tags.sort((a: TagEntity, b: TagEntity) => {
		// It seems title can sometimes be undefined (perhaps when syncing
		// and before tag has been decrypted?). It would be best to find
		// the root cause but for now that will do.
		//
		// Fixes https://github.com/XilinJia/Xilinota/issues/4051
		if (!a || !a.title || !b || !b.title) return 0;

		// Note: while newly created tags are normalized and lowercase
		// imported tags might be any case, so we need to do case-insensitive
		// sort.
		return a.title.toLowerCase() < b.title.toLowerCase() ? -1 : +1;
	});
	const tagItems: React.JSX.Element[] = [];
	const order: string[] = [];
	for (let i = 0; i < tags.length; i++) {
		const tag = tags[i];
		if (tag.id) {
			order.push(tag.id);
			tagItems.push(renderItem(tag, !!props.selectedTagId && props.selectedTagId === tag.id && props.notesParentType === 'Tag'));
		}
	}
	return {
		items: tagItems,
		order: order,
	};
};

export const shared = {
	renderFolders,
	renderTags,
};
