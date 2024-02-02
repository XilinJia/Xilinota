import { MasterKeyEntity } from './types';
import Logger from '@xilinota/utils/Logger';
import shim from '../../shim';
import Setting from '../../models/Setting';
import MasterKey from '../../models/MasterKey';
import BaseItem from '../../models/BaseItem';
import XilinotaError from '../../XilinotaError';
import { getActiveMasterKeyId, setActiveMasterKeyId } from '../synchronizer/syncInfoUtils';
import { padLeft } from '../../string-utils';

const logger = Logger.create('EncryptionService');

function hexPad(s: string, length: number) {
	return padLeft(s, length, '0');
}

export function isValidHeaderIdentifier(id: string, ignoreTooLongLength = false) {
	if (!id) return false;
	if (!ignoreTooLongLength && id.length !== 5) return false;
	return /JED\d\d/.test(id);
}

interface DecryptedMasterKey {
	updatedTime: number;
	plainText: string;
}

export interface EncryptionCustomHandler {
	context?: any;
	encrypt(context: any, hexaBytes: string, password: string): Promise<string>;
	decrypt(context: any, hexaBytes: string, password: string): Promise<string>;
}

export enum EncryptionMethod {
	SJCL = 1,
	SJCL2 = 2,
	SJCL3 = 3,
	SJCL4 = 4,
	SJCL1a = 5,
	Custom = 6,
	SJCL1b = 7,
}

export interface EncryptOptions {
	encryptionMethod?: EncryptionMethod;
	onProgress?: Function;
	encryptionHandler?: EncryptionCustomHandler;
	masterKeyId?: string;
}

interface Reader {
	handle: any;
	read: Function;
	close: Function;
}

interface Writer {
	append: Function;
	close: Function;
}

export default class EncryptionService {

	public static instance_: EncryptionService | null = null;

	public static fsDriver_: any = null;

	// Note: 1 MB is very slow with Node and probably even worse on mobile.
	//
	// On mobile the time it takes to decrypt increases exponentially for some reason, so it's important
	// to have a relatively small size so as not to freeze the app. For example, on Android 7.1 simulator
	// with 4.1 GB RAM, it takes this much to decrypt a block;
	//
	// 50KB => 1000 ms
	// 25KB => 250ms
	// 10KB => 200ms
	// 5KB => 10ms
	//
	// So making the block 10 times smaller make it 100 times faster! So for now using 5KB. This can be
	// changed easily since the chunk size is incorporated into the encrypted data.
	private chunkSize_ = 5000;
	private decryptedMasterKeys_: Record<string, DecryptedMasterKey> = {};
	public defaultEncryptionMethod_ = EncryptionMethod.SJCL1a; // public because used in tests
	private defaultMasterKeyEncryptionMethod_ = EncryptionMethod.SJCL4;

	private headerTemplates_ = {
		// Template version 1
		1: {
			// Fields are defined as [name, valueSize, valueType]
			fields: [['encryptionMethod', 2, 'int'], ['masterKeyId', 32, 'hex']],
		},
	};

	public static instance() {
		if (this.instance_) return this.instance_;
		this.instance_ = new EncryptionService();
		return this.instance_;
	}

	public get defaultMasterKeyEncryptionMethod() {
		return this.defaultMasterKeyEncryptionMethod_;
	}

	public loadedMasterKeysCount() {
		return Object.keys(this.decryptedMasterKeys_).length;
	}

	public chunkSize() {
		return this.chunkSize_;
	}

	public defaultEncryptionMethod() {
		return this.defaultEncryptionMethod_;
	}

	public setActiveMasterKeyId(id: string) {
		setActiveMasterKeyId(id);
	}

	public activeMasterKeyId() {
		const id = getActiveMasterKeyId();
		if (!id) {
			const error: any = new Error('No master key is defined as active. Check this: Either one or more master keys exist but no password was provided for any of them. Or no master key exist. Or master keys and password exist, but none was set as active.');
			error.code = 'noActiveMasterKey';
			throw error;
		}
		return id;
	}

	public isMasterKeyLoaded(masterKey: MasterKeyEntity) {
		if (!masterKey.id) return false;
		const d = this.decryptedMasterKeys_[masterKey.id];
		if (!d) return false;
		return d.updatedTime === masterKey.updated_time;
	}

