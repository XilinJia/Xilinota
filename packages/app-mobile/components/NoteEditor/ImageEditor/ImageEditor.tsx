import React from 'react';
import { _ } from '@xilinota/lib/locale';
import Logger from '@xilinota/utils/Logger';
import Setting from '@xilinota/lib/models/Setting';
import shim from '@xilinota/lib/shim';
import { themeStyle } from '@xilinota/lib/theme';
import { Theme } from '@xilinota/lib/themes/type';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, BackHandler } from 'react-native';
import { WebViewMessageEvent } from 'react-native-webview';
import ExtendedWebView, { WebViewControl } from '../../ExtendedWebView';
import { clearAutosave, writeAutosave } from './autosave';
import { LocalizedStrings } from './js-draw/types';

const logger = Logger.create('ImageEditor');

type OnSaveCallback = (svgData: string)=> void;
type OnCancelCallback = ()=> void;
type LoadInitialSVGCallback = ()=> Promise<string>;

interface Props {
	themeId: number;
	loadInitialSVGData: LoadInitialSVGCallback|null;
	onSave: OnSaveCallback;
	onExit: OnCancelCallback;
}

const useCss = (editorTheme: Theme) => {
	return useMemo(() => {
		// Ensure we have contrast between the background and selection. Some themes
		// have the same backgroundColor and selectionColor2. (E.g. Aritim Dark)
		let selectionBackgroundColor = editorTheme.selectedColor2;
		if (selectionBackgroundColor === editorTheme.backgroundColor) {
			selectionBackgroundColor = editorTheme.selectedColor;
		}

		return `
			:root .imageEditorContainer {
				--background-color-1: ${editorTheme.backgroundColor};
				--foreground-color-1: ${editorTheme.color};
				--background-color-2: ${editorTheme.backgroundColor3};
				--foreground-color-2: ${editorTheme.color3};
				--background-color-3: ${editorTheme.raisedBackgroundColor};
				--foreground-color-3: ${editorTheme.raisedColor};
			
				--selection-background-color: ${editorTheme.backgroundColorHover3};
				--selection-foreground-color: ${editorTheme.color3};
				--primary-action-foreground-color: ${editorTheme.color4};

				--primary-shadow-color: ${editorTheme.colorFaded};

				width: 100vw;
				height: 100vh;
				box-sizing: border-box;
			}

			body, html {
				padding: 0;
				margin: 0;
			}

			/* Hide the scrollbar. See scrollbar accessibility concerns
			   (https://developer.mozilla.org/en-US/docs/Web/CSS/scrollbar-width#accessibility_concerns)
			   for why this isn't done in js-draw itself. */
			.toolbar-tool-row::-webkit-scrollbar {
				display: none;
				height: 0;
			}

			/* Hide the save/close icons on small screens. This isn't done in the upstream
			   js-draw repository partially beause it isn't as well localized as Xilinota
			   (icons can be used to suggest the meaning of a button when a translation is
			   unavailable). */
			.toolbar-edge-toolbar:not(.one-row) .toolwidget-tag--save .toolbar-icon,
			.toolbar-edge-toolbar:not(.one-row) .toolwidget-tag--exit .toolbar-icon {
				display: none;
			}
		`;
	}, [editorTheme]);
};

