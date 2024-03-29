import { useCallback } from 'react';

import { ToastAndroid } from 'react-native';
import { _ } from '@xilinota/lib/locale';
import { reg } from '@xilinota/lib/registry';
import dialogs from '../../../utils/dialogs';
import Resource from '@xilinota/lib/models/Resource';
import { copyToCache } from '../../../utils/ShareUtils';
import isEditableResource from '../../NoteEditor/ImageEditor/isEditableResource';
// const Share = require('react-native-share').default;
import Share from 'react-native-share';
import { HandleMessageCallback } from './useOnMessage';

interface Callbacks {
	onXilinotaLinkClick: (link: string)=> void;
	onRequestEditResource: HandleMessageCallback|undefined;
}

export default function useOnResourceLongPress(callbacks: Callbacks, dialogBoxRef: any) {
	const { onXilinotaLinkClick, onRequestEditResource } = callbacks;

	return useCallback(async (msg: string) => {
		try {
			const resourceId = msg.split(':')[1];
			const resource = await Resource.load(resourceId);

			// Handle the case where it's a long press on a link with no resource
			if (!resource) {
				reg.logger().warn(`Long-press: Resource with ID ${resourceId} does not exist (may be a note).`);
				return;
			}

			const name = resource.title ? resource.title : resource.file_name;
			const mime: string|undefined = resource.mime;

			const actions = [];

			actions.push({ text: _('Open'), id: 'open' });
			if (mime && isEditableResource(mime)) {
				actions.push({ text: _('Edit'), id: 'edit' });
			}
			actions.push({ text: _('Share'), id: 'share' });

			const action = await dialogs.pop({ dialogbox: dialogBoxRef.current }, name, actions);

			if (action === 'open') {
				onXilinotaLinkClick(`xilinota://${resourceId}`);
			} else if (action === 'share') {
				const fileToShare = await copyToCache(resource);

				await Share.open({
					type: resource.mime,
					filename: resource.title,
					url: `file://${fileToShare}`,
					failOnCancel: false,
				});
			} else if (action === 'edit') {
				if (onRequestEditResource) onRequestEditResource(`edit:${resourceId}`);
			}
		} catch (e) {
			reg.logger().error('Could not handle link long press', e);
			ToastAndroid.show('An error occurred, check log for details', ToastAndroid.SHORT);
		}
	}, [onXilinotaLinkClick, onRequestEditResource, dialogBoxRef]);
}
