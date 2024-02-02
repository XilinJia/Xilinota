import BaseModel, { ModelType } from '../BaseModel';
import BaseItem from './BaseItem';
import ItemChange from './ItemChange';
import NoteResource from './NoteResource';
import Setting from './Setting';
import markdownUtils from '../markdownUtils';
import { _ } from '../locale';
import { ResourceEntity, ResourceLocalStateEntity } from '../services/database/types';
import ResourceLocalState from './ResourceLocalState';
import mimeUtils from '../mime-utils';
import { filename, safeFilename } from '../path-utils';
// import FsDriverDummy from '../fs-driver-dummy';
import XilinotaError from '../XilinotaError';
import itemCanBeEncrypted from './utils/itemCanBeEncrypted';
import { getEncryptionEnabled } from '../services/synchronizer/syncInfoUtils';
import ShareService from '../services/share/ShareService';
import { SaveOptions } from './utils/types';
import EncryptionService from '../services/e2ee/EncryptionService';
import { Row } from '../database';
import { dirname, fileExtension, friendlySafeFilename, safeFileExtension } from '../path-utils';
import FsDriverBase from '../fs-driver-base';

export default class Resource extends BaseItem {

	public static IMAGE_MAX_DIMENSION = 1920;

	public static FETCH_STATUS_IDLE = 0;
	public static FETCH_STATUS_STARTED = 1;
	public static FETCH_STATUS_DONE = 2;
	public static FETCH_STATUS_ERROR = 3;

	public static shareService_: ShareService | null = null;

	public static fsDriver_: FsDriverBase;

	public static tableName(): string {
		return 'resources';
	}

	public static modelType(): ModelType {
		return BaseModel.TYPE_RESOURCE;
	}

	public static encryptionService(): EncryptionService {
		if (!this.encryptionService_) throw new Error('Resource.encryptionService_ is not set!!');
		return this.encryptionService_;
	}

	protected static shareService(): ShareService {
		if (!this.shareService_) throw new Error('Resource.shareService_ is not set!!');
		return this.shareService_;
	}

	public static isSupportedImageMimeType(type: string): boolean {
		const imageMimeTypes = ['image/jpg', 'image/jpeg', 'image/png', 'image/gif', 'image/svg+xml', 'image/webp', 'image/avif'];
		return imageMimeTypes.indexOf(type.toLowerCase()) >= 0;
	}

	public static fetchStatuses(resourceIds: string[]): Promise<Row[]> {
		if (!resourceIds.length) return Promise.resolve([]);
		return this.db().selectAll(`SELECT resource_id, fetch_status FROM resource_local_states WHERE resource_id IN ("${resourceIds.join('","')}")`);
	}

	public static sharedResourceIds(): Promise<string[]> {
		return this.db().selectAllFields('SELECT id FROM resources WHERE is_shared = 1', [], 'id');
	}

	public static errorFetchStatuses(): Promise<Row[]> {
		return this.db().selectAll(`
			SELECT title AS resource_title, resource_id, fetch_error
			FROM resource_local_states
			LEFT JOIN resources ON resources.id = resource_local_states.resource_id
			WHERE fetch_status = ?
		`, [Resource.FETCH_STATUS_ERROR]);
	}

	public static needToBeFetched(resourceDownloadMode: string = '', limit: number = 0): Promise<ResourceEntity[]> {
		const sql = ['SELECT * FROM resources WHERE encryption_applied = 0 AND id IN (SELECT resource_id FROM resource_local_states WHERE fetch_status = ?)'];
		if (resourceDownloadMode !== 'always') {
			sql.push('AND resources.id IN (SELECT resource_id FROM resources_to_download)');
		}
		sql.push('ORDER BY updated_time DESC');
		if (limit) sql.push(`LIMIT ${limit}`);
		return this.modelSelectAll(sql.join(' '), [Resource.FETCH_STATUS_IDLE]);
	}

	public static async resetStartedFetchStatus() {
		return await this.db().exec('UPDATE resource_local_states SET fetch_status = ? WHERE fetch_status = ?', [Resource.FETCH_STATUS_IDLE, Resource.FETCH_STATUS_STARTED]);
	}

