import DatabaseDriverBase from '@xilinota/lib//database-driver-base';
import SQLite from 'react-native-sqlite-storage';
export default class DatabaseDriverReactNative extends DatabaseDriverBase {
    lastInsertId_;
    db_ = null;
    constructor() {
        super();
        this.lastInsertId_ = null;
    }
    open(options) {
        // SQLite.DEBUG(true);
        return new Promise((resolve, reject) => {
            SQLite.openDatabase({ name: options.name }, (db) => {
                this.db_ = db;
                resolve(null);
            }, (error) => {
                reject(error);
            });
        });
    }
    // sqliteErrorToJsError(error: Error, _sql: string = '', _params = null): Error {
    // 	return error;
    // }
    selectOne(sql, params = null) {
        return new Promise((resolve, reject) => {
            this.db_?.executeSql(sql, params, 
            // TODO: how to really call this?
            (r) => {
                resolve(r.rows.length ? r.rows.item(0) : null);
            }, (_tx, error) => {
                reject(error);
            });
        });
    }
    selectAll(sql, params = null) {
        return this.exec(sql, params).then((r) => {
            const output = [];
            for (let i = 0; i < r.rows.length; i++) {
                output.push(r.rows.item(i));
            }
            return output;
        });
    }
    loadExtension(path) {
        throw new Error(`No extension support for ${path} in react-native-sqlite-storage`);
    }
    exec(sql, params = null) {
        return new Promise((resolve, reject) => {
            this.db_?.executeSql(sql, params, (r) => {
                // TODO: how to really call this?
                if ('insertId' in r)
                    this.lastInsertId_ = r.insertId;
                resolve(r);
            }, (_tx, error) => {
                reject(error);
            });
        });
    }
    lastInsertId() {
        return this.lastInsertId_;
    }
}
// module.exports = { DatabaseDriverReactNative };
//# sourceMappingURL=database-driver-react-native.js.map