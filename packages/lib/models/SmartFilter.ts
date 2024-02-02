// Not used??

import BaseModel, { ModelType } from '../BaseModel';

export default class SmartFilter extends BaseModel {
	public static tableName(): string {
		throw new Error('Not using database');
	}

	public static modelType() : ModelType {
		return BaseModel.TYPE_SMART_FILTER;
	}
}
