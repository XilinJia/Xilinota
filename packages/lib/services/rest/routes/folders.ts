
import { Request } from '../Api';
import defaultAction from '../utils/defaultAction';
import paginatedResults from '../utils/paginatedResults';
import BaseModel from '../../../BaseModel';
import requestFields from '../utils/requestFields';
import Folder from '../../../models/Folder';
import FoldersScreenUtils from '../../../folders-screen-utils';
const { ErrorNotFound } = require('../utils/errors');

export default async function(request: Request, id: string = '', link: string = '') {
	if (request.method === 'GET' && !id) {
		if (request.query.as_tree) {
			const folders = await FoldersScreenUtils.allForDisplay({ fields: requestFields(request, BaseModel.TYPE_FOLDER) });
			const output = await Folder.allAsTree(folders);
			return output;
		} else {
			return defaultAction(BaseModel.TYPE_FOLDER, request, id, link);
		}
	}

	if (request.method === 'GET' && id) {
		if (link && link === 'notes') {
			const folder = await Folder.load(id);
			if (!folder) throw (`Folder not found ${id}`);
			return paginatedResults(BaseModel.TYPE_NOTE, request, { sql: 'parent_id = ?', params: [folder.id] });
		} else if (link) {
			throw new ErrorNotFound();
		}
	}

	return defaultAction(BaseModel.TYPE_FOLDER, request, id, link);
}
