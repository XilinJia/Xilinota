import * as React from 'react';
import { ForwardedRef } from 'react';
import { useEffect, useState, useRef, forwardRef, useImperativeHandle } from 'react';
import { EditorProps, LogMessageCallback, OnEventCallback, PluginData } from '@xilinota/editor/types';
import createEditor from '@xilinota/editor/CodeMirror/createEditor';
import CodeMirrorControl from '@xilinota/editor/CodeMirror/CodeMirrorControl';
import { PluginStates } from '@xilinota/lib/services/plugins/reducer';
import { ContentScriptType } from '@xilinota/lib/services/plugins/api/types';
import shim from '@xilinota/lib/shim';
import PluginService from '@xilinota/lib/services/plugins/PluginService';
import setupVim from '../utils/setupVim';

interface Props extends EditorProps {
	style: React.CSSProperties;
	pluginStates: PluginStates;

	onEditorPaste: (event: Event)=> void;
}

const Editor = (props: Props, ref: ForwardedRef<CodeMirrorControl>) => {
	const editorContainerRef = useRef<HTMLDivElement>();
	const [editor, setEditor] = useState<CodeMirrorControl|null>(null);

	// The editor will only be created once, so callbacks that could
	// change need to be stored as references.
	const onEventRef = useRef<OnEventCallback>(props.onEvent);
	const onLogMessageRef = useRef<LogMessageCallback>(props.onLogMessage);

	useEffect(() => {
		onEventRef.current = props.onEvent;
		onLogMessageRef.current = props.onLogMessage;
	}, [props.onEvent, props.onLogMessage]);

	useEffect(() => {
		if (!editor) {
			return () => {};
		}

		const pasteEventHandler = (_editor: any, event: Event) => {
			props.onEditorPaste(event);
		};

		editor.on('paste', pasteEventHandler);

		return () => {
			editor.off('paste', pasteEventHandler);
		};
	}, [editor, props.onEditorPaste]);

	useImperativeHandle(ref, () => {
		return editor;
	}, [editor]);

	useEffect(() => {
		if (!editor) {
			return;
		}

		const plugins: PluginData[] = [];
		for (const pluginId in props.pluginStates) {
			const pluginState = props.pluginStates[pluginId];
			const codeMirrorContentScripts = pluginState.contentScripts[ContentScriptType.CodeMirrorPlugin] ?? [];

			for (const contentScript of codeMirrorContentScripts) {
				plugins.push({
					pluginId,
					contentScriptId: contentScript.id,
					contentScriptJs: () => shim.fsDriver().readFile(contentScript.path),
					postMessageHandler: (message: any) => {
						const plugin = PluginService.instance().pluginById(pluginId);
						return plugin.emitContentScriptMessage(contentScript.id, message);
					},
				});
			}
		}

		void editor.setPlugins(plugins);
	}, [editor, props.pluginStates]);

	useEffect(() => {
		if (!editorContainerRef.current) return () => {};

		const editorProps: EditorProps = {
			...props,
			onEvent: event => onEventRef.current(event),
			onLogMessage: message => onLogMessageRef.current(message),
		};

		const editor = createEditor(editorContainerRef.current, editorProps);
		editor.addStyles({
			'.cm-scroller': { overflow: 'auto' },
		});
		setEditor(editor);

		return () => {
			editor.remove();
		};
	// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Should run just once
	}, []);

	useEffect(() => {
		editor?.updateSettings(props.settings);
	}, [props.settings, editor]);

	useEffect(() => {
		if (!editor) {
			return;
		}

		setupVim(editor);
	}, [editor]);

	return (
		<div
			style={props.style}
			ref={editorContainerRef}
		></div>
	);
};

export default forwardRef(Editor);
