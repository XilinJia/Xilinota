/* xilinota-manifest:
{
	"id": "org.xilinotaapp.plugins.JsBundleDemo",
	"manifest_version": 1,
	"app_min_version": "1.4",
	"name": "JS Bundle test",
	"description": "JS Bundle Test plugin",
	"version": "1.0.0",
	"author": "Laurent Cozic",
	"homepage_url": "https://xilinotaapp.org"
}
*/

xilinota.plugins.register({
	onStart: async function() {
		await xilinota.data.post(['folders'], null, { title: "my plugin folder" });
	},
});
