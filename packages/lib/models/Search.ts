// This class doesn't appear to be used at all

import BaseModel, { ModelType } from '../BaseModel';

export default class Search extends BaseModel {
	public static tableName(): string {
		throw new Error('Not using database');
	}

	public static modelType() : ModelType {
		return BaseModel.TYPE_SEARCH;
	}

	public static keywords(query: string) : string[] {
		let q_: string = query.trim();
		let output = q_.split(/[\s\t\n]+/);
		output = output.filter((o: any) => !!o);
		return output;
	}
}
