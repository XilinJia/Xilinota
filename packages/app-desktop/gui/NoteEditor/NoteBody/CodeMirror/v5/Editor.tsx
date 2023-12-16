import * as React from 'react';
import { useEffect, useImperativeHandle, useState, useRef, useCallback, forwardRef } from 'react';
import { PluginStates } from '@xilinota/lib/services/plugins/reducer';

import CodeMirror from 'codemirror';

import 'codemirror/addon/comment/comment';
import 'codemirror/addon/dialog/dialog';
import 'codemirror/addon/edit/closebrackets';
import 'codemirror/addon/edit/continuelist';
import 'codemirror/addon/scroll/annotatescrollbar';
import 'codemirror/addon/search/matchesonscrollbar';
import 'codemirror/addon/search/searchcursor';

import useListIdent from '../utils/useListIdent';
import useScrollUtils from '../utils/useScrollUtils';
import useCursorUtils from '../utils/useCursorUtils';
import useLineSorting from '../utils/useLineSorting';
import useEditorSearch from '../utils/useEditorSearch';
import useXilinotaMode from '../utils/useXilinotaMode';
import useKeymap from '../utils/useKeymap';
import useExternalPlugins from '../utils/useExternalPlugins';
import useXilinotaCommands from '../utils/useXilinotaCommands';

import 'codemirror/keymap/emacs';
import 'codemirror/keymap/vim';
import 'codemirror/keymap/sublime'; // Used for swapLineUp and swapLineDown

import 'codemirror/mode/meta';

import Setting from '@xilinota/lib/models/Setting';

// import eventManager from '@xilinota/lib/eventManager';

import { reg } from '@xilinota/lib/registry';

// Based on http://pypl.github.io/PYPL.html
const topLanguages = [
	'python',
	'clike',
	'javascript',
	'jsx',
	'php',
	'r',
	'swift',
	'go',
	'vb',
	'vbscript',
	'ruby',
	'rust',
	'dart',
	'lua',
	'groovy',
	'perl',
	'cobol',
	'julia',
	'haskell',
	'pascal',
	'css',

	// Additional languages, not in the PYPL list
	'xml', // For HTML too
	'markdown',
	'yaml',
	'shell',
	'dockerfile',
	'diff',
	'erlang',
	'sql',
];
// Load Top Modes
for (let i = 0; i < topLanguages.length; i++) {
	const mode = topLanguages[i];

	if (CodeMirror.modeInfo.find((m: any) => m.mode === mode)) {
		require(`codemirror/mode/${mode}/${mode}`);
	} else {
		reg.logger().error('Cannot find CodeMirror mode: ', mode);
	}
}
export interface EditorProps {
	value: string;
	searchMarkers: any;
	mode: string;
	style: any;
	codeMirrorTheme: any;
	readOnly: boolean;
	autoMatchBraces: boolean | object;
	keyMap: string;
	plugins: PluginStates;
	onChange: any;
	onScroll: any;
	onEditorPaste: any;
	isSafeMode: boolean;
	onResize: any;
	onUpdate: any;
}

