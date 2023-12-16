/* eslint @typescript-eslint/no-unused-vars: 0, no-unused-vars: ["error", { "argsIgnorePattern": ".*" }], */

import Setting from '../../models/Setting';
import shim from '../../shim';

export default class InteropService_Exporter_Base {
	private context_: any = {};
	private metadata_: any = {};

	public async init(_destDir: string, _options: any = {}) {}
	public async prepareForProcessingItemType(_itemType: number, _itemsToExport: any[]) {}
	public async processItem(_itemType: number, _item: any) {}
	public async processResource(_resource: any, _filePath: string) {}
	public async close() {}

	public setMetadata(md: any) {
		this.metadata_ = md;
	}

	public metadata() {
		return this.metadata_;
	}

	public updateContext(context: any) {
		this.context_ = { ...this.context_, ...context };
	}

	public context() {
		return this.context_;
	}

	protected async temporaryDirectory_(createIt: boolean) {
		const md5 = require('md5');
		const tempDir = `${Setting.value('tempDir')}/${md5(Math.random() + Date.now())}`;
		if (createIt) await shim.fsDriver().mkdir(tempDir);
		return tempDir;
	}
}
