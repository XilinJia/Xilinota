import ElectronAppWrapper from './ElectronAppWrapper';
import shim from '@xilinota/lib/shim';
import { _, setLocale } from '@xilinota/lib/locale';
import { BrowserWindow, nativeTheme, nativeImage, RelaunchOptions, dialog, Menu, MenuItem, shell, screen, app } from 'electron';
import { execFile } from 'node:child_process';
import { dirname, toSystemSlashes } from '@xilinota/lib/path-utils';
import ProgressBar from 'electron-progressbar';

interface LastSelectedPath {
	file: string;
	directory: string;
}

interface OpenDialogOptions {
	properties?: string[];
	defaultPath?: string;
	createDirectory?: boolean;
	filters?: any[];
}

export class Bridge {

	private electronWrapper_: ElectronAppWrapper;
	private lastSelectedPaths_: LastSelectedPath;

	public constructor(electronWrapper: ElectronAppWrapper) {
		this.electronWrapper_ = electronWrapper;
		this.lastSelectedPaths_ = {
			file: '',
			directory: '',
		};
	}

	public electronApp(): ElectronAppWrapper {
		return this.electronWrapper_;
	}

	public electronIsDev(): boolean {
		return !this.electronApp().electronApp().isPackaged;
	}

	// The build directory contains additional external files that are going to
	// be packaged by Electron Builder. This is for files that need to be
	// accessed outside of the Electron app (for example the application icon).
	//
	// Any static file that's accessed from within the app such as CSS or fonts
	// should go in /vendor.
	//
	// The build folder location is dynamic, depending on whether we're running
	// in dev or prod, which makes it hard to access it from static files (for
	// example from plain HTML files that load CSS or JS files). For this reason
	// it should be avoided as much as possible.
	public buildDir(): string {
		return this.electronApp().buildDir();
	}

	// The vendor directory and its content is dynamically created from other
	// dir (usually by pulling files from node_modules). It can also be accessed
	// using a relative path such as "../../vendor/lib/file.js" because it will
	// be at the same location in both prod and dev mode (unlike the build dir).
	public vendorDir(): string {
		return `${__dirname}/vendor`;
	}

	public env(): string {
		return this.electronWrapper_.env();
	}

	public processArgv(): string[] {
		return process.argv;
	}

	public getLocale = (): any => {
		return this.electronApp().electronApp().getLocale();
	};

	// Applies to electron-context-menu@3:
	//
	// For now we have to disable spell checking in non-editor text
	// areas (such as the note title) because the context menu lives in
	// the main process, and the spell checker service is in the
	// renderer process. To get the word suggestions, we need to call
	// the spellchecker service but that can only be done in an async
	// way, and the menu is built synchronously.
	//
	// Moving the spellchecker to the main process would be hard because
	// it depends on models and various other classes which are all in
	// the renderer process.
	//
	// Perhaps the easiest would be to patch electron-context-menu to
	// support the renderer process again. Or possibly revert to an old
	// version of electron-context-menu.
	public setupContextMenu(_spellCheckerMenuItemsHandler: Function): void {
		require('electron-context-menu')({
			allWindows: [this.window()],

			electronApp: this.electronApp(),

			shouldShowMenu: (_event: any, params: any) => {
				return params.isEditable;
			},

			// menu: (actions: any, props: any) => {
			// 	const items = spellCheckerMenuItemsHandler(props.misspelledWord, props.dictionarySuggestions);
			// 	const spellCheckerMenuItems = items.map((item: any) => new MenuItem(item)); //SpellCheckerService.instance().contextMenuItems(props.misspelledWord, props.dictionarySuggestions).map((item: any) => new MenuItem(item));

			// 	const output = [
			// 		actions.cut(),
			// 		actions.copy(),
			// 		actions.paste(),
			// 		...spellCheckerMenuItems,
			// 	];

			// 	return output;
			// },
		});
	}

	public window(): BrowserWindow {
		return this.electronWrapper_.window();
	}

	public showItemInFolder(fullPath: string): void {
		return shell.showItemInFolder(toSystemSlashes(fullPath));
	}

	public newBrowserWindow(options: any): BrowserWindow {
		return new BrowserWindow(options);
	}

	public windowContentSize(): { width: number; height: number; } {
		const win = this.window();
		if (!win) return { width: 0, height: 0 };
		const s = win.getContentSize();
		return { width: s[0], height: s[1] };
	}

	public windowSize(): { width: number; height: number; } {
		const win = this.window();
		if (!win) return { width: 0, height: 0 };
		const s = win.getSize();
		return { width: s[0], height: s[1] };
	}

	public windowSetSize(width: number, height: number): void {
		const win = this.window();
		if (!win) return;
		return win.setSize(width, height);
	}

	public openDevTools(): void {
		return this.window()?.webContents.openDevTools();
	}

	public closeDevTools(): void {
		return this.window()?.webContents.closeDevTools();
	}

	public async showSaveDialog(options: any): Promise<string | undefined> {
		if (!options) options = {};
		if (!('defaultPath' in options) && this.lastSelectedPaths_.file) options.defaultPath = this.lastSelectedPaths_.file;
		const win = this.window();
		if (win) {
			const { filePath } = await dialog.showSaveDialog(win, options);
			if (filePath) {
				this.lastSelectedPaths_.file = filePath;
			}
			return filePath;
		}
		return '';
	}

