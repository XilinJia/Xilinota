import { findInvalidImportPaths } from './checkLibPaths';

describe('checkLibPaths', () => {

	test('should detect invalid lib paths', async () => {
		const testCases: [number, string][] = [
			[1, `
				import time from '../lib/time';
			`],
			[2, `
				import time from '../lib/time';
				import shim from '../lib/shim';
			`],
			[1, `
				import time from '../lib/time';
				import shim from '@xilinota/lib/shim';
			`],
			[1, `
				import time from '@xilinota/lib/time';
				import shim = require('../lib/shim');
			`],
			[1, `
				import time from '@xilinota/lib/time';
				import shim from '@xilinota/lib/shim';
				const { isInsideContainer } = require('../lib/shim');
			`],
		];

		for (const testCase of testCases) {
			const [expected, input] = testCase;
			const actual = findInvalidImportPaths(__dirname, input.split('\n').map(l => l.trim()).join('\n'));
			expect(actual.length).toBe(expected);
		}
	});

});
