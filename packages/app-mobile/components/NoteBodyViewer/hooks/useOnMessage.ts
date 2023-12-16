import { useCallback } from 'react';
import shared from '@xilinota/lib/components/shared/note-screen-shared';

export type HandleMessageCallback = (message: string)=> void;
export type OnMarkForDownloadCallback = (resource: { resourceId: string })=> void;

interface MessageCallbacks {
	onMarkForDownload?: OnMarkForDownloadCallback;
	onXilinotaLinkClick: HandleMessageCallback;
	onResourceLongPress: HandleMessageCallback;
	onRequestEditResource?: HandleMessageCallback;
	onCheckboxChange: HandleMessageCallback;
}

export default function useOnMessage(
	noteBody: string,
	callbacks: MessageCallbacks,
) {
	// Dectructure callbacks. Because we have that ({ a: 1 }) !== ({ a: 1 }),
	// we can expect the `callbacks` variable from the last time useOnMessage was called to
	// not equal the current` callbacks` variable, even if the callbacks themselves are the
	// same.
	//
	// Thus, useCallback should depend on each callback individually.
	const {
		onMarkForDownload, onResourceLongPress, onCheckboxChange, onRequestEditResource, onXilinotaLinkClick,
	} = callbacks;

	return useCallback((event: any) => {
		// 2021-05-19: Historically this was unescaped twice as it was
		// apparently needed after an upgrade to RN 58 (or 59). However this is
		// no longer needed and in fact would break certain URLs so it can be
		// removed. Keeping the comment here anyway in case we find some URLs
		// that end up being broken after removing the double unescaping.
		// https://github.com/XilinJia/Xilinota/issues/4494
		const msg = event.nativeEvent.data;

		// eslint-disable-next-line no-console
		console.info('Got IPC message: ', msg);

		if (msg.indexOf('checkboxclick:') === 0) {
			const newBody = shared.toggleCheckbox(msg, noteBody);
			onCheckboxChange?.(newBody);
		} else if (msg.indexOf('markForDownload:') === 0) {
			const splittedMsg = msg.split(':');
			const resourceId = splittedMsg[1];
			onMarkForDownload?.({ resourceId: resourceId });
		} else if (msg.startsWith('longclick:')) {
			onResourceLongPress(msg);
		} else if (msg.startsWith('edit:')) {
			onRequestEditResource?.(msg);
		} else if (msg.startsWith('xilinota:')) {
			onXilinotaLinkClick(msg);
		} else if (msg.startsWith('error:')) {
			console.error(`Webview injected script error: ${msg}`);
		} else {
			onXilinotaLinkClick(msg);
		}
	}, [
		noteBody,
		onCheckboxChange,
		onMarkForDownload,
		onXilinotaLinkClick,
		onResourceLongPress,
		onRequestEditResource,
	]);
}
