import yargs = require('yargs');
import { chdir } from 'process';
import { rootDir } from './tool-utils';
import { execCommand } from '@xilinota/utils';

const main = async () => {
	const argv = await yargs.argv;
	const filePaths = argv._ as string[];
	if (!filePaths || !filePaths.length) return;

	chdir(rootDir);

	try {
		await execCommand(['yarn', 'run', 'cspell'].concat(filePaths), { showStderr: false, showStdout: false });
	} catch (error) {
		if (!(error as any).stdout.trim()) return;

		console.error(`Some spelling mistakes were found:\n${(error as any).stdout}`);
		process.exit(1);
	}
};

main().catch((error) => {
	console.error('Fatal error');
	console.error(error);
	process.exit(1);
});
