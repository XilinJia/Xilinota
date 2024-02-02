import { execCommand, getRootDir } from '@xilinota/utils';
import { readFile, writeFile } from 'fs-extra';
import { chdir } from 'process';

const main = async () => {
	chdir(await getRootDir());

	const previousContent = {
		'.gitignore': await readFile('.gitignore', 'utf8'),
		'.eslintignore': await readFile('.eslintignore', 'utf8'),
	};

	await execCommand('yarn run updateIgnored', { quiet: true });

	const newContent = {
		'.gitignore': await readFile('.gitignore', 'utf8'),
		'.eslintignore': await readFile('.eslintignore', 'utf8'),
	};

	if (newContent['.gitignore'] !== previousContent['.gitignore'] || newContent['.eslintignore'] !== previousContent['.eslintignore']) {
		await writeFile('.gitignore', previousContent['.gitignore'], 'utf8');
		await writeFile('.eslintignore', previousContent['.eslintignore'], 'utf8');
		throw new Error('.gitignore or .eslintignore would be modified - run `yarn run updateIgnored`');
	}
};

if (require.main === module) {

	main().catch((error) => {
		console.error(error);
		process.exit(1);
	});
}
