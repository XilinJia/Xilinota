/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

// Get the list of files in the ./dist/ directory
const files = fs.readdirSync(__dirname);

// Export each module dynamically
const modules = {};
// eslint-disable-next-line github/array-foreach
files.forEach(file => {
	const moduleName = path.parse(file).name;
	if (moduleName === 'dist' || path.extname(file) === '.js' || moduleName.startsWith('.')) return;
	console.log(file, moduleName);
	// modules[moduleName] = require(`./dist/lib/${moduleName}`).default;
});

module.exports = modules;
