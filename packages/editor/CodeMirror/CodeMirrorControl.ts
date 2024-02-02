import { EditorView } from '@codemirror/view';
import { EditorCommandType, EditorControl, EditorSettings, LogMessageCallback, PluginData, SearchState } from '../types';
import CodeMirror5Emulation from './CodeMirror5Emulation/CodeMirror5Emulation';
import editorCommands from './editorCommands/editorCommands';
import { EditorSelection, StateEffect } from '@codemirror/state';
import { updateLink } from './markdown/markdownCommands';
import { SearchQuery, setSearchQuery } from '@codemirror/search';
import PluginLoader from './PluginLoader';

interface Callbacks {
	onUndoRedo(): void;
	onSettingsChange(newSettings: EditorSettings): void;
	onClearHistory(): void;
	onRemove(): void;
	onLogMessage: LogMessageCallback;
}

export default class CodeMirrorControl extends CodeMirror5Emulation implements EditorControl {
	private _pluginControl: PluginLoader;

	public constructor(
		editor: EditorView,
		private _callbacks: Callbacks,
	) {
		super(editor, _callbacks.onLogMessage);

		this._pluginControl = new PluginLoader(this, _callbacks.onLogMessage);
	}

	public supportsCommand(name: string): boolean {
		return name in editorCommands || super.commandExists(name);
	}

	public override execCommand(name: string): void {
		if (name in editorCommands) {
			editorCommands[name as EditorCommandType](this.editor);
		} else if (super.commandExists(name)) {
			super.execCommand(name);
		}

		if (name === EditorCommandType.Undo || name === EditorCommandType.Redo) {
			this._callbacks.onUndoRedo();
		}
	}

	public undo(): void {
		this.execCommand(EditorCommandType.Undo);
		this._callbacks.onUndoRedo();
	}

	public redo(): void {
		this.execCommand(EditorCommandType.Redo);
		this._callbacks.onUndoRedo();
	}

	public select(anchor: number, head: number): void {
		this.editor.dispatch(this.editor.state.update({
			selection: { anchor, head },
			scrollIntoView: true,
		}));
	}

	public clearHistory(): void {
		this._callbacks.onClearHistory();
	}

	public setScrollPercent(fraction: number): void {
		const maxScroll = this.editor.scrollDOM.scrollHeight - this.editor.scrollDOM.clientHeight;
		this.editor.scrollDOM.scrollTop = fraction * maxScroll;
	}

	public insertText(text: string): void {
		this.editor.dispatch(this.editor.state.replaceSelection(text));
	}

	public updateBody(newBody: string): boolean {
		// TODO: doc.toString() can be slow for large documents.
		const currentBody = this.editor.state.doc.toString();

		if (newBody !== currentBody) {
			// For now, collapse the selection to a single cursor
			// to ensure that the selection stays within the document
			// (and thus avoids an exception).
			const mainCursorPosition = this.editor.state.selection.main.anchor;
			const newCursorPosition = Math.min(mainCursorPosition, newBody.length);

			this.editor.dispatch(this.editor.state.update({
				changes: {
					from: 0,
					to: this.editor.state.doc.length,
					insert: newBody,
				},
				selection: EditorSelection.cursor(newCursorPosition),
				scrollIntoView: true,
			}));

			return true;
		}

		return false;
	}

	public updateLink(newLabel: string, newUrl: string): void {
		updateLink(newLabel, newUrl)(this.editor);
	}

	public updateSettings(newSettings: EditorSettings): void {
		this._callbacks.onSettingsChange(newSettings);
	}

	public setSearchState(newState: SearchState): void {
		const query = new SearchQuery({
			search: newState.searchText,
			caseSensitive: newState.caseSensitive,
			regexp: newState.useRegex,
			replace: newState.replaceText,
		});
		this.editor.dispatch({
			effects: setSearchQuery.of(query),
		});
	}

	public addStyles(...styles: Parameters<typeof EditorView.theme>): void {
		this.editor.dispatch({
			effects: StateEffect.appendConfig.of(EditorView.theme(...styles)),
		});
	}

	public setPlugins(plugins: PluginData[]): Promise<void> {
		return this._pluginControl.setPlugins(plugins);
	}

	public remove(): void {
		this._pluginControl.remove();
		this._callbacks.onRemove();
	}
}
