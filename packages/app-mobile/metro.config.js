// Metro configuration for React Native
// https://github.com/facebook/react-native

// The technique below to get the symlinked packages to work with the Metro
// bundler comes from this comment:
//
// https://github.com/facebook/metro/issues/1#issuecomment-501143843
//
// Perhaps also investigate this technique as it's specifically for Lerna:
//
// https://github.com/facebook/metro/issues/1#issuecomment-511228599

const path = require('path');

const localPackages = {
	'@xilinota/lib': path.resolve(__dirname, '../lib/'),
	'@xilinota/renderer': path.resolve(__dirname, '../renderer/'),
	'@xilinota/editor': path.resolve(__dirname, '../editor/'),
	'@xilinota/tools': path.resolve(__dirname, '../tools/'),
	'@xilinota/utils': path.resolve(__dirname, '../utils/'),
	'@xilinota/fork-htmlparser2': path.resolve(__dirname, '../fork-htmlparser2/'),
	'@xilinota/fork-uslug': path.resolve(__dirname, '../fork-uslug/'),
	'@xilinota/react-native-saf-x': path.resolve(__dirname, '../react-native-saf-x/'),
	'@xilinota/react-native-alarm-notification': path.resolve(__dirname, '../react-native-alarm-notification/'),
	'@xilinota/fork-sax': path.resolve(__dirname, '../fork-sax/'),
};

const remappedPackages = {
	...localPackages,
};

// Some packages aren't available in react-native and thus must be replaced by browserified
// versions. For example, this allows us to `import {resolve} from 'path'` rather than
// `const { resolve } = require('path-browserify')` ('path-browerify' doesn't have its own type
// definitions).
const browserifiedPackages = ['path'];
for (const package of browserifiedPackages) {
	remappedPackages[package] = path.resolve(__dirname, `./node_modules/${package}-browserify/`);
}

const watchedFolders = [];
for (const [, v] of Object.entries(localPackages)) {
	watchedFolders.push(v);
}

module.exports = {
	transformer: {
		getTransformOptions: async () => ({
			transform: {
				experimentalImportSupport: false,
				inlineRequires: true,
			},
		}),
	},
	resolver: {
		// This configuration allows you to build React-Native modules and test
		// them without having to publish the module. Any exports provided by
		// your source should be added to the "target" parameter. Any import not
		// matched by a key in target will have to be located in the embedded
		// app's node_modules directory.
		//
		extraNodeModules: new Proxy(
			// The first argument to the Proxy constructor is passed as "target"
			// to the "get" method below. Put the names of the libraries
			// included in your reusable module as they would be imported when
			// the module is actually used.
			//
			remappedPackages,
			{
				get: (target, name) => {
					if (target.hasOwnProperty(name)) {
						return target[name];
					}
					return path.join(process.cwd(), `node_modules/${name}`);
				},
			},
		),
	},
	projectRoot: path.resolve(__dirname),
	watchFolders: watchedFolders,
};