	public async loadMasterKey(model: MasterKeyEntity, password: string, makeActive = false) {
		if (!model.id) throw new Error('Master key does not have an ID - save it first');

		logger.info(`Loading master key: ${model.id}. Make active:`, makeActive);

		this.decryptedMasterKeys_[model.id] = {
			plainText: await this.decryptMasterKeyContent(model, password),
			updatedTime: model.updated_time ?? 0,
		};

		if (makeActive) this.setActiveMasterKeyId(model.id);
	}

	public unloadMasterKey(model: MasterKeyEntity) {
		if (model.id) delete this.decryptedMasterKeys_[model.id];
	}

	public loadedMasterKey(id: string) {
		if (!this.decryptedMasterKeys_[id]) {
			const error: any = new Error(`Master key is not loaded: ${id}`);
			error.code = 'masterKeyNotLoaded';
			error.masterKeyId = id;
			throw error;
		}
		return this.decryptedMasterKeys_[id];
	}

	public loadedMasterKeyIds() {
		return Object.keys(this.decryptedMasterKeys_);
	}

	public fsDriver() {
		if (!EncryptionService.fsDriver_) throw new Error('EncryptionService.fsDriver_ not set!');
		return EncryptionService.fsDriver_;
	}

	public sha256(string: string) {
		const sjcl = shim.sjclModule;
		const bitArray = sjcl.hash.sha256.hash(string);
		return sjcl.codec.hex.fromBits(bitArray);
	}

	public async generateApiToken() {
		return await this.randomHexString(64);
	}

	private async randomHexString(byteCount: number) {
		const bytes: any[] = await shim.randomBytes(byteCount);
		return bytes
			.map(a => {
				return hexPad(a.toString(16), 2);
			})
			.join('');
	}

	public masterKeysThatNeedUpgrading(masterKeys: MasterKeyEntity[]) {
		return MasterKey.allWithoutEncryptionMethod(masterKeys, [this.defaultMasterKeyEncryptionMethod_, EncryptionMethod.Custom]);
	}

	public async reencryptMasterKey(model: MasterKeyEntity, decryptionPassword: string, encryptionPassword: string, decryptOptions: EncryptOptions = {}, encryptOptions: EncryptOptions = {}): Promise<MasterKeyEntity> {
		const newEncryptionMethod = this.defaultMasterKeyEncryptionMethod_;
		const plainText = await this.decryptMasterKeyContent(model, decryptionPassword, decryptOptions);
		const newContent = await this.encryptMasterKeyContent(newEncryptionMethod, plainText, encryptionPassword, encryptOptions);
		return { ...model, ...newContent };
	}

	public async encryptMasterKeyContent(encryptionMethod: EncryptionMethod | null, hexaBytes: string, password: string, options: EncryptOptions = {}): Promise<MasterKeyEntity> {
		options = { ...options };

		if (encryptionMethod === null) encryptionMethod = this.defaultMasterKeyEncryptionMethod_;

		if (options.encryptionHandler) {
			return {
				checksum: '',
				encryption_method: EncryptionMethod.Custom,
				content: await options.encryptionHandler.encrypt(options.encryptionHandler.context, hexaBytes, password),
			};
		} else {
			return {
				// Checksum is not necessary since decryption will already fail if data is invalid
				checksum: encryptionMethod === EncryptionMethod.SJCL2 ? this.sha256(hexaBytes) : '',
				encryption_method: encryptionMethod,
				content: await this.encrypt(encryptionMethod, password, hexaBytes),
			};
		}
	}

	private async generateMasterKeyContent_(password: string, options: EncryptOptions = {}) {
		options = { encryptionMethod: this.defaultMasterKeyEncryptionMethod_, ...options };
		if (!options.encryptionMethod) {
			logger.error('generateMasterKeyContent_ encryptionMethod undefined, assuming SJCL')
			options.encryptionMethod = EncryptionMethod.SJCL
		}

		const bytes: any[] = await shim.randomBytes(256);
		const hexaBytes = bytes.map(a => hexPad(a.toString(16), 2)).join('');

		return this.encryptMasterKeyContent(options.encryptionMethod, hexaBytes, password, options);
	}

