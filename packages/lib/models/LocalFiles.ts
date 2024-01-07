import path = require('path');
import BaseModel from '../BaseModel';
import { FolderEntity, NoteEntity, ResourceEntity } from '../services/database/types';
import BaseItem, { unwantedCharacters } from './BaseItem';
import Resource from './Resource';
import Setting from './Setting';
import { SaveOptions } from './utils/types';
import time from '../time';
import { FileApi } from '../file-api';
const { FileApiDriverLocal } = require('../file-api-driver-local');

export const id_folder_map = new Map<string, FolderEntity>();
setInterval(() => {
	Setting.setValue('lastTimeAlive', new Date().getTime());
}, 60000);

export default class LocalFile extends BaseItem {

	protected static fileApi: FileApi;

	public static populateFolderFunc: ()=> Promise<void> = this.populateFolder;
	public static syncFromSystemFunc: ()=> Promise<void> = this.syncFromSystem;
	public static prepResourcesDirFunc: ()=> Promise<void> = null;

	private static setupFileApi(baseDir: string, driver: any) {
		this.fileApi = new FileApi(baseDir, driver);
		this.fileApi.setLogger(this.logger());
		this.fileApi.setSyncTargetId(111);	// TODO: how to set it?
	}

	public static async init(_profileName: string, doWait = false) {
		const driver = new FileApiDriverLocal();
		const homeDir = await driver.homeDir();
		const dName = Setting.value('env') === 'dev' ? 'XilinotasDev' : 'Xilinotas';

		const appPlatform = Setting.value('appType');
		let baseFilePath = homeDir;
		if (appPlatform !== 'mobile') {
			baseFilePath = `${homeDir}${path.sep}Documents`;
			const stat = await driver.stat(baseFilePath);
			if (!stat) await driver.mkdir(baseFilePath);
		}
		baseFilePath = `${baseFilePath}${path.sep}${dName}`;
		let stat = await driver.stat(baseFilePath);
		if (!stat) await driver.mkdir(baseFilePath);

		const filePath = `${baseFilePath}${path.sep}${_profileName}`;
		this.setupFileApi(filePath, driver);
		this.logger().info('LocalFiles init: filePath', filePath);
		Setting.setConstant('localFilesDir', filePath);
		stat = await driver.stat(filePath);
		const doPopulate = !stat;

		const resourceDirName = '.resources';
		Setting.setConstant('resourceDirName', resourceDirName);
		const resourceDir = `${filePath}/${resourceDirName}`;
		Setting.setConstant('resourceDir', resourceDir);
		if (this.prepResourcesDirFunc) await this.prepResourcesDirFunc();

		if (doPopulate) {
			// await driver.mkdir(filePath);	// relying on prepResourcesDir() to create the directory
			if (doWait) {
				await this.populateFolderFunc();
			} else {
				void this.populateFolderFunc();
			}
		} else {
			await this.build_id_folder_map();
			if (doWait) {
				await this.syncFromSystemFunc();
			} else {
				void this.syncFromSystemFunc();
			}
		}
	}

	public static async build_id_folder_map(): Promise<void> {
		const folders = await BaseItem.loadItemsByType(BaseModel.TYPE_FOLDER);
		id_folder_map.clear();
		for (const f of folders) {
			id_folder_map.set(f.id, f);
		}
	}

	// eslint-disable-next-line @typescript-eslint/type-annotation-spacing
	public static async sysPathFromRoot(local: any, createDir: ((path_: string) => Promise<void>) | null = null): Promise<string> {
		if (!local) return '';

		let parent: any = local;
		const parents: string[] = [];
		while (true) {
			if (parent.parent_id) {
				parent = id_folder_map.get(parent.parent_id);
				if (!parent) break;
				parents.splice(0, 0, parent.title);
			} else {
				break;
			}
		}
		let path_ = '';
		for (const p of parents) {
			path_ += p;
			if (createDir !== null) await createDir(path_);
			path_ += path.sep;
		}
		// TODO: seems if the note is under focus of an editor, the title somehow becomes readonly
		const item = { ...local };
		item.title = local.title.replace(unwantedCharacters, '');
		return path_ + this.fileNameFS(local);
	}

	// XJ testing
	public static isMDFile(path_: string): boolean {
		// title string.md
		if (!path_ || !path_.length) return false;
		let p: any = path_.split(path.sep);
		p = p[p.length - 1];
		p = p.split('.');
		if (p.length < 2) return false;
		return p[p.length - 1] === 'md';
	}

