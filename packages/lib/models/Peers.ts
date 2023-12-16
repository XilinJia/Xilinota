import { FolderEntity, NoteEntity } from '../services/database/types';
import time from '../time';
import BaseItem from './BaseItem';
import Folder from './Folder';
import { id_folder_map } from './LocalFiles';
import Note from './Note';

const ThrottleTime = 500;

export function anyPeerAvailable() {
	return !!PeerSocket.broadcaster && !!PeerSocket.sender;
}

export class PeerSocket {
	public static broadcaster: (tag: string, data: Record<string, string>)=> void = null;
	public static sender: (tag: string, data: Record<string, string>, clientId: string,)=> void = null;
}
export class PeersFolder extends BaseItem {

	public static async parsePeerMessage(msg: Record<string, string>) {
		switch (msg.action) {
		case 'send':
			await this.receiveFromPeer(msg.content);
			break;
		case 'delete':
			await this.deleteAfterPeer(msg.content);
			break;
		case 'move':
			await this.moveAfterPeer(msg.content);
			break;
		}
	}

	public static async deleteOnPeers(folderId: string) {
		if (!PeerSocket.broadcaster) return;
		PeerSocket.broadcaster('folder', { action: 'delete', content: folderId });
		this.logger().info('deleteOnPeers: ', folderId);
		await time.msleep(ThrottleTime);
	}

	public static async deleteOnPeer(folderId: string, clientId: string) {
		if (!PeerSocket.sender) return;
		PeerSocket.sender('folder', { action: 'delete', content: folderId }, clientId);
		this.logger().info('deleteOnPeer: ', folderId);
		await time.msleep(ThrottleTime);
	}

	private static async deleteAfterPeer(folderId: string) {
		// const folder: FolderEntity = await this.load(folderId);
		// note is not on this device. ignore
		// if (!folder) return;

		await Folder.delete(folderId);
		// this.logger().info('Note deleteAfterPeer: delete', folder.title);
	}

	public static async moveOnPeers(folderId: string) {
		if (!PeerSocket.broadcaster) return;
		const folder = id_folder_map.get(folderId);
		const encodedData = `${folder.id} ${folder.parent_id}`;
		PeerSocket.broadcaster('folder', { action: 'move', content: encodedData });
		this.logger().info('moveOnPeers: ', folder.title);
		await time.msleep(ThrottleTime);
	}

	public static async moveOnPeer(folderId: string, clientId: string) {
		if (!PeerSocket.sender) return;
		const folder = id_folder_map.get(folderId);
		const encodedData = `${folder.id} ${folder.parent_id}`;
		PeerSocket.sender('folder', { action: 'move', content: encodedData }, clientId);
		this.logger().info('moveOnPeers: ', folder.title);
		await time.msleep(ThrottleTime);
	}

	private static async moveAfterPeer(encodedData: string) {
		const ids = encodedData.split(' ');
		const folderId = ids[0];
		const newFolderId = ids[1];
		const folder: FolderEntity = id_folder_map.get(folderId);
		// folder is not on this device. ignore
		if (!folder) return;

		if (!folder.parent_id && !newFolderId) return;

		// const newFolder = id_folder_map.get(newFolderId);
		let parent: FolderEntity = null;
		if (folder.parent_id) {
			parent = id_folder_map.get(folder.parent_id);
			// note exists but not in its claimed folder: this should be an error
			if (!parent) return;
		}

		await Folder.moveToFolder(folderId, newFolderId);
		// if new folder doesn't exist, remove the folder, else, move to the new folder
		// if (!newFolder && folder.parent_id) {
		// 	await this.delete(folderId);
		// } else {
		// 	await this.moveToFolder(folderId, newFolderId);
		// }
		this.logger().info('Note moveAfterPeer: savedNote');
	}

	public static async sendToPeers(folderId: string) {
		if (!PeerSocket.broadcaster) return;
		const folder = id_folder_map.get(folderId);
		const encodedData = await BaseItem.serializeForSync(folder);
		PeerSocket.broadcaster('folder', { action: 'send', content: encodedData });
		this.logger().info('sendToPeers: sent folder', encodedData);
		await time.msleep(ThrottleTime);
		const nids: string[] = await Folder.noteIds(folderId);
		await PeersNote.sendToPeers(nids);
		const subFolderIds = await Folder.subFolderIds(folderId);
		for (const sfid of subFolderIds) {
			await time.msleep(ThrottleTime);
			await this.sendToPeers(sfid);
		}
	}

