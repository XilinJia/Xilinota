import BaseModel from '../../../BaseModel';
import { Request } from '../Api';
import defaultAction from '../utils/defaultAction';

export default function(request: Request, id: string = '', link: string = '') {
	return defaultAction(BaseModel.TYPE_MASTER_KEY, request, id, link);
}
