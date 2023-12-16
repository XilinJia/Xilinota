const gulp = require('gulp');
const utils = require('@xilinota/tools/gulp/utils');
const compileSass = require('@xilinota/tools/compileSass');
const compilePackageInfo = require('@xilinota/tools/compilePackageInfo');

const tasks = {
	compileScripts: {
		fn: require('./tools/compileScripts'),
	},
	compilePackageInfo: {
		fn: async () => {
			await compilePackageInfo(`${__dirname}/package.json`, `${__dirname}/packageInfo.js`);
		},
	},
	copyPluginAssets: {
		fn: require('./tools/copyPluginAssets.js'),
	},
	copyApplicationAssets: {
		fn: require('./tools/copyApplicationAssets.js'),
	},
	electronRebuild: {
		fn: require('./tools/electronRebuild.js'),
	},
	electronBuilder: {
		fn: require('./tools/electronBuilder.js'),
	},
	tsc: require('@xilinota/tools/gulp/tasks/tsc'),
	updateIgnoredTypeScriptBuild: require('@xilinota/tools/gulp/tasks/updateIgnoredTypeScriptBuild'),
	buildCommandIndex: require('@xilinota/tools/gulp/tasks/buildCommandIndex'),
	compileSass: {
		fn: async () => {
			await compileSass(
				`${__dirname}/style.scss`,
				`${__dirname}/style.min.css`,
			);
		},
	},
};

utils.registerGulpTasks(gulp, tasks);

const buildParallel = [
	'compileScripts',
	'compilePackageInfo',
	'copyPluginAssets',
	'copyApplicationAssets',
	'updateIgnoredTypeScriptBuild',
	'buildCommandIndex',
	'compileSass',
];

gulp.task('build', gulp.parallel(...buildParallel));