	public static resetErrorStatus(resourceId: string) {
		return this.db().exec('UPDATE resource_local_states SET fetch_status = ?, fetch_error = "" WHERE resource_id = ?', [Resource.FETCH_STATUS_IDLE, resourceId]);
	}

	public static fsDriver() {
		if (!Resource.fsDriver_) Resource.fsDriver_ = new FsDriverBase();
		return Resource.fsDriver_;
	}

	// DEPRECATED IN FAVOUR OF friendlySafeFilename()
	public static friendlyFilename(resource: ResourceEntity): string {
		let output = safeFilename(resource.title ?? ''); // Make sure not to allow spaces or any special characters as it's not supported in HTTP headers
		if (!output) output = resource.id ?? '';
		let extension = resource.file_extension;
		if (!extension) extension = resource.mime ? mimeUtils.toFileExtension(resource.mime) ?? '' : '';
		extension = extension ? `.${extension}` : '';
		return output + extension;
	}

	public static baseDirectoryPath(): string {
		return Setting.value('resourceDir');
	}

	public static baseRelativeDirectoryPath(): string {
		return Setting.value('resourceDirName');
	}

	public static filename(resource: ResourceEntity, encryptedBlob = false): string {
		let extension = encryptedBlob ? 'crypted' : resource.file_extension;
		if (!extension) extension = resource.mime ? mimeUtils.toFileExtension(resource.mime) ?? '' : '';
		extension = extension ? `.${extension}` : '';
		return resource.id + extension;
	}

	public static friendlySafeFilename(resource: ResourceEntity): string {
		let ext = resource.file_extension;
		if (!ext) ext = resource.mime ? mimeUtils.toFileExtension(resource.mime) ?? '' : '';
		const safeExt = ext ? safeFileExtension(ext).toLowerCase() : '';
		let title = resource.title ? resource.title : resource.id;
		if (safeExt && title && fileExtension(title).toLowerCase() === safeExt) title = filename(title);
		return friendlySafeFilename(title ?? '') + (safeExt ? `.${safeExt}` : '');
	}

	public static relativePath(resource: ResourceEntity, encryptedBlob = false): string {
		return `${Setting.value('resourceDirName')}/${this.filename(resource, encryptedBlob)}`;
	}

	public static fullPath(resource: ResourceEntity, encryptedBlob = false): string {
		return `${Setting.value('resourceDir')}/${this.filename(resource, encryptedBlob)}`;
	}

	public static async isReady(resource: ResourceEntity): Promise<boolean> {
		const r = await this.readyStatus(resource);
		return r === 'ok';
	}

	public static async readyStatus(resource: ResourceEntity): Promise<"notFound" | "notDownloaded" | "encrypted" | "ok"> {
		const ls = await this.localState(resource);
		if (!resource) return 'notFound';
		if (ls.fetch_status !== Resource.FETCH_STATUS_DONE) return 'notDownloaded';
		if (resource.encryption_blob_encrypted) return 'encrypted';
		return 'ok';
	}

	public static async requireIsReady(resource: ResourceEntity): Promise<void> {
		const readyStatus = await Resource.readyStatus(resource);
		if (readyStatus !== 'ok') throw new Error(`Resource is not ready. Status: ${readyStatus}`);
	}