	public async generateMasterKey(password: string, options: EncryptOptions = {}) {
		const model = await this.generateMasterKeyContent_(password, options);

		const now = Date.now();
		model.created_time = now;
		model.updated_time = now;
		model.source_application = Setting.value('appId');
		model.hasBeenUsed = false;

		return model;
	}

	public async decryptMasterKeyContent(model: MasterKeyEntity, password: string, options: EncryptOptions = {}): Promise<string> {

		if (model.encryption_method === EncryptionMethod.Custom) {
			if (!options.encryptionHandler) throw new Error('Master key was encrypted using a custom method, but no encryptionHandler is provided');
			return options.encryptionHandler.decrypt(options.encryptionHandler.context, model.content ?? '', password);
		}

		const plainText = await this.decrypt(model.encryption_method ?? 0, password, model.content ?? '');
		if (model.encryption_method === EncryptionMethod.SJCL2) {
			const checksum = this.sha256(plainText);
			if (checksum !== model.checksum) throw new Error('Could not decrypt master key (checksum failed)');
		}

		return plainText;
	}

	public async checkMasterKeyPassword(model: MasterKeyEntity, password: string) {
		try {
			await this.decryptMasterKeyContent(model, password);
		} catch (error) {
			return false;
		}

		return true;
	}

	private wrapSjclError(sjclError: any) {
		const error = new Error(sjclError.message);
		error.stack = sjclError.stack;
		return error;
	}

