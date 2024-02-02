"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shared = void 0;
const Folder_1 = __importDefault(require("../../models/Folder"));
const BaseModel_1 = __importDefault(require("../../BaseModel"));
function folderHasChildren_(folders, folderId) {
    for (let i = 0; i < folders.length; i++) {
        const folder = folders[i];
        if (folder.parent_id === folderId)
            return true;
    }
    return false;
}
function folderIsVisible(folders, folderId, collapsedFolderIds) {
    if (!collapsedFolderIds || !collapsedFolderIds.length)
        return true;
    while (true) {
        const folder = BaseModel_1.default.byId(folders, folderId);
        if (!folder)
            throw new Error(`No folder with id ${folderId}`);
        if (!folder.parent_id)
            return true;
        if (collapsedFolderIds.indexOf(folder.parent_id) >= 0)
            return false;
        folderId = folder.parent_id;
    }
}
function renderFoldersRecursive_(props, renderItem, items, parentId, depth, order) {
    var _a;
    const folders = props.folders;
    for (let i = 0; i < folders.length; i++) {
        const folder = folders[i];
        if (!Folder_1.default.idsEqual((_a = folder.parent_id) !== null && _a !== void 0 ? _a : '', parentId))
            continue;
        if (!folder.id || !folderIsVisible(props.folders, folder.id, props.collapsedFolderIds))
            continue;
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
const renderFolders = function (props, renderItem) {
    return renderFoldersRecursive_(props, renderItem, [], '', 0, []);
};
const renderTags = function (props, renderItem) {
    const tags = props.tags.slice();
    tags.sort((a, b) => {
        // It seems title can sometimes be undefined (perhaps when syncing
        // and before tag has been decrypted?). It would be best to find
        // the root cause but for now that will do.
        //
        // Fixes https://github.com/XilinJia/Xilinota/issues/4051
        if (!a || !a.title || !b || !b.title)
            return 0;
        // Note: while newly created tags are normalized and lowercase
        // imported tags might be any case, so we need to do case-insensitive
        // sort.
        return a.title.toLowerCase() < b.title.toLowerCase() ? -1 : +1;
    });
    const tagItems = [];
    const order = [];
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
exports.shared = {
    renderFolders,
    renderTags,
};
//# sourceMappingURL=side-menu-shared.js.map