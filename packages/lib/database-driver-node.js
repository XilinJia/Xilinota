"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const database_driver_base_1 = __importDefault(require("./database-driver-base"));
const shim_1 = __importDefault(require("./shim"));
class DatabaseDriverNode extends database_driver_base_1.default {
    constructor() {
        super(...arguments);
        this.db_ = null;
        // lastInsertId() : string | null {
        // 	throw new Error('NOT IMPLEMENTED');
        // }
    }
    open(options) {
        return new Promise((resolve, reject) => {
            const sqlite3 = shim_1.default.nodeSqlite().verbose();
            this.db_ = new sqlite3.Database(options.name, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(null);
            });
        });
    }
    // sqliteErrorToJsError(error: { code: string; }, sql: string = '', params = null): Error {
    // 	const msg = [error.toString()];
    // 	if (sql) msg.push(sql);
    // 	if (params) msg.push(params);
    // 	const output = new Error(msg.join(': '));
    // 	if (error.code) (output as any).code = error.code;
    // 	return output;
    // }
    selectOne(sql, params = null) {
        if (!params)
            params = {};
        return new Promise((resolve, reject) => {
            var _a;
            (_a = this.db_) === null || _a === void 0 ? void 0 : _a.get(sql, params, (error, row) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(row);
            });
        });
    }
    loadExtension(path) {
        return new Promise((resolve, reject) => {
            var _a;
            (_a = this.db_) === null || _a === void 0 ? void 0 : _a.loadExtension(path, (error) => {
                if (error) {
                    reject(error);
                }
                else {
                    resolve(null);
                }
            });
        });
    }
    selectAll(sql, params = null) {
        if (!params)
            params = {};
        return new Promise((resolve, reject) => {
            var _a;
            (_a = this.db_) === null || _a === void 0 ? void 0 : _a.all(sql, params, (error, rows) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(rows);
            });
        });
    }
    exec(sql, params = null) {
        if (!params)
            params = {};
        return new Promise((resolve, reject) => {
            var _a;
            (_a = this.db_) === null || _a === void 0 ? void 0 : _a.run(sql, params, (error) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve(null);
            });
        });
    }
}
exports.default = DatabaseDriverNode;
//# sourceMappingURL=database-driver-node.js.map