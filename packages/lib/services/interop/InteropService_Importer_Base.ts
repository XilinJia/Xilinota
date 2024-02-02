/* eslint @typescript-eslint/no-unused-vars: 0, no-unused-vars: 0 */

import { ImportExportResult } from './types';

import Setting from '../../models/Setting';
import shim from '../../shim';
import md5 from 'md5';

export default class InteropService_Importer_Base {

	private metadata_: any = null;
	protected sourcePath_ = '';
	protected options_: any = {};

	public setMetadata(md: any) {
		this.metadata_ = md;
	}

	public metadata() {
		return this.metadata_;
	}

	public async init(sourcePath: string, options: any) {
		this.sourcePath_ = sourcePath;
		this.options_ = options;
	}

	public async exec(_result: ImportExportResult): Promise<ImportExportResult> { throw ('importer base exec not implemented'); }

	protected async temporaryDirectory_(createIt: boolean) {
		const tempDir = `${Setting.value('tempDir')}/${md5(Math.random().toString() + Date.now())}`;
		if (createIt) await shim.fsDriver().mkdir(tempDir);
		return tempDir;
	}
}