const ImageEditor = (props: Props) => {
	const editorTheme: Theme = themeStyle(props.themeId);
	const webviewRef = useRef<WebViewControl>({injectJS: (_: string)=>{}});
	const [imageChanged, setImageChanged] = useState(false);

	const onRequestCloseEditor = useCallback((promptIfUnsaved: boolean) => {
		const discardChangesAndClose = async () => {
			await clearAutosave();
			props.onExit();
		};

		if (!imageChanged || !promptIfUnsaved) {
			void discardChangesAndClose();
			return true;
		}

		Alert.alert(
			_('Save changes?'), _('This drawing may have unsaved changes.'), [
				{
					text: _('Discard changes'),
					onPress: discardChangesAndClose,
					style: 'destructive',
				},
				{
					text: _('Save changes'),
					onPress: () => {
						// saveDrawing calls props.onSave(...) which may close the
						// editor.
						webviewRef?.current?.injectJS('window.editorControl.saveThenExit()');
					},
				},
			],
		);
		return true;
	}, [webviewRef, props.onExit, imageChanged]);

	useEffect(() => {
		const hardwareBackPressListener = () => {
			onRequestCloseEditor(true);
			return true;
		};
		BackHandler.addEventListener('hardwareBackPress', hardwareBackPressListener);

		return () => {
			BackHandler.removeEventListener('hardwareBackPress', hardwareBackPressListener);
		};
	}, [onRequestCloseEditor]);

	const css = useCss(editorTheme);
	const html = useMemo(() => `
		<!DOCTYPE html>
		<html>
			<head>
				<meta charset="utf-8"/>
				<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>

				<style>
					${css}
				</style>
			</head>
			<body></body>
		</html>
	`, [css]);

	// A set of localization overrides (Xilinota is better localized than js-draw).
	// All localizable strings (some unused?) can be found at
	// https://github.com/personalizedrefrigerator/js-draw/blob/main/.github/ISSUE_TEMPLATE/translation-js-draw-new.yml
	const localizedStrings: LocalizedStrings = useMemo(() => ({
		save: _('Save'),
		close: _('Close'),
		undo: _('Undo'),
		redo: _('Redo'),
	}), []);

	const injectedJavaScript = useMemo(() => `
		window.onerror = (message, source, lineno) => {
			window.ReactNativeWebView.postMessage(
				"error: " + message + " in file://" + source + ", line " + lineno
			);
		};

		const setImageHasChanges = (hasChanges) => {
			window.ReactNativeWebView.postMessage(
				JSON.stringify({
					action: 'set-image-has-changes',
					data: hasChanges,
				}),
			);
		};

		window.updateEditorTemplate = (templateData) => {
			window.ReactNativeWebView.postMessage(
				JSON.stringify({
					action: 'set-image-template-data',
					data: templateData,
				}),
			);
		};

		const notifyReadyToLoadSVG = () => {
			window.ReactNativeWebView.postMessage(
				JSON.stringify({
					action: 'ready-to-load-data',
				})
			);
		};

		const saveDrawing = async (drawing, isAutosave) => {
			window.ReactNativeWebView.postMessage(
				JSON.stringify({
					action: isAutosave ? 'autosave' : 'save',
					data: drawing.outerHTML,
				}),
			);
		};

		const closeEditor = (promptIfUnsaved) => {
			window.ReactNativeWebView.postMessage(JSON.stringify({
				action: 'close',
				promptIfUnsaved,
			}));
		};

		try {
			if (window.editorControl === undefined) {
				${shim.injectedJs('svgEditorBundle')}

				window.editorControl = svgEditorBundle.createJsDrawEditor(
					{
						saveDrawing,
						closeEditor,
						updateEditorTemplate,
						setImageHasChanges,
					},
					${JSON.stringify(Setting.value('imageeditor.jsdrawToolbar'))},
					${JSON.stringify(Setting.value('locale'))},
					${JSON.stringify(localizedStrings)},
				);

				// Start loading the SVG file (if present) after loading the editor.
				// This shows the user that progress is being made (loading large SVGs
				// from disk into memory can take several seconds).
				notifyReadyToLoadSVG();
			}
		} catch(e) {
			window.ReactNativeWebView.postMessage(
				'error: ' + e.message + ': ' + JSON.stringify(e)
			);
		}
		true;
	`, [localizedStrings]);

	useEffect(() => {
		webviewRef.current?.injectJS(`
			if (window.editorControl) {
				window.editorControl.onThemeUpdate();
			}
		`);
	}, [editorTheme]);

	const onReadyToLoadData = useCallback(async () => {
		const initialSVGData = await props.loadInitialSVGData?.() ?? '';

		// It can take some time for initialSVGData to be transferred to the WebView.
		// Thus, do so after the main content has been loaded.
		webviewRef?.current?.injectJS(`(async () => {
			if (window.editorControl) {
				const initialSVGData = ${JSON.stringify(initialSVGData)};
				const initialTemplateData = ${JSON.stringify(Setting.value('imageeditor.imageTemplate'))};

				editorControl.loadImageOrTemplate(initialSVGData, initialTemplateData);
			}
		})();`);
	}, [webviewRef, props.loadInitialSVGData]);

	const onMessage = useCallback(async (event: WebViewMessageEvent) => {
		const data = event.nativeEvent.data;
		if (data.startsWith('error:')) {
			logger.error('ImageEditor:', data);
			return;
		}

		const json = JSON.parse(data);
		if (json.action === 'save') {
			await clearAutosave();
			props.onSave(json.data);
		} else if (json.action === 'autosave') {
			await writeAutosave(json.data);
		} else if (json.action === 'save-toolbar') {
			Setting.setValue('imageeditor.jsdrawToolbar', json.data);
		} else if (json.action === 'close') {
			onRequestCloseEditor(json.promptIfUnsaved);
		} else if (json.action === 'ready-to-load-data') {
			void onReadyToLoadData();
		} else if (json.action === 'set-image-has-changes') {
			setImageChanged(json.data);
		} else if (json.action === 'set-image-template-data') {
			Setting.setValue('imageeditor.imageTemplate', json.data);
		} else {
			logger.error('Unknown action,', json.action);
		}
	}, [props.onSave, onRequestCloseEditor, onReadyToLoadData]);

	const onError = useCallback((event: any) => {
		logger.error('ImageEditor: WebView error: ', event);
	}, []);

	return (
		<ExtendedWebView
			themeId={props.themeId}
			html={html}
			injectedJavaScript={injectedJavaScript}
			onMessage={onMessage}
			onError={onError}
			ref={webviewRef}
			webviewInstanceId={'image-editor-js-draw'}
		/>
	);
};

export default ImageEditor;
