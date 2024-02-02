import shim from './shim';
import time from './time';
import Logger from '@xilinota/utils/Logger';
import { _ } from './locale';
import XilinotaError from './XilinotaError';

const { stringify } = require('query-string');
import urlUtils from './urlUtils';
const Buffer = require('buffer').Buffer;

const logger = Logger.create('OneDriveApi');

export default class OneDriveApi {

	private clientId_: string;
	private clientSecret_: string;
	private auth_: any = null;
	private accountProperties_: any = null;
	private isPublic_: boolean;
	private listeners_: Record<string, any>;

	// `isPublic` is to tell OneDrive whether the application is a "public" one (Mobile and desktop
	// apps are considered "public"), in which case the secret should not be sent to the API.
	// In practice the React Native app is public, and the Node one is not because we
	// use a local server for the OAuth dance.
	public constructor(clientId: string, clientSecret: string, isPublic: boolean) {
		this.clientId_ = clientId;
		this.clientSecret_ = clientSecret;
		this.auth_ = null;
		this.accountProperties_ = null;
		this.isPublic_ = isPublic;
		this.listeners_ = {
			authRefreshed: [],
		};
	}

	public isPublic() {
		return this.isPublic_;
	}

	public dispatch(eventName: string, param: any) {
		const ls = this.listeners_[eventName];
		for (let i = 0; i < ls.length; i++) {
			ls[i](param);
		}
	}

	public on(eventName: string, callback: Function) {
		this.listeners_[eventName].push(callback);
	}

	public tokenBaseUrl() {
		return 'https://login.microsoftonline.com/common/oauth2/v2.0/token';
	}

	public nativeClientRedirectUrl() {
		return 'https://login.microsoftonline.com/common/oauth2/nativeclient';
	}

	public auth(): any {
		return this.auth_;
	}

	public setAuth(auth: any) {
		this.auth_ = auth;
		this.dispatch('authRefreshed', this.auth());
	}

	public token() {
		return this.auth_ ? this.auth_.access_token : null;
	}

	public clientId() {
		return this.clientId_;
	}

	public clientSecret() {
		return this.clientSecret_;
	}

	public async appDirectory() {
		const driveId = this.accountProperties_.driveId;
		const r = await this.execJson('GET', `/me/drives/${driveId}/special/approot`);
		return `${r.parentReference.path}/${r.name}`;
	}

	public authCodeUrl(redirectUri: string) {
		const query = {
			client_id: this.clientId_,
			scope: 'files.readwrite offline_access sites.readwrite.all',
			response_type: 'code',
			redirect_uri: redirectUri,
			prompt: 'login',
		};
		return `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${stringify(query)}`;
	}

	public async execTokenRequest(code: string, redirectUri: string) {
		const body: any = {};
		body['client_id'] = this.clientId();
		if (!this.isPublic()) body['client_secret'] = this.clientSecret();
		body['code'] = code;
		body['redirect_uri'] = redirectUri;
		body['grant_type'] = 'authorization_code';

		const r = await shim.fetch(this.tokenBaseUrl(), {
			method: 'POST',
			body: urlUtils.objectToQueryString(body),
			headers: {
				['Content-Type']: 'application/x-www-form-urlencoded',
			},
		});

		if (!r.ok) {
			const text = await r.text();
			throw new Error(`Could not retrieve auth code: ${r.status}: ${r.statusText}: ${text}`);
		}

		try {
			const json = await r.json();
			this.setAuth(json);
		} catch (error) {
			this.setAuth(null);
			const text = await r.text();
			if (error instanceof Error) error.message += `: ${text}`;
			throw error;
		}
	}

	public oneDriveErrorResponseToError(errorResponse: any) {
		if (!errorResponse) return new Error('Undefined error');

		if (errorResponse.error) {
			const e = errorResponse.error;
			const output: any = new Error(e.message);
			if (e.code) output.code = e.code;
			if (e.innerError) output.innerError = e.innerError;
			return output;
		} else {
			return new Error(JSON.stringify(errorResponse));
		}
	}