	public async showOpenDialog(options: OpenDialogOptions = {}): Promise<string[]> {
		let fileType = 'file';
		if (options.properties && options.properties.includes('openDirectory')) fileType = 'directory';
		if (!('defaultPath' in options) && (this.lastSelectedPaths_ as any)[fileType]) options.defaultPath = (this.lastSelectedPaths_ as any)[fileType];
		if (!('createDirectory' in options)) options.createDirectory = true;
		const win = this.window();
		if (win) {
			const { filePaths } = await dialog.showOpenDialog(win, options as any);
			if (filePaths && filePaths.length) {
				(this.lastSelectedPaths_ as any)[fileType] = dirname(filePaths[0]);
			}
			return filePaths;
		}
		return [];
	}

	// Don't use this directly - call one of the showXxxxxxxMessageBox() instead
	private showMessageBox_(window: any, options: any): number {
		if (!window) window = this.window();
		return dialog.showMessageBoxSync(window, options);
	}

	public showErrorMessageBox(message: string): number {
		return this.showMessageBox_(this.window(), {
			type: 'error',
			message: message,
			buttons: [_('OK')],
		});
	}

	public showConfirmMessageBox(message: string, options: any = null): boolean {
		options = {
			buttons: [_('OK'), _('Cancel')],
			...options,
		};

		const result = this.showMessageBox_(this.window(), {
			type: 'question',
			message: message,
			cancelId: 1,
			buttons: options.buttons, ...options
		});

		return result === 0;
	}

	/* returns the index of the clicked button */
	public showMessageBox(message: string, options: any = {}): number {

		const result = this.showMessageBox_(this.window(), {
			type: 'question',
			message: message,
			buttons: [_('OK'), _('Cancel')], ...options
		});

		return result;
	}

	public showInfoMessageBox(message: string, options: any = {}): boolean {
		const result = this.showMessageBox_(this.window(), {
			type: 'info',
			message: message,
			buttons: [_('OK')], ...options
		});
		return result === 0;
	}

	public setLocale(locale: string): void {
		setLocale(locale);
	}

	public get Menu(): typeof Electron.CrossProcessExports.Menu {
		return Menu;
	}

	public get MenuItem(): typeof Electron.CrossProcessExports.MenuItem {
		return MenuItem;
	}

	public openExternal(url: string): Promise<void> {
		return shell.openExternal(url);
	}

	public async openItem(fullPath: string): Promise<string> {
		return shell.openPath(toSystemSlashes(fullPath));
	}

	public screen(): Electron.Screen {
		return screen;
	}

	public shouldUseDarkColors(): boolean {
		return nativeTheme.shouldUseDarkColors;
	}

	public addEventListener(name: string, fn: Function): void {
		if (name === 'nativeThemeUpdated') {
			nativeTheme.on('updated', fn);
		} else {
			throw new Error(`Unsupported event: ${name}`);
		}
	}

	public ProgressBarDefinitive(msg = 'Preparing data...', detail = 'Wait...'): any {
		const progressBar = new ProgressBar({
			indeterminate: false,
			text: msg,
			detail: detail,
		});

		progressBar
			.on('completed', () => {
				// console.info('completed...');
				progressBar.detail = 'Task completed. Exiting...';
			})
			.on('aborted', (_value: number) => {
				// console.info(`aborted... ${_value}`);
			})
			.on('progress', (value: number) => {
				progressBar.detail = `Value ${value} out of ${progressBar.getOptions().maxValue}...`;
			});

		// setInterval(() => {
		// 	if (!progressBar.isCompleted()) {
		// 		progressBar.value += 1;
		// 	}
		// }, 20);
		return progressBar;
	}

	public ProgressBarIndefinitive(msg = 'Preparing data...', detail = 'Wait...'): any {
		const progressBar = new ProgressBar({
			text: msg,
			detail: detail,
		});

		progressBar
			.on('completed', () => {
				progressBar.detail = 'Task completed. Exiting...';
			})
			.on('aborted', (_value: number) => {
			});

		// setInterval(() => {
		// 	progressBar.setCompleted();
		// }, 4000);
		return progressBar;
	}

	public restart(linuxSafeRestart = true): void {
		// Note that in this case we are not sending the "appClose" event
		// to notify services and component that the app is about to close
		// but for the current use-case it's not really needed.

		if (shim.isPortable()) {
			const options = {
				execPath: process.env.PORTABLE_EXECUTABLE_FILE,
			};
			app.relaunch(options);
		} else if (shim.isLinux() && linuxSafeRestart) {
			// XJ test
			// this.showInfoMessageBox(_('The app is now going to close. Please relaunch it to complete the process.'));
			if (app.isPackaged && process.env.APPIMAGE) {
				const options: RelaunchOptions = {
					args: process.argv,
					execPath: process.execPath,
				};
				execFile(process.env.APPIMAGE, options.args);
				app.quit();
				return;
			}
			app.relaunch();
		} else {
			app.relaunch();
		}
		app.quit();
	}

	public createImageFromPath(path: string): Electron.NativeImage {
		return nativeImage.createFromPath(path);
	}

}

let bridge_: Bridge | null = null;

export function initBridge(wrapper: ElectronAppWrapper): Bridge {
	if (bridge_) throw new Error('Bridge already initialized');
	bridge_ = new Bridge(wrapper);
	return bridge_;
}

export default function bridge(): Bridge {
	if (!bridge_) throw new Error('Bridge not initialized');
	return bridge_;
}