	// For resources, we need to decrypt the item (metadata) and the resource binary blob.
	public static async decrypt(item: ResourceEntity): Promise<ResourceEntity> {
		// The item might already be decrypted but not the blob (for instance if it crashes while
		// decrypting the blob or was otherwise interrupted).
		const decryptedItem = item.encryption_cipher_text ? await super.decrypt(item) : { ...item };
		if (!decryptedItem.encryption_blob_encrypted) return decryptedItem;

		const localState = await this.localState(item);
		if (localState.fetch_status !== Resource.FETCH_STATUS_DONE) {
			// Not an error - it means the blob has not been downloaded yet.
			// It will be decrypted later on, once downloaded.
			return decryptedItem;
		}

		const plainTextPath = this.fullPath(decryptedItem);
		const encryptedPath = this.fullPath(decryptedItem, true);
		const noExtPath = `${dirname(encryptedPath)}/${filename(encryptedPath)}`;

		// When the resource blob is downloaded by the synchroniser, it's initially a file with no
		// extension (since it's encrypted, so we don't know its extension). So here rename it
		// to a file with a ".crypted" extension so that it's better identified, and then decrypt it.
		// Potentially plainTextPath is also a path with no extension if it's an unknown mime type.
		if (await this.fsDriver().exists(noExtPath)) {
			await this.fsDriver().move(noExtPath, encryptedPath);
		}

		try {
			await this.encryptionService().decryptFile(encryptedPath, plainTextPath);
		} catch (error) {
			if (error instanceof XilinotaError && error.code === 'invalidIdentifier') {
				// As the identifier is invalid it most likely means that this is not encrypted data
				// at all. It can happen for example when there's a crash between the moment the data
				// is decrypted and the resource item is updated.
				this.logger().warn(`Found a resource that was most likely already decrypted but was marked as encrypted. Marked it as decrypted: ${item.id}`);
				this.fsDriver().move(encryptedPath, plainTextPath);
			} else {
				throw error;
			}
		}

		decryptedItem.encryption_blob_encrypted = 0;
		return super.save(decryptedItem, { autoTimestamp: false });
	}

	// Prepare the resource by encrypting it if needed.
	// The call returns the path to the physical file AND a representation of the resource object
	// as it should be uploaded to the sync target. Note that this may be different from what is stored
	// in the database. In particular, the flag encryption_blob_encrypted might be 1 on the sync target
	// if the resource is encrypted, but will be 0 locally because the device has the decrypted resource.
	public static async fullPathForSyncUpload(resource: ResourceEntity): Promise<{ path: string; resource: ResourceEntity; }> {
		const plainTextPath = this.fullPath(resource);

		const share = resource.share_id ? await this.shareService().shareById(resource.share_id) : null;

		if (!getEncryptionEnabled() || !share || !itemCanBeEncrypted(resource as any, share)) {
			// Normally not possible since itemsThatNeedSync should only return decrypted items
			if (resource.encryption_blob_encrypted) throw new Error('Trying to access encrypted resource but encryption is currently disabled');
			return { path: plainTextPath, resource: resource };
		}

		const encryptedPath = this.fullPath(resource, true);
		if (resource.encryption_blob_encrypted) return { path: encryptedPath, resource: resource };

		try {
			await this.encryptionService().encryptFile(plainTextPath, encryptedPath, {
				masterKeyId: share && share.master_key_id ? share.master_key_id : '',
			});
		} catch (error) {
			if ((error as any).code === 'ENOENT') throw new XilinotaError(`File not found:${(error as any).toString()}`, 'fileNotFound');
			throw error;
		}

		const resourceCopy = { ...resource };
		resourceCopy.encryption_blob_encrypted = 1;
		return { path: encryptedPath, resource: resourceCopy };
	}

	public static markdownTag(resource: any): string {
		let tagAlt = resource.alt ? resource.alt : resource.title;
		if (!tagAlt) tagAlt = '';
		const lines = [];
		if (Resource.isSupportedImageMimeType(resource.mime)) {
			lines.push('![');
			lines.push(markdownUtils.escapeTitleText(tagAlt));
			lines.push(`](:/${resource.id})`);
		} else {
			lines.push('[');
			lines.push(markdownUtils.escapeTitleText(tagAlt));
			lines.push(`](:/${resource.id})`);
		}
		return lines.join('');
	}

	public static internalUrl(resource: ResourceEntity): string {
		return `:/${resource.id}`;
	}

	public static pathToId(path: string): string {
		return filename(path);
	}

	public static async content(resource: ResourceEntity) {
		return this.fsDriver().readFile(this.fullPath(resource), 'Buffer');
	}

	public static isResourceUrl(url: string): boolean {
		return !!url && url.length === 34 && url[0] === ':' && url[1] === '/';
	}

	// XJ added
	public static isResourceFileUrl(url: string): boolean {
		const pattern = /\.resources\/[a-f0-9]{32}(\.[A-Za-z]+)?$/;
		return !!url && pattern.test(url);
	}