	// XJ added
	public static fileNameFS(itemOrId: any, extension: string = null): string {
		if (extension === null) extension = 'md';

		if (typeof itemOrId === 'string') {
			return `${itemOrId}.${extension}`;
			// XJ testing
		} else {
			if (itemOrId.type_ === BaseModel.TYPE_FOLDER) {
				return itemOrId.title;
			} else if (itemOrId.type_ === BaseModel.TYPE_NOTE) {
				if (itemOrId.is_todo) {
					if (itemOrId.todo_completed) return `V - ${itemOrId.title}.${extension}`;
					else return `X - ${itemOrId.title}.${extension}`;
				}
				return `${itemOrId.title}.${extension}`;
			} else if (itemOrId.type_ === BaseModel.TYPE_RESOURCE) {
				return `_resources${path.sep}${Resource.friendlySafeFilename(itemOrId as ResourceEntity)}`;
			}
			return `_others${path.sep}${itemOrId.id}.${extension}`;
		}
	}

	public static async populateFolder() {
		const folders = await BaseItem.loadItemsByType(BaseModel.TYPE_FOLDER);
		this.logger().info('number of folders to create', folders.length);
		for (const f of folders) {
			await this.saveFolder(f);
		}
		const notes = await BaseItem.loadItemsByType(BaseModel.TYPE_NOTE);
		this.logger().info('number of notes to save to file', notes.length);
		for (let i = 0; i < notes.length; i++) {
			const n = notes[i];
			// this.logger().info('saving note', i, n.title);
			await this.saveNote(n);
		}
		await this.build_id_folder_map();
	}

	public static async saveFolder(f: FolderEntity) {
		// XJ added
		const createDir = async (path_: string) => {
			const pStat = await this.fileApi.stat(path_);
			if (!pStat) await this.fileApi.mkdir(path_);
		};

		const path_ = await this.sysPathFromRoot(f, createDir);
		this.logger().info('creating folder on disk:', path_);
		let stat = await this.fileApi.stat(path_);
		if (!stat) await this.fileApi.mkdir(path_);
		const resPath = `${path_}${path.sep}.resources`;
		stat = await this.fileApi.stat(resPath);
		if (!stat) await this.fileApi.mkdir(resPath);

		const props = [`id: ${f.id}`, `parent_id: ${f.parent_id}`];
		const temp = [];
		temp.push('---');
		if (props.length) temp.push(props.join('\n'));
		temp.push('---');
		const content = temp.join('\n');
		const fPath = `${path_}${path.sep}.dir_props.md`;
		await this.fileApi.put(fPath, content);

		await this.build_id_folder_map();
	}

	public static async saveNote(note: NoteEntity) {
		const createDir = async (path_: string) => {
			const pStat = await this.fileApi.stat(path_);
			if (!pStat) await this.fileApi.mkdir(path_);
		};
		const path_ = await LocalFile.sysPathFromRoot(note, createDir);
		const resPath = `${path.dirname(path_)}${path.sep}.resources`;
		let rStat = await this.fileApi.stat(resPath);
		if (!rStat) await this.fileApi.mkdir(resPath);

		const resPathLink = `${path.dirname(path_)}${path.sep}_resources`;
		rStat = await this.fileApi.stat(resPathLink);
		if (!rStat) await this.fileApi.mkdir(resPathLink);

		const copyResourcesInNote = async () => {
			const Note = BaseItem.getClass('Note');
			let content = await Note.serializeAllProps(note);
			const resourceIds = await Note.linkedResourceIds(content);

			for (let i = 0; i < resourceIds.length; i++) {
				const id = resourceIds[i];
				if (content.indexOf(`:/${id}`) === -1 && content.indexOf(`.resources/${id}`) === -1) continue;

				const resource = await Resource.load(id);
				if (!resource) continue;

				const resConfigPath = Resource.fullPath(resource); // path in xilinota config
				let stat = await this.fileApi.stat(resConfigPath, true);
				if (!stat) {
					// this.logger().info('Resource file not exist:', resConfigPath);
					continue;
				}
				const resourcefilename = Resource.filename(resource);
				// eslint-disable-next-line prefer-const
				let resFullpPathFS = `${resPath}${path.sep}${resourcefilename}`;
				// eslint-disable-next-line prefer-const
				let resRelPathFS = `.resources${path.sep}${resourcefilename}`;
				// this.logger().info('resConfigPath resRelPathFS', resConfigPath, resFullpPathFS);
				stat = await this.fileApi.stat(resFullpPathFS);
				// TODO: needs more thoughts regarding the _resources folder
				// if (stat) {
				// 	resFullpPathFS = `${resPathLink}${path.sep}${resourcefilename}`;
				// 	resRelPathFS = `_resources${path.sep}${resourcefilename}`;
				// 	stat = await this.fileApi.stat(resFullpPathFS);
				// }
				if (!stat) {
					// await this.fileApi.put(resFullpPathFS, resource, { source: 'file', path: resConfigPath });
					await this.fileApi.link(resConfigPath, this.fileApi.fullPath(resFullpPathFS));
				}
				if (content.indexOf(`:/${id}`) > -1) content = content.replace(new RegExp(`:/${id}`, 'gi'), resRelPathFS);

				// this.logger().info('loadNote', i, id, isImage, resourcefilename);
			}
			return content;
		};
		const content = await copyResourcesInNote();

		await this.fileApi.put(path_, content);
	}

