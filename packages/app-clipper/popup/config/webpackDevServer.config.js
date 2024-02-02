/* eslint-disable @typescript-eslint/no-unused-vars */
'use strict';
const path = require('path');

// const errorOverlayMiddleware = require('react-dev-utils/errorOverlayMiddleware');
// const evalSourceMapMiddleware = require('react-dev-utils/evalSourceMapMiddleware');
// const noopServiceWorkerMiddleware = require('react-dev-utils/noopServiceWorkerMiddleware');
// const ignoredFiles = require('react-dev-utils/ignoredFiles');
// const paths = require('./paths');
// const fs = require('fs');

const protocol = process.env.HTTPS === 'true' ? 'https' : 'http';
const host = process.env.HOST || '0.0.0.0';

module.exports = function(proxy, allowedHost) {
	return {
		static: {
			directory: path.join(__dirname, './dist'),
		},
		allowedHosts: 'all',
		// disableHostCheck:
		//   !proxy || process.env.DANGEROUSLY_DISABLE_HOST_CHECK === 'true',
		// Enable gzip compression of generated files.
		compress: true,
		// output: {
		//   hashFunction: 'sha256'
		// },
		open: true,
		port: 9002,
		// Silence WebpackDevServer's own logs since they're generally not useful.
		// It will still show compile warnings and errors with this setting.
		// clientLogLevel: 'none',
		// By default WebpackDevServer serves physical files from current directory
		// in addition to all the virtual build products that it serves from memory.
		// This is confusing because those files won’t automatically be available in
		// production build folder unless we copy them. However, copying the whole
		// project directory is dangerous because we may expose sensitive files.
		// Instead, we establish a convention that only files in `public` directory
		// get served. Our build script will copy `public` into the `build` folder.
		// In `index.html`, you can get URL of `public` folder with %PUBLIC_URL%:
		// <link rel="icon" href="%PUBLIC_URL%/favicon.ico">
		// In JavaScript code, you can access it with `process.env.PUBLIC_URL`.
		// Note that we only recommend to use `public` folder as an escape hatch
		// for files like `favicon.ico`, `manifest.json`, and libraries that are
		// for some reason broken when imported through Webpack. If you just want to
		// use an image, put it in `src` and `import` it from JavaScript instead.
		// contentBase: paths.appPublic,
		// By default files from `contentBase` will not trigger a page reload.
		// watchContentBase: true,
		// Enable hot reloading server. It will provide /sockjs-node/ endpoint
		// for the WebpackDevServer client so it can learn when the files were
		// updated. The WebpackDevServer client is included as an entry point
		// in the Webpack development configuration. Note that only changes
		// to CSS are currently hot reloaded. JS changes will refresh the browser.
		hot: true,
		// Use 'ws' instead of 'sockjs-node' on server since we're using native
		// websockets in `webpackHotDevClient`.
		// transportMode: 'ws',
		// Prevent a WS client from getting injected as we're already including
		// `webpackHotDevClient`.
		// injectClient: false,
		// It is important to tell WebpackDevServer to use the same "root" path
		// as we specified in the config. In development, we always serve from /.
		// publicPath: '/',
		// WebpackDevServer is noisy by default so we emit custom message instead
		// by listening to the compiler events with `compiler.hooks[...].tap` calls above.
		// quiet: true,
		// Reportedly, this avoids CPU overload on some systems.
		// https://github.com/facebook/create-react-app/issues/293
		// src/node_modules is not ignored to support absolute imports
		// https://github.com/facebook/create-react-app/issues/1065
		// watchOptions: {
		//   ignored: ignoredFiles(paths.appSrc)
		// },
		// Enable HTTPS if the HTTPS environment variable is set to 'true'
		https: protocol === 'https',
		host,
		// overlay: false,
		historyApiFallback: {
			// Paths with dots should still use the history fallback.
			// See https://github.com/facebook/create-react-app/issues/387.
			disableDotRule: true,
		},
		devMiddleware: {
			writeToDisk: true,
		},
		// setupMiddlewares: (middlewares, devServer) => {
		// 	if (!devServer) {
		// 		throw new Error('webpack-dev-server is not defined');
		// 	}

		// 	devServer.app.get('/setup-middleware/some/path', (_, response) => {
		// 		response.send('setup-middlewares option GET');
		// 	});

		// 	// Use the `unshift` method if you want to run a middleware before all other middlewares
		// 	// or when you are migrating from the `onBeforeSetupMiddleware` option
		// 	middlewares.unshift({
		// 		name: 'first-in-array',
		// 		// `path` is optional
		// 		path: '/foo/path',
		// 		middleware: (req, res) => {
		// 			res.send('Foo!');
		// 		},
		// 	});

		// 	// Use the `push` method if you want to run a middleware after all other middlewares
		// 	// or when you are migrating from the `onAfterSetupMiddleware` option
		// 	middlewares.push({
		// 		name: 'hello-world-test-one',
		// 		// `path` is optional
		// 		path: '/foo/bar',
		// 		middleware: (req, res) => {
		// 			res.send('Foo Bar!');
		// 		},
		// 	});

		// 	middlewares.push((req, res) => {
		// 		res.send('Hello World!');
		// 	});

		// 	return middlewares;
		// },

		proxy: {
			'/api': 'http://localhost:9000',
		},
		// public: allowedHost,
		// proxy
		// before(app, server) {
		// 	if (fs.existsSync(paths.proxySetup)) {
		// 		// This registers user provided middleware for proxy reasons
		// 		require(paths.proxySetup)(app);
		// 	}

		// 	// This lets us fetch source contents from webpack for the error overlay
		// 	app.use(evalSourceMapMiddleware(server));
		// 	// This lets us open files from the runtime error overlay.
		// 	app.use(errorOverlayMiddleware());

		// 	//   // This service worker file is effectively a 'no-op' that will reset any
		// 	//   // previous service worker registered for the same host:port combination.
		// 	//   // We do this in development to avoid hitting the production cache if
		// 	//   // it used the same host and port.
		// 	//   // https://github.com/facebook/create-react-app/issues/2272#issuecomment-302832432
		// 	app.use(noopServiceWorkerMiddleware());
		// },
	};
};
