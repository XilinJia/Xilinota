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
Object.defineProperty(exports, "__esModule", { value: true });
const file_api_1 = require("./file-api");
// import Logger from '@xilinota/utils/Logger';
// const logger = Logger.create('fiel-api-driver-local');
// NOTE: when synchronising with the file system the time resolution is the second (unlike milliseconds for OneDrive for instance).
// What it means is that if, for example, client 1 changes a note at time t, and client 2 changes the same note within the same second,
// both clients will not know about each others updates during the next sync. They will simply both sync their note and whoever
// comes last will overwrite (on the remote storage) the note of the other client. Both client will then have a different note at
// that point and that will only be resolved if one of them changes the note and sync (if they don't change it, it will never get resolved).
//
// This is compound with the fact that we can't have a reliable delta API on the file system so we need to check all the timestamps
// every time and rely on this exclusively to know about changes.
//
// This explains occasional failures of the fuzzing program (it finds that the clients end up with two different notes after sync). To
// check that it is indeed the problem, check log-database.txt of both clients, search for the note ID, and most likely both notes
// will have been modified at the same exact second at some point. If not, it's another bug that needs to be investigated.
class FileApiDriverLocal {
    fsErrorToJsError_(error, path = '') {
        let msg = error.toString();
        if (path)
            msg += `. Path: ${path}`;
        const output = new Error(msg);
        if (error.code)
            output.code = error.code;
        return output;
    }
    fsDriver() {
        if (!FileApiDriverLocal.fsDriver_) {
            throw new Error('FileApiDriverLocal.fsDriver_ not set!');
        }
        return FileApiDriverLocal.fsDriver_;
    }
    homeDir() {
        return __awaiter(this, void 0, void 0, function* () {
            if (!FileApiDriverLocal.homeDir_)
                FileApiDriverLocal.homeDir_ = yield this.fsDriver().getHomeDir();
            return FileApiDriverLocal.homeDir_;
        });
    }
    stat(path) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const s = yield this.fsDriver().stat(path);
                if (!s)
                    return null;
                return this.metadataFromStat_(s);
            }
            catch (error) {
                throw this.fsErrorToJsError_(error);
            }
        });
    }
    metadataFromStat_(stat) {
        return {
            path: stat.path,
            // created_time: stat.birthtime.getTime(),
            mtime: stat.mtime.getTime(),
            birthtime: stat.mtime.getTime(),
            updated_time: stat.mtime.getTime(),
            isDirectory: stat.isDirectory,
            isDir: stat.isDirectory(),
            size: stat.size,
        };
    }
    metadataFromStats_(stats) {
        const output = [];
        for (let i = 0; i < stats.length; i++) {
            const mdStat = this.metadataFromStat_(stats[i]);
            output.push(mdStat);
        }
        return output;
    }
    setTimestamp(path, timestampMs) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.fsDriver().setTimestamp(path, new Date(timestampMs));
            }
            catch (error) {
                throw this.fsErrorToJsError_(error);
            }
        });
    }
    delta(path, options) {
        return __awaiter(this, void 0, void 0, function* () {
            const getStatFn = (path) => __awaiter(this, void 0, void 0, function* () {
                const stats = yield this.fsDriver().readDirStats(path);
                return this.metadataFromStats_(stats);
            });
            try {
                const output = yield (0, file_api_1.basicDelta)(path, getStatFn, options);
                return output;
            }
            catch (error) {
                throw this.fsErrorToJsError_(error, path);
            }
        });
    }
    list(path) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                const stats = yield this.fsDriver().readDirStats(path);
                const output = this.metadataFromStats_(stats);
                return {
                    items: output,
                    hasMore: false,
                    context: null,
                };
            }
            catch (error) {
                throw this.fsErrorToJsError_(error, path);
            }
        });
    }
    get(path, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!options)
                options = {};
            let output = null;
            try {
                if (options.target === 'file') {
                    // output = await fs.copy(path, options.path, { overwrite: true });
                    output = yield this.fsDriver().copy(path, options.path);
                }
                else {
                    // output = await fs.readFile(path, options.encoding);
                    output = yield this.fsDriver().readFile(path, options.encoding);
                }
            }
            catch (error) {
                if (error.code === 'ENOENT')
                    return null;
                throw this.fsErrorToJsError_(error, path);
            }
            return output;
        });
    }
    mkdir(path) {
        return __awaiter(this, void 0, void 0, function* () {
            if (yield this.fsDriver().exists(path))
                return;
            try {
                yield this.fsDriver().mkdir(path);
            }
            catch (error) {
                throw this.fsErrorToJsError_(error, path);
            }
        });
    }
    put(path, content, options = null) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!options)
                options = {};
            try {
                if (options.source === 'file') {
                    yield this.fsDriver().copy(options.path, path);
                    return;
                }
                if (!options.encoding)
                    options.encoding = 'utf8';
                yield this.fsDriver().writeFile(path, content, options.encoding);
            }
            catch (error) {
                throw this.fsErrorToJsError_(error, path);
            }
        });
    }
    delete(path) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.fsDriver().unlink(path);
            }
            catch (error) {
                throw this.fsErrorToJsError_(error, path);
            }
        });
    }
    rmdir(path) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.fsDriver().rmdir(path);
            }
            catch (error) {
                throw this.fsErrorToJsError_(error, path);
            }
        });
    }
    remove(path) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.fsDriver().remove(path);
            }
            catch (error) {
                throw this.fsErrorToJsError_(error, path);
            }
        });
    }
    move(oldPath, newPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.fsDriver().move(oldPath, newPath);
            }
            catch (error) {
                throw this.fsErrorToJsError_(error, oldPath);
            }
        });
    }
    link(oldPath, newPath) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                yield this.fsDriver().link(oldPath, newPath);
            }
            catch (error) {
                throw this.fsErrorToJsError_(error, oldPath);
            }
        });
    }
    format() {
        throw new Error('Not supported');
    }
    clearRoot(baseDir) {
        return __awaiter(this, void 0, void 0, function* () {
            if (baseDir.startsWith('content://')) {
                const result = yield this.list(baseDir);
                for (const item of result.items) {
                    yield this.fsDriver().remove(item.path);
                }
            }
            else {
                yield this.fsDriver().remove(baseDir);
                yield this.fsDriver().mkdir(baseDir);
            }
        });
    }
    // XJ added
    ls_R(directoryPath) {
        return __awaiter(this, void 0, void 0, function* () {
            // list absolute path
            return yield this.fsDriver().ls_R(directoryPath);
        });
    }
    ls_RR(directory) {
        return __awaiter(this, void 0, void 0, function* () {
            // only list relative paths
            return yield this.fsDriver().ls_RR(directory);
        });
    }
}
exports.default = FileApiDriverLocal;
// module.exports = { FileApiDriverLocal };
//# sourceMappingURL=file-api-driver-local.js.map