	public static async moveNote(noteId: string, folderId: string) {
		const note = await this.loadItemById(noteId);
		const nPath = await this.sysPathFromRoot(note);
		const f = id_folder_map.get(folderId);
		const fPath = `${await this.sysPathFromRoot(f)}${path.sep}${this.fileNameFS(note)}`;

		const moveResourcesInNote = async () => {
			const Note = BaseItem.getClass('Note');
			const content = await Note.serializeAllProps(note);
			const resourceIds = await Note.linkedResourceIds(content);

			const oResPath = `${path.dirname(nPath)}${path.sep}.resources`;
			let stat = await this.fileApi.stat(oResPath);
			if (!stat) return;

			const nResPath = `${path.dirname(fPath)}${path.sep}.resources`;
			for (let i = 0; i < resourceIds.length; i++) {
				const id = resourceIds[i];
				if (content.indexOf(`:/${id}`) === -1) continue;

				const resource = await Resource.load(id);
				if (!resource) continue;

				const resourcefilename = Resource.filename(resource);
				const oldResFile = `${oResPath}${path.sep}${resourcefilename}`;
				stat = await this.fileApi.stat(oldResFile);
				if (!stat) {
					// this.logger().info('Resource file not exist:', oldResFile);
					continue;
				}
				const resFullpPathFS = `${nResPath}${path.sep}${resourcefilename}`;
				stat = await this.fileApi.stat(resFullpPathFS);
				if (!stat) await this.fileApi.move(oldResFile, resFullpPathFS);
			}
		};
		await moveResourcesInNote();
		await this.fileApi.move(nPath, fPath);
	}

	public static async moveFolder(folderId: string, targetFolderId: string) {
		const f = id_folder_map.get(folderId);
		const fPath = await this.sysPathFromRoot(f);
		const f1 = id_folder_map.get(targetFolderId);
		const f1Path = `${await this.sysPathFromRoot(f1)}/${this.fileNameFS(f)}`;
		await this.fileApi.move(fPath, f1Path);
		await this.build_id_folder_map();
	}

	public static async renameFolder(folderId: string, newName: string) {
		const f = id_folder_map.get(folderId);
		if (!f) return;
		const fPath = await this.sysPathFromRoot(f);
		const f1Path = fPath.replace(f.title, newName);
		await this.fileApi.move(fPath, f1Path);
		await this.build_id_folder_map();
	}

	public static async deleteFolder(folder: FolderEntity) {
		const path_ = await this.sysPathFromRoot(folder);
		this.logger().info('deleting folder:', path_);
		const stat = await this.fileApi.stat(path_);
		if (stat) await this.fileApi.remove(path_);
	}

	public static async deleteNoteFile(note: NoteEntity) {
		const path_ = await this.sysPathFromRoot(note);
		await this.fileApi.delete(path_);
	}

