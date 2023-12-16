import { PluginManifest } from './utils/types';
import ViewController from './ViewController';
import shim from '../../shim';
import { ViewHandle } from './utils/createViewHandle';
import { ContentScriptType } from './api/types';
import Logger from '@xilinota/utils/Logger';
const EventEmitter = require('events');

const logger = Logger.create('Plugin');

interface ViewControllers {
	[key: string]: ViewController;
}

export interface ContentScript {
	id: string;
	path: string;
}

interface ContentScripts {
	[type: string]: ContentScript[];
}

export default class Plugin {

	private baseDir_: string;
	private manifest_: PluginManifest;
	private scriptText_: string;
	private viewControllers_: ViewControllers = {};
	private contentScripts_: ContentScripts = {};
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	private dispatch_: Function;
	private eventEmitter_: any;
	private devMode_ = false;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	private messageListener_: Function = null;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	private contentScriptMessageListeners_: Record<string, Function> = {};
	private dataDir_: string;
	private dataDirCreated_ = false;

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public constructor(baseDir: string, manifest: PluginManifest, scriptText: string, dispatch: Function, dataDir: string) {
		this.baseDir_ = shim.fsDriver().resolve(baseDir);
		this.manifest_ = manifest;
		this.scriptText_ = scriptText;
		this.dispatch_ = dispatch;
		this.dataDir_ = dataDir;
		this.eventEmitter_ = new EventEmitter();
	}

	public get id(): string {
		return this.manifest.id;
	}

	public get devMode(): boolean {
		return this.devMode_;
	}

	public set devMode(v: boolean) {
		this.devMode_ = v;
	}

	public get manifest(): PluginManifest {
		return this.manifest_;
	}

	public get scriptText(): string {
		return this.scriptText_;
	}

	public get baseDir(): string {
		return this.baseDir_;
	}

	public async dataDir(): Promise<string> {
		if (this.dataDirCreated_) return this.dataDir_;

		if (!(await shim.fsDriver().exists(this.dataDir_))) {
			await shim.fsDriver().mkdir(this.dataDir_);
			this.dataDirCreated_ = true;
		}

		return this.dataDir_;
	}

	public get viewCount(): number {
		return Object.keys(this.viewControllers_).length;
	}

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public on(eventName: string, callback: Function) {
		return this.eventEmitter_.on(eventName, callback);
	}

	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	public off(eventName: string, callback: Function) {
		return this.eventEmitter_.removeListener(eventName, callback);
	}

	public emit(eventName: string, event: any = null) {
		return this.eventEmitter_.emit(eventName, event);
	}

	public async registerContentScript(type: ContentScriptType, id: string, path: string) {
		if (!this.contentScripts_[type]) this.contentScripts_[type] = [];

		const absolutePath = shim.fsDriver().resolveRelativePathWithinDir(this.baseDir, path);

		if (!(await shim.fsDriver().exists(absolutePath))) throw new Error(`Could not find content script at path ${absolutePath}`);

		this.contentScripts_[type].push({ id, path: absolutePath });

		logger.debug(`"${this.id}": Registered content script: ${type}: ${id}: ${absolutePath}`);

		this.dispatch_({
			type: 'PLUGIN_CONTENT_SCRIPTS_ADD',
			pluginId: this.id,
			contentScript: {
				type: type,
				id: id,
				path: absolutePath,
			},
		});
	}

	public contentScriptsByType(type: ContentScriptType): ContentScript[] {
		return this.contentScripts_[type] ? this.contentScripts_[type] : [];
	}

	public contentScriptById(id: string): ContentScript {
		for (const type in this.contentScripts_) {
			const cs = this.contentScripts_[type];
			for (const c of cs) {
				if (c.id === id) return c;
			}
		}

		return null;
	}

	public addViewController(v: ViewController) {
		if (this.viewControllers_[v.handle]) throw new Error(`View already added or there is already a view with this ID: ${v.handle}`);
		this.viewControllers_[v.handle] = v;
	}

	public viewController(handle: ViewHandle): ViewController {
		if (!this.viewControllers_[handle]) throw new Error(`View not found: ${handle}`);
		return this.viewControllers_[handle];
	}

	public deprecationNotice(goneInVersion: string, message: string, isError = false) {
		if (isError) {
			throw new Error(`"${this.id}": No longer supported: ${message} (deprecated since version ${goneInVersion})`);
		} else {
			logger.warn(`"${this.id}": DEPRECATION NOTICE: ${message} This will stop working in version ${goneInVersion}.`);
		}
	}

	public emitMessage(message: any) {
		if (!this.messageListener_) return;
		return this.messageListener_(message);
	}

	public onMessage(callback: any) {
		this.messageListener_ = callback;
	}

	public onContentScriptMessage(id: string, callback: any) {
		if (!this.contentScriptById(id)) {
			// The script could potentially be registered later on, but still
			// best to print a warning to notify the user of a possible bug.
			logger.warn(`onContentScriptMessage: No such content script: ${id}`);
		}

		this.contentScriptMessageListeners_[id] = callback;
	}

	public emitContentScriptMessage(id: string, message: any) {
		if (!this.contentScriptMessageListeners_[id]) return;
		return this.contentScriptMessageListeners_[id](message);
	}

}