	// XJ edited
	public static urlToId(url: string): string {
		if (this.isResourceUrl(url)) return url.substring(2);
		if (this.isResourceFileUrl(url)) {
			const pattern = /\.resources\/([a-f0-9]{32})(\.[A-Za-z]+)?$/;
			const match = url.match(pattern);
			return match ? match[1] : '';
		}
		throw new Error(`Not a valid resource URL: ${url}`);
	}

	public static async localState(resourceOrId: ResourceEntity | string): Promise<ResourceLocalStateEntity> {

		const defaultRow = await ResourceLocalState.byResourceId(typeof resourceOrId === 'object' ? resourceOrId.id ?? '' : resourceOrId);
		if (defaultRow.fetch_status === this.FETCH_STATUS_DONE) return defaultRow;

		const res = typeof resourceOrId === 'object' ? resourceOrId : await this.load(resourceOrId);
		if (res) {
			defaultRow.resource_id = res.id;
			const exist_ = await this.fsDriver().exists(Resource.fullPath(res));
			if (exist_) {
				defaultRow.fetch_status = this.FETCH_STATUS_DONE;
			}
			this.setLocalState(res, defaultRow);
		}
		return defaultRow;
	}

	public static setLocalStateQueries(resourceOrId: ResourceEntity | string, state: ResourceLocalStateEntity): { sql: string; params: any[]; }[] {
		const id = typeof resourceOrId === 'object' ? resourceOrId.id : resourceOrId;
		return ResourceLocalState.saveQueries({ ...state, resource_id: id ?? '' });
	}

	public static async setLocalState(resourceOrId: ResourceEntity | string, state: ResourceLocalStateEntity): Promise<void> {
		const id = typeof resourceOrId === 'object' ? resourceOrId.id : resourceOrId;
		await ResourceLocalState.save({ ...state, resource_id: id ?? '' });
	}

	public static async needFileSizeSet(): Promise<ResourceEntity[]> {
		return this.modelSelectAll('SELECT * FROM resources WHERE `size` < 0 AND encryption_blob_encrypted = 0');
	}

	// Only set the `size` field and nothing else, not even the update_time
	// This is because it's only necessary to do it once after migration 20
	// and each client does it so there's no need to sync the resource.
	public static async setFileSizeOnly(resourceId: string, fileSize: number) {
		return this.db().exec('UPDATE resources set `size` = ? WHERE id = ?', [fileSize, resourceId]);
	}

	public static async batchDelete(ids: string[], options: any = null): Promise<void> {
		// For resources, there's not really batch deletion since there's the
		// file data to delete too, so each is processed one by one with the
		// file data being deleted last since the metadata deletion call may
		// throw (for example if trying to delete a read-only item).
		for (let i = 0; i < ids.length; i++) {
			const id = ids[i];
			const resource = await Resource.load(id);
			if (!resource) continue;

			const path = Resource.fullPath(resource);
			await super.batchDelete([id], options);
			await this.fsDriver().remove(path);
			await NoteResource.deleteByResource(id); // Clean up note/resource relationships
		}

		await ResourceLocalState.batchDelete(ids);
	}

	public static async markForDownload(resourceId: string): Promise<void> {
		// Insert the row only if it's not already there
		const t = Date.now();
		await this.db().exec('INSERT INTO resources_to_download (resource_id, updated_time, created_time) SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM resources_to_download WHERE resource_id = ?)', [resourceId, t, t, resourceId]);
	}

	public static async downloadedButEncryptedBlobCount(excludedIds: string[] = []) {
		let excludedSql = '';
		if (excludedIds.length) {
			excludedSql = `AND resource_id NOT IN ("${excludedIds.join('","')}")`;
		}

		const r = await this.db().selectOne(`
			SELECT count(*) as total
			FROM resource_local_states
			WHERE fetch_status = ?
			AND resource_id IN (SELECT id FROM resources WHERE encryption_blob_encrypted = 1)
			${excludedSql}
		`, [Resource.FETCH_STATUS_DONE]);

		return r ? r.total : 0;
	}

	public static async downloadStatusCounts(status: number) {
		const r = await this.db().selectOne(`
			SELECT count(*) as total
			FROM resource_local_states
			WHERE fetch_status = ?
		`, [status]);

		return r ? r.total : 0;
	}