	public static async deleteNote(note: NoteEntity) {
		const path_ = await this.sysPathFromRoot(note);

		const deleteResourcesInNote = async () => {
			const Note = BaseItem.getClass('Note');
			const content = await Note.serializeAllProps(note);
			const resourceIds = await Note.linkedResourceIds(content);

			const oResPath = `${path.dirname(path_)}${path.sep}.resources`;
			let stat = await this.fileApi.stat(oResPath);
			if (!stat) return;

			for (let i = 0; i < resourceIds.length; i++) {
				const id = resourceIds[i];
				if (content.indexOf(`:/${id}`) === -1) continue;

				const resource = await Resource.load(id);
				if (!resource) continue;

				// const resourcePath = Resource.fullPath(resource); // path in xilinota config
				// stat = await this.fileApi.stat(resourcePath, true);
				// if (stat) await this.fileApi.delete(resourcePath, true);

				const resourcefilename = Resource.filename(resource);
				const oldResFile = `${oResPath}${path.sep}${resourcefilename}`;
				stat = await this.fileApi.stat(oldResFile);
				if (!stat) {
					// this.logger().info('Resource file not exist:', oldResFile);
					continue;
				}
				await this.fileApi.delete(oldResFile);

				// this.logger().info('loadNote', i, id, isImage, resourcefilename);
			}
		};
		this.logger().info('deleting note:', path_);
		const stat = await this.fileApi.stat(path_);
		if (stat) {
			await deleteResourcesInNote();
			await this.fileApi.delete(path_);
		}
	}

