import xilinota from 'api';

xilinota.plugins.register({
	onStart: async function() {
		setTimeout(async () => {
			const installDir = await xilinota.plugins.installationDir();
			console.info('Plugin installation directory: ', installDir);
			
			const fs = xilinota.require('fs-extra');
			const fileContent = await fs.readFile(installDir + '/external.txt', 'utf8');
			console.info('Read external file content: ' + fileContent);
		}, 5000);
	},
});