function Editor(props: EditorProps, ref: any) {
	const [editor, setEditor] = useState(null);
	const editorParent = useRef(null);
	const lastEditTime = useRef(NaN);

	// Codemirror plugins add new commands to codemirror (or change it's behavior)
	// This command adds the smartListIndent function which will be bound to tab
	useListIdent(CodeMirror);
	useScrollUtils(CodeMirror);
	useCursorUtils(CodeMirror);
	useLineSorting(CodeMirror);
	useEditorSearch(CodeMirror);
	useXilinotaMode(CodeMirror);
	const pluginOptions: any = useExternalPlugins(CodeMirror, props.plugins);
	useKeymap(CodeMirror);
	useXilinotaCommands(CodeMirror);

	useImperativeHandle(ref, () => {
		return editor;
	});

	const editor_change = useCallback((cm: any, change: any) => {
		if (props.onChange && change.origin !== 'setValue') {
			props.onChange(cm.getValue());
			lastEditTime.current = Date.now();
		}
	}, [props.onChange]);

	// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
	const editor_scroll = useCallback((_cm: any) => {
		props.onScroll();
	}, [props.onScroll]);

	// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
	const editor_paste = useCallback((_cm: any, _event: any) => {
		props.onEditorPaste();
	}, [props.onEditorPaste]);

	// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
	const editor_drop = useCallback((cm: any, _event: any) => {
		cm.focus();
	}, []);

	const editor_drag = useCallback((cm: any, event: any) => {
		// This is the type for all drag and drops that are external to codemirror
		// setting the cursor allows us to drop them in the right place
		if (event.dataTransfer.effectAllowed === 'all') {
			const coords = cm.coordsChar({ left: event.x, top: event.y });
			cm.setCursor(coords);
		}

		event.dataTransfer.dropEffect = 'copy';
	}, []);

	const editor_resize = useCallback((cm: any) => {
		props.onResize(cm);
	}, [props.onResize]);

	const editor_update = useCallback((cm: any) => {
		const edited = Date.now() - lastEditTime.current <= 100;
		props.onUpdate(cm, edited);
	}, [props.onUpdate]);

	useEffect(() => {
		if (!editorParent.current) return () => {};

		const userOptions = {};

		const safeOptions: Record<string, any> = {
			value: props.value,
			readOnly: props.readOnly,
		};

		const unsafeOptions: Record<string, any> = {
			screenReaderLabel: props.value,
			theme: props.codeMirrorTheme,
			mode: props.mode,
			readOnly: props.readOnly,
			autoCloseBrackets: props.autoMatchBraces,
			inputStyle: Setting.value('editor.spellcheckBeta') ? 'contenteditable' : 'textarea',
			lineWrapping: true,
			lineNumbers: false,
			indentWithTabs: true,
			indentUnit: 4,
			spellcheck: true,
			allowDropFileTypes: [''], // disable codemirror drop handling
			keyMap: props.keyMap ? props.keyMap : 'default',
		};

		let cmOptions: Record<string, any> = { ...safeOptions };

		if (!props.isSafeMode) {
			cmOptions = {
				...cmOptions,
				...unsafeOptions,
				...userOptions,
			};
		}

		const cm = CodeMirror(editorParent.current, cmOptions);
		setEditor(cm);
		cm.on('change', editor_change);
		cm.on('scroll', editor_scroll);
		cm.on('paste', editor_paste);
		cm.on('drop', editor_drop);
		cm.on('dragover', editor_drag);
		cm.on('refresh', editor_resize);
		cm.on('update', editor_update);

		// It's possible for searchMarkers to be available before the editor
		// In these cases we set the markers asap so the user can see them as
		// soon as the editor is ready
		if (props.searchMarkers) { cm.setMarkers(props.searchMarkers.keywords, props.searchMarkers.options); }

		return () => {
			// Clean up codemirror
			cm.off('change', editor_change);
			cm.off('scroll', editor_scroll);
			cm.off('paste', editor_paste);
			cm.off('drop', editor_drop);
			cm.off('dragover', editor_drag);
			cm.off('refresh', editor_resize);
			cm.off('update', editor_update);
			// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
			if (editorParent.current) editorParent.current.removeChild(cm.getWrapperElement());
			setEditor(null);
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, []);

	useEffect(() => {
		if (editor) {
			//  Value can also be changed by the editor itself so we need this guard
			//  to prevent loops
			if (props.value !== editor.getValue()) {
				editor.setValue(props.value);
				editor.clearHistory();
			}
			editor.setOption('screenReaderLabel', props.value);
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.value]);

	useEffect(() => {
		if (editor) {
			editor.setOption('theme', props.codeMirrorTheme);
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.codeMirrorTheme]);

	useEffect(() => {
		if (editor) {
			editor.setOption('mode', props.mode);
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.mode]);

	useEffect(() => {
		if (editor) {
			editor.setOption('readOnly', props.readOnly);
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.readOnly]);

	useEffect(() => {
		if (editor) {
			editor.setOption('autoCloseBrackets', props.autoMatchBraces);
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.autoMatchBraces]);

	useEffect(() => {
		if (editor) {
			editor.setOption('keyMap', props.keyMap ? props.keyMap : 'default');
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.keyMap]);

	useEffect(() => {
		if (editor) {
			for (const option in pluginOptions) {
				editor.setOption(option, pluginOptions[option]);
			}
		}
	}, [pluginOptions, editor]);

	return <div className='codeMirrorEditor' style={props.style} ref={editorParent} />;
}

export default forwardRef(Editor);
