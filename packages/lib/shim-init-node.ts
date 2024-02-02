'use strict';

import fs from 'fs-extra';

import http from 'http';
import https from 'https';

const toRelative = require('relative');

import { HttpProxyAgent, HttpsProxyAgent } from 'hpagent';
import timers from 'timers';
import zlib from 'zlib';
import dgram from 'dgram';

import mimeUtils from './mime-utils';

import Setting from "./models/Setting";
import { NoteEntity, ResourceEntity } from "./services/database/types";
import shim from './shim';
import GeolocationNode from './geolocation-node';
import FileApiDriverLocal from './file-api-driver-local';
import { setLocale, defaultLocale, closestSupportedLocale } from './locale';
import FsDriverNode from './fs-driver-node';
import Note from './models/Note';
import Resource from './models/Resource';
import { _ } from './locale';
import { basename, fileExtension, safeFileExtension, toFileProtocolPath } from './path-utils';
import FsDriverBase from './fs-driver-base';

const proxySettings: any = {};

function fileExists(filePath: string): boolean {
	try {
		return fs.statSync(filePath).isFile();
	} catch (error) {
		return false;
	}
}

function isUrlHttps(url: string): boolean {
	return url.startsWith('https');
}

function resolveProxyUrl(proxyUrl: string): string | undefined {
	return (
		proxyUrl ||
		process.env['http_proxy'] ||
		process.env['https_proxy'] ||
		process.env['HTTP_PROXY'] ||
		process.env['HTTPS_PROXY']
	);
}

// https://github.com/sindresorhus/callsites/blob/main/index.js
function callsites() {
	const _prepareStackTrace = Error.prepareStackTrace;
	Error.prepareStackTrace = (_any, stack) => stack;
	const stack = new Error().stack?.slice(1);
	Error.prepareStackTrace = _prepareStackTrace;
	return stack;
}

const gunzipFile = function(source: string, destination: any) {
	if (!fileExists(source)) {
		throw new Error(`No such file: ${source}`);
	}

	return new Promise((resolve, reject) => {
		// prepare streams
		const src = fs.createReadStream(source);
		const dest = fs.createWriteStream(destination);

		// extract the archive
		src.pipe(zlib.createGunzip()).pipe(dest);

		// callback on extract completion
		dest.on('close', () => {
			resolve(null);
		});

		src.on('error', () => {
			reject();
		});

		dest.on('error', () => {
			reject();
		});
	});
};

export function setupProxySettings(options: any) {
	proxySettings.maxConcurrentConnections = options.maxConcurrentConnections;
	proxySettings.proxyTimeout = options.proxyTimeout;
	proxySettings.proxyEnabled = options.proxyEnabled;
	proxySettings.proxyUrl = options.proxyUrl;
}

