"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const Folder_1 = __importDefault(require("./models/Folder"));
const Setting_1 = __importDefault(require("./models/Setting"));
const shim_1 = __importDefault(require("./shim"));
class FoldersScreenUtils {
    static allForDisplay(options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            const orderDir = Setting_1.default.value('folders.sortOrder.reverse') ? 'DESC' : 'ASC';
            const folderOptions = Object.assign({ caseInsensitive: true, order: [
                    {
                        by: 'title',
                        dir: orderDir,
                    },
                ] }, options);
            let folders = yield Folder_1.default.all(folderOptions);
            if (Setting_1.default.value('folders.sortOrder.field') === 'last_note_user_updated_time') {
                folders = yield Folder_1.default.orderByLastModified(folders, orderDir);
            }
            if (Setting_1.default.value('showNoteCounts')) {
                yield Folder_1.default.addNoteCounts(folders, Setting_1.default.value('showCompletedTodos'));
            }
            return folders;
        });
    }
    static refreshFolders() {
        return __awaiter(this, void 0, void 0, function* () {
            FoldersScreenUtils.refreshCalls_.push(true);
            try {
                const folders = yield this.allForDisplay({ includeConflictFolder: true });
                // TODO: it's reported that this has a middleware serialization issue
                this.dispatch({
                    type: 'FOLDER_UPDATE_ALL',
                    items: folders,
                });
            }
            finally {
                FoldersScreenUtils.refreshCalls_.pop();
            }
        });
    }
    static scheduleRefreshFolders() {
        if (this.scheduleRefreshFoldersIID_)
            shim_1.default.clearTimeout(this.scheduleRefreshFoldersIID_);
        this.scheduleRefreshFoldersIID_ = shim_1.default.setTimeout(() => {
            this.scheduleRefreshFoldersIID_ = null;
            this.refreshFolders();
        }, 1000);
    }
    static cancelTimers() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.scheduleRefreshFoldersIID_) {
                shim_1.default.clearTimeout(this.scheduleRefreshFoldersIID_);
                this.scheduleRefreshFoldersIID_ = null;
            }
            return new Promise((resolve) => {
                const iid = shim_1.default.setInterval(() => {
                    if (!FoldersScreenUtils.refreshCalls_.length) {
                        shim_1.default.clearInterval(iid);
                        resolve(null);
                    }
                }, 100);
            });
        });
    }
}
FoldersScreenUtils.refreshCalls_ = [];
FoldersScreenUtils.scheduleRefreshFoldersIID_ = null;
exports.default = FoldersScreenUtils;
// FoldersScreenUtils.refreshCalls_ = [];
// module.exports = { FoldersScreenUtils };
//# sourceMappingURL=folders-screen-utils.js.map