	public static async sendToPeer(folderId: string, clientId: string) {
		if (!PeerSocket.sender) return;
		const folder = id_folder_map.get(folderId);
		const encodedData = await BaseItem.serializeForSync(folder);
		PeerSocket.sender('folder', { action: 'send', content: encodedData }, clientId);
		this.logger().info('sendToPeers: sent folder', encodedData);
		await time.msleep(ThrottleTime);
		const nids: string[] = await Folder.noteIds(folderId);
		await PeersNote.sendToPeer(nids, clientId);
		const subFolderIds = await Folder.subFolderIds(folderId);
		for (const sfid of subFolderIds) {
			await time.msleep(ThrottleTime);
			await this.sendToPeer(sfid, clientId);
		}
	}

	private static async receiveFromPeer(encodedData: string) {
		// this.logger().info('Folder receive: received folder', encodedData);
		const folder: FolderEntity = BaseItem.unserialize(encodedData);
		this.logger().info('Folder receive: unserialized folder', folder);
		let parent: FolderEntity = null;
		if (folder.parent_id) {
			parent = id_folder_map.get(folder.parent_id);
		}
		if (!folder.parent_id || !!parent) {
			const isNew_ = !id_folder_map.get(folder.id);
			const savedFolder = await Folder.save(folder, { isNew: isNew_ });
			this.logger().info('Folder receive: savedFolder', savedFolder);
		}
	}
}

export class PeersNote extends BaseItem {

	public static async parsePeerMessage(msg: Record<string, string>) {
		this.logger().info('parsePeerMessage action', msg.action);
		switch (msg.action) {
		case 'send':
			await this.receiveFromPeer(msg.content);
			break;
		case 'delete':
			await this.deleteAfterPeer(msg.content);
			break;
		case 'batchdelete':
			await this.batchDeleteAfterPeer(msg.content);
			break;
		case 'move':
			await this.moveAfterPeer(msg.content);
			break;
		case 'sync':
			await this.syncFromPeer(msg.content);
			break;
		}
	}

	public static async sendToPeers(noteIds: string[]) {
		if (!PeerSocket.broadcaster) return;
		for (const nid of noteIds) {
			const note = await Note.load(nid);
			// this.logger().info('sendToPeers: sending note', note);
			const encodedData = await Note.serializeAllProps(note);
			PeerSocket.broadcaster('note', { action: 'send', content: encodedData });
			this.logger().info('sendToPeers: sent note', note.title);
			await time.msleep(ThrottleTime);
		}
	}

	public static async sendToPeer(noteIds: string[], clientId: string) {
		if (!PeerSocket.sender) return;
		for (const nid of noteIds) {
			const note = await Note.load(nid);
			// this.logger().info('sendToPeers: sending note', note);
			const encodedData = await Note.serializeAllProps(note);
			PeerSocket.sender('note', { action: 'send', content: encodedData }, clientId);
			this.logger().info('sendToPeer: sent note', note.title);
			await time.msleep(ThrottleTime);
		}
	}

	private static async receiveFromPeer(encodedData: string) {
		const note: NoteEntity = BaseItem.unserialize(encodedData);

		const Folder = BaseItem.getClass('Folder');
		let folder: FolderEntity = null;
		if (note.parent_id) {
			folder = id_folder_map.get(note.parent_id);
		}
		if (!folder) {
			const folderTitle = '_InBox';
			folder = await Folder.loadByField('title', folderTitle);
			if (!folder) {
				folder = {
					title: folderTitle,
					is_shared: 0,
					share_id: '',
				};
				folder = await Folder.save(folder);
			}
			note.parent_id = folder.id;
		}
		const savedNote = await Note.save(note);
		this.logger().info('Note receiveFromPeer: savedNote', folder.title, savedNote.title);
	}