	private static async doDB_FS_Diffs() {
		const quitTime = Setting.value('shutdownTime');
		this.logger().info('doDB_FS_Diffs: quitTime', quitTime);

		const Note = BaseItem.getClass('Note');

		const fileList: string[] = await this.fileApi.ls_RR();
		const fileSet: Set<string> = new Set();
		const dirSet_: Set<string> = new Set();
		const filterFileList = () => {
			for (const f of fileList) {
				// this.logger().info('doDB_FS_Diffs: file', f, path.dirname(f));
				if (f[0] === '.') continue;
				let p: any = f.split(path.sep);
				p = p[p.length - 1];
				if (p[0] === '.' || p[0] === '_') continue;
				if (LocalFile.isMDFile(f)) {
					fileSet.add(f);
					dirSet_.add(path.dirname(f));
				}
			}
		};
		filterFileList();

		const isParentDirectory = (directory: string, directoryPaths: Set<string>) => {
			const dirStr = `${directory}${path.sep}`;
			for (const path_ of directoryPaths) {
				if (path_ !== directory && path_.startsWith(dirStr)) {
					return true;
				}
			}
			return false;
		};
		const dirSet = Array.from(dirSet_).filter(path => !isParentDirectory(path, dirSet_));
		this.logger().debug('doDB_FS_Diffs: FS folders:', dirSet);

		this.logger().debug('doDB_FS_Diffs: FS files:', fileSet);

		const dbNotes: NoteEntity[] = await Note.notesWOBody();
		const notePaths: Set<string> = new Set();
		const path_note_map = new Map<string, NoteEntity>();
		for (const note of dbNotes) {
			const p = await LocalFile.sysPathFromRoot(note);
			// this.logger().info('doDB_FS_Diffs: p', p);
			let p1 = p;
			if (p.startsWith(`.${path.sep}`)) {
				p1 = p.substring(p.indexOf(path.sep) + 1);
			}
			notePaths.add(p1);
			path_note_map.set(p1, note);
		}
		this.logger().debug('doDB_FS_Diffs: DB note path list:', notePaths);

		if (fileSet.size === 0 && notePaths.size > 0) {
			await this.populateFolder();
			return;
		}

		const diffDF = new Set(notePaths);	// notes in DB but not in FS
		for (const it of fileSet) {
			diffDF.delete(it);
		}
		this.logger().debug('doDB_FS_Diffs: DB notes not in FS:', diffDF);

		const diffFD = new Set(fileSet);	// notes in FS but not in DB
		for (const it of notePaths) {
			diffFD.delete(it);
		}
		this.logger().debug('doDB_FS_Diffs: FS notes not in DB:', diffFD);

		const commonLP = new Set<string>();
		for (const it of notePaths) {
			if (fileSet.has(it)) commonLP.add(it);
		}
		this.logger().debug('doDB_FS_Diffs: notes in both DB and FS:', commonLP);

		const save_to_DB_as_note = async (content: any, options: SaveOptions = null) => {
			let note: NoteEntity = await BaseItem.unserialize(content, { type_: BaseModel.TYPE_NOTE });
			note = Note.filter(note);
			if (!note.user_updated_time) note.user_updated_time = note.updated_time;
			if (!note.user_created_time) note.user_created_time = note.created_time;
			if (!options) {
				options = {
					autoTimestamp: false,
					isNew: true,
				};
			}
			await Note.save(note, options);
		};

		const do_commons = async () => {
			// for notes in both FS abd DB, import from FS to overwrite DB, only those changed when Xilinota not running
			for (const p of commonLP) {
				const noteDB: any = path_note_map.get(p);
				const statFS = await this.fileApi.stat(p);
				if (noteDB.updated_time < quitTime && statFS.updated_time < quitTime) continue;

				this.logger().debug('do_commons:', p, 'DB:', noteDB.updated_time - quitTime, 'FS:', statFS.updated_time - quitTime, 'FS-DB:', statFS.updated_time - noteDB.updated_time);
				const content = await this.fileApi.get(p);
				await save_to_DB_as_note(content, { isNew: false, autoTimestamp: false });
			}
		};
		const idsExist: string[] = [];

		const do_FS_extras = async () => {
			// for notes in FS but not in DB
			const Folder = BaseItem.getClass('Folder');

			const addFolder = async (title: string, parent_id: string): Promise<string> => {
				const folder = {
					title: title,
					parent_id: parent_id,
					updated_time: time.unixMs(),
				};
				this.logger().info('addFolders adding in DB', path.basename(title));
				const savedFolder: FolderEntity = await Folder.save(folder);
				return savedFolder.id;
			};

			const addFolders = async () => {
				for (const dp of dirSet) {
					const dList = dp.split(path.sep);
					const len = dList.length;
					let parent_id = '';
					let parent_path: string = null;
					for (let i = 0; i < len; i++) {
						const d = dList[i];
						const p_ = !parent_path ? d : `${parent_path}${path.sep}${d}`;
						const tDirFile = `${p_}${path.sep}.dir_props.md`;
						const dirContent = await this.fileApi.get(tDirFile);
						let exist_ = false;
						if (dirContent) {
							const dirProps = BaseItem.getFrontMatter(dirContent);
							const id = dirProps.id;
							const f = id_folder_map.get(id);
							if (f) {
								exist_ = true;
								parent_id = dirProps.id;
							}
						}
						if (!exist_) {
							parent_id = await addFolder(d, parent_id);
						}
						parent_path = p_;
					}
				}
			};
			await addFolders();

			for (const p of diffFD) {
				const stat = await this.fileApi.stat(p);
				// this.logger().info('do_FS_extras: note file stat', stat);
				if (!stat) continue;
				if (LocalFile.isMDFile(p)) {
					// this.logger().info('do_FS_extras: p', p, path.dirname(p));
					const filename = path.basename(p);
					const title = filename.slice(0, filename.lastIndexOf('.md'));
					const tDirFile = `${path.dirname(p)}${path.sep}.dir_props.md`;
					const dirContent = await this.fileApi.get(tDirFile);
					const dirProps = BaseItem.getFrontMatter(dirContent);
					const parent_id = dirProps.id;
					const content = await this.fileApi.get(p);
					if (content) {
						const { frontMatter, body } = BaseItem.parseFrontMatter(content);
						if (frontMatter && frontMatter.id) {
							const note: NoteEntity = await Note.load(frontMatter.id);
							if (note) {
								idsExist.push(note.id);
								this.logger().error('do_FS_extras: note already exists', p);
								continue;
							}
						}
						const note = {
							parent_id: parent_id,
							title: title,
							body: body,
							updated_time: stat.updated_time,
							created_time: stat.updated_time,
							user_updated_time: stat.updated_time,
							user_created_time: stat.updated_time,
							markup_language: 1,
						};
						this.logger().debug('do_FS_extras: saving note', title);
						await Note.save(note);
					}
				}
			}
		};

		const do_DB_extras = async () => {
			// for notes in DB but not in FS
			for (const p of diffDF) {
				const note = path_note_map.get(p);
				if (idsExist.includes(note.id)) {
					this.logger().error('do_DB_extras: note exists in other folder', p);
					continue;
				}
				this.logger().info('do_DB_extras: deleting note', note.title);
				Note.delete(note.id);
			}
		};

		if (commonLP.size > 0) await do_commons();

		if (diffFD.size > 0) await do_FS_extras();

		if (diffDF.size > 0) await do_DB_extras();

		await this.build_id_folder_map();
	}

	public static async syncFromSystem() {
		// return new Promise<void>((resolve, _reject) => {
		// 	setTimeout(async () => {
		// 		// defer the task
		// 		await this.doDB_FS_Diffs();
		// 		resolve();
		// 	}, 2000);
		// });
		await this.doDB_FS_Diffs();
	}
}


