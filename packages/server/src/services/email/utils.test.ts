import { markdownBodyToHtml, markdownBodyToPlainText } from './utils';

describe('services/email/utils', () => {

	test('markdownBodyToHtml should convert URLs to clickable links', async () => {
		const testCases = [
			['Click this: [link](https://xilinotaapp.org)', '<p>Click this: <a href="https://xilinotaapp.org">link</a></p>'],
			['Click this: https://xilinotaapp.org', '<p>Click this: <a href="https://xilinotaapp.org">https://xilinotaapp.org</a></p>'],
		];

		for (const testCase of testCases) {
			const [input, expected] = testCase;
			const actual = markdownBodyToHtml(input);
			expect(actual.trim()).toBe(expected.trim());
		}
	});

	test('markdownBodyToPlainText should convert links to plain URLs', async () => {
		const testCases = [
			['Click this: [link](https://xilinotaapp.org)', 'Click this: https://xilinotaapp.org'],
			['Click this: https://xilinotaapp.org', 'Click this: https://xilinotaapp.org'],
		];

		for (const testCase of testCases) {
			const [input, expected] = testCase;
			const actual = markdownBodyToPlainText(input);
			expect(actual.trim()).toBe(expected.trim());
		}
	});

});
