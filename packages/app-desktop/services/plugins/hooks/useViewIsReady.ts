import { useEffect, useState } from 'react';

export default function useViewIsReady(viewRef: any) {
	// Just checking if the iframe is ready is not sufficient because its content
	// might not be ready (for example, IPC listeners might not be initialised).
	// So we also listen to a custom "ready" message coming from the webview content
	// (in UserWebviewIndex.js)
	const [iframeReady, setIFrameReady] = useState(false);
	const [iframeContentReady, setIFrameContentReady] = useState(false);

	useEffect(() => {

		console.debug('useViewIsReady ============== Setup Listeners');

		function onIFrameReady() {

			console.debug('useViewIsReady: onIFrameReady');
			setIFrameReady(true);
		}

		function onMessage(event: any) {
			const data = event.data;

			if (!data || data.target !== 'UserWebview') return;


			console.debug('useViewIsReady: message', data);

			if (data.message === 'ready') {
				setIFrameContentReady(true);
			}
		}

		const iframeDocument = viewRef.current.contentWindow.document;


		console.debug('useViewIsReady readyState', iframeDocument.readyState);

		if (iframeDocument.readyState === 'complete') {
			onIFrameReady();
		}

		viewRef.current.addEventListener('dom-ready', onIFrameReady);
		viewRef.current.addEventListener('load', onIFrameReady);
		viewRef.current.contentWindow.addEventListener('message', onMessage);

		return () => {
			if (viewRef.current) {
				viewRef.current.removeEventListener('dom-ready', onIFrameReady);
				viewRef.current.removeEventListener('load', onIFrameReady);

				viewRef.current.contentWindow.removeEventListener('message', onMessage);
			}
		};

	}, []);

	return iframeReady && iframeContentReady;
}