	public static async deleteOnPeers(noteId: string) {
		if (!PeerSocket.broadcaster) return;
		PeerSocket.broadcaster('note', { action: 'delete', content: noteId });
		this.logger().info('deleteOnPeers: ', noteId);
		await time.msleep(ThrottleTime);
	}

	public static async deleteOnPeer(noteId: string, clientId: string) {
		if (!PeerSocket.sender) return;
		PeerSocket.sender('note', { action: 'delete', content: noteId }, clientId);
		this.logger().info('deleteOnPeer: ', noteId);
		await time.msleep(ThrottleTime);
	}

	public static async deleteAfterPeer(noteId: string) {
		await Note.delete(noteId);
	}

	public static async batchDeleteOnPeers(noteIds: string[]) {
		if (!PeerSocket.broadcaster) return;
		PeerSocket.broadcaster('note', { action: 'batchdelete', content: noteIds.join(' ') });
		// this.logger().info('deleteOnPeers: ', noteId);
		await time.msleep(ThrottleTime);
	}

	public static async batchDeleteOnPeer(noteIds: string[], clientId: string) {
		if (!PeerSocket.sender) return;
		PeerSocket.sender('note', { action: 'batchdelete', content: noteIds.join(' ') }, clientId);
		// this.logger().info('deleteOnPeer: ', noteId);
		await time.msleep(ThrottleTime);
	}

	private static async batchDeleteAfterPeer(noteIds: string) {
		const ids = noteIds.split(' ');
		await Note.batchDelete(ids);
	}

	public static async moveOnPeers(noteId: string) {
		if (!PeerSocket.broadcaster) return;
		const note = await Note.load(noteId);
		const encodedData = `${note.id} ${note.parent_id}`;
		PeerSocket.broadcaster('note', { action: 'move', content: encodedData });
		this.logger().info('moveOnPeers: ', note.title);
		await time.msleep(ThrottleTime);
	}

	private static async moveAfterPeer(encodedData: string) {
		const ids = encodedData.split(' ');
		const noteId = ids[0];
		const folderId = ids[1];
		const note: NoteEntity = await Note.load(noteId);
		// note is not on this device. ignore
		if (!note) return;

		let folder: FolderEntity = null;
		if (note.parent_id) {
			folder = id_folder_map.get(note.parent_id);
		}
		// note exists but not in its claimed folder: this should be an error
		if (!folder) return;

		await this.moveOrDelete(noteId, folderId);
		this.logger().info('Note moveAfterPeer: moved', note.title);
	}

	private static async moveOrDelete(noteId: string, folderId: string) {
		const newFolder = id_folder_map.get(folderId);
		// if new folder doesn't exist, remove the note, else, move to the new folder
		if (!newFolder) {
			await Note.delete(noteId);
		} else {
			await Note.moveToFolder(noteId, folderId);
		}
	}

	public static async syncToPeers(note: NoteEntity) {
		if (!PeerSocket.broadcaster) return;
		const encodedData = await Note.serializeAllProps(note);
		PeerSocket.broadcaster('note', { action: 'sync', content: encodedData });
		this.logger().info('syncToPeers: sync note', note.title);
		await time.msleep(ThrottleTime);
	}

	public static async syncToPeer(note: NoteEntity, clientId: string) {
		if (!PeerSocket.sender) return;
		const encodedData = await Note.serializeAllProps(note);
		PeerSocket.sender('note', { action: 'sync', content: encodedData }, clientId);
		this.logger().info('syncToPeer: sync note', note.title);
		await time.msleep(ThrottleTime);
	}

	private static async syncFromPeer(encodedData: string) {
		const note: NoteEntity = BaseItem.unserialize(encodedData);
		const noteLocal: NoteEntity = await Note.load(note.id);

		if (noteLocal && noteLocal.parent_id !== note.parent_id) {
			await this.moveOrDelete(note.id, note.parent_id);
			this.logger().info('Note syncFromPeer: moved or deleted', note.title);
		} else {
			let folder: FolderEntity = null;
			if (note.parent_id) {
				folder = id_folder_map.get(note.parent_id);
			}
			// parent folder is not on this device, ignore
			if (!folder) return;

			await Note.save(note);
			this.logger().info('Note syncFromPeer: savedNote', note.title);
		}
	}
}
