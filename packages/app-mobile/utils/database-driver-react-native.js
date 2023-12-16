const SQLite = require('react-native-sqlite-storage');

class DatabaseDriverReactNative {
	constructor() {
		this.lastInsertId_ = null;
	}

	open(options) {
		// SQLite.DEBUG(true);
		return new Promise((resolve, reject) => {
			SQLite.openDatabase(
				{ name: options.name },
				db => {
					this.db_ = db;
					resolve();
				},
				error => {
					reject(error);
				},
			);
		});
	}

	sqliteErrorToJsError(error) {
		return error;
	}

	selectOne(sql, params = null) {
		return new Promise((resolve, reject) => {
			this.db_.executeSql(
				sql,
				params,
				r => {
					resolve(r.rows.length ? r.rows.item(0) : null);
				},
				error => {
					reject(error);
				},
			);
		});
	}

	selectAll(sql, params = null) {
		// eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
		return this.exec(sql, params).then(r => {
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
			this.db_.executeSql(
				sql,
				params,
				r => {
					if ('insertId' in r) this.lastInsertId_ = r.insertId;
					resolve(r);
				},
				error => {
					reject(error);
				},
			);
		});
	}

	lastInsertId() {
		return this.lastInsertId_;
	}
}

module.exports = { DatabaseDriverReactNative };
