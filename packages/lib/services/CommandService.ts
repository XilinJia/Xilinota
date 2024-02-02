import eventManager from '../eventManager';
import BaseService from './BaseService';
import shim from '../shim';
import WhenClause from './WhenClause';
import { State } from '../reducer';

type LabelFunction = () => string;
type EnabledCondition = string;

type AppState = State & any;
export interface CommandContext {
	// The state may also be of type "AppState" (used by the desktop app), which inherits from "State" (used by all apps)
	state: AppState;
	dispatch: Function;
}

export interface CommandRuntime {
	execute: (context: CommandContext, ...args: any[]) => Promise<any | void>;
	enabledCondition?: EnabledCondition;
	// Used for the (optional) toolbar button title
	mapStateToTitle?: (state: any) => string;
}

export interface CommandDeclaration {
	name: string;

	// Used for the menu item label, and toolbar button tooltip
	label?: LabelFunction | string;

	// Command description - if none is provided, the label will be used as description
	description?: string;

	// This is a bit of a hack because some labels don't make much sense in isolation. For example,
	// the commmand to focus the note list is called just "Note list". This makes sense within the menu
	// but not so much within the keymap config screen, where the parent item is not displayed. Because
	// of this we have this "parentLabel()" property to clarify the meaning of the certain items.
	// For example, the focusElementNoteList will have these two properties:
	//     label() => _('Note list'),
	//     parentLabel() => _('Focus'),
	// Which will be displayed as "Focus: Note list" in the keymap config screen.
	parentLabel?: LabelFunction | string;

	// All free Font Awesome icons are available: https://fontawesome.com/icons?d=gallery&m=free
	iconName?: string;

	// Same as `role` key in Electron MenuItem:
	// https://www.electronjs.org/docs/api/menu-item#new-menuitemoptions
	// Note that due to a bug in Electron, menu items with a role cannot
	// be disabled.
	role?: string;
}

export interface Command {
	declaration: CommandDeclaration;
	runtime?: CommandRuntime;
}

interface Commands {
	[key: string]: Command;
}

interface ReduxStore {
	dispatch: (action: any) => void;
	getState: () => any;
}

interface Utils {
	store: ReduxStore;
}

export const utils: Utils = {
	store: {
		dispatch: () => { },
		getState: () => { },
	},
};

interface CommandByNameOptions {
	mustExist?: boolean;
	runtimeMustBeRegistered?: boolean;
}

export interface SearchResult {
	commandName: string;
	title: string;
}

export default class CommandService extends BaseService {

	private static instance_: CommandService;

	public static instance(): CommandService {
		if (this.instance_) return this.instance_;
		this.instance_ = new CommandService();
		return this.instance_;
	}

	private commands_: Commands = {};
	private store_: ReduxStore | undefined;
	private devMode_: boolean | undefined;
	private stateToWhenClauseContext_: ((s: AppState, options?: any) => any) | undefined;

	public initialize(store: ReduxStore, devMode: boolean, stateToWhenClauseContext: (s: AppState, options?: any) => any): void {
		utils.store = store;
		this.store_ = store;
		this.devMode_ = devMode;
		this.stateToWhenClauseContext_ = stateToWhenClauseContext;
	}

	public on(eventName: string, callback: Function): void {
		eventManager.on(eventName, callback);
	}

	public off(eventName: string, callback: Function): void {
		eventManager.off(eventName, callback);
	}

	public searchCommands(query: string, returnAllWhenEmpty: boolean, excludeWithoutLabel = true): SearchResult[] {
		query = query.toLowerCase();

		const output = [];

		const whenClauseContext = this.currentWhenClauseContext();

		for (const commandName of this.commandNames()) {
			const label = this.label(commandName, true);
			if (!label && excludeWithoutLabel) continue;
			if (!this.isEnabled(commandName, whenClauseContext)) continue;

			const title = label ? `${label} (${commandName})` : commandName;

			if ((returnAllWhenEmpty && !query) || title.toLowerCase().includes(query)) {
				output.push({
					commandName: commandName,
					title: title,
				});
			}
		}

		output.sort((a: SearchResult, b: SearchResult) => {
			return a.title.toLowerCase() < b.title.toLowerCase() ? -1 : +1;
		});

		return output;
	}

	public commandNames(publicOnly = false): string[] {
		if (publicOnly) {
			const output = [];
			for (const name in this.commands_) {
				if (!this.isPublic(name)) continue;
				output.push(name);
			}
			return output;
		} else {
			return Object.keys(this.commands_);
		}
	}

	public commandByName(name: string, options: CommandByNameOptions = {}): Command | null {
		options = {
			mustExist: false,
			runtimeMustBeRegistered: false,
			...options,
		};

		const command = this.commands_[name];

		if (!command) {
			if (options.mustExist) throw new Error(`Command not found: ${name}. Make sure the declaration has been registered.`);
			return null;
		}

		if (options.runtimeMustBeRegistered && !command.runtime) throw new Error(`Runtime is not registered for command ${name}`);
		return command;
	}

	public registerDeclaration(declaration: CommandDeclaration): void {
		declaration = { ...declaration };
		if (!declaration.label) declaration.label = '';
		if (!declaration.iconName) declaration.iconName = 'fas fa-cog';

		this.commands_[declaration.name] = {
			declaration: declaration,
		};
	}

