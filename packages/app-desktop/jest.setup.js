/* eslint-disable jest/require-top-level-describe */

const { shimInit } = require('@xilinota/lib/shim-init-node');
const sqlite3 = require('sqlite3');
const SyncTargetNone = require('@xilinota/lib/SyncTargetNone').default;

// Mock the S3 sync target -- the @aws-s3 libraries depend on an old version
// of uuid that doesn't work with jest without additional configuration.
jest.doMock('@xilinota/lib/SyncTargetAmazonS3', () => {
	return SyncTargetNone;
});

// @electron/remote requires electron to be running. Mock it.
jest.mock('@electron/remote', () => {
	return {
		require: () => {
			return {
				default: {},
			};
		},
	};
});

// Import after mocking problematic libraries
const { afterEachCleanUp, afterAllCleanUp } = require('@xilinota/lib/testing/test-utils.js');


shimInit({ nodeSqlite: sqlite3 });

afterEach(async () => {
	await afterEachCleanUp();
});

afterAll(async () => {
	await afterAllCleanUp();
});

