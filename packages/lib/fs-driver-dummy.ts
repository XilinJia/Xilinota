import FsDriverBase from "./fs-driver-base";

// TODO: possibly not needed
export default class FsDriverDummy extends FsDriverBase {
	constructor() {
		super();
	}

	appendFileSync() { }
	async readFile(_path: string, _encoding = 'utf8'): Promise<any> { }
}

// module.exports = { FsDriverDummy };
