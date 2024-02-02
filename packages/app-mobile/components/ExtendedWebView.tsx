// Wraps react-native-webview. Allows loading HTML directly.

import React from 'react';

import {
	forwardRef, Ref, useEffect, useImperativeHandle, useRef, useState,
} from 'react';
import { WebView, WebViewMessageEvent } from 'react-native-webview';
import { WebViewErrorEvent, WebViewEvent, WebViewSource } from 'react-native-webview/lib/WebViewTypes';

import Setting from '@xilinota/lib/models/Setting';
import { themeStyle } from '@xilinota/lib/theme';
import { Theme } from '@xilinota/lib/themes/type';
import shim from '@xilinota/lib/shim';
import { StyleProp, ViewStyle } from 'react-native';


export interface WebViewControl {
	// Evaluate the given [script] in the context of the page.
	// Unlike react-native-webview/WebView, this does not need to return true.
	injectJS(script: string): void;
}

interface SourceFileUpdateEvent {
	uri: string;
	baseUrl: string;

	filePath: string;
}

type OnMessageCallback = (event: WebViewMessageEvent) => void;
type OnErrorCallback = (event: WebViewErrorEvent) => void;
type OnLoadEndCallback = (event: WebViewEvent) => void;
type OnFileUpdateCallback = (event: SourceFileUpdateEvent) => void;

interface Props {
	themeId: number;

	// A name to be associated with the WebView (e.g. NoteEditor)
	// This name should be unique.
	webviewInstanceId: string;

	// If HTML is still being loaded, [html] should be an empty string.
	html: string;

	// Allow a secure origin to load content from any other origin.
	// Defaults to 'never'.
	// See react-native-webview's prop with the same name.
	mixedContentMode?: 'never' | 'always';

	// Initial javascript. Must evaluate to true.
	injectedJavaScript: string;

	// iOS only: Scroll the outer content of the view. Set this to `false` if
	// the main view container doesn't scroll.
	scrollEnabled?: boolean;

	style?: StyleProp<ViewStyle>;
	onMessage: OnMessageCallback;
	onError: OnErrorCallback;
	onLoadEnd?: OnLoadEndCallback;

	// Triggered when the file containing [html] is overwritten with new content.
	onFileUpdate?: OnFileUpdateCallback;
}

const ExtendedWebView = (props: Props, ref: Ref<WebViewControl>): React.JSX.Element => {
	const theme: Theme = themeStyle(props.themeId);
	const webviewRef = useRef<WebView>(null);
	const blankSource: WebViewSource = { uri: '', baseUrl: '', }
	const [source, setSource] = useState<WebViewSource>(blankSource);

	useImperativeHandle(ref, (): WebViewControl => {
		return {
			injectJS(js: string) {
				webviewRef.current?.injectJavaScript(`
				try {
					${js}
				}
				catch(e) {
					logMessage('Error in injected JS:' + e, e);
					throw e;
				};

				true;`);
			},
		};
	});

	// props.onLoadEnd = () => {
	// 	console.log('props.onLoadEnd', webviewRef.current);
	// 	webviewRef.current?.injectJavaScript(props.injectedJavaScript);
	// };

	useEffect(() => {
		let cancelled = false;
		async function createHtmlFile(): Promise<void> {
			const tempFile = `${Setting.value('resourceDir')}/${props.webviewInstanceId}.html`;
			// console.log('createHtmlFile:', tempFile);
			await shim.fsDriver().writeFile(tempFile, props.html, 'utf8');
			if (cancelled) return;

			// Now that we are sending back a file instead of an HTML string, we're always sending back the
			// same file. So we add a cache busting query parameter to it, to make sure that the WebView re-renders.
			//
			// `baseUrl` is where the images will be loaded from. So images must use a path relative to resourceDir.
			const newSource = {
				uri: `file://${tempFile}?r=${Math.round(Math.random() * 100000000)}`,
				baseUrl: `file://${Setting.value('resourceDir')}/`,
			};
			setSource(newSource);

			props.onFileUpdate?.({
				...newSource,
				filePath: tempFile,
			});
		}

		if (props.html && props.html.length > 0) {
			void createHtmlFile();
		} else {
			setSource(blankSource);
		}

		return () => {
			cancelled = true;
		};
	}, [props.html, props.webviewInstanceId, props.onFileUpdate]);

	// - `setSupportMultipleWindows` must be `true` for security reasons:
	//   https://github.com/react-native-webview/react-native-webview/releases/tag/v11.0.0

	// 2023-06-10: When the source is falsy, we set it to `{ uri: undefined }`
	// to avoid various crashes and errors:
	// https://github.com/react-native-webview/react-native-webview/issues/2920
	// https://github.com/react-native-webview/react-native-webview/issues/2995

	const webViewSource = source ? source : undefined;
	return (
		<WebView
			style={{
				backgroundColor: theme.backgroundColor,
				...(props.style as any),
			}}
			ref={webviewRef}
			scrollEnabled={props.scrollEnabled}
			// useWebKit={true}
			source={webViewSource}
			setSupportMultipleWindows={true}
			hideKeyboardAccessoryView={true}
			allowingReadAccessToURL={`file://${Setting.value('resourceDir')}`}
			originWhitelist={['file://*', './*', 'http://*', 'https://*']}
			mixedContentMode={props.mixedContentMode}
			allowFileAccess={true}
			injectedJavaScript={props.injectedJavaScript}
			onMessage={props.onMessage}
			onError={props.onError}
			onLoadEnd={props.onLoadEnd}
		/>
	);
};

export default forwardRef(ExtendedWebView);
