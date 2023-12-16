import { GitHubRelease } from './tool-utils';
import { downloadUrl, OS } from './update-readme-download';

describe('update-readme-download', () => {

	it('convert download URLs', async () => {
		const createRelease = (assetName: string, browserDownloadUrl: string) => {
			const r: GitHubRelease = {
				assets: [
					{
						browser_download_url: browserDownloadUrl,
						name: assetName,
					},
				],
				tag_name: '',
				upload_url: '',
				html_url: '',
				prerelease: false,
				draft: false,
				body: '',
			};
			return r;
		};

		const testCases: [GitHubRelease, OS, boolean, string][] = [
			[
				createRelease('xilinota-v2.9.8.apk', 'https://github.com/XilinJia/Xilinota-android/releases/download/android-v2.9.8/xilinota-v2.9.8.apk'),
				OS.Android,
				false,
				'https://objects.xilinotausercontent.com/v2.9.8/xilinota-v2.9.8.apk',
			],
			[
				createRelease('Xilinota-Setup-2.11.11.exe', 'https://github.com/XilinJia/Xilinota/releases/download/v2.11.11/Xilinota-Setup-2.11.11.exe'),
				OS.Windows,
				false,
				'https://objects.xilinotausercontent.com/v2.11.11/Xilinota-Setup-2.11.11.exe',
			],
			[
				createRelease('XilinotaPortable.exe', 'https://github.com/XilinJia/Xilinota/releases/download/v2.11.11/XilinotaPortable.exe'),
				OS.Windows,
				true,
				'https://objects.xilinotausercontent.com/v2.11.11/XilinotaPortable.exe',
			],
		];

		for (const [release, os, portable, expected] of testCases) {
			const actual = downloadUrl(release, os, portable);
			expect(actual).toBe(expected);
		}
	});

});
