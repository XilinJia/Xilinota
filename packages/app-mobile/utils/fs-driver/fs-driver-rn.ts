import FsDriverBase, { ReadDirStatsOptions } from '@xilinota/lib/fs-driver-base';
const RNFetchBlob = require('rn-fetch-blob').default;
import * as RNFS from 'react-native-fs';
import { readdir, stat } from 'react-native-fs';
const path = require('path');
const DocumentPicker = require('react-native-document-picker').default;
import { openDocument, openDocumentTreeTag } from '@xilinota/react-native-saf-x';
import RNSAF, { DocumentFileDetail, openDocumentTree } from '@xilinota/react-native-saf-x';
import { Platform } from 'react-native';
import * as tar from 'tar-stream';
import { resolve } from 'path';
import { Buffer } from 'buffer';
import Logger from '@xilinota/utils/Logger';

const logger = Logger.create('fs-driver-rn');

const ANDROID_URI_PREFIX = 'content://';

function isScopedUri(path: string) {
	return path.includes(ANDROID_URI_PREFIX);
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

	public homeDir = '';

	public async getHomeDir() {
		if (this.homeDir === '') this.homeDir = await this.getExternalDirectoryPathTag('homeDir');
		return this.homeDir;
	}

	public appendFileSync() {
		throw new Error('Not implemented');
	}

	// Requires that the file already exists.
	// TODO: Update for compatibility with fs-driver-node's appendFile (which does not
	//       require that the file exists).
	public appendFile(path: string, content: any, rawEncoding = 'base64') {
		const encoding = normalizeEncoding(rawEncoding);

		if (isScopedUri(path)) {
			return RNSAF.writeFile(path, content, { encoding, append: true });
		}
		return RNFS.appendFile(path, content, encoding);
	}

	// Encoding can be either "utf8", "utf-8", or "base64"
	public writeFile(path: string, content: any, rawEncoding = 'base64') {
		const encoding = normalizeEncoding(rawEncoding);

		if (isScopedUri(path)) {
			return RNSAF.writeFile(path, content, { encoding: encoding });
		}

		// We need to use rn-fetch-blob here due to this bug:
		// https://github.com/itinance/react-native-fs/issues/700
		return RNFetchBlob.fs.writeFile(path, content, encoding);
	}

	// same as rm -rf
	public async remove(path: string) {
		return await this.unlink(path);
	}

	// Returns a format compatible with Node.js format
	private rnfsStatToStd_(stat: any, path: string) {
		let birthtime;
		const mtime = stat.lastModified ? new Date(stat.lastModified) : stat.mtime;
		if (stat.lastModified) {
			birthtime = new Date(stat.lastModified);
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
			path: path,
			size: stat.size,
		};
	}

	public async readDirStats(path: string, options: any = null) {
		if (!options) options = {};
		if (!('recursive' in options)) options.recursive = false;

		const isScoped = isScopedUri(path);

		let stats: any[] = [];
		try {
			if (isScoped) {
				stats = await RNSAF.listFiles(path);
			} else {
				stats = await RNFS.readDir(path);
			}
		} catch (error) {
			throw new Error(`Could not read directory: ${path}: ${error.message}`);
		}

		let output: any[] = [];
		for (let i = 0; i < stats.length; i++) {
			const stat = stats[i];
			const relativePath = (isScoped ? stat.uri : stat.path).substr(path.length + 1);
			const standardStat = this.rnfsStatToStd_(stat, relativePath);
			output.push(standardStat);

			if (isScoped) {
				// readUriDirStatsHandleRecursion_ expects stat to have a URI property.
				// Use the original stat.
				output = await this.readUriDirStatsHandleRecursion_(stat, output, options);
			} else {
				output = await this.readDirStatsHandleRecursion_(path, standardStat, output, options);
			}
		}
		return output;
	}

	// XJ added
	public async ls_R(directoryPath: string) {
		// list absolute path
		const files: string[] = [];

		const scanDirectory = async (currentPath: string) => {
			const items = await readdir(currentPath);

			for (const item of items) {
				const itemPath = path.join(currentPath, item);
				const stats = await stat(itemPath);

				files.push(itemPath);
				if (stats.isDirectory()) {
					await scanDirectory(itemPath); // Recursively scan subdirectory
				}
			}
		};

		await scanDirectory(directoryPath);
		return files;
	}

	public async ls_RR(directory: string) {

		const filepaths: string[] = [];
		// logger.info('RN ls_RR ', directory);

		const traverseDirectory = async (directoryPath: string) => {
			try {
				const files = await readdir(directoryPath);
				for (const file of files) {
					const filePath = `${directoryPath}/${file}`;
					const stats = await stat(filePath);
					const relativePath = path.relative(directory, filePath);

					filepaths.push(relativePath);
					if (stats.isDirectory()) {
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

	protected async readUriDirStatsHandleRecursion_(stat: DocumentFileDetail, output: DocumentFileDetail[], options: ReadDirStatsOptions) {
		if (options.recursive && stat.type === 'directory') {
			const subStats = await this.readDirStats(stat.uri, options);
			for (let j = 0; j < subStats.length; j++) {
				const subStat = subStats[j];
				output.push(subStat);
			}
		}
		return output;
	}

	public async move(source: string, dest: string) {
		if (isScopedUri(source) || isScopedUri(dest)) {
			await RNSAF.moveFile(source, dest, { replaceIfDestinationExists: true });
		}
		return RNFS.moveFile(source, dest);
	}

	public async rename(source: string, dest: string) {
		if (isScopedUri(source) || isScopedUri(dest)) {
			await RNSAF.rename(source, dest);
		}
		return RNFS.moveFile(source, dest);
	}

	public async moveAllFiles(sourcePath: string, destinationPath: string, mediaExtensions: string[] = []) {
		try {
			const files = await RNFS.readDir(sourcePath);
			for (const file of files) {
				if (file.isFile()) {
					if (mediaExtensions) {
						const fileName = file.name.toLowerCase();
						const fileExtension = fileName.split('.').pop();
						if (!mediaExtensions.includes(fileExtension)) continue;
					}
					const sourceFile = `${sourcePath}/${file.name}`;
					const destinationFile = `${destinationPath}/${file.name}`;

					// eslint-disable-next-line no-console
					console.log('File moving:', file.name);
					await RNFS.moveFile(sourceFile, destinationFile);
				}
			}
		} catch (error) {
			console.error('Error moving files:', error);
		}
	}

	public async exists(path: string) {
		if (isScopedUri(path)) {
			return RNSAF.exists(path);
		}
		return RNFS.exists(path);
	}

	public async mkdir(path: string) {
		if (isScopedUri(path)) {
			await RNSAF.mkdir(path);
			return;
		}

		// Also creates parent directories: Works like mkdir -p
		return RNFS.mkdir(path);
	}

	public async stat(path: string) {
		try {
			let r;
			if (isScopedUri(path)) {
				r = await RNSAF.stat(path);
			} else {
				r = await RNFS.stat(path);
			}
			return this.rnfsStatToStd_(r, path);
		} catch (error) {
			if (error && (error.code === 'ENOENT' || !(await this.exists(path)))) {
				// Probably { [Error: File does not exist] framesToPop: 1, code: 'EUNSPECIFIED' }
				//     or   { [Error: The file {file} couldn’t be opened because there is no such file.], code: 'ENSCOCOAERRORDOMAIN260' }
				// which unfortunately does not have a proper error code. Can be ignored.
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

	public async open(path: string, mode: number) {
		if (isScopedUri(path)) {
			throw new Error('open() not implemented in FsDriverAndroid');
		}
		// Note: RNFS.read() doesn't provide any way to know if the end of file has been reached.
		// So instead we stat the file here and use stat.size to manually check for end of file.
		// Bug: https://github.com/itinance/react-native-fs/issues/342
		const stat = await this.stat(path);
		return {
			path: path,
			offset: 0,
			mode: mode,
			stat: stat,
		};
	}

	public close(): Promise<void> {
		// Nothing
		return null;
	}

	public readFile(path: string, rawEncoding = 'utf8') {
		const encoding = normalizeEncoding(rawEncoding);

		if (isScopedUri(path)) {
			return RNSAF.readFile(path, { encoding: encoding });
		}
		return RNFS.readFile(path, encoding);
	}

	// Always overwrite destination
	public async copy(source: string, dest: string) {
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

	public async link(source: string, dest: string) {
		await this.copy(source, dest);
	}

	public async unlink(path: string) {
		try {
			if (isScopedUri(path)) {
				await RNSAF.unlink(path);
				return;
			}
			await RNFS.unlink(path);
		} catch (error) {
			if (error && ((error.message && error.message.indexOf('exist') >= 0) || error.code === 'ENOENT')) {
				// Probably { [Error: File does not exist] framesToPop: 1, code: 'EUNSPECIFIED' }
				// which unfortunately does not have a proper error code. Can be ignored.
			} else {
				throw error;
			}
		}
	}

	public async readFileChunk(handle: any, length: number, rawEncoding = 'base64') {
		const encoding = normalizeEncoding(rawEncoding);

		if (handle.offset + length > handle.stat.size) {
			length = handle.stat.size - handle.offset;
		}

		if (!length) return null;
		const output = await RNFS.read(handle.path, length, handle.offset, encoding);
		// eslint-disable-next-line require-atomic-updates
		handle.offset += length;
		return output ? output : null;
	}

	public resolve(path: string) {
		throw new Error(`Not implemented: resolve(): ${path}`);
	}

	public resolveRelativePathWithinDir(_baseDir: string, relativePath: string) {
		throw new Error(`Not implemented: resolveRelativePathWithinDir(): ${relativePath}`);
	}

	public async md5File(path: string): Promise<string> {
		throw new Error(`Not implemented: md5File(): ${path}`);
	}

	public async tarExtract(_options: any) {
		throw new Error('Not implemented: tarExtract');
	}

	public async tarCreate(options: any, filePaths: string[]) {
		// Choose a default cwd if not given
		const cwd = options.cwd ?? RNFS.DocumentDirectoryPath;
		const file = resolve(cwd, options.file);

		if (await this.exists(file)) {
			throw new Error('Error! Destination already exists');
		}

		const pack = tar.pack();

		for (const path of filePaths) {
			const absPath = resolve(cwd, path);
			const stat = await this.stat(absPath);
			const sizeBytes: number = stat.size;

			const entry = pack.entry({ name: path, size: sizeBytes }, (error) => {
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
		let data: number[]|null = null;
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
		let directory;
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

	public isUsingAndroidSAF() {
		return Platform.OS === 'android' && Platform.Version > 28;
	}

	/** always returns an array */
	public async pickDocument(options: { multiple: false }) {
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
					result = [await DocumentPicker.pick()];
				}
			}
		} catch (error) {
			if (DocumentPicker.isCancel(error) || error?.message?.includes('cancel')) {
				// eslint-disable-next-line no-console
				console.info('pickDocuments: user has cancelled');
				return null;
			} else {
				throw error;
			}
		}

		return result;
	}
}
