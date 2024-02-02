const { afterEachCleanUp } = require('./testing/test-utils.js');
const { shimInit } = require('./shim-init-node.js');
const sharp = require('sharp');
const nodeSqlite = require('sqlite3').verbose();

shimInit({ sharp, nodeSqlite });

global.afterEach(async () => {
	await afterEachCleanUp();
});
