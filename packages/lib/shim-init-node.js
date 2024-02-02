'use strict';
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shimInit = exports.setupProxySettings = void 0;
const fs_extra_1 = __importDefault(require("fs-extra"));
const http_1 = __importDefault(require("http"));
const https_1 = __importDefault(require("https"));
const toRelative = require('relative');
const hpagent_1 = require("hpagent");
const timers_1 = __importDefault(require("timers"));
const zlib_1 = __importDefault(require("zlib"));
const dgram_1 = __importDefault(require("dgram"));
const mime_utils_1 = __importDefault(require("./mime-utils"));
const Setting_1 = __importDefault(require("./models/Setting"));
const shim_1 = __importDefault(require("./shim"));
const geolocation_node_1 = __importDefault(require("./geolocation-node"));
const file_api_driver_local_1 = __importDefault(require("./file-api-driver-local"));
const locale_1 = require("./locale");
const fs_driver_node_1 = __importDefault(require("./fs-driver-node"));
const Note_1 = __importDefault(require("./models/Note"));
const Resource_1 = __importDefault(require("./models/Resource"));
const locale_2 = require("./locale");
const path_utils_1 = require("./path-utils");
const proxySettings = {};
function fileExists(filePath) {
    try {
        return fs_extra_1.default.statSync(filePath).isFile();
    }
    catch (error) {
        return false;
    }
}
function isUrlHttps(url) {
    return url.startsWith('https');
}
function resolveProxyUrl(proxyUrl) {
    return (proxyUrl ||
        process.env['http_proxy'] ||
        process.env['https_proxy'] ||
        process.env['HTTP_PROXY'] ||
        process.env['HTTPS_PROXY']);
}
// https://github.com/sindresorhus/callsites/blob/main/index.js
function callsites() {
    var _a;
    const _prepareStackTrace = Error.prepareStackTrace;
    Error.prepareStackTrace = (_any, stack) => stack;
    const stack = (_a = new Error().stack) === null || _a === void 0 ? void 0 : _a.slice(1);
    Error.prepareStackTrace = _prepareStackTrace;
    return stack;
}
const gunzipFile = function (source, destination) {
    if (!fileExists(source)) {
        throw new Error(`No such file: ${source}`);
    }
    return new Promise((resolve, reject) => {
        // prepare streams
        const src = fs_extra_1.default.createReadStream(source);
        const dest = fs_extra_1.default.createWriteStream(destination);
        // extract the archive
        src.pipe(zlib_1.default.createGunzip()).pipe(dest);
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
function setupProxySettings(options) {
    proxySettings.maxConcurrentConnections = options.maxConcurrentConnections;
    proxySettings.proxyTimeout = options.proxyTimeout;
    proxySettings.proxyEnabled = options.proxyEnabled;
    proxySettings.proxyUrl = options.proxyUrl;
}
exports.setupProxySettings = setupProxySettings;
function shimInit(options = null) {
    options = Object.assign({ sharp: null, keytar: null, React: null, appVersion: null, electronBridge: null, nodeSqlite: null }, options);
    const sharp = options.sharp;
    const keytar = (shim_1.default.isWindows() || shim_1.default.isMac()) && !shim_1.default.isPortable() ? options.keytar : null;
    const appVersion = options.appVersion;
    shim_1.default.setNodeSqlite(options.nodeSqlite);
    shim_1.default.FileApiDriverLocal = file_api_driver_local_1.default;
    shim_1.default.Geolocation = geolocation_node_1.default;
    shim_1.default.FormData = require('form-data');
    shim_1.default.sjclModule = require('./vendor/sjcl.js');
    shim_1.default.electronBridge_ = options.electronBridge;
    shim_1.default.fsDriver = () => {
        if (!shim_1.default.fsDriver_)
            shim_1.default.fsDriver_ = new fs_driver_node_1.default();
        return shim_1.default.fsDriver_;
    };
    shim_1.default.dgram = () => {
        return dgram_1.default;
    };
    if (options.React) {
        shim_1.default.react = () => {
            return options.React;
        };
    }
    shim_1.default.electronBridge = () => {
        return shim_1.default.electronBridge_;
    };
    shim_1.default.randomBytes = (count) => __awaiter(this, void 0, void 0, function* () {
        const buffer = require('crypto').randomBytes(count);
        return Array.from(buffer);
    });
    shim_1.default.detectAndSetLocale = function () {
        let locale = shim_1.default.isElectron() ? shim_1.default.electronBridge().getLocale() : process.env.LANG;
        if (!locale)
            locale = (0, locale_1.defaultLocale)();
        locale = locale.split('.');
        locale = locale[0];
        locale = (0, locale_1.closestSupportedLocale)(locale);
        Setting_1.default.setValue('locale', locale);
        (0, locale_1.setLocale)(locale);
        return locale;
    };
    shim_1.default.writeImageToFile = function (nativeImage, mime, targetPath) {
        return __awaiter(this, void 0, void 0, function* () {
            if (shim_1.default.isElectron()) {
                // For Electron
                let buffer = null;
                mime = mime.toLowerCase();
                if (mime === 'image/png') {
                    buffer = nativeImage.toPNG();
                }
                else if (mime === 'image/jpg' || mime === 'image/jpeg') {
                    buffer = nativeImage.toJPEG(90);
                }
                if (!buffer)
                    throw new Error(`Cannot resize image because mime type "${mime}" is not supported: ${targetPath}`);
                yield shim_1.default.fsDriver().writeFile(targetPath, buffer, 'buffer');
            }
            else {
                throw new Error('Node support not implemented');
            }
        });
    };
    shim_1.default.showMessageBox = (message, options = null) => {
        if (shim_1.default.isElectron()) {
            return shim_1.default.electronBridge().showMessageBox(message, options);
        }
        else {
            throw new Error('Not implemented');
        }
    };
    const handleResizeImage_ = function (filePath, targetPath, mime, resizeLargeImages) {
        return __awaiter(this, void 0, void 0, function* () {
            const maxDim = Resource_1.default.IMAGE_MAX_DIMENSION;
            if (shim_1.default.isElectron()) {
                // For Electron
                const nativeImage = require('electron').nativeImage;
                const image = nativeImage.createFromPath(filePath);
                if (image.isEmpty())
                    throw new Error(`Image is invalid or does not exist: ${filePath}`);
                const size = image.getSize();
                const saveOriginalImage = () => __awaiter(this, void 0, void 0, function* () {
                    yield shim_1.default.fsDriver().copy(filePath, targetPath);
                    return true;
                });
                const saveResizedImage = () => __awaiter(this, void 0, void 0, function* () {
                    const options = {};
                    if (size.width > size.height) {
                        options.width = maxDim;
                    }
                    else {
                        options.height = maxDim;
                    }
                    const resizedImage = image.resize(options);
                    yield shim_1.default.writeImageToFile(resizedImage, mime, targetPath);
                    return true;
                });
                const canResize = size.width > maxDim || size.height > maxDim;
                if (canResize) {
                    if (resizeLargeImages === 'alwaysAsk') {
                        const Yes = 0, No = 1, Cancel = 2;
                        const userAnswer = shim_1.default.showMessageBox(`${(0, locale_2._)('You are about to attach a large image (%dx%d pixels). Would you like to resize it down to %d pixels before attaching it?', size.width, size.height, maxDim)}\n\n${(0, locale_2._)('(You may disable this prompt in the options)')}`, {
                            buttons: [(0, locale_2._)('Yes'), (0, locale_2._)('No'), (0, locale_2._)('Cancel')],
                        });
                        if (userAnswer === Yes)
                            return yield saveResizedImage();
                        if (userAnswer === No)
                            return yield saveOriginalImage();
                        if (userAnswer === Cancel)
                            return false;
                    }
                    else if (resizeLargeImages === 'alwaysResize') {
                        return yield saveResizedImage();
                    }
                }
                return yield saveOriginalImage();
            }
            else {
                // For the CLI tool
                const image = sharp(filePath);
                const md = yield image.metadata();
                if (md.width <= maxDim && md.height <= maxDim) {
                    shim_1.default.fsDriver().copy(filePath, targetPath);
                    return true;
                }
                return new Promise((resolve, reject) => {
                    image
                        .resize(Resource_1.default.IMAGE_MAX_DIMENSION, Resource_1.default.IMAGE_MAX_DIMENSION, {
                        fit: 'inside',
                        withoutEnlargement: true,
                    })
                        .toFile(targetPath, (error, info) => {
                        if (error) {
                            reject(error);
                        }
                        else {
                            resolve(info);
                        }
                    });
                });
            }
        });
    };
    // This is a bit of an ugly method that's used to both create a new resource
    // from a file, and update one. To update a resource, pass the
    // destinationResourceId option. This method is indirectly tested in
    // Api.test.ts.
    shim_1.default.createResourceFromPath = function (filePath, defaultProps = null, options = null) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            options = Object.assign({ resizeLargeImages: 'always', userSideValidation: false, destinationResourceId: '' }, options);
            // upgrading read-chunk to version 4.0.3 crashes
            const readChunk = (yield Promise.resolve().then(() => __importStar(require('read-chunk')))).default;
            // upgrading image-type to version 5.2.0 crashes
            const imageType = (yield Promise.resolve().then(() => __importStar(require('image-type')))).default;
            const isUpdate = !!options.destinationResourceId;
            const uuid = (yield Promise.resolve().then(() => __importStar(require('./uuid_')))).default;
            if (!(yield fs_extra_1.default.pathExists(filePath)))
                throw new Error((0, locale_2._)('Cannot access %s', filePath));
            defaultProps = defaultProps ? defaultProps : {};
            let resourceId = defaultProps.id ? defaultProps.id : uuid.create();
            if (isUpdate)
                resourceId = options.destinationResourceId;
            let resource = isUpdate ? {} : Resource_1.default.new();
            resource.id = resourceId;
            // When this is an update we auto-update the mime type, in case the
            // content type has changed, but we keep the title. It is still possible
            // to modify the title on update using defaultProps.
            resource.mime = (_a = mime_utils_1.default.fromFilename(filePath)) !== null && _a !== void 0 ? _a : '';
            if (!isUpdate)
                resource.title = (0, path_utils_1.basename)(filePath);
            let fileExt = (0, path_utils_1.safeFileExtension)((0, path_utils_1.fileExtension)(filePath));
            if (!resource.mime) {
                const buffer = yield readChunk(filePath, 0, 64);
                const detectedType = imageType(buffer);
                if (detectedType) {
                    fileExt = detectedType.ext;
                    resource.mime = detectedType.mime;
                }
                else {
                    resource.mime = 'application/octet-stream';
                }
            }
            resource.file_extension = fileExt;
            const targetPath = Resource_1.default.fullPath(resource);
            if (options.resizeLargeImages !== 'never' && resource.mime && ['image/jpeg', 'image/jpg', 'image/png'].includes(resource.mime)) {
                const ok = yield handleResizeImage_(filePath, targetPath, resource.mime, options.resizeLargeImages);
                if (!ok) {
                    console.warn('handleResizeImage_ failed with', targetPath);
                }
            }
            else {
                yield fs_extra_1.default.copy(filePath, targetPath, { overwrite: true });
            }
            // While a whole object can be passed as defaultProps, we only just
            // support the title and ID (used above). Any other prop should be
            // derived from the provided file.
            if ('title' in defaultProps)
                resource.title = defaultProps.title;
            const itDoes = yield shim_1.default.fsDriver().waitTillExists(targetPath);
            if (!itDoes)
                throw new Error(`Resource file was not created: ${targetPath}`);
            const fileStat = yield shim_1.default.fsDriver().stat(targetPath);
            if (fileStat)
                resource.size = fileStat.size;
            const saveOptions = { isNew: true };
            if (options.userSideValidation)
                saveOptions.userSideValidation = true;
            if (isUpdate) {
                saveOptions.isNew = false;
                const tempPath = `${targetPath}.tmp`;
                yield shim_1.default.fsDriver().move(targetPath, tempPath);
                resource = yield Resource_1.default.save(resource, saveOptions);
                if (resource.id)
                    yield Resource_1.default.updateResourceBlobContent(resource.id, tempPath);
                yield shim_1.default.fsDriver().remove(tempPath);
                return resource;
            }
            else {
                return Resource_1.default.save(resource, saveOptions);
            }
        });
    };
    shim_1.default.attachFileToNoteBody = function (noteBody, filePath, position = 0, options = null) {
        return __awaiter(this, void 0, void 0, function* () {
            options = Object.assign({ createFileURL: false }, options);
            const { basename } = yield Promise.resolve().then(() => __importStar(require('path')));
            const { escapeTitleText } = require('./markdownUtils').default;
            let resource = null;
            if (!options.createFileURL) {
                resource = yield shim_1.default.createResourceFromPath(filePath, null, options);
                if (!resource)
                    return '';
            }
            const newBody = [];
            if (position === 0) {
                position = noteBody ? noteBody.length : 0;
            }
            if (noteBody && position)
                newBody.push(noteBody.substring(0, position));
            if (!options.createFileURL) {
                newBody.push(Resource_1.default.markdownTag(resource));
            }
            else {
                const filename = escapeTitleText(basename(filePath)); // to get same filename as standard drag and drop
                const fileURL = `[${filename}](${(0, path_utils_1.toFileProtocolPath)(filePath)})`;
                newBody.push(fileURL);
            }
            if (noteBody)
                newBody.push(noteBody.substring(position));
            return newBody.join('\n\n');
        });
    };
    shim_1.default.attachFileToNote = function (note, filePath, position = 0, options = null) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const newBody = yield shim_1.default.attachFileToNoteBody((_a = note.body) !== null && _a !== void 0 ? _a : '', filePath, position, options);
            // if (!newBody) return null;
            const newNote = Object.assign(Object.assign({}, note), { body: newBody });
            return Note_1.default.save(newNote);
        });
    };
    shim_1.default.imageToDataUrl = (filePath, maxSize = 0) => __awaiter(this, void 0, void 0, function* () {
        if (shim_1.default.isElectron()) {
            const nativeImage = require('electron').nativeImage;
            let image = nativeImage.createFromPath(filePath);
            if (!image)
                throw new Error(`Could not load image: ${filePath}`);
            const ext = (0, path_utils_1.fileExtension)(filePath).toLowerCase();
            if (!['jpg', 'jpeg', 'png'].includes(ext))
                throw new Error(`Unsupported file format: ${ext}`);
            if (maxSize) {
                const size = image.getSize();
                if (size.width > maxSize || size.height > maxSize) {
                    console.warn(`Image is over ${maxSize}px - resizing it: ${filePath}`);
                    const options = {};
                    if (size.width > size.height) {
                        options.width = maxSize;
                    }
                    else {
                        options.height = maxSize;
                    }
                    image = image.resize(options);
                }
            }
            return image.toDataURL();
        }
        else {
            throw new Error('Unsupported method');
        }
    }),
        shim_1.default.imageFromDataUrl = function (imageDataUrl, filePath, options = null) {
            return __awaiter(this, void 0, void 0, function* () {
                if (options === null)
                    options = {};
                if (shim_1.default.isElectron()) {
                    const nativeImage = require('electron').nativeImage;
                    let image = nativeImage.createFromDataURL(imageDataUrl);
                    if (image.isEmpty())
                        throw new Error('Could not convert data URL to image - perhaps the format is not supported (eg. image/gif)'); // Would throw for example if the image format is no supported (eg. image/gif)
                    if (options.cropRect) {
                        // Crop rectangle values need to be rounded or the crop() call will fail
                        const c = options.cropRect;
                        if ('x' in c)
                            c.x = Math.round(c.x);
                        if ('y' in c)
                            c.y = Math.round(c.y);
                        if ('width' in c)
                            c.width = Math.round(c.width);
                        if ('height' in c)
                            c.height = Math.round(c.height);
                        image = image.crop(c);
                    }
                    const mime = mime_utils_1.default.fromDataUrl(imageDataUrl);
                    yield shim_1.default.writeImageToFile(image, mime, filePath);
                }
                else {
                    if (options.cropRect)
                        throw new Error('Crop rect not supported in Node');
                    const imageDataURI = require('image-data-uri');
                    const result = imageDataURI.decode(imageDataUrl);
                    yield shim_1.default.fsDriver().writeFile(filePath, result.dataBuffer, 'buffer');
                }
            });
        };
    // Not used??
    // shim.readLocalFileBase64 = (path: string) : string => {
    // 	const data = fs.readFileSync(path);
    // 	return new Buffer(data).toString('base64');
    // };
    shim_1.default.fetch = function (url, options = {}) {
        return __awaiter(this, void 0, void 0, function* () {
            try { // Check if the url is valid
                new URL(url);
            }
            catch (error) { // If the url is not valid, a TypeError will be thrown
                throw new Error(`Not a valid URL: ${url}`);
            }
            const resolvedProxyUrl = resolveProxyUrl(proxySettings.proxyUrl);
            options.agent = (resolvedProxyUrl && proxySettings.proxyEnabled) ? shim_1.default.proxyAgent(url, resolvedProxyUrl) : null;
            // upgrading node-fetch to version 3.3.2 causes crash
            const nodeFetch = require('node-fetch');
            return shim_1.default.fetchWithRetry(() => {
                return nodeFetch(url, options);
            }, options);
        });
    };
    shim_1.default.fetchBlob = function (_url, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!options || !options.path)
                throw new Error('fetchBlob: target file path is missing');
            if (!options.method)
                options.method = 'GET';
            // if (!('maxRetry' in options)) options.maxRetry = 5;
            const urlParse = require('url').parse;
            const url = typeof _url === 'string' ? urlParse(_url.trim()) : _url;
            const method = options.method ? options.method : 'GET';
            const http = url.protocol.toLowerCase() === 'http:' ? require('follow-redirects').http : require('follow-redirects').https;
            const headers = options.headers ? options.headers : {};
            const filePath = options.path;
            function makeResponse(response) {
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
                agent: (resolvedProxyUrl && proxySettings.proxyEnabled) ? shim_1.default.proxyAgent(url.href, resolvedProxyUrl) : null,
            };
            const doFetchOperation = () => __awaiter(this, void 0, void 0, function* () {
                return new Promise((resolve, reject) => {
                    let file = null;
                    const cleanUpOnError = (error) => {
                        // We ignore any unlink error as we only want to report on the main error
                        fs_extra_1.default.unlink(filePath)
                            .catch(() => { })
                            .then(() => {
                            if (file) {
                                file.close(() => {
                                    file = null;
                                    reject(error);
                                });
                            }
                            else {
                                reject(error);
                            }
                        });
                    };
                    try {
                        // Note: relative paths aren't supported
                        file = fs_extra_1.default.createWriteStream(filePath);
                        file.on('error', (error) => {
                            cleanUpOnError(error);
                        });
                        const request = http.request(requestOptions, (response) => {
                            response.pipe(file);
                            const isGzipped = response.headers['content-encoding'] === 'gzip';
                            file.on('finish', () => {
                                file.close(() => __awaiter(this, void 0, void 0, function* () {
                                    if (isGzipped) {
                                        const gzipFilePath = `${filePath}.gzip`;
                                        yield shim_1.default.fsDriver().move(filePath, gzipFilePath);
                                        try {
                                            yield gunzipFile(gzipFilePath, filePath);
                                            resolve(makeResponse(response));
                                        }
                                        catch (error) {
                                            cleanUpOnError(error);
                                        }
                                        shim_1.default.fsDriver().remove(gzipFilePath);
                                    }
                                    else {
                                        resolve(makeResponse(response));
                                    }
                                }));
                            });
                        });
                        request.on('error', (error) => {
                            cleanUpOnError(error);
                        });
                        request.end();
                    }
                    catch (error) {
                        cleanUpOnError(error);
                    }
                });
            });
            return shim_1.default.fetchWithRetry(doFetchOperation, options);
        });
    };
    shim_1.default.uploadBlob = function (url, options) {
        return __awaiter(this, void 0, void 0, function* () {
            if (!options || !options.path)
                throw new Error('uploadBlob: source file path is missing');
            const content = yield fs_extra_1.default.readFile(options.path);
            options = Object.assign(Object.assign({}, options), { body: content });
            return shim_1.default.fetch(url, options);
        });
    };
    shim_1.default.stringByteLength = function (string) {
        return Buffer.byteLength(string, 'utf-8');
    };
    shim_1.default.Buffer = Buffer;
    shim_1.default.openUrl = (url) => {
        // Returns true if it opens the file successfully; returns false if it could
        // not find the file.
        return shim_1.default.electronBridge().openExternal(url);
    };
    shim_1.default.httpAgent_ = null;
    shim_1.default.httpAgent = (url) => {
        if (!shim_1.default.httpAgent_) {
            const AgentSettings = {
                keepAlive: true,
                maxSockets: 1,
                keepAliveMsecs: 5000,
            };
            shim_1.default.httpAgent_ = {
                http: new http_1.default.Agent(AgentSettings),
                https: new https_1.default.Agent(AgentSettings),
            };
        }
        return url.startsWith('https') ? shim_1.default.httpAgent_.https : shim_1.default.httpAgent_.http;
    };
    shim_1.default.proxyAgent = (serverUrl, proxyUrl) => {
        const proxyAgentConfig = {
            keepAlive: true,
            maxSockets: proxySettings.maxConcurrentConnections,
            keepAliveMsecs: 5000,
            proxy: proxyUrl,
            timeout: proxySettings.proxyTimeout * 1000,
        };
        // Based on https://github.com/delvedor/hpagent#usage
        if (!isUrlHttps(proxyUrl) && !isUrlHttps(serverUrl)) {
            return new hpagent_1.HttpProxyAgent(proxyAgentConfig);
        }
        else if (isUrlHttps(proxyUrl) && !isUrlHttps(serverUrl)) {
            return new hpagent_1.HttpProxyAgent(proxyAgentConfig);
        }
        else if (!isUrlHttps(proxyUrl) && isUrlHttps(serverUrl)) {
            return new hpagent_1.HttpsProxyAgent(proxyAgentConfig);
        }
        else {
            return new hpagent_1.HttpsProxyAgent(proxyAgentConfig);
        }
    };
    shim_1.default.openOrCreateFile = (filepath, defaultContents) => {
        // If the file doesn't exist, create it
        if (!fs_extra_1.default.existsSync(filepath)) {
            fs_extra_1.default.writeFile(filepath, defaultContents, 'utf-8');
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
        return shim_1.default.electronBridge().openItem(filepath);
    };
    shim_1.default.waitForFrame = () => { };
    shim_1.default.appVersion = () => {
        if (appVersion)
            return appVersion;
        // Should not happen but don't throw an error because version number is
        // used in error messages.
        return 'unknown-version!';
    };
    shim_1.default.pathRelativeToCwd = (path) => {
        return toRelative(process.cwd(), path);
    };
    shim_1.default.setTimeout = (fn, interval) => {
        return timers_1.default.setTimeout(fn, interval);
    };
    shim_1.default.setInterval = (fn, interval) => {
        return timers_1.default.setInterval(fn, interval);
    };
    shim_1.default.clearTimeout = (id) => {
        timers_1.default.clearTimeout(id);
    };
    shim_1.default.clearInterval = (id) => {
        timers_1.default.clearInterval(id);
    };
    shim_1.default.keytar = () => {
        return keytar;
    };
    shim_1.default.requireDynamic = (path) => {
        if (path.indexOf('.') === 0) {
            const sites = callsites();
            if (sites) {
                if (sites.length <= 1)
                    throw new Error(`Cannot require file (1) ${path}`);
                const filename = sites[1].getFileName();
                if (!filename)
                    throw new Error(`Cannot require file (2) ${path}`);
                const fileDirName = require('path').dirname(filename);
                return require(`${fileDirName}/${path}`);
            }
        }
        else {
            return require(path);
        }
    };
}
exports.shimInit = shimInit;
//# sourceMappingURL=shim-init-node.js.map