	public async encrypt(method: EncryptionMethod, key: string, plainText: string): Promise<string> {
		if (!method) throw new Error('Encryption method is required');
		if (!key) throw new Error('Encryption key is required');

		const sjcl = shim.sjclModule;

		const handlers: Record<EncryptionMethod, () => string> = {
			// 2020-01-23: Deprecated and no longer secure due to the use og OCB2 mode - do not use.
			[EncryptionMethod.SJCL]: () => {
				try {
					// Good demo to understand each parameter: https://bitwiseshiftleft.github.io/sjcl/demo/
					return sjcl.json.encrypt(key, plainText, {
						v: 1, // version
						iter: 1000, // Defaults to 1000 in sjcl but since we're running this on mobile devices, use a lower value. Maybe review this after some time. https://security.stackexchange.com/questions/3959/recommended-of-iterations-when-using-pkbdf2-sha256
						ks: 128, // Key size - "128 bits should be secure enough"
						ts: 64, // ???
						mode: 'ocb2', //  The cipher mode is a standard for how to use AES and other algorithms to encrypt and authenticate your message. OCB2 mode is slightly faster and has more features, but CCM mode has wider support because it is not patented.
						// "adata":"", // Associated Data - not needed?
						cipher: 'aes',
					});
				} catch (error) {
					throw this.wrapSjclError(error);
				}
			},

			// 2020-03-06: Added method to fix https://github.com/XilinJia/Xilinota/issues/2591
			//             Also took the opportunity to change number of key derivations, per Isaac Potoczny's suggestion
			// 2023-06-10: Deprecated in favour of SJCL1b
			[EncryptionMethod.SJCL1a]: () => {
				try {
					// We need to escape the data because SJCL uses encodeURIComponent to process the data and it only
					// accepts UTF-8 data, or else it throws an error. And the notes might occasionally contain
					// invalid UTF-8 data. Fixes https://github.com/XilinJia/Xilinota/issues/2591
					return sjcl.json.encrypt(key, escape(plainText), {
						v: 1, // version
						iter: 101, // Since the master key already uses key derivations and is secure, additional iteration here aren't necessary, which will make decryption faster. SJCL enforces an iter strictly greater than 100
						ks: 128, // Key size - "128 bits should be secure enough"
						ts: 64, // ???
						mode: 'ccm', //  The cipher mode is a standard for how to use AES and other algorithms to encrypt and authenticate your message. OCB2 mode is slightly faster and has more features, but CCM mode has wider support because it is not patented.
						// "adata":"", // Associated Data - not needed?
						cipher: 'aes',
					});
				} catch (error) {
					throw this.wrapSjclError(error);
				}
			},

			// 2023-06-10: Changed AES-128 to AES-256 per TheQuantumPhysicist's suggestions
			// https://github.com/XilinJia/Xilinota/issues/7686
			[EncryptionMethod.SJCL1b]: () => {
				try {
					// We need to escape the data because SJCL uses encodeURIComponent to process the data and it only
					// accepts UTF-8 data, or else it throws an error. And the notes might occasionally contain
					// invalid UTF-8 data. Fixes https://github.com/XilinJia/Xilinota/issues/2591
					return sjcl.json.encrypt(key, escape(plainText), {
						v: 1, // version
						iter: 101, // Since the master key already uses key derivations and is secure, additional iteration here aren't necessary, which will make decryption faster. SJCL enforces an iter strictly greater than 100
						ks: 256, // Key size - "256-bit is the golden standard that we should follow."
						ts: 64, // ???
						mode: 'ccm', //  The cipher mode is a standard for how to use AES and other algorithms to encrypt and authenticate your message. OCB2 mode is slightly faster and has more features, but CCM mode has wider support because it is not patented.
						// "adata":"", // Associated Data - not needed?
						cipher: 'aes',
					});
				} catch (error) {
					throw this.wrapSjclError(error);
				}
			},

			// 2020-01-23: Deprecated - see above.
			// Was used to encrypt master keys
			[EncryptionMethod.SJCL2]: () => {
				try {
					return sjcl.json.encrypt(key, plainText, {
						v: 1,
						iter: 10000,
						ks: 256,
						ts: 64,
						mode: 'ocb2',
						cipher: 'aes',
					});
				} catch (error) {
					throw this.wrapSjclError(error);
				}
			},

			// Don't know why we have this - it's not used anywhere. It must be
			// kept however, in case some note somewhere is encrypted using this
			// method.
			[EncryptionMethod.SJCL3]: () => {
				try {
					// Good demo to understand each parameter: https://bitwiseshiftleft.github.io/sjcl/demo/
					return sjcl.json.encrypt(key, plainText, {
						v: 1, // version
						iter: 1000, // Defaults to 1000 in sjcl. Since we're running this on mobile devices we need to be careful it doesn't affect performances too much. Maybe review this after some time. https://security.stackexchange.com/questions/3959/recommended-of-iterations-when-using-pkbdf2-sha256
						ks: 128, // Key size - "128 bits should be secure enough"
						ts: 64, // ???
						mode: 'ccm', //  The cipher mode is a standard for how to use AES and other algorithms to encrypt and authenticate your message. OCB2 mode is slightly faster and has more features, but CCM mode has wider support because it is not patented.
						// "adata":"", // Associated Data - not needed?
						cipher: 'aes',
					});
				} catch (error) {
					throw this.wrapSjclError(error);
				}
			},

			// Same as above but more secure (but slower) to encrypt master keys
			[EncryptionMethod.SJCL4]: () => {
				try {
					return sjcl.json.encrypt(key, plainText, {
						v: 1,
						iter: 10000,
						ks: 256,
						ts: 64,
						mode: 'ccm',
						cipher: 'aes',
					});
				} catch (error) {
					throw this.wrapSjclError(error);
				}
			},

			[EncryptionMethod.Custom]: () => {
				// This is handled elsewhere but as a sanity check, throw an exception
				throw new Error('Custom encryption method is not supported here');
			},
		};

		return handlers[method]();
	}

	public async decrypt(method: EncryptionMethod, key: string, cipherText: string) {
		if (!method) throw new Error('Encryption method is required');
		if (!key) throw new Error('Encryption key is required');

		const sjcl = shim.sjclModule;
		if (!this.isValidEncryptionMethod(method)) throw new Error(`Unknown decryption method: ${method}`);

		try {
			const output = sjcl.json.decrypt(key, cipherText);

			if (method === EncryptionMethod.SJCL1a || method === EncryptionMethod.SJCL1b) {
				return unescape(output);
			} else {
				return output;
			}
		} catch (error) {
			// SJCL returns a string as error which means stack trace is missing so convert to an error object here
			throw new Error((error as Error).message);
		}
	}

