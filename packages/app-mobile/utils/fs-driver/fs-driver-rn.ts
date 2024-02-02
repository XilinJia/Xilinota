
import { Platform } from 'react-native';
import RNFetchBlob from 'rn-fetch-blob';
import RNFS from 'react-native-fs';
import DocumentPicker, { DocumentPickerResponse } from 'react-native-document-picker';
import tar from 'tar-stream';
import path, { resolve } from 'path';
import { Buffer } from 'buffer';

import FsDriverBase, { ReadDirStatsOptions, Stat } from '@xilinota/lib/fs-driver-base';
import RNSAF, { DocumentFileDetail, openDocumentTree, openDocument, openDocumentTreeTag } from '@xilinota/react-native-saf-x';
import Logger from '@xilinota/utils/Logger';

const logger = Logger.create('fs-driver-rn');

const ANDROID_URI_PREFIX = 'content://';

function isScopedUri(path_: string): boolean {
	return path_.includes(ANDROID_URI_PREFIX);
}

// Encodings supported by rn-fetch-blob, RNSAF, and
// RNFS.
// See also
// - https://github.com/itinance/react-native-fs#readfilefilepath-string-encoding-string-promisestring
// - https://github.com/joltup/rn-fetch-blob/blob/cf9e8843599de92031df2660d5a1da18491fa3c0/android/src/main/java/com/RNFetchBlob/RNFetchBlobFS.java#L1049
export enum SupportedEncoding {
	Utf8 = 'utf8',
	Ascii = 'ascii',
	Base64 = 'base64',
}
const supportedEncodings = Object.values<string>(SupportedEncoding);

// Converts some encodings specifiers that work with NodeJS into encodings
// that work with RNSAF, RNFetchBlob.fs, and RNFS.
//
// Throws if an encoding can't be normalized.
const normalizeEncoding = (encoding: string): SupportedEncoding => {
	encoding = encoding.toLowerCase();

	// rn-fetch-blob and RNSAF require the exact string "utf8", but NodeJS (and thus
	// fs-driver-node) support variants on this like "UtF-8" and "utf-8". Convert them:
	if (encoding === 'utf-8') {
		encoding = 'utf8';
	}

	if (!supportedEncodings.includes(encoding)) {
		throw new Error(`Unsupported encoding: ${encoding}.`);
	}

	return encoding as SupportedEncoding;
};

export default class FsDriverRN extends FsDriverBase {

	prototype: FsDriverBase;

	constructor() {
		super();
		this.prototype = FsDriverBase.prototype;
	}

	public async getHomeDir(): Promise<string> {
		if (this.homeDir === '') this.homeDir = await this.getExternalDirectoryPathTag('homeDir') ?? '';
		return this.homeDir;
	}

	// public appendFileSync(): void {
	// 	throw new Error('Not implemented');
	// }

	// Requires that the file already exists.
	// TODO: Update for compatibility with fs-driver-node's appendFile (which does not
	//       require that the file exists).
	public appendFile(path_: string, content: any, rawEncoding = 'base64'): Promise<void> {
		const encoding = normalizeEncoding(rawEncoding);

		if (isScopedUri(path_)) {
			return RNSAF.writeFile(path_, content, { encoding, append: true });
		}
		return RNFS.appendFile(path_, content, encoding);
	}

	// Encoding can be either "utf8", "utf-8", or "base64"
	public writeFile(path_: string, content: any, rawEncoding = 'base64'): Promise<void> {
		const encoding = normalizeEncoding(rawEncoding);

		if (isScopedUri(path_)) {
			return RNSAF.writeFile(path_, content, { encoding: encoding });
		}

		// We need to use rn-fetch-blob here due to this bug:
		// https://github.com/itinance/react-native-fs/issues/700
		return RNFetchBlob.fs.writeFile(path_, content, encoding);
	}

	// same as rm -rf
	public async remove(path_: string): Promise<void> {
		return await this.unlink(path_);
	}

	// Returns a format compatible with Node.js format
	private rnfsStatToStd_(stat_: DocumentFileDetail | RNFS.ReadDirItem | RNFS.StatResult, path_: string): Stat {
		const stat = stat_ as any;

		let birthtime: number;
		const mtime: Date = stat.lastModified ? new Date(stat.lastModified) : stat.mtime;
		if (stat.lastModified) {
			// birthtime = new Date(stat.lastModified);
			birthtime = stat.lastModified;
		} else if (stat.ctime) {
			// Confusingly, "ctime" normally means "change time" but here it's used as "creation time". Also sometimes it is null
			birthtime = stat.ctime;
		} else {
			birthtime = stat.mtime;
		}
		return {
			birthtime,
			mtime,
			isDirectory: () => stat.type ? stat.type === 'directory' : stat.isDirectory(),
			path: path_,
			size: stat.size,

			uri: stat.uri ? stat.uri : '',
			name: stat.name ? stat.name : '',
			type: stat.type ? stat.type : '',
			lastModified: stat.lastModified ? stat.lastModified : birthtime,
			mime: stat.mime ? stat.mime : ''
		};
	}

