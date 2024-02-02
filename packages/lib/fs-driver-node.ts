import path, { resolve as nodeResolve } from 'path';
import FsDriverBase, { Stat } from './fs-driver-base';
import time from './time';
import fs, { readdir } from 'fs-extra';
import md5File from 'md5-file';

import os from 'os';

export default class FsDriverNode extends FsDriverBase {

	prototype: FsDriverBase;

	constructor() {
		super();
		this.prototype = FsDriverBase.prototype;
	}

	public async getHomeDir(): Promise<string> {
		if (this.homeDir === '') this.homeDir = os.homedir();
		return this.homeDir;
	}

	private fsErrorToJsError_(error: any, path: string = ''): any {
		let msg = error.toString();
		if (path !== '') msg += `. Path: ${path}`;
		const output: any = new Error(msg);
		if (error.code) output.code = error.code;
		return output;
	}

	public appendFileSync(path_: string, string: string): void {
		return fs.appendFileSync(path_, string);
	}

	public async appendFile(path_: string, string: string, encoding: any = 'base64'): Promise<void> {
		try {
			return await fs.appendFile(path_, string, { encoding: encoding });
		} catch (error) {
			throw this.fsErrorToJsError_(error, path_);
		}
	}

	public async writeFile(path_: string, string: string, encoding: BufferEncoding | string = 'base64'): Promise<void> {
		try {
			if (encoding === 'buffer') {
				return await fs.writeFile(path_, string);
			} else {
				return await fs.writeFile(path_, string, { encoding: encoding as BufferEncoding });
			}
		} catch (error) {
			throw this.fsErrorToJsError_(error, path_);
		}
	}

	// same as rm -rf
	public async remove(path_: string): Promise<void> {
		try {
			const r = await fs.remove(path_);
			return r;
		} catch (error) {
			throw this.fsErrorToJsError_(error, path_);
		}
	}

	public async move(source: string, dest: string): Promise<void> {
		let lastError = null;

		for (let i = 0; i < 5; i++) {
			try {
				const output = await fs.move(source, dest, { overwrite: true });
				return output;
			} catch (error) {
				lastError = error;
				// Normally cannot happen with the `overwrite` flag but sometime it still does.
				// In this case, retry.
				if ((error as any).code === 'EEXIST') {
					await time.sleep(1);
					continue;
				}
				throw this.fsErrorToJsError_(error);
			}
		}

		throw lastError;
	}

	public async rename(source: string, dest: string): Promise<void> {
		await this.move(source, dest);
	}

	public exists(path_: string): Promise<boolean> {
		return fs.pathExists(path_);
	}

	public async mkdir(path_: string): Promise<void> {
		// Note that mkdirp() does not throw an error if the directory
		// could not be created. This would make the synchroniser to
		// incorrectly try to sync with a non-existing dir:
		// https://github.com/XilinJia/Xilinota/issues/2117
		const r = await fs.mkdirp(path_);
		if (!(await this.exists(path_))) throw new Error(`Could not create directory: ${path}`);
		return r;
	}

	public async stat(path_: string): Promise<Stat | null> {
		try {
			const stat = await fs.stat(path_);
			const birthtime = stat.birthtime.getTime();
			return {
				birthtime,
				mtime: stat.mtime,
				isDirectory: () => stat.isDirectory(),
				path: path_,
				size: stat.size,
				uri: '',
				name: '',
				type: '',
				lastModified: birthtime,
				mime: ''
			};
		} catch (error) {
			if ((error as any).code === 'ENOENT') return null;
			throw error;
		}
	}

	public readdirSync(path_: string): string[] {
		return fs.readdirSync(path_);
	}

	public statSync(path_: string): fs.Stats {
		return fs.statSync(path_);
	}

	public async setTimestamp(path_: string, timestampDate: any): Promise<void> {
		return fs.utimes(path_, timestampDate, timestampDate);
	}

	public async readDirStats(path_: string, options: any = null): Promise<Stat[]> {
		if (!options) options = {};
		if (!('recursive' in options)) options.recursive = false;

		let items = [];
		try {
			items = await fs.readdir(path_);
		} catch (error) {
			throw this.fsErrorToJsError_(error);
		}

		let output: Stat[] = [];
		for (let i = 0; i < items.length; i++) {
			const item = items[i];
			const stat = await this.stat(`${path}${path.sep}${item}`);
			if (!stat) continue; // Has been deleted between the readdir() call and now
			stat.path = stat.path.substring(path_.length + 1);
			output.push(stat);

			output = await this.readDirStatsHandleRecursion_(path_, stat, output, options);
		}
		return output;
	}