	private async encryptAbstract_(source: any, destination: any, options: EncryptOptions = {}) {
		options = { encryptionMethod: this.defaultEncryptionMethod(), ...options };
		if (!options.encryptionMethod) {
			logger.error('encryptAbstract_ encryptionMethod undefined, assuming SJCL')
			options.encryptionMethod = EncryptionMethod.SJCL
		}

		const method = options.encryptionMethod;
		const masterKeyId = options.masterKeyId ? options.masterKeyId : this.activeMasterKeyId();
		const masterKeyPlainText = this.loadedMasterKey(masterKeyId).plainText;

		const header = {
			encryptionMethod: method,
			masterKeyId: masterKeyId,
		};

		await destination.append(this.encodeHeader_(header));

		let doneSize = 0;

		while (true) {
			const block = await source.read(this.chunkSize_);
			if (!block) break;

			doneSize += this.chunkSize_;
			if (options.onProgress) options.onProgress({ doneSize: doneSize });

			// Wait for a frame so that the app remains responsive in mobile.
			// https://corbt.com/posts/2015/12/22/breaking-up-heavy-processing-in-react-native.html
			await shim.waitForFrame();

			const encrypted = await this.encrypt(method, masterKeyPlainText, block);

			await destination.append(padLeft(encrypted.length.toString(16), 6, '0'));
			await destination.append(encrypted);
		}
	}

	private async decryptAbstract_(source: any, destination: any, options: EncryptOptions = {}) {

		const header: any = await this.decodeHeaderSource_(source);
		const masterKeyPlainText = this.loadedMasterKey(header.masterKeyId).plainText;

		let doneSize = 0;

		while (true) {
			const lengthHex = await source.read(6);
			if (!lengthHex) break;
			if (lengthHex.length !== 6) throw new Error(`Invalid block size: ${lengthHex}`);
			const length = parseInt(lengthHex, 16);
			if (!length) continue; // Weird but could be not completely invalid (block of size 0) so continue decrypting

			doneSize += length;
			if (options.onProgress) options.onProgress({ doneSize: doneSize });

			await shim.waitForFrame();

			const block = await source.read(length);

			const plainText = await this.decrypt(header.encryptionMethod, masterKeyPlainText, block);
			await destination.append(plainText);
		}
	}

	private stringReader_(string: string, sync = false) {
		const reader = {
			index: 0,
			read: function(size: number) {
				const output = string.substring(reader.index, size);
				reader.index += size;
				return !sync ? Promise.resolve(output) : output;
			},
			close: function() { },
		};
		return reader;
	}

	private stringWriter_() {
		const output: any = {
			data: [],
			append: async function(data: any) {
				output.data.push(data);
			},
			result: function() {
				return output.data.join('');
			},
			close: function() { },
		};
		return output;
	}

	private async fileReader_(path: string, encoding: any) {
		const handle = await this.fsDriver().open(path, 'r');
		const reader: Reader = {
			handle: handle,
			read: async (size: number) => {
				return this.fsDriver().readFileChunk(reader.handle, size, encoding);
			},
			close: async () => {
				await this.fsDriver().close(reader.handle);
			},
		};
		return reader;
	}

	private async fileWriter_(path: string, encoding: any) {
		const writer: Writer = {
			append: async (data: any) => {
				return this.fsDriver().appendFile(path, data, encoding);
			},
			close: function() { },
		};
		return writer;
	}

	public async encryptString(plainText: any, options: EncryptOptions = {}): Promise<string> {
		const source = this.stringReader_(plainText);
		const destination = this.stringWriter_();
		await this.encryptAbstract_(source, destination, options);
		return destination.result();
	}

	public async decryptString(cipherText: any, options: EncryptOptions = {}): Promise<string> {
		const source = this.stringReader_(cipherText);
		const destination = this.stringWriter_();
		await this.decryptAbstract_(source, destination, options);
		return destination.data.join('');
	}

	public async encryptFile(srcPath: string, destPath: string, options: EncryptOptions = {}) {
		let source: Reader | null = await this.fileReader_(srcPath, 'base64');
		let destination: Writer | null = await this.fileWriter_(destPath, 'ascii');

		const cleanUp = async () => {
			if (source) await source.close();
			if (destination) await destination.close();

			source = null;

			destination = null;
		};

		try {
			await this.fsDriver().unlink(destPath);
			await this.encryptAbstract_(source, destination, options);
		} catch (error) {
			await cleanUp();
			await this.fsDriver().unlink(destPath);
			throw error;
		}

		await cleanUp();
	}

