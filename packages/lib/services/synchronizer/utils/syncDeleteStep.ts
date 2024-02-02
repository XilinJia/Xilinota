import { Dispatch } from 'redux';
import BaseModel from '../../../BaseModel';
import BaseItem from '../../../models/BaseItem';
import ItemChange from '../../../models/ItemChange';
import Resource from '../../../models/Resource';
import time from '../../../time';
import resourceRemotePath from './resourceRemotePath';
import { ApiCallFunction, LogSyncOperationFunction } from './types';
import XilinotaError from '../../../XilinotaError';

export default async (syncTargetId: number, cancelling: boolean, logSyncOperation: LogSyncOperationFunction, apiCall: ApiCallFunction, dispatch: Dispatch) => {
	const deletedItems = await BaseItem.deletedItems(syncTargetId);
	for (let i = 0; i < deletedItems.length; i++) {
		if (cancelling) break;

		const item = deletedItems[i];
		const path = BaseItem.systemPath(item.item_id);
		const isResource = item.item_type === BaseModel.TYPE_RESOURCE;

		try {
			await apiCall('delete', path);

			if (isResource) {
				const remoteContentPath = item.item_id ? resourceRemotePath(item.item_id) : '';
				await apiCall('delete', remoteContentPath);
			}

			if (item.item_id) logSyncOperation('deleteRemote', null, { id: item.item_id }, 'local has been deleted');
		} catch (error) {
			if (error instanceof XilinotaError && error.code === 'isReadOnly') {
				let remoteContent = await apiCall('get', path);

				if (remoteContent) {
					remoteContent = await BaseItem.unserialize(remoteContent);
					const ItemClass = BaseItem.itemClass(item.item_type);
					let nextQueries = BaseItem.updateSyncTimeQueries(syncTargetId, remoteContent, time.unixMs());

					if (isResource) {
						nextQueries = nextQueries.concat(Resource.setLocalStateQueries(remoteContent.id, {
							fetch_status: Resource.FETCH_STATUS_IDLE,
						}));
					}

					await ItemClass.save(remoteContent, { isNew: true, autoTimestamp: false, changeSource: ItemChange.SOURCE_SYNC, nextQueries });

					if (isResource) dispatch({ type: 'SYNC_CREATED_OR_UPDATED_RESOURCE', id: remoteContent.id });
				}
			} else {
				throw error;
			}
		}

		if (item.item_id) await BaseItem.remoteDeletedItem(syncTargetId, item.item_id);
	}
};
