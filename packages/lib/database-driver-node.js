const shim = require('./shim').default;
const Promise = require('promise');

class DatabaseDriverNode {
	open(options) {
		return new Promise((resolve, reject) => {
			const sqlite3 = shim.nodeSqlite().verbose();

			this.db_ = new sqlite3.Database(options.name, sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, error => {
				if (error) {
					reject(error);
					return;
				}
				resolve();
			});
		});
	}

	sqliteErrorToJsError(error, sql = null, params = null) {
		const msg = [error.toString()];
		if (sql) msg.push(sql);
		if (params) msg.push(params);
		const output = new Error(msg.join(': '));
		if (error.code) output.code = error.code;
		return output;
	}

	selectOne(sql, params = null) {
		if (!params) params = {};
		return new Promise((resolve, reject) => {
			this.db_.get(sql, params, (error, row) => {
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
			this.db_.loadExtension(path, (error) => {
				if (error) {
					reject(error);
				} else {
					resolve();
				}
			});
		});
	}

	selectAll(sql, params = null) {
		if (!params) params = {};
		return new Promise((resolve, reject) => {
			this.db_.all(sql, params, (error, row) => {
				if (error) {
					reject(error);
					return;
				}
				resolve(row);
			});
		});
	}

	exec(sql, params = null) {
		if (!params) params = {};
		return new Promise((resolve, reject) => {
			this.db_.run(sql, params, error => {
				if (error) {
					reject(error);
					return;
				}
				resolve();
			});
		});
	}

	lastInsertId() {
		throw new Error('NOT IMPLEMENTED');
	}
}

module.exports = { DatabaseDriverNode };