	public registerRuntime(commandName: string, runtime: CommandRuntime): void {
		if (typeof commandName !== 'string') throw new Error(`Command name must be a string. Got: ${JSON.stringify(commandName)}`);

		const command = this.commandByName(commandName);

		runtime = { ...runtime };
		if (!runtime.enabledCondition) runtime.enabledCondition = 'true';
		if (command) command.runtime = runtime;
	}

	public registerCommands(commands: Command[]): void {
		for (const command of commands) {
			if (!command.runtime) {
				BaseService.logger().warn('command runtime undefined, ignore:', command);
				continue;
			}
			CommandService.instance().registerRuntime(command.declaration.name, command.runtime);
		}
	}

	public unregisterCommands(commands: Command[]): void {
		for (const command of commands) {
			CommandService.instance().unregisterRuntime(command.declaration.name);
		}
	}

	public componentRegisterCommands(_component: any, commands: Command[]): void {
		for (const command of commands) {
			if (!command.runtime) {
				BaseService.logger().warn('command runtime undefined, ignore:', command);
				continue;
			}
			// TODO: not sure what this does
			// CommandService.instance().registerRuntime(command.declaration.name, command.runtime(component));
			CommandService.instance().registerRuntime(command.declaration.name, command.runtime);
		}
	}

	public componentUnregisterCommands(commands: Command[]): void {
		for (const command of commands) {
			CommandService.instance().unregisterRuntime(command.declaration.name);
		}
	}

	public unregisterRuntime(commandName: string): void {
		const command = this.commandByName(commandName, { mustExist: false });
		if (!command || !command.runtime) return;
		delete command.runtime;
	}

	private createContext(): CommandContext {
		return {
			state: this.store_!.getState(),
			dispatch: (action: any) => {
				this.store_!.dispatch(action);
			},
		};
	}

	public async execute(commandName: string, ...args: any[]): Promise<any | void> {
		// TODO: somehow, commandName can be undefined???
		if (!commandName) return;
		const command = this.commandByName(commandName);
		// Some commands such as "showModalMessage" can be executed many
		// times per seconds, so we should only display this message in
		// debug mode.
		if (commandName !== 'showModalMessage') BaseService.logger().debug('CommandService::execute:', commandName, args);
		if (!command || !command.runtime) throw new Error(`Cannot execute a command without a runtime: ${commandName}`);
		return command.runtime.execute(this.createContext(), ...args);
	}

	public scheduleExecute(commandName: string, args: any): void {
		shim.setTimeout(() => {
			void this.execute(commandName, args);
		}, 10);
	}

	public currentWhenClauseContext() {
		return this.stateToWhenClauseContext_!(this.store_!.getState());		// set during initialize
	}

	public isPublic(commandName: string): boolean {
		return !!this.label(commandName);
	}

	// When looping on commands and checking their enabled state, the whenClauseContext
	// should be specified (created using currentWhenClauseContext) to avoid having
	// to re-create it on each call.
	public isEnabled(commandName: string, whenClauseContext: any = null): boolean {
		const command = this.commandByName(commandName);
		if (!command || !command.runtime) return false;

		if (!whenClauseContext) whenClauseContext = this.currentWhenClauseContext();

		const exp = new WhenClause(command.runtime.enabledCondition ?? '', this.devMode_);
		return exp.evaluate(whenClauseContext);
	}

	// The title is dynamic and derived from the state, which is why the state is passed
	// as an argument. Title can be used for example to display the alarm date on the
	// "set alarm" toolbar button.
	public title(commandName: string, state: AppState | null = null): string {
		const command = this.commandByName(commandName);
		if (!command || !command.runtime) return '';

		state = state || this.store_!.getState();

		if (command.runtime.mapStateToTitle) {
			return command.runtime.mapStateToTitle(state);
		} else {
			return '';
		}
	}

	public iconName(commandName: string): string {
		const command = this.commandByName(commandName);
		if (!command) {
			// throw new Error(`No such command: ${commandName}`);
			BaseService.logger().warn('CommandService commandName invalid', commandName);
			return '';
		}

		return command.declaration.iconName ?? '';
	}

	public label(commandName: string, fullLabel = false): string {
		const command = this.commandByName(commandName);
		if (!command) {
			// throw new Error(`Command: ${commandName} is not declared`);
			BaseService.logger().warn('CommandService commandName invalid', commandName);
			return '';
		}
		const output = [];

		const parentLabel = (d: CommandDeclaration): string => {
			if (!d.parentLabel) return '';
			if (typeof d.parentLabel === 'function') return d.parentLabel();
			return d.parentLabel as string;
		};

		if (fullLabel && parentLabel(command.declaration)) output.push(parentLabel(command.declaration));
		output.push(typeof command.declaration.label === 'function' ? command.declaration.label() : command.declaration.label);
		return output.join(': ');
	}

	public description(commandName: string): string {
		const command = this.commandByName(commandName);
		if (command && command.declaration.description) return command.declaration.description;
		return this.label(commandName, true);
	}

	public exists(commandName: string): boolean {
		const command = this.commandByName(commandName, { mustExist: false });
		return !!command;
	}
}
