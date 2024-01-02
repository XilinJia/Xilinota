/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

function clearTranspiledFiles(directory) {
	fs.readdir(directory, (error, files) => {
		if (error) {
			console.error('Error reading directory:', error);
			return;
		}

		// eslint-disable-next-line github/array-foreach
		files.forEach((file) => {
			const filePath = path.join(directory, file);

			fs.stat(filePath, (statErr, stats) => {
				if (statErr) {
					console.error('Error getting file stats:', statErr);
					return;
				}

				if (stats.isDirectory() && path.basename(filePath) !== 'node_modules') {
					// Recursive call for subdirectories, excluding 'node_modules'
					clearTranspiledFiles(filePath);
				} else if (
					stats.isFile() &&
          (path.extname(file) === '.js' || file.endsWith('.js.map'))
				) {
					// Check for corresponding TypeScript file
					const tsFile = path.join(
						directory,
						`${path.basename(file, path.extname(file) === '.js' ? '.js' : '.js.map')}.ts`,
					);

					fs.access(tsFile, fs.constants.F_OK, (accessErr) => {
						if (!accessErr) {
							// If TypeScript file exists, delete JavaScript or source map file
							fs.unlink(filePath, (unlinkErr) => {
								if (unlinkErr) {
									console.error('Error deleting file:', unlinkErr);
								} else {
									console.log('Deleted:', filePath);
								}
							});
						}
					});
				}
			});
		});
	});
}

// Replace 'path_to_your_directory' with the actual path to your directory
clearTranspiledFiles('.');
