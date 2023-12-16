import config from './rollup.config';

export default config({
	output: {
		file: 'lib/turndown.cjs.js',
		format: 'cjs',
	},
	browser: false,
});