	public async readDirStats(path_: string, options: any = null): Promise<Stat[]> {
		if (!options) options = {};
		if (!('recursive' in options)) options.recursive = false;

		const isScoped = isScopedUri(path_);

		let stats: DocumentFileDetail[] | RNFS.ReadDirItem[] = [];
		// let stats: any[] = [];
		try {
			if (isScoped) {
				stats = await RNSAF.listFiles(path_);
			} else {
				stats = await RNFS.readDir(path_);
			}
		} catch (error) {
			throw new Error(`Could not read directory: ${path_}: ${(error as Error).message}`);
		}

		let output: Stat[] = [];
		for (let i = 0; i < stats.length; i++) {
			const stat = stats[i];
			const relativePath = (isScoped ? (stat as DocumentFileDetail).uri : (stat as RNFS.ReadDirItem).path).substring(path_.length + 1);
			const standardStat = this.rnfsStatToStd_(stat, relativePath);
			output.push(standardStat);

			if (isScoped) {
				// readUriDirStatsHandleRecursion_ expects stat to have a URI property.
				// Use the original stat.
				const output_ = await this.readUriDirStatsHandleRecursion_((stat as DocumentFileDetail), (output as DocumentFileDetail[]), options);
				for (const o of output_) output.push(this.rnfsStatToStd_(o, relativePath));
			} else {
				output = await this.readDirStatsHandleRecursion_(path_, standardStat, (output as Stat[]), options);
			}
		}
		return output;
	}

	public async ls_R(directoryPath: string): Promise<string[]> {
		// list absolute path
		const files: string[] = [];
		const isScoped = isScopedUri(directoryPath);

		const scanDirectory = async (currentPath: string) => {
			const items = isScopedUri(currentPath) ? await RNSAF.listFiles(currentPath) : await RNFS.readDir(currentPath);

			for (const item of items) {
				const actFile = isScoped ? (item as DocumentFileDetail).uri : (item as RNFS.ReadDirItem).name;
				const itemPath = path.join(currentPath, actFile);
				const stats = await this.stat(itemPath);
				if (!stats) continue;

				files.push(itemPath);
				if (stats.isDirectory()) {
					await scanDirectory(itemPath); // Recursively scan subdirectory
				}
			}
		};

		await scanDirectory(directoryPath);
		return files;
	}

	public async ls_RR(directory: string): Promise<string[]> {

		const filepaths: string[] = [];
		const isScoped = isScopedUri(directory);

		const traverseDirectory = async (directoryPath: string): Promise<void> => {
			try {
				const files = isScoped ? await RNSAF.listFiles(directoryPath) : await RNFS.readDir(directoryPath);
				for (const file of files) {
					let filePath: string;
					if (isScoped) {
						filePath = (file as DocumentFileDetail).uri;
					} else {
						filePath = `${directoryPath}/${(file as RNFS.ReadDirItem).name}`
					}
					const stats = await this.stat(filePath);
					const relativePath = isScoped ? filePath.replace(`${directory}/`, '') : path.relative(directory, filePath);
					if (!stats) continue;

					filepaths.push(relativePath);
					if (stats.isDirectory()) {
						await traverseDirectory(filePath); // Recursively list subdirectories
					}
				}
			} catch (error) {
				console.error('ls_RR Error:', error, directoryPath);
			}
		};

		await traverseDirectory(directory);
		return filepaths;
	}

	protected async readUriDirStatsHandleRecursion_(stat: DocumentFileDetail, output: DocumentFileDetail[], options: ReadDirStatsOptions): Promise<DocumentFileDetail[]> {
		if (options.recursive && stat.type === 'directory') {
			const subStats = await this.readDirStats(stat.uri, options);
			for (let j = 0; j < subStats.length; j++) {
				const subStat = subStats[j];
				output.push(subStat as DocumentFileDetail);
			}
		}
		return output;
	}

	public async move(source: string, dest: string): Promise<void> {
		if (isScopedUri(source) || isScopedUri(dest)) {
			await RNSAF.moveFile(source, dest, { replaceIfDestinationExists: true });
		}
		return RNFS.moveFile(source, dest);
	}

	public async rename(source: string, dest: string): Promise<void> {
		if (isScopedUri(source) || isScopedUri(dest)) {
			await RNSAF.rename(source, dest);
		}
		return RNFS.moveFile(source, dest);
	}

