import xilinota from 'api';

xilinota.plugins.register({
	onStart: async function() {
		const folder = await xilinota.data.post(['folders'], null, { title: "my plugin folder" });
		await xilinota.data.post(['notes'], null, { parent_id: folder.id, title: "testing plugin!" });
	},
});