	public async decryptFile(srcPath: string, destPath: string, options: EncryptOptions = {}) {
		let source: Reader | null = await this.fileReader_(srcPath, 'ascii');
		let destination: Writer | null = await this.fileWriter_(destPath, 'base64');

		const cleanUp = async () => {
			if (source) await source.close();
			if (destination) await destination.close();

			source = null;

			destination = null;
		};

		try {
			await this.fsDriver().unlink(destPath);
			await this.decryptAbstract_(source, destination, options);
		} catch (error) {
			await cleanUp();
			await this.fsDriver().unlink(destPath);
			throw error;
		}

		await cleanUp();
	}

	public headerTemplate(version: number) {
		const r = (this.headerTemplates_ as any)[version];
		if (!r) throw new Error(`Unknown header version: ${version}`);
		return r;
	}

	public encodeHeader_(header: any) {
		// Sanity check
		if (header.masterKeyId.length !== 32) throw new Error(`Invalid master key ID size: ${header.masterKeyId}`);

		let encryptionMetadata = '';
		encryptionMetadata += padLeft(header.encryptionMethod.toString(16), 2, '0');
		encryptionMetadata += header.masterKeyId;
		encryptionMetadata = padLeft(encryptionMetadata.length.toString(16), 6, '0') + encryptionMetadata;
		return `JED01${encryptionMetadata}`;
	}

	public async decodeHeaderString(cipherText: any) {
		const source = this.stringReader_(cipherText);
		return this.decodeHeaderSource_(source);
	}

	private async decodeHeaderSource_(source: any) {
		const identifier = await source.read(5);
		if (!isValidHeaderIdentifier(identifier)) throw new XilinotaError(`Invalid encryption identifier. Data is not actually encrypted? ID was: ${identifier}`, 'invalidIdentifier');
		const mdSizeHex = await source.read(6);
		const mdSize = parseInt(mdSizeHex, 16);
		if (isNaN(mdSize) || !mdSize) throw new Error(`Invalid header metadata size: ${mdSizeHex}`);
		const md = await source.read(parseInt(mdSizeHex, 16));
		return this.decodeHeaderBytes_(identifier + mdSizeHex + md);
	}

	public decodeHeaderBytes_(headerHexaBytes: any) {
		const reader: any = this.stringReader_(headerHexaBytes, true);
		const identifier = reader.read(3);
		const version = parseInt(reader.read(2), 16);
		if (identifier !== 'JED') throw new Error(`Invalid header (missing identifier): ${headerHexaBytes.substring(0, 64)}`);
		const template = this.headerTemplate(version);

		parseInt(reader.read(6), 16); // Read the size and move the reader pointer forward

		const output: any = {};

		for (let i = 0; i < template.fields.length; i++) {
			const m = template.fields[i];
			const name = m[0];
			const size = m[1];
			const type = m[2];
			let v = reader.read(size);

			if (type === 'int') {
				v = parseInt(v, 16);
			} else if (type === 'hex') {
				// Already in hexa
			} else {
				throw new Error(`Invalid type: ${type}`);
			}

			output[name] = v;
		}

		return output;
	}

	public isValidEncryptionMethod(method: EncryptionMethod) {
		return [EncryptionMethod.SJCL, EncryptionMethod.SJCL1a, EncryptionMethod.SJCL1b, EncryptionMethod.SJCL2, EncryptionMethod.SJCL3, EncryptionMethod.SJCL4].indexOf(method) >= 0;
	}

	public async itemIsEncrypted(item: any) {
		if (!item) throw new Error('No item');
		const ItemClass = BaseItem.itemClass(item);
		if (!ItemClass.encryptionSupported()) return false;
		return item.encryption_applied && isValidHeaderIdentifier(item.encryption_cipher_text, true);
	}

	public async fileIsEncrypted(path: string) {
		const handle = await this.fsDriver().open(path, 'r');
		const headerIdentifier = await this.fsDriver().readFileChunk(handle, 5, 'ascii');
		await this.fsDriver().close(handle);
		return isValidHeaderIdentifier(headerIdentifier);
	}
}
