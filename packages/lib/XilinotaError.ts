export default class XilinotaError extends Error {

	public code: any = null;
	public details = '';

	public constructor(message: string, code: any = null, details: string = '') {
		super(message);
		this.code = code;
		this.details = details;
	}

}
