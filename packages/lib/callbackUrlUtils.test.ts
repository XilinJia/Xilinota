import * as callbackUrlUtils from './callbackUrlUtils';

describe('callbackUrlUtils', () => {

	it('should identify valid callback urls', () => {
		const url = 'xilinota://x-callback-url/openFolder?a=b';
		expect(callbackUrlUtils.isCallbackUrl(url)).toBe(true);
	});

	it('should identify invalid callback urls', () => {
		expect(callbackUrlUtils.isCallbackUrl('not-xilinota://x-callback-url/123?a=b')).toBe(false);
		expect(callbackUrlUtils.isCallbackUrl('xilinota://xcallbackurl/123?a=b')).toBe(false);
		expect(callbackUrlUtils.isCallbackUrl('xilinota://x-callback-url/invalidCommand?a=b')).toBe(false);
	});

	it('should build valid note callback urls', () => {
		const noteUrl = callbackUrlUtils.getNoteCallbackUrl('123456');
		expect(callbackUrlUtils.isCallbackUrl(noteUrl)).toBe(true);
		expect(noteUrl).toBe('xilinota://x-callback-url/openNote?id=123456');
	});

	it('should build valid folder callback urls', () => {
		const folderUrl = callbackUrlUtils.getFolderCallbackUrl('123456');
		expect(callbackUrlUtils.isCallbackUrl(folderUrl)).toBe(true);
		expect(folderUrl).toBe('xilinota://x-callback-url/openFolder?id=123456');
	});

	it('should build valid tag callback urls', () => {
		const tagUrl = callbackUrlUtils.getTagCallbackUrl('123456');
		expect(callbackUrlUtils.isCallbackUrl(tagUrl)).toBe(true);
		expect(tagUrl).toBe('xilinota://x-callback-url/openTag?id=123456');
	});

	it('should parse note callback urls', () => {
		const parsed = callbackUrlUtils.parseCallbackUrl('xilinota://x-callback-url/openNote?id=123456');
		expect(parsed.command).toBe(callbackUrlUtils.CallbackUrlCommand.OpenNote);
		expect(parsed.params).toStrictEqual({ id: '123456' });
	});

	it('should parse folder callback urls', () => {
		const parsed = callbackUrlUtils.parseCallbackUrl('xilinota://x-callback-url/openFolder?id=123456');
		expect(parsed.command).toBe(callbackUrlUtils.CallbackUrlCommand.OpenFolder);
		expect(parsed.params).toStrictEqual({ id: '123456' });
	});

	it('should parse tag callback urls', () => {
		const parsed = callbackUrlUtils.parseCallbackUrl('xilinota://x-callback-url/openTag?id=123456');
		expect(parsed.command).toBe(callbackUrlUtils.CallbackUrlCommand.OpenTag);
		expect(parsed.params).toStrictEqual({ id: '123456' });
	});

	it('should throw an error on invalid input', () => {
		expect(() => callbackUrlUtils.parseCallbackUrl('not-a-url'))
			.toThrowError('Invalid callback url not-a-url');

		expect(() => callbackUrlUtils.parseCallbackUrl('not-xilinota://x-callback-url/123?a=b'))
			.toThrowError('Invalid callback url not-xilinota://x-callback-url/123?a=b');

		expect(() => callbackUrlUtils.parseCallbackUrl('xilinota://xcallbackurl/123?a=b'))
			.toThrowError('Invalid callback url xilinota://xcallbackurl/123?a=b');
	});



});