	// XJ added
	public async ls_R(directoryPath: string): Promise<string[]> {
		// list absolute path
		const files: string[] = [];

		const scanDirectory = async (currentPath: string) => {
			const items = await readdir(currentPath);

			for (const item of items) {
				const itemPath = path.join(currentPath, item);
				const stats = await this.stat(itemPath);

				files.push(itemPath);
				if (stats && stats.isDirectory()) {
					await scanDirectory(itemPath); // Recursively scan subdirectory
				}
			}
		};

		await scanDirectory(directoryPath);
		return files;
	}

	public async ls_RR(directory: string): Promise<string[]> {

		const filepaths: string[] = [];
		// logger.info('ls_RR ', directory);

		const traverseDirectory = async (directoryPath: string) => {
			try {
				const files = await readdir(directoryPath);
				for (const file of files) {
					const filePath = `${directoryPath}${path.sep}${file}`;
					const stats = await this.stat(filePath);
					const relativePath = path.relative(directory, filePath);

					filepaths.push(relativePath);
					if (stats && stats.isDirectory()) {
						// logger.info('ls_RR traverseDirectory: Directory', filePath);
						await traverseDirectory(filePath); // Recursively list subdirectories
					}
				}
			} catch (error) {
				console.error('Error:', error);
			}
		};
		await traverseDirectory(directory);
		return filepaths;
	}

	public async open(path_: string, mode: any): Promise<number> {
		try {
			return await fs.open(path_, mode);
		} catch (error) {
			throw this.fsErrorToJsError_(error, path_);
		}
	}

	public async close(handle: any): Promise<void> {
		try {
			return await fs.close(handle);
		} catch (error) {
			throw this.fsErrorToJsError_(error, '');
		}
	}

	public async readFile(filepath: string, encoding: string | BufferEncoding = 'utf8'): Promise<string | Buffer> {
		try {
			if (encoding === 'Buffer') return await fs.readFile(filepath); // Returns the raw buffer
			return await fs.readFile(filepath, encoding as BufferEncoding);
		} catch (error) {
			throw this.fsErrorToJsError_(error, filepath);
		}
	}

	// Always overwrite destination
	public async copy(source: string, dest: string): Promise<void> {
		try {
			return await fs.copy(source, dest, { overwrite: true });
		} catch (error) {
			throw this.fsErrorToJsError_(error, source);
		}
	}

	public async link(source: string, dest: string): Promise<void> {
		try {
			return await fs.link(source, dest);
		} catch (error) {
			throw this.fsErrorToJsError_(error, source);
		}
	}

	public async chmod(source: string, mode: string | number): Promise<void> {
		return fs.chmod(source, mode);
	}

	public async unlink(path_: string): Promise<void> {
		try {
			await fs.unlink(path_);
		} catch (error) {
			if ((error as any).code === 'ENOENT') return; // Don't throw if the file does not exist
			throw error;
		}
	}

	public async rmdir(path_: string): Promise<void> {
		try {
			await fs.rmdir(path_);
		} catch (error) {
			if ((error as any).code === 'ENOENT') return; // Don't throw if the file does not exist
			throw error;
		}
	}


	public async readFileChunk(handle: any, length: number, encoding = 'base64'): Promise<string> {
		// let buffer = new Buffer(length);
		let buffer = Buffer.alloc(length);
		const result = await fs.read(handle, buffer, 0, length, null);
		if (!result.bytesRead) return '';
		buffer = buffer.slice(0, result.bytesRead);
		if (encoding === 'base64') return buffer.toString('base64');
		if (encoding === 'ascii') return buffer.toString('ascii');
		throw new Error(`Unsupported encoding: ${encoding}`);
	}

	public resolve(path_: string): string {
		return path.resolve(path_);
	}

	// Resolves the provided relative path to an absolute path within baseDir. The function
	// also checks that the absolute path is within baseDir, to avoid security issues.
	// It is expected that baseDir is a safe path (not user-provided).
	public resolveRelativePathWithinDir(baseDir: string, relativePath: string): string {
		const resolvedBaseDir = nodeResolve(baseDir);
		const resolvedPath = nodeResolve(baseDir, relativePath);
		if (resolvedPath.indexOf(resolvedBaseDir) !== 0) throw new Error(`Resolved path for relative path "${relativePath}" is not within base directory "${baseDir}" (Was resolved to ${resolvedPath})`);
		return resolvedPath;
	}

	public async md5File(filepath: string): Promise<string> {
		return md5File(filepath);
	}

	public async tarExtract(options: any): Promise<void> {
		await require('tar').extract(options);
	}

	public async tarCreate(options: any, filePaths: string[]) {
		await require('tar').create(options, filePaths);
	}

}
