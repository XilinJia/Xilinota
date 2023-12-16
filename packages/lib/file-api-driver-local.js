const { basicDelta } = require('./file-api');
// const path = require('path');
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
	fsErrorToJsError_(error, path = null) {
		let msg = error.toString();
		if (path !== null) msg += `. Path: ${path}`;
		const output = new Error(msg);
		if (error.code) output.code = error.code;
		return output;
	}

	fsDriver() {
		if (!FileApiDriverLocal.fsDriver_) { throw new Error('FileApiDriverLocal.fsDriver_ not set!'); }
		return FileApiDriverLocal.fsDriver_;
	}

	async homeDir() {
		if (!FileApiDriverLocal.homeDir_) FileApiDriverLocal.homeDir_ = await this.fsDriver().getHomeDir();
		return FileApiDriverLocal.homeDir_;
	}

	async stat(path) {
		try {
			const s = await this.fsDriver().stat(path);
			if (!s) return null;
			return this.metadataFromStat_(s);
		} catch (error) {
			throw this.fsErrorToJsError_(error);
		}
	}

	metadataFromStat_(stat) {
		return {
			path: stat.path,
			// created_time: stat.birthtime.getTime(),
			updated_time: stat.mtime.getTime(),
			isDir: stat.isDirectory(),
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

	async setTimestamp(path, timestampMs) {
		try {
			await this.fsDriver().setTimestamp(path, new Date(timestampMs));
		} catch (error) {
			throw this.fsErrorToJsError_(error);
		}
	}

	async delta(path, options) {
		const getStatFn = async path => {
			const stats = await this.fsDriver().readDirStats(path);
			return this.metadataFromStats_(stats);
		};

		try {
			const output = await basicDelta(path, getStatFn, options);
			return output;
		} catch (error) {
			throw this.fsErrorToJsError_(error, path);
		}
	}

	async list(path) {
		try {
			const stats = await this.fsDriver().readDirStats(path);
			const output = this.metadataFromStats_(stats);

			return {
				items: output,
				hasMore: false,
				context: null,
			};
		} catch (error) {
			throw this.fsErrorToJsError_(error, path);
		}
	}

	async get(path, options) {
		if (!options) options = {};
		let output = null;

		try {
			if (options.target === 'file') {
				// output = await fs.copy(path, options.path, { overwrite: true });
				output = await this.fsDriver().copy(path, options.path);
			} else {
				// output = await fs.readFile(path, options.encoding);
				output = await this.fsDriver().readFile(path, options.encoding);
			}
		} catch (error) {
			if (error.code === 'ENOENT') return null;
			throw this.fsErrorToJsError_(error, path);
		}

		return output;
	}

	async mkdir(path) {
		if (await this.fsDriver().exists(path)) return;

		try {
			await this.fsDriver().mkdir(path);
		} catch (error) {
			throw this.fsErrorToJsError_(error, path);
		}
	}

	async put(path, content, options = null) {
		if (!options) options = {};

		try {
			if (options.source === 'file') {
				await this.fsDriver().copy(options.path, path);
				return;
			}
			if (!options.encoding) options.encoding = 'utf8';
			await this.fsDriver().writeFile(path, content, options.encoding);
		} catch (error) {
			throw this.fsErrorToJsError_(error, path);
		}
	}

	async delete(path) {
		try {
			await this.fsDriver().unlink(path);
		} catch (error) {
			throw this.fsErrorToJsError_(error, path);
		}
	}

	async rmdir(path) {
		try {
			await this.fsDriver().rmdir(path);
		} catch (error) {
			throw this.fsErrorToJsError_(error, path);
		}
	}

	async remove(path) {
		try {
			await this.fsDriver().remove(path);
		} catch (error) {
			throw this.fsErrorToJsError_(error, path);
		}
	}

	async move(oldPath, newPath) {
		try {
			await this.fsDriver().move(oldPath, newPath);
		} catch (error) {
			throw this.fsErrorToJsError_(error, oldPath);
		}
	}

	format() {
		throw new Error('Not supported');
	}

	async clearRoot(baseDir) {
		if (baseDir.startsWith('content://')) {
			const result = await this.list(baseDir);
			for (const item of result.items) {
				await this.fsDriver().remove(item.path);
			}
		} else {
			await this.fsDriver().remove(baseDir);
			await this.fsDriver().mkdir(baseDir);
		}
	}

	// XJ added
	async ls_R(directoryPath) {
		// list absolute path
		return await this.fsDriver().ls_R(directoryPath);
	}

	async ls_RR(directory) {
		// only list relative paths
		return await this.fsDriver().ls_RR(directory);
	}
}

module.exports = { FileApiDriverLocal };