	public isFile(path_: DocumentFileDetail | RNFS.ReadDirItem): boolean {
		return ('uri' in path_ && (path_ as DocumentFileDetail).type === 'file') ||
			(!('uri' in path_) && (path_ as RNFS.ReadDirItem).isFile())
	}

	public async moveAllFiles(sourcePath: string, destinationPath: string, mediaExtensions: string[] = []): Promise<void> {
		try {
			const paths = isScopedUri(sourcePath) ? await RNSAF.listFiles(sourcePath) : await RNFS.readDir(sourcePath);;
			for (const file of paths) {
				if (this.isFile(file)) {
					if (mediaExtensions) {
						const fileName = file.name.toLowerCase();
						const fileExtension = fileName.split('.').pop();
						if (!fileExtension || !mediaExtensions.includes(fileExtension)) continue;
					}
					const sourceFile = `${sourcePath}/${file.name}`;
					const destinationFile = `${destinationPath}/${file.name}`;

					console.log('File moving:', file.name);
					await this.move(sourceFile, destinationFile);
				}
			}
		} catch (error) {
			console.error('Error moving files:', error, sourcePath, destinationPath);
		}
	}

	public async exists(path_: string): Promise<boolean> {
		if (isScopedUri(path_)) {
			return RNSAF.exists(path_);
		}
		return RNFS.exists(path_);
	}

	public async mkdir(path_: string): Promise<void> {
		if (isScopedUri(path_)) {
			await RNSAF.mkdir(path_);
			return;
		}

		// Also creates parent directories: Works like mkdir -p
		return RNFS.mkdir(path_);
	}

	public async stat(path_: string): Promise<Stat | null> {
		try {
			let r;
			if (isScopedUri(path_)) {
				r = await RNSAF.stat(path_);
			} else {
				r = await RNFS.stat(path_);
			}
			return this.rnfsStatToStd_(r, path_);
		} catch (error) {
			// throw error;
			if (((error as any).code === 'ENOENT' || !(await this.exists(path_)))) {
				// Probably { [Error: File does not exist] framesToPop: 1, code: 'EUNSPECIFIED' }
				//     or   { [Error: The file {file} couldn’t be opened because there is no such file.], code: 'ENSCOCOAERRORDOMAIN260' }
				// which unfortunately does not have a proper error code. Can be ignored.
				logger.warn('RN stat', error, path_);
				return null;
			} else {
				throw error;
			}
		}
	}

	// NOTE: DOES NOT WORK - no error is thrown and the function is called with the right
	// arguments but the function returns `false` and the timestamp is not set.
	// Current setTimestamp is not really used so keep it that way, but careful if it
	// becomes needed.
	public async setTimestamp() {
		// return RNFS.touch(path, timestampDate, timestampDate);
	}

	public async open(path_: string, mode: number): Promise<{
		path: string;
		offset: number;
		mode: number;
		stat: Stat | null;
	}> {
		if (isScopedUri(path_)) {
			throw new Error('open() not implemented in FsDriverAndroid');
		}
		// Note: RNFS.read() doesn't provide any way to know if the end of file has been reached.
		// So instead we stat the file here and use stat.size to manually check for end of file.
		// Bug: https://github.com/itinance/react-native-fs/issues/342
		const stat = await this.stat(path_);
		return {
			path: path_,
			offset: 0,
			mode: mode,
			stat: stat,
		};
	}

	public async close(): Promise<void> {
		// Nothing
		return;
	}

	public readFile(path_: string, rawEncoding = 'utf8'): Promise<string> {
		const encoding = normalizeEncoding(rawEncoding);

		if (isScopedUri(path_)) {
			return RNSAF.readFile(path_, { encoding: encoding });
		}
		return RNFS.readFile(path_, encoding);
	}

	// Always overwrite destination
	public async copy(source: string, dest: string): Promise<void> {
		let retry = false;
		try {
			if (isScopedUri(source) || isScopedUri(dest)) {
				await RNSAF.copyFile(source, dest, { replaceIfDestinationExists: true });
				return;
			}
			await RNFS.copyFile(source, dest);
		} catch (error) {
			// On iOS it will throw an error if the file already exist
			retry = true;
			await this.unlink(dest);
		}

		if (retry) {
			if (isScopedUri(source) || isScopedUri(dest)) {
				await RNSAF.copyFile(source, dest, { replaceIfDestinationExists: true });
			} else {
				await RNFS.copyFile(source, dest);
			}
		}
	}

	public async link(source: string, dest: string): Promise<void> {
		await this.copy(source, dest);
	}