	public async uploadChunk(url: string, handle: any, buffer: any, options: any) {
		options = { ...options };
		if (!options.method) { options.method = 'POST'; }

		if (!options.contentLength) throw new Error('uploadChunk: contentLength is missing');
		if (!options.headers) throw new Error('uploadChunk: header is missing');

		if (buffer) {
			options.body = buffer.slice(options.startByte, options.startByte + options.contentLength);
		} else {
			const chunk = await shim.fsDriver().readFileChunk(handle, options.contentLength);
			const buffer = Buffer.from(chunk, 'base64');
			options.body = buffer;
		}

		delete options.contentLength;
		delete options.startByte;

		const response = await shim.fetch(url, options);
		return response;
	}

	public async uploadBigFile(url: string, options: any) {
		const response = await shim.fetch(url, {
			method: 'POST',
			headers: {
				'Authorization': options.headers.Authorization,
				'Content-Type': 'application/json',
			},
		});
		if (!response.ok) {
			return response;
		} else {
			const uploadUrl = (await response.json()).uploadUrl;
			const chunkSize = 7.5 * 1024 * 1024;

			let byteSize = null;
			let handle = null;
			let buffer = null;
			if (options.body) {
				byteSize = Buffer.byteLength(options.body);
				buffer = Buffer.from(options.body);
			} else {
				byteSize = (await shim.fsDriver().stat(options.path))?.size ?? 0;
				handle = await shim.fsDriver().open(options.path, 'r');
			}

			const numberOfChunks = Math.ceil(byteSize / chunkSize);

			try {
				for (let i = 0; i < numberOfChunks; i++) {
					const startByte = i * chunkSize;
					let endByte = null;
					let contentLength = null;
					if (i === numberOfChunks - 1) {
						// Last fragment. It is not ensured that the last fragment is a multiple of 327,680 bytes as recommanded in the api doc. The reasons is that the docs are out of day for this purpose: https://github.com/OneDrive/onedrive-api-docs/issues/1200#issuecomment-597281253
						endByte = byteSize - 1;
						contentLength = byteSize - ((numberOfChunks - 1) * chunkSize);
					} else {
						endByte = (i + 1) * chunkSize - 1;
						contentLength = chunkSize;
					}
					logger.debug(`Uploading File Fragment ${(startByte / 1048576).toFixed(2)} - ${(endByte / 1048576).toFixed(2)} from ${(byteSize / 1048576).toFixed(2)} Mbit ...`);
					const headers = {
						'Content-Length': contentLength,
						'Content-Range': `bytes ${startByte}-${endByte}/${byteSize}`,
						'Content-Type': 'application/octet-stream; charset=utf-8',
					};

					const response = await this.uploadChunk(uploadUrl, handle, buffer, { startByte: startByte, contentLength: contentLength, method: 'PUT', headers: headers });
					if (!response.ok) {
						return response;
					}

				}
				return { ok: true };
			} catch (error) {
				const type = (handle) ? 'Resource' : 'Note Content';
				if (error instanceof XilinotaError) logger.error(`Couldn't upload ${type} > 4 Mb. Got unhandled error:`, error ? error.code : '', error ? error.message : '', error);
				throw error;
			} finally {
				if (handle) await shim.fsDriver().close(handle);
			}

		}
	}

