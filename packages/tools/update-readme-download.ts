import * as fs from 'fs-extra';
import { fileExtension } from '@xilinota/lib/path-utils';
import { gitHubLatestRelease, GitHubRelease } from './tool-utils';
const readmePath = `${__dirname}/../../README.md`;

async function msleep(ms: number) {
	return new Promise((resolve) => {
		setTimeout(() => {
			resolve(null);
		}, ms);
	});
}

export enum OS {
	MacOs = 'macos',
	Windows = 'windows',
	Android = 'android',
	Android32 = 'android32',
	Linux = 'linux',
}

export const downloadUrl = (release: GitHubRelease, os: OS, portable = false) => {
	if (!release || !release.assets || !release.assets.length) return null;

	for (let i = 0; i < release.assets.length; i++) {
		const asset = release.assets[i];
		const name = asset.name;
		const ext = fileExtension(name);

		const githubAndroidUrl = 'github.com/XilinJia/Xilinota-android/releases/download/android-';
		const githubUrl = 'github.com/XilinJia/Xilinota/releases/download/';
		const xilinotaDomain = 'objects.xilinotausercontent.com/';

		if (ext === 'dmg' && os === OS.MacOs) return asset.browser_download_url.replace(githubUrl, xilinotaDomain);

		if (ext === 'exe' && os === OS.Windows) {
			if (portable) {
				if (name === 'XilinotaPortable.exe') return asset.browser_download_url.replace(githubUrl, xilinotaDomain);
			} else {
				if (name.match(/^Xilinota-Setup-[\d.]+\.exe$/)) return asset.browser_download_url.replace(githubUrl, xilinotaDomain);
			}
		}

		if (ext === 'AppImage' && os === OS.Linux) return asset.browser_download_url.replace(githubUrl, xilinotaDomain);

		if (os === OS.Android32 && name.endsWith('32bit.apk')) return asset.browser_download_url.replace(githubAndroidUrl, xilinotaDomain);

		if (os === OS.Android && ext === 'apk' && !name.endsWith('32bit.apk')) return asset.browser_download_url.replace(githubAndroidUrl, xilinotaDomain);
	}

	throw new Error(`Could not find download URL for: ${os}`);
};

function readmeContent() {
	if (!fs.existsSync(readmePath)) throw new Error(`Cannot find ${readmePath}`);
	return fs.readFileSync(readmePath, 'utf8');
}

function setReadmeContent(content: string) {
	if (!fs.existsSync(readmePath)) throw new Error(`Cannot find ${readmePath}`);
	return fs.writeFileSync(readmePath, content);
}

async function main(argv: any) {
	const waitForVersion = argv.length === 3 ? argv[2] : null;

	if (waitForVersion) console.info(`Waiting for version ${waitForVersion} to be released before updating readme...`);

	let release = null;
	while (true) {
		release = await gitHubLatestRelease('xilinota');
		if (!waitForVersion) break;

		if (release.tag_name !== waitForVersion) {
			await msleep(60000 * 5);
		} else {
			console.info(`Got version ${waitForVersion}`);
			break;
		}
	}

	const androidRelease = await gitHubLatestRelease('xilinota-android');

	// const android32Url = downloadUrl(androidRelease, OS.Android32);
	const androidUrl = downloadUrl(androidRelease, OS.Android);
	const winUrl = downloadUrl(release, OS.Windows);
	const winPortableUrl = downloadUrl(release, OS.Windows, true);
	const macOsUrl = downloadUrl(release, OS.MacOs);
	const linuxUrl = downloadUrl(release, OS.Linux);

	console.info('Windows: ', winUrl);
	console.info('Windows Portable: ', winPortableUrl);
	console.info('macOS: ', macOsUrl);
	console.info('Linux: ', linuxUrl);
	console.info('Android: ', androidUrl);
	// console.info('Android 32: ', android32Url);

	let content = readmeContent();

	if (winUrl) content = content.replace(/(https:\/\/objects.xilinotausercontent.com\/v\d+\.\d+\.\d+\/Xilinota-Setup-.*?\.exe)/, winUrl);
	if (winPortableUrl) content = content.replace(/(https:\/\/objects.xilinotausercontent.com\/v\d+\.\d+\.\d+\/XilinotaPortable.exe)/, winPortableUrl);
	if (macOsUrl) content = content.replace(/(https:\/\/objects.xilinotausercontent.com\/v\d+\.\d+\.\d+\/Xilinota-.*?\.dmg)/, macOsUrl);
	if (linuxUrl) content = content.replace(/(https:\/\/objects.xilinotausercontent.com\/v\d+\.\d+\.\d+\/Xilinota-.*?\.AppImage)/, linuxUrl);

	if (androidUrl) content = content.replace(/(https:\/\/objects.xilinotausercontent.com\/v\d+\.\d+\.\d+\/xilinota-v\d+\.\d+\.\d+\.apk)/, androidUrl);
	// if (android32Url) content = content.replace(/(https:\/\/objects.xilinotausercontent.com\/v\d+\.\d+\.\d+\/xilinota-v\d+\.\d+\.\d+-32bit\.apk)/, android32Url);

	setReadmeContent(content);
}

if (require.main === module) {

	main(process.argv).catch((error) => {
		console.error('Fatal error');
		console.error(error);
		process.exit(1);
	});
}