	public async unlink(path_: string): Promise<void> {
		try {
			if (isScopedUri(path_)) {
				await RNSAF.unlink(path_);
				return;
			}
			await RNFS.unlink(path_);
		} catch (error) {
			const err = error as any;
			if (error && ((err.message && err.message.indexOf('exist') >= 0) || err.code === 'ENOENT')) {
				// Probably { [Error: File does not exist] framesToPop: 1, code: 'EUNSPECIFIED' }
				// which unfortunately does not have a proper error code. Can be ignored.
			} else {
				throw error;
			}
		}
	}

	public async readFileChunk(handle: any, length: number, rawEncoding = 'base64'): Promise<string> {
		const encoding = normalizeEncoding(rawEncoding);

		if (handle.offset + length > handle.stat.size) {
			length = handle.stat.size - handle.offset;
		}

		if (!length) return '';
		const output = await RNFS.read(handle.path, length, handle.offset, encoding);

		handle.offset += length;
		return output ? output : '';
	}

	// public resolve(path: string): string {
	// 	throw new Error(`Not implemented: resolve(): ${path}`);
	// }

	// public resolveRelativePathWithinDir(_baseDir: string, relativePath: string): string {
	// 	throw new Error(`Not implemented: resolveRelativePathWithinDir(): ${relativePath}`);
	// }

	// public async md5File(path: string): Promise<string> {
	// 	throw new Error(`Not implemented: md5File(): ${path}`);
	// }

	// public async tarExtract(_options: any): Promise<void> {
	// 	throw new Error('Not implemented: tarExtract');
	// }

	public async tarCreate(options: any, filePaths: string[]): Promise<void> {
		// Choose a default cwd if not given
		const cwd = options.cwd ?? RNFS.DocumentDirectoryPath;
		const file = resolve(cwd, options.file);

		if (await this.exists(file)) {
			throw new Error('Error! Destination already exists');
		}

		const pack = tar.pack();

		for (const path_ of filePaths) {
			const absPath = resolve(cwd, path_);
			const stat = await this.stat(absPath);
			const sizeBytes: number = stat ? stat.size : 0;

			const entry = pack.entry({ name: path_, size: sizeBytes }, (error) => {
				if (error) {
					logger.error(`Tar error: ${error}`);
				}
			});

			const chunkSize = 1024 * 100; // 100 KiB
			for (let offset = 0; offset < sizeBytes; offset += chunkSize) {
				// The RNFS documentation suggests using base64 for binary files.
				const part = await RNFS.read(absPath, chunkSize, offset, 'base64');
				entry.write(Buffer.from(part, 'base64'));
			}
			entry.end();
		}

		pack.finalize();

		// The streams used by tar-stream seem not to support a chunk size
		// (it seems despite the typings provided).
		let data: number[] | null = null;
		while ((data = pack.read()) !== null) {
			const buff = Buffer.from(data);
			const base64Data = buff.toString('base64');
			await this.appendFile(file, base64Data, 'base64');
		}
	}

	public async getExternalDirectoryPath(): Promise<string | undefined> {
		let directory;
		if (this.isUsingAndroidSAF()) {
			const doc = await openDocumentTree(true);
			if (doc?.uri) {
				directory = doc?.uri;
			}
		} else {
			directory = RNFS.ExternalDirectoryPath;
		}
		return directory;
	}

	public async getExternalDirectoryPathTag(tag: string): Promise<string | undefined> {
		let directory: string | undefined;
		if (this.isUsingAndroidSAF()) {
			const doc = await openDocumentTreeTag(tag);
			if (doc?.uri) {
				directory = doc?.uri;
			}
		} else {
			directory = RNFS.ExternalDirectoryPath;
		}
		return directory;
	}

	public isUsingAndroidSAF(): boolean {
		return Platform.OS === 'android' && Platform.Version > 28;
	}

	/** always returns an array */
	public async pickDocument(options: { multiple: false }): Promise<DocumentFileDetail[] | DocumentPickerResponse[] | null> {
		const { multiple = false } = options || {};
		let result;
		try {
			if (this.isUsingAndroidSAF()) {
				result = await openDocument({ multiple });
				if (!result) {
					// to catch the error down below using the 'cancel' keyword
					throw new Error('User canceled document picker');
				}
				result = result.map(r => {
					(r.type as string) = r.mime;
					((r as any).fileCopyUri as string) = r.uri;
					return r;
				});
			} else {
				// the result is an array
				if (multiple) {
					result = await DocumentPicker.pick({ allowMultiSelection: true });
				} else {
					result = await DocumentPicker.pick();
				}
			}
		} catch (error) {
			const err = error as Error;
			if (DocumentPicker.isCancel(err) || err.message.includes('cancel')) {

				console.info('pickDocuments: user has cancelled');
				return null;
			} else {
				throw error;
			}
		}

		return result;
	}
}
