import time from './time';
import Setting from './models/Setting';
import { filename, fileExtension } from './path-utils';
const md5 = require('md5');

export interface Stat {
	birthtime: number;
	mtime: number;
	isDirectory(): boolean;
	path: string;
	size: number;
}

export interface ReadDirStatsOptions {
	recursive: boolean;
}

export default class FsDriverBase {

	public async stat(_path: string): Promise<Stat> {
		throw new Error('Not implemented');
	}

	public async readFile(_path: string, _encoding = 'utf8'): Promise<any> {
		throw new Error('Not implemented');
	}

	public async appendFile(_path: string, _content: string, _encoding = 'base64'): Promise<any> {
		throw new Error('Not implemented');
	}

	public async copy(_source: string, _dest: string) {
		throw new Error('Not implemented');
	}

	public async chmod(_source: string, _mode: string | number) {
		throw new Error('Not implemented');
	}

	public async mkdir(_path: string) {
		throw new Error('Not implemented');
	}

	public async unlink(_path: string) {
		throw new Error('Not implemented');
	}

	public async move(_source: string, _dest: string) {
		throw new Error('Not implemented');
	}

	public async readFileChunk(_handle: any, _length: number, _encoding = 'base64'): Promise<string> {
		throw new Error('Not implemented');
	}

	public async open(_path: string, _mode: any): Promise<any> {
		throw new Error('Not implemented');
	}

	public async close(_handle: any): Promise<any> {
		throw new Error('Not implemented');
	}

	public async readDirStats(_path: string, _options: ReadDirStatsOptions = null): Promise<Stat[]> {
		throw new Error('Not implemented');
	}

	public async ls_RR(_directory: string): Promise<string[]> {
		throw new Error('Not implemented');
	}

	public async exists(_path: string): Promise<boolean> {
		throw new Error('Not implemented');
	}

	public async remove(_path: string): Promise<void> {
		throw new Error('Not implemented');
	}

	public async isDirectory(path: string) {
		const stat = await this.stat(path);
		return !stat ? false : stat.isDirectory();
	}

	public async writeFile(_path: string, _content: string, _encoding = 'base64'): Promise<void> {
		throw new Error('Not implemented');
	}

	protected async readDirStatsHandleRecursion_(basePath: string, stat: Stat, output: Stat[], options: ReadDirStatsOptions): Promise<Stat[]> {
		if (options.recursive && stat.isDirectory()) {
			const subPath = `${basePath}/${stat.path}`;
			const subStats = await this.readDirStats(subPath, options);
			for (let j = 0; j < subStats.length; j++) {
				const subStat = subStats[j];
				subStat.path = `${stat.path}/${subStat.path}`;
				output.push(subStat);
			}
		}

		return output;
	}

	public async findUniqueFilename(name: string, reservedNames: string[] = null, markdownSafe = false): Promise<string> {
		if (reservedNames === null) {
			reservedNames = [];
		}
		let counter = 1;

		const nameNoExt = filename(name, true);
		let extension = fileExtension(name);
		if (extension) extension = `.${extension}`;
		let nameToTry = nameNoExt + extension;
		while (true) {
			// Check if the filename does not exist in the filesystem and is not reserved
			const exists = await this.exists(nameToTry) || reservedNames.includes(nameToTry);
			if (!exists) return nameToTry;
			if (!markdownSafe) {
				nameToTry = `${nameNoExt} (${counter})${extension}`;
			} else {
				nameToTry = `${nameNoExt}-${counter}${extension}`;
			}
			counter++;
			if (counter >= 1000) {
				nameToTry = `${nameNoExt} (${new Date().getTime()})${extension}`;
				await time.msleep(10);
			}
			if (counter >= 1100) throw new Error('Cannot find unique filename');
		}
	}

	public async removeAllThatStartWith(dirPath: string, filenameStart: string) {
		if (!filenameStart || !dirPath) throw new Error('dirPath and filenameStart cannot be empty');

		const stats = await this.readDirStats(dirPath);

		for (const stat of stats) {
			if (stat.path.indexOf(filenameStart) === 0) {
				await this.remove(`${dirPath}/${stat.path}`);
			}
		}
	}

	public async waitTillExists(path: string, timeout = 10000) {
		const startTime = Date.now();

		while (true) {
			const e = await this.exists(path);
			if (e) return true;
			if (Date.now() - startTime > timeout) return false;
			await time.msleep(100);
		}
	}

	// TODO: move out of here and make it part of xilinota-renderer
	// or assign to option using .bind(fsDriver())
	public async cacheCssToFile(cssStrings: string[]) {
		const cssString = Array.isArray(cssStrings) ? cssStrings.join('\n') : cssStrings;
		const cssFilePath = `${Setting.value('tempDir')}/${md5(escape(cssString))}.css`;
		if (!(await this.exists(cssFilePath))) {
			await this.writeFile(cssFilePath, cssString, 'utf8');
		}

		return {
			path: cssFilePath,
			mime: 'text/css',
		};
	}

	public async tarExtract(_options: any) {
		throw new Error('Not implemented');
	}

	public async tarCreate(_options: any, _filePaths: string[]) {
		throw new Error('Not implemented');
	}

}