	public async exec(method: string, path: string, query: any = null, data: any = null, options: any = null) {
		if (!path) throw new Error('Path is required');

		method = method.toUpperCase();

		if (!options) options = {};
		if (!options.headers) options.headers = {};
		if (!options.target) options.target = 'string';

		if (method !== 'GET') {
			options.method = method;
		}

		if (method === 'PATCH' || method === 'POST') {
			options.headers['Content-Type'] = 'application/json';
			if (data) data = JSON.stringify(data);
		}

		let url = path;

		// In general, `path` contains a path relative to the base URL, but in some
		// cases the full URL is provided (for example, when it's a URL that was
		// retrieved from the API).
		if (url.indexOf('https://') !== 0) {
			const slash = path.indexOf('/') === 0 ? '' : '/';
			url = `https://graph.microsoft.com/v1.0${slash}${path}`;
		}

		if (query) {
			url += url.indexOf('?') < 0 ? '?' : '&';
			url += stringify(query);
		}

		if (data) options.body = data;

		options.timeout = 1000 * 60 * 5; // in ms

		for (let i = 0; i < 5; i++) {
			options.headers['Authorization'] = `bearer ${this.token()}`;
			options.headers['User-Agent'] = `ISV|Xilinota|Xilinota/${shim.appVersion()}`;

			const handleRequestRepeat = async (error: any, sleepSeconds: number = 0) => {
				sleepSeconds ??= (i + 1) * 5;
				logger.info(`Got error below - retrying (${i})...`);
				logger.info(error);
				await time.sleep(sleepSeconds);
			};

			let response = null;
			try {
				if (path.includes('/createUploadSession')) {
					response = await this.uploadBigFile(url, options);
				} else if (options.source === 'file' && (method === 'POST' || method === 'PUT')) {
					response = await shim.uploadBlob(url, options);
				} else if (options.target === 'string') {
					response = await shim.fetch(url, options);
				} else {
					// file
					response = await shim.fetchBlob(url, options);
				}
			} catch (error) {
				if (shim.fetchRequestCanBeRetried(error)) {
					await handleRequestRepeat(error);
					continue;
				} else {
					if (error instanceof XilinotaError) logger.error('Got unhandled error:', error ? error.code : '', error ? error.message : '', error);
					throw error;
				}
			}

			if (!response.ok) {
				const errorResponseText = await response.text();
				let errorResponse = null;

				try {
					errorResponse = JSON.parse(errorResponseText); // await response.json();
				} catch (error) {
					if (error instanceof Error) error.message = `OneDriveApi::exec: Cannot parse JSON error: ${errorResponseText} ${error.message}`;
					await handleRequestRepeat(error);
					continue;
				}

				const error = this.oneDriveErrorResponseToError(errorResponse);

				if (error.code === 'InvalidAuthenticationToken' || error.code === 'unauthenticated') {
					logger.info('Token expired: refreshing...');
					await this.refreshAccessToken();
					continue;
				} else if (error && ((error.error && error.error.code === 'generalException') || error.code === 'generalException' || error.code === 'EAGAIN')) {
					// Rare error (one Google hit) - I guess the request can be repeated
					// { error:
					//    { code: 'generalException',
					//      message: 'An error occurred in the data store.',
					//      innerError:
					//       { 'request-id': 'b4310552-c18a-45b1-bde1-68e2c2345eef',
					//         date: '2017-06-29T00:15:50' } } }

					// { FetchError: request to https://graph.microsoft.com/v1.0/drive/root:/Apps/Xilinota/.sync/7ee5dc04afcb414aa7c684bfc1edba8b.md_1499352102856 failed, reason: connect EAGAIN 65.52.64.250:443 - Local (0.0.0.0:54374)
					//   name: 'FetchError',
					//   message: 'request to https://graph.microsoft.com/v1.0/drive/root:/Apps/Xilinota/.sync/7ee5dc04afcb414aa7c684bfc1edba8b.md_1499352102856 failed, reason: connect EAGAIN 65.52.64.250:443 - Local (0.0.0.0:54374)',
					//   type: 'system',
					//   errno: 'EAGAIN',
					//   code: 'EAGAIN' }
					await handleRequestRepeat(error);
					continue;
				} else if (error && (error.code === 'resourceModified' || (error.error && error.error.code === 'resourceModified'))) {
					// NOTE: not tested, very hard to reproduce and non-informative error message, but can be repeated

					// Error: ETag does not match current item's value
					// Code: resourceModified
					// Header: {"_headers":{"cache-control":["private"],"transfer-encoding":["chunked"],"content-type":["application/json"],"request-id":["d...ea47"],"client-request-id":["d99...ea47"],"x-ms-ags-diagnostic":["{\"ServerInfo\":{\"DataCenter\":\"North Europe\",\"Slice\":\"SliceA\",\"Ring\":\"2\",\"ScaleUnit\":\"000\",\"Host\":\"AGSFE_IN_13\",\"ADSiteName\":\"DUB\"}}"],"duration":["96.9464"],"date":[],"connection":["close"]}}
					// Request: PATCH https://graph.microsoft.com/v1.0/drive/root:/Apps/XilinotaDev/f56c5601fee94b8085524513bf3e352f.md null "{\"fileSystemInfo\":{\"lastModifiedDateTime\":\"....\"}}" {"headers":{"Content-Type":"application/json","Authorization":"bearer ...

					await handleRequestRepeat(error);
					continue;
				} else if (error?.code === 'activityLimitReached' && response?.headers?._headers['retry-after'][0] && !isNaN(Number(response?.headers?._headers['retry-after'][0]))) {
					// Wait for OneDrive throttling
					// Relavent Microsoft Docs: https://docs.microsoft.com/en-us/sharepoint/dev/general-development/how-to-avoid-getting-throttled-or-blocked-in-sharepoint-online#best-practices-to-handle-throttling
					// Decrement retry count as multiple sync threads will cause repeated throttling errors - this will wait until throttling is resolved to continue, preventing a hard stop on the sync
					i--;
					const sleepSeconds = response.headers._headers['retry-after'][0];
					logger.info(`OneDrive Throttle, sync thread sleeping for ${sleepSeconds} seconds...`);
					await handleRequestRepeat(error, Number(sleepSeconds));
					continue;
				} else if (error.code === 'itemNotFound' && method === 'DELETE') {
					// Deleting a non-existing item is ok - noop
					return;
				} else {
					error.request = `${method} ${url} ${JSON.stringify(query)} ${JSON.stringify(data)} ${JSON.stringify(options)}`;
					error.headers = await response.headers;
					throw error;
				}
			}

			return response;
		}

		throw new Error(`Could not execute request after multiple attempts: ${method} ${url}`);
	}

