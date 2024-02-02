import Logger from '@xilinota/utils/Logger';
import Plugin from './plugins/Plugin';
import { MenuItem } from './commands/MenuUtils';

export default class PluginManager {
	plugins_: Record<string, any>;
	logger_: Logger;
	static instance_: PluginManager;

	constructor() {
		this.plugins_ = {};
		this.logger_ = new Logger();
	}

	setLogger(l: Logger): void {
		this.logger_ = l;
	}

	logger(): Logger {
		return this.logger_;
	}

	static instance(): PluginManager {
		if (this.instance_) return this.instance_;
		this.instance_ = new PluginManager();
		return this.instance_;
	}

	register(classes: Plugin | Plugin[]): void {
		if (!Array.isArray(classes)) classes = [classes];

		for (let i = 0; i < classes.length; i++) {
			const PluginClass: Plugin = classes[i];

			if (this.plugins_[PluginClass.manifest.name]) throw new Error(`Already registered: ${PluginClass.manifest.name}`);

			this.plugins_[PluginClass.manifest.name] = {
				Class: PluginClass,
				instance: null,
			};
		}
	}

	pluginInstance_(name: string) {
		const p = this.plugins_[name];
		if (p.instance) return p.instance;
		p.instance = new p.Class();
		p.instance.dispatch = (action: any) => this.dispatch_(action);
		return p.instance;
	}

	dispatch_(_action: any) {
		throw new Error('Method not implemented.');
	}

	pluginClass_(name: string) {
		return this.plugins_[name].Class;
	}

	onPluginMenuItemTrigger_(event: { pluginName: any; itemName: any; userData: any; }): void {
		const p = this.pluginInstance_(event.pluginName);
		p.onTrigger({
			itemName: event.itemName,
			userData: event.userData,
		});
	}

	pluginDialogToShow(pluginStates: { [x: string]: any; }): {
		Dialog: any;
		props: {
			userData: any;
			dispatch: (action: any) => void;
			plugin: any;
		};
	} | null {

		for (const name in pluginStates) {
			const p = pluginStates[name];
			if (!p.dialogOpen) continue;

			const Class = this.pluginClass_(name);
			if (!Class.Dialog) continue;

			return {
				Dialog: Class.Dialog,
				props: { ...this.dialogProps_(name), userData: p.userData },
			};
		}

		return null;
	}

	dialogProps_(name: string): {
		dispatch: (action: any) => void;
		plugin: any;
	} {
		return {
			dispatch: (action: any) => this.dispatch_(action),
			plugin: this.pluginInstance_(name),
		};
	}

	menuItems(): MenuItem[] {
		let output: MenuItem[] = [];
		for (const name in this.plugins_) {
			const menuItems = this.plugins_[name].Class.manifest.menuItems.slice();
			if (!menuItems) continue;

			for (let i = 0; i < menuItems.length; i++) {
				const item = { ...menuItems[i] };

				item.click = () => {
					this.onPluginMenuItemTrigger_({
						pluginName: name,
						itemName: item.name,
						userData: item.userData,
					});
				};

				if (menuItems[i].accelerator) item.accelerator = menuItems[i].accelerator();

				menuItems[i] = item;
			}

			output = output.concat(menuItems);
		}

		return output;
	}
}

// module.exports = PluginManager;
