import { useCallback } from 'react';
import { FormNote } from './types';
import contextMenu from './contextMenu';
import CommandService from '@xilinota/lib/services/CommandService';
import PostMessageService from '@xilinota/lib/services/PostMessageService';
import ResourceFetcher from '@xilinota/lib/services/ResourceFetcher';
import { reg } from '@xilinota/lib/registry';

const bridge = require('@electron/remote').require('./bridge').default;


export default function useMessageHandler(scrollWhenReady: any, setScrollWhenReady: Function, editorRef: any, setLocalSearchResultCount: Function, dispatch: Function, formNote: FormNote) {
	return useCallback(async (event: any) => {
		const msg = event.channel ? event.channel : '';
		const args = event.args;
		const arg0 = args && args.length >= 1 ? args[0] : null;

		if (msg !== 'percentScroll') console.info(`useMessageHandler Got ipc-message: ${msg}`, arg0);

		if (msg.indexOf('error:') === 0) {
			const s = msg.split(':');
			s.splice(0, 1);
			reg.logger().error(s.join(':'));
		} else if (msg === 'noteRenderComplete') {
			if (scrollWhenReady) {
				const options = { ...scrollWhenReady };
				setScrollWhenReady(null);
				editorRef.current.scrollTo(options);
			}
		} else if (msg === 'setMarkerCount') {
			setLocalSearchResultCount(arg0);
		} else if (msg.indexOf('markForDownload:') === 0) {
			const s = msg.split(':');
			if (s.length < 2) throw new Error(`Invalid message: ${msg}`);
			void ResourceFetcher.instance().markForDownload(s[1]);
		} else if (msg === 'contextMenu') {
			const menu = await contextMenu({
				itemType: arg0 && arg0.type,
				resourceId: arg0.resourceId,
				filename: arg0.filename,
				mime: arg0.mime,
				textToCopy: arg0.textToCopy,
				linkToCopy: arg0.linkToCopy || null,
				htmlToCopy: '',
				insertContent: () => { console.warn('insertContent() not implemented'); },
				fireEditorEvent: () => { console.warn('fireEditorEvent() not implemented'); },
			}, dispatch);

			menu.popup({ window: bridge().window() });
		} else if (msg.indexOf('#') === 0) {
			// This is an internal anchor, which is handled by the WebView so skip this case
		} else if (msg === 'contentScriptExecuteCommand') {
			const commandName = arg0.name;
			const commandArgs = arg0.args || [];
			void CommandService.instance().execute(commandName, ...commandArgs);
		} else if (msg === 'postMessageService.message') {
			void PostMessageService.instance().postMessage(arg0);
		} else if (msg === 'openPdfViewer') {
			await CommandService.instance().execute('openPdfViewer', arg0.resourceId, arg0.pageNo);
		} else {
			await CommandService.instance().execute('openItem', msg);
			// bridge().showErrorMessageBox(_('Unsupported link or message: %s', msg));
		}

	}, [dispatch, setLocalSearchResultCount, scrollWhenReady, formNote]);
}