	public setAccountProperties(accountProperties: any) {
		this.accountProperties_ = accountProperties;
	}

	public async execAccountPropertiesRequest() {

		try {
			const response = await this.exec('GET', 'https://graph.microsoft.com/v1.0/me/drive');
			const data = await response.json();
			const accountProperties = { accountType: data.driveType, driveId: data.id };
			return accountProperties;
		} catch (error) {
			if (error instanceof XilinotaError) throw new Error(`Could not retrieve account details (drive ID, Account type. Error code: ${error.code}, Error message: ${error.message}`);
			throw error;
		}
	}

	public async execJson(method: string, path: string, query: any = null, data: any = null) {
		const response = await this.exec(method, path, query, data);
		const errorResponseText = await response.text();
		try {
			const output = JSON.parse(errorResponseText); // await response.json();
			return output;
		} catch (error) {
			if (error instanceof Error) error.message = `OneDriveApi::execJson: Cannot parse JSON: ${errorResponseText} ${error.message}`;
			throw error;
			// throw new Error('Cannot parse JSON: ' + text);
		}
	}

	public async execText(method: string, path: string, query: any = null, data: any = null) {
		const response = await this.exec(method, path, query, data);
		const output = await response.text();
		return output;
	}

	public async refreshAccessToken() {
		if (!this.auth_ || !this.auth_.refresh_token) {
			this.setAuth(null);
			throw new Error(_('Cannot refresh token: authentication data is missing. Starting the synchronisation again may fix the problem.'));
		}

		const body: any = {};
		body['client_id'] = this.clientId();
		if (!this.isPublic()) body['client_secret'] = this.clientSecret();
		body['refresh_token'] = this.auth_.refresh_token;
		body['redirect_uri'] = 'http://localhost:1917';
		body['grant_type'] = 'refresh_token';

		const response = await shim.fetch(this.tokenBaseUrl(), {
			method: 'POST',
			body: urlUtils.objectToQueryString(body),
			headers: {
				['Content-Type']: 'application/x-www-form-urlencoded',
			},
		});

		if (!response.ok) {
			this.setAuth(null);
			const msg = await response.text();
			throw new Error(`${msg}: TOKEN: ${this.auth_}`);
		}

		const auth = await response.json();
		this.setAuth(auth);
	}
}
