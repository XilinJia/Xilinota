xilinota.plugins.register({
	onStart: async function() {
		await xilinota.data.post(['folders'], null, { title: "multi - simple2" });
	},
});