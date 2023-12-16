import xilinota from 'api';

xilinota.plugins.register({
	onStart: async function() {
		const installDir = await xilinota.plugins.installationDir();		
		const chromeCssFilePath = installDir + '/chrome.css';
		const noteCssFilePath = installDir + '/note.css';
		await (xilinota as any).window.loadChromeCssFile(chromeCssFilePath);
		await (xilinota as any).window.loadNoteCssFile(noteCssFilePath);
	},
});