export function shimInit(options: any = null) {
	options = {
		sharp: null,
		keytar: null,
		React: null,
		appVersion: null,
		electronBridge: null,
		nodeSqlite: null,
		...options,
	};

	const sharp = options.sharp;
	const keytar = (shim.isWindows() || shim.isMac()) && !shim.isPortable() ? options.keytar : null;
	const appVersion: string = options.appVersion;

	shim.setNodeSqlite(options.nodeSqlite);

	shim.FileApiDriverLocal = FileApiDriverLocal;
	shim.Geolocation = GeolocationNode;
	shim.FormData = require('form-data');
	shim.sjclModule = require('./vendor/sjcl.js');
	shim.electronBridge_ = options.electronBridge;

	shim.fsDriver = (): FsDriverBase => {
		if (!shim.fsDriver_) shim.fsDriver_ = new FsDriverNode();
		return shim.fsDriver_;
	};

	shim.dgram = (): any => {
		return dgram;
	};

	if (options.React) {
		shim.react = (): typeof React => {
			return options.React;
		};
	}

	shim.electronBridge = (): any => {
		return shim.electronBridge_;
	};

	shim.randomBytes = async (count: number): Promise<any[]> => {
		const buffer = require('crypto').randomBytes(count);
		return Array.from(buffer);
	};

	shim.detectAndSetLocale = function(): any {
		let locale = shim.isElectron() ? shim.electronBridge().getLocale() : process.env.LANG;
		if (!locale) locale = defaultLocale();
		locale = locale.split('.');
		locale = locale[0];
		locale = closestSupportedLocale(locale);
		Setting.setValue('locale', locale);
		setLocale(locale);
		return locale;
	};

	shim.writeImageToFile = async function(nativeImage: { toPNG: () => any; toJPEG: (arg0: number) => any; }, mime: string, targetPath: any) {
		if (shim.isElectron()) {
			// For Electron
			let buffer = null;

			mime = mime.toLowerCase();

			if (mime === 'image/png') {
				buffer = nativeImage.toPNG();
			} else if (mime === 'image/jpg' || mime === 'image/jpeg') {
				buffer = nativeImage.toJPEG(90);
			}

			if (!buffer) throw new Error(`Cannot resize image because mime type "${mime}" is not supported: ${targetPath}`);

			await shim.fsDriver().writeFile(targetPath, buffer, 'buffer');
		} else {
			throw new Error('Node support not implemented');
		}
	};

	shim.showMessageBox = (message: string, options = null) => {
		if (shim.isElectron()) {
			return shim.electronBridge().showMessageBox(message, options);
		} else {
			throw new Error('Not implemented');
		}
	};

	const handleResizeImage_ = async function(filePath: string, targetPath: string, mime: any, resizeLargeImages: string) {
		const maxDim = Resource.IMAGE_MAX_DIMENSION;

		if (shim.isElectron()) {
			// For Electron
			const nativeImage = require('electron').nativeImage;
			const image = nativeImage.createFromPath(filePath);
			if (image.isEmpty()) throw new Error(`Image is invalid or does not exist: ${filePath}`);
			const size = image.getSize();

			const saveOriginalImage = async () => {
				await shim.fsDriver().copy(filePath, targetPath);
				return true;
			};
			const saveResizedImage = async () => {
				const options: any = {};
				if (size.width > size.height) {
					options.width = maxDim;
				} else {
					options.height = maxDim;
				}
				const resizedImage = image.resize(options);
				await shim.writeImageToFile(resizedImage, mime, targetPath);
				return true;
			};

			const canResize = size.width > maxDim || size.height > maxDim;
			if (canResize) {
				if (resizeLargeImages === 'alwaysAsk') {
					const Yes = 0, No = 1, Cancel = 2;
					const userAnswer = shim.showMessageBox(`${_('You are about to attach a large image (%dx%d pixels). Would you like to resize it down to %d pixels before attaching it?', size.width, size.height, maxDim)}\n\n${_('(You may disable this prompt in the options)')}`, {
						buttons: [_('Yes'), _('No'), _('Cancel')],
					});
					if (userAnswer === Yes) return await saveResizedImage();
					if (userAnswer === No) return await saveOriginalImage();
					if (userAnswer === Cancel) return false;
				} else if (resizeLargeImages === 'alwaysResize') {
					return await saveResizedImage();
				}
			}

			return await saveOriginalImage();
		} else {
			// For the CLI tool
			const image = sharp(filePath);
			const md = await image.metadata();

			if (md.width <= maxDim && md.height <= maxDim) {
				shim.fsDriver().copy(filePath, targetPath);
				return true;
			}

			return new Promise((resolve, reject) => {
				image
					.resize(Resource.IMAGE_MAX_DIMENSION, Resource.IMAGE_MAX_DIMENSION, {
						fit: 'inside',
						withoutEnlargement: true,
					})
					.toFile(targetPath, (error: any, info: unknown) => {
						if (error) {
							reject(error);
						} else {
							resolve(info);
						}
					});
			});
		}
	};

	// This is a bit of an ugly method that's used to both create a new resource
	// from a file, and update one. To update a resource, pass the
	// destinationResourceId option. This method is indirectly tested in
	// Api.test.ts.
	shim.createResourceFromPath = async function(filePath: string, defaultProps: any = null, options: any = null): Promise<ResourceEntity> {
		options = {
			resizeLargeImages: 'always', // 'always', 'ask' or 'never'
			userSideValidation: false,
			destinationResourceId: '', ...options
		};

		// upgrading read-chunk to version 4.0.3 crashes
		const readChunk = (await import('read-chunk')).default;
		// upgrading image-type to version 5.2.0 crashes
		const imageType = (await import('image-type')).default;

		const isUpdate = !!options.destinationResourceId;

		const uuid = (await import('./uuid_')).default;

		if (!(await fs.pathExists(filePath))) throw new Error(_('Cannot access %s', filePath));

		defaultProps = defaultProps ? defaultProps : {};

		let resourceId = defaultProps!.id ? defaultProps!.id : uuid.create();
		if (isUpdate) resourceId = options.destinationResourceId;

		let resource: ResourceEntity = isUpdate ? {} : Resource.new();
		resource.id = resourceId;

		// When this is an update we auto-update the mime type, in case the
		// content type has changed, but we keep the title. It is still possible
		// to modify the title on update using defaultProps.
		resource.mime = mimeUtils.fromFilename(filePath) ?? '';
		if (!isUpdate) resource.title = basename(filePath);

		let fileExt = safeFileExtension(fileExtension(filePath));

		if (!resource.mime) {
			const buffer = await readChunk(filePath, 0, 64);
			const detectedType = imageType(buffer);

			if (detectedType) {
				fileExt = detectedType.ext;
				resource.mime = detectedType.mime;
			} else {
				resource.mime = 'application/octet-stream';
			}
		}

		resource.file_extension = fileExt;

		const targetPath = Resource.fullPath(resource);

		if (options.resizeLargeImages !== 'never' && resource.mime && ['image/jpeg', 'image/jpg', 'image/png'].includes(resource.mime)) {
			const ok = await handleResizeImage_(filePath, targetPath, resource.mime, options.resizeLargeImages);
			if (!ok) {
				console.warn('handleResizeImage_ failed with', targetPath);
			}
		} else {
			await fs.copy(filePath, targetPath, { overwrite: true });
		}

		// While a whole object can be passed as defaultProps, we only just
		// support the title and ID (used above). Any other prop should be
		// derived from the provided file.
		if ('title' in defaultProps) resource.title = defaultProps.title;

		const itDoes = await shim.fsDriver().waitTillExists(targetPath);
		if (!itDoes) throw new Error(`Resource file was not created: ${targetPath}`);

		const fileStat = await shim.fsDriver().stat(targetPath);
		if (fileStat) resource.size = fileStat.size;

		const saveOptions: any = { isNew: true };
		if (options.userSideValidation) saveOptions.userSideValidation = true;

		if (isUpdate) {
			saveOptions.isNew = false;
			const tempPath = `${targetPath}.tmp`;
			await shim.fsDriver().move(targetPath, tempPath);
			resource = await Resource.save(resource, saveOptions);
			if (resource.id) await Resource.updateResourceBlobContent(resource.id, tempPath);
			await shim.fsDriver().remove(tempPath);
			return resource;
		} else {
			return Resource.save(resource, saveOptions);
		}
	};

	shim.attachFileToNoteBody = async function(noteBody: string, filePath: string, position: number = 0, options: any = null): Promise<string> {
		options = { createFileURL: false, ...options };

		const { basename } = await import('path');
		const { escapeTitleText } = require('./markdownUtils').default;

		let resource = null;
		if (!options.createFileURL) {
			resource = await shim.createResourceFromPath(filePath, null, options);
			if (!resource) return '';
		}

		const newBody = [];

		if (position === 0) {
			position = noteBody ? noteBody.length : 0;
		}

		if (noteBody && position) newBody.push(noteBody.substring(0, position));

		if (!options.createFileURL) {
			newBody.push(Resource.markdownTag(resource));
		} else {
			const filename = escapeTitleText(basename(filePath)); // to get same filename as standard drag and drop
			const fileURL = `[${filename}](${toFileProtocolPath(filePath)})`;
			newBody.push(fileURL);
		}

		if (noteBody) newBody.push(noteBody.substring(position));

		return newBody.join('\n\n');
	};

	shim.attachFileToNote = async function(note: NoteEntity, filePath: string, position: number = 0, options: any = null): Promise<NoteEntity> {
		const newBody = await shim.attachFileToNoteBody(note.body ?? '', filePath, position, options);
		// if (!newBody) return null;

		const newNote = { ...note, body: newBody };
		return Note.save(newNote);
	};

	shim.imageToDataUrl = async (filePath: string, maxSize: number = 0): Promise<string> => {
		if (shim.isElectron()) {
			const nativeImage = require('electron').nativeImage;
			let image = nativeImage.createFromPath(filePath);
			if (!image) throw new Error(`Could not load image: ${filePath}`);

			const ext = fileExtension(filePath).toLowerCase();
			if (!['jpg', 'jpeg', 'png'].includes(ext)) throw new Error(`Unsupported file format: ${ext}`);

			if (maxSize) {
				const size = image.getSize();

				if (size.width > maxSize || size.height > maxSize) {
					console.warn(`Image is over ${maxSize}px - resizing it: ${filePath}`);

					const options: any = {};
					if (size.width > size.height) {
						options.width = maxSize;
					} else {
						options.height = maxSize;
					}

					image = image.resize(options);
				}
			}

			return image.toDataURL();
		} else {
			throw new Error('Unsupported method');
		}
	},

		shim.imageFromDataUrl = async function(imageDataUrl: string, filePath: string, options: any = null) {
			if (options === null) options = {};

			if (shim.isElectron()) {
				const nativeImage = require('electron').nativeImage;
				let image = nativeImage.createFromDataURL(imageDataUrl);
				if (image.isEmpty()) throw new Error('Could not convert data URL to image - perhaps the format is not supported (eg. image/gif)'); // Would throw for example if the image format is no supported (eg. image/gif)
				if (options.cropRect) {
					// Crop rectangle values need to be rounded or the crop() call will fail
					const c = options.cropRect;
					if ('x' in c) c.x = Math.round(c.x);
					if ('y' in c) c.y = Math.round(c.y);
					if ('width' in c) c.width = Math.round(c.width);
					if ('height' in c) c.height = Math.round(c.height);
					image = image.crop(c);
				}
				const mime = mimeUtils.fromDataUrl(imageDataUrl);
				await shim.writeImageToFile(image, mime, filePath);
			} else {
				if (options.cropRect) throw new Error('Crop rect not supported in Node');

				const imageDataURI = require('image-data-uri');
				const result = imageDataURI.decode(imageDataUrl);
				await shim.fsDriver().writeFile(filePath, result.dataBuffer, 'buffer');
			}
		};

	// Not used??
	// shim.readLocalFileBase64 = (path: string) : string => {
	// 	const data = fs.readFileSync(path);
	// 	return new Buffer(data).toString('base64');
	// };

	shim.fetch = async function(url: string, options: any = {}) {
		try { // Check if the url is valid
			new URL(url);
		} catch (error) { // If the url is not valid, a TypeError will be thrown
			throw new Error(`Not a valid URL: ${url}`);
		}
		const resolvedProxyUrl = resolveProxyUrl(proxySettings.proxyUrl);
		options.agent = (resolvedProxyUrl && proxySettings.proxyEnabled) ? shim.proxyAgent(url, resolvedProxyUrl) : null;
		// upgrading node-fetch to version 3.3.2 causes crash
		const nodeFetch = require('node-fetch');
		return shim.fetchWithRetry(() => {
			return nodeFetch(url, options);
		}, options);
	};

	shim.fetchBlob = async function(_url: string | URL, options: { path: any; method: string; headers: any; }): Promise<any> {
		if (!options || !options.path) throw new Error('fetchBlob: target file path is missing');
		if (!options.method) options.method = 'GET';
		// if (!('maxRetry' in options)) options.maxRetry = 5;

		const urlParse = require('url').parse;

		const url = typeof _url === 'string' ? urlParse(_url.trim()) : _url;
		const method = options.method ? options.method : 'GET';
		const http = url.protocol.toLowerCase() === 'http:' ? require('follow-redirects').http : require('follow-redirects').https;
		const headers = options.headers ? options.headers : {};
		const filePath = options.path;

		function makeResponse(response: { statusCode: number; statusMessage: any; headers: any; }) {
			return {
				ok: response.statusCode < 400,
				path: filePath,
				text: () => {
					return response.statusMessage;
				},
				json: () => {
					return { message: `${response.statusCode}: ${response.statusMessage}` };
				},
				status: response.statusCode,
				headers: response.headers,
			};
		}

		const resolvedProxyUrl = resolveProxyUrl(proxySettings.proxyUrl);

		const requestOptions = {
			protocol: url.protocol,
			host: url.hostname,
			port: url.port,
			method: method,
			path: url.pathname + (url.query ? `?${url.query}` : ''),
			headers: headers,
			agent: (resolvedProxyUrl && proxySettings.proxyEnabled) ? shim.proxyAgent(url.href, resolvedProxyUrl) : null,
		};

		const doFetchOperation = async () => {
			return new Promise((resolve, reject) => {
				let file: any = null;

				const cleanUpOnError = (error: unknown) => {
					// We ignore any unlink error as we only want to report on the main error
					fs.unlink(filePath)

						.catch(() => { })

						.then(() => {
							if (file) {
								file.close(() => {
									file = null;
									reject(error);
								});
							} else {
								reject(error);
							}
						});
				};

				try {
					// Note: relative paths aren't supported
					file = fs.createWriteStream(filePath);

					file.on('error', (error: unknown) => {
						cleanUpOnError(error);
					});

					const request = http.request(requestOptions, (response: any) => {
						response.pipe(file);

						const isGzipped = response.headers['content-encoding'] === 'gzip';

						file.on('finish', () => {
							file.close(async () => {
								if (isGzipped) {
									const gzipFilePath = `${filePath}.gzip`;
									await shim.fsDriver().move(filePath, gzipFilePath);

									try {
										await gunzipFile(gzipFilePath, filePath);
										resolve(makeResponse(response));
									} catch (error) {
										cleanUpOnError(error);
									}

									shim.fsDriver().remove(gzipFilePath);
								} else {
									resolve(makeResponse(response));
								}
							});
						});
					});

					request.on('error', (error: Error) => {
						cleanUpOnError(error);
					});

					request.end();
				} catch (error) {
					cleanUpOnError(error);
				}
			});
		};

		return shim.fetchWithRetry(doFetchOperation, options);
	};

	shim.uploadBlob = async function(url: string, options: any): Promise<any> {
		if (!options || !options.path) throw new Error('uploadBlob: source file path is missing');
		const content = await fs.readFile(options.path);
		options = { ...options, body: content };
		return shim.fetch(url, options);
	};

	shim.stringByteLength = function(string: string): number {
		return Buffer.byteLength(string, 'utf-8');
	};

	shim.Buffer = Buffer;

	shim.openUrl = (url: string): any => {
		// Returns true if it opens the file successfully; returns false if it could
		// not find the file.
		return shim.electronBridge().openExternal(url);
	};

	shim.httpAgent_ = null;

	shim.httpAgent = (url: string) => {
		if (!shim.httpAgent_) {
			const AgentSettings = {
				keepAlive: true,
				maxSockets: 1,
				keepAliveMsecs: 5000,
			};
			shim.httpAgent_ = {
				http: new http.Agent(AgentSettings),
				https: new https.Agent(AgentSettings),
			};
		}
		return url.startsWith('https') ? shim.httpAgent_.https : shim.httpAgent_.http;
	};

	shim.proxyAgent = (serverUrl: string, proxyUrl: string) => {
		const proxyAgentConfig = {
			keepAlive: true,
			maxSockets: proxySettings.maxConcurrentConnections,
			keepAliveMsecs: 5000,
			proxy: proxyUrl,
			timeout: proxySettings.proxyTimeout * 1000,
		};

		// Based on https://github.com/delvedor/hpagent#usage
		if (!isUrlHttps(proxyUrl) && !isUrlHttps(serverUrl)) {
			return new HttpProxyAgent(proxyAgentConfig);
		} else if (isUrlHttps(proxyUrl) && !isUrlHttps(serverUrl)) {
			return new HttpProxyAgent(proxyAgentConfig);
		} else if (!isUrlHttps(proxyUrl) && isUrlHttps(serverUrl)) {
			return new HttpsProxyAgent(proxyAgentConfig);
		} else {
			return new HttpsProxyAgent(proxyAgentConfig);
		}
	};

	shim.openOrCreateFile = (filepath: string, defaultContents: string): any => {
		// If the file doesn't exist, create it
		if (!fs.existsSync(filepath)) {
			fs.writeFile(filepath, defaultContents, 'utf-8');
			// callback is not an option
			// fs.writeFile(filepath, defaultContents, 'utf-8', (error: Error) => {
			// 	if (error) {
			// 		console.error(`error: ${error}`);
			// 	}
			// });
		}

		// Open the file
		// Don't use openUrl() there.
		// The underneath require('electron').shell.openExternal() has a bug
		// https://github.com/electron/electron/issues/31347

		return shim.electronBridge().openItem(filepath);
	};

	shim.waitForFrame = () => { };

	shim.appVersion = (): string => {
		if (appVersion) return appVersion;
		// Should not happen but don't throw an error because version number is
		// used in error messages.
		return 'unknown-version!';
	};

	shim.pathRelativeToCwd = (path: string): any => {
		return toRelative(process.cwd(), path);
	};

	shim.setTimeout = (fn: Function, interval: number) => {
		return timers.setTimeout(fn, interval);
	};

	shim.setInterval = (fn: Function, interval: number) => {
		return timers.setInterval(fn, interval);
	};

	shim.clearTimeout = (id: string | number): void => {
		timers.clearTimeout(id);
	};

	shim.clearInterval = (id: string | number): void => {
		timers.clearInterval(id);
	};

	shim.keytar = () => {
		return keytar;
	};

	shim.requireDynamic = (path: string) => {
		if (path.indexOf('.') === 0) {
			const sites = callsites();
			if (sites) {
				if (sites.length <= 1) throw new Error(`Cannot require file (1) ${path}`);
				const filename = (sites[1] as any).getFileName();
				if (!filename) throw new Error(`Cannot require file (2) ${path}`);

				const fileDirName = require('path').dirname(filename);
				return require(`${fileDirName}/${path}`);
			}
		} else {
			return require(path);
		}
	};
}

// module.exports = { shimInit, setupProxySettings };
