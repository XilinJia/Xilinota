import BaseModel, { ModelType } from '../BaseModel';
import { ResourceLocalStateEntity } from '../services/database/types';
import Database from '../database';

export default class ResourceLocalState extends BaseModel {
	public static tableName(): string {
		return 'resource_local_states';
	}

	public static modelType(): ModelType {
		return BaseModel.TYPE_RESOURCE_LOCAL_STATE;
	}

	public static async byResourceId(resourceId: string): Promise<ResourceLocalStateEntity> {
		if (!resourceId) {
			this.logger().error('Resource ID not provided'); // Sanity check
			return {};
		}
		const result = await this.modelSelectOne('SELECT * FROM resource_local_states WHERE resource_id = ?', [resourceId]);

		if (!result) {
			const defaultRow = this.db().createDefaultRow(this.tableName());
			delete defaultRow.id;
			defaultRow.resource_id = resourceId;
			return defaultRow;
		}

		return result;
	}

	public static saveQueries(o: ResourceLocalStateEntity): { sql: string; params: any[]; }[] {
		return [{ sql: 'DELETE FROM resource_local_states WHERE resource_id = ?', params: [o.resource_id] }, Database.insertQuery(this.tableName(), o)];
	}

	public static async save(o: ResourceLocalStateEntity): Promise<ResourceLocalStateEntity> {
		this.db().transactionExecBatch(this.saveQueries(o));
		return o;
	}

	public static batchDelete(ids: string[], options: any = null) {
		options = options ? { ...options } : {};
		options.idFieldName = 'resource_id';
		return super.batchDelete(ids, options);
	}
}