	public static async createdLocallyCount() {
		const r = await this.db().selectOne(`
			SELECT count(*) as total
			FROM resources
			WHERE id NOT IN
			(SELECT resource_id FROM resource_local_states)
		`);

		return r ? r.total : 0;
	}

	public static fetchStatusToLabel(status: number): string {
		if (status === Resource.FETCH_STATUS_IDLE) return _('Not downloaded');
		if (status === Resource.FETCH_STATUS_STARTED) return _('Downloading');
		if (status === Resource.FETCH_STATUS_DONE) return _('Downloaded');
		if (status === Resource.FETCH_STATUS_ERROR) return _('Error');
		throw new Error(`Invalid status: ${status}`);
	}

	public static async updateResourceBlobContent(resourceId: string, newBlobFilePath: string): Promise<ResourceEntity | null> {
		const resource = await Resource.load(resourceId);
		if (!resource) return null;
		await this.requireIsReady(resource);

		const fileStat = await this.fsDriver().stat(newBlobFilePath);

		// We first save the resource metadata because this can throw, for
		// example if modifying a resource that is read-only

		const result = await Resource.save({
			id: resource.id,
			size: fileStat ? fileStat.size : 0,
		});

		// If the above call has succeeded, we save the data blob

		await this.fsDriver().copy(newBlobFilePath, Resource.fullPath(resource));

		return result;
	}

	public static async resourceBlobContent(resourceId: string, encoding = 'Buffer'): Promise<any | null> {
		const resource = await Resource.load(resourceId);
		if (!resource) return null;
		await this.requireIsReady(resource);
		return await this.fsDriver().readFile(Resource.fullPath(resource), encoding);
	}

	public static async duplicateResource(resourceId: string): Promise<ResourceEntity> {
		const resource = await Resource.load(resourceId);
		const localState = resource ? await Resource.localState(resource) : {};

		let newResource: ResourceEntity = { ...resource };
		delete newResource.id;
		delete newResource.is_shared;
		delete newResource.share_id;
		newResource = await Resource.save(newResource);

		const newLocalState = { ...localState };
		if (newResource.id) newLocalState.resource_id = newResource.id;
		delete newLocalState.id;

		await Resource.setLocalState(newResource, newLocalState);

		if (resource) {
			const sourcePath = Resource.fullPath(resource);
			if (await this.fsDriver().exists(sourcePath)) {
				await this.fsDriver().copy(sourcePath, Resource.fullPath(newResource));
			}
		}
		return newResource;
	}

	public static async resourceConflictFolderId(): Promise<string> {
		const folder = await this.resourceConflictFolder();
		return folder.id;
	}

	private static async resourceConflictFolder(): Promise<any> {
		const conflictFolderTitle = _('Conflicts (attachments)');
		const Folder = this.getClass('Folder');

		const folder = await Folder.loadByTitle(conflictFolderTitle);
		if (!folder || folder.parent_id) {
			return Folder.save({ title: conflictFolderTitle });
		}

		return folder;
	}

	public static async createConflictResourceNote(resource: ResourceEntity): Promise<void> {
		if (!resource.id) return;

		const Note = this.getClass('Note');
		const conflictResource = await Resource.duplicateResource(resource.id);

		await Note.save({
			title: _('Attachment conflict: "%s"', resource.title),
			body: _('There was a [conflict](%s) on the attachment below.\n\n%s', 'https://xilinotaapp.org/help/apps/conflict', Resource.markdownTag(conflictResource)),
			parent_id: await this.resourceConflictFolderId(),
		}, { changeSource: ItemChange.SOURCE_SYNC });
	}

	public static async save(o: ResourceEntity, options: SaveOptions = {}): Promise<ResourceEntity> {
		const resource = { ...o };

		if (this.isNew(o, options)) {
			const now = Date.now();
			options = { ...options, autoTimestamp: false };
			if (!resource.created_time) resource.created_time = now;
			if (!resource.updated_time) resource.updated_time = now;
			if (!resource.blob_updated_time) resource.blob_updated_time = now;
		}

		return await super.save(resource, options);
	}

}
