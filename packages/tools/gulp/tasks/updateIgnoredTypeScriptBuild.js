const utils = require('../utils');
const rootDir = utils.rootDir();

module.exports = {
	src: '',
	fn: async function() {
		// Note that patterns must be `folder/**` in order to make it skip the
		// directory. If it's `folder/**/*` it will filter the results but still
		// scan the directory.
		//
		// https://github.com/isaacs/node-glob/issues/371

		const tsFiles = utils.globSync('{**/*.ts,**/*.tsx}', {
			cwd: rootDir,
			ignore: [
				'**/.git/**',
				'**/node_modules/**',
				'Assets/**',
				'docs/**',
				'packages/app-cli/build/**',
				'packages/app-cli/tests-build/**',
				'packages/app-cli/tests/html_to_md/**',
				'packages/app-cli/tests/md_to_html/**',
				'packages/app-cli/tests/support/plugins/**',
				'packages/app-cli/tests/support/syncTargetSnapshots/**',
				'packages/app-cli/tests/sync/**',
				'packages/app-cli/tests/test data/**',
				'packages/app-cli/tests/tmp/**',
				'packages/app-clipper/popup/build/**',
				'packages/app-desktop/dist/**',
				'packages/app-desktop/dist/**',
				'packages/app-mobile/android/**',
				'packages/app-mobile/ios/**',
				'packages/fork-sax/**',
				'packages/lib/plugin_types/**',
				'packages/server/**',
				'packages/utils/**',
			],
		}).filter(f => !f.endsWith('.d.ts'));

		// Use this to check what files are being scanned.
		// Also change glob call to `glob.sync('**/*',`
		//
		// const fs = require('fs-extra');
		// fs.writeFileSync('/Users/laurent/listfile.txt', JSON.stringify(tsFiles, null, '\t'));

		const ignoredJsFiles = tsFiles.map(f => {
			const s = f.split('.');
			s.pop();
			return `${s.join('.')}.js`;
		});

		const regex = /(# AUTO-GENERATED - EXCLUDED TYPESCRIPT BUILD)[\s\S]*(# AUTO-GENERATED - EXCLUDED TYPESCRIPT BUILD)/;
		const replacement = `$1\n${ignoredJsFiles.join('\n')}\n$2`;

		await Promise.all([
			utils.replaceFileText(`${rootDir}/.gitignore`, regex, replacement),
			utils.replaceFileText(`${rootDir}/.eslintignore`, regex, replacement),
		]);
	},
};
