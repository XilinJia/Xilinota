// Utility function to convert the plugin assets to a list of LINK or SCRIPT tags
// that can be included in the HEAD tag.
export default function assetsToHeaders(pluginAssets: string | any[], options: any = null): string | Record<string, string> {
	options = { asHtml: false, ...options };

	const headers: Record<string, string> = {};
	for (let i = 0; i < pluginAssets.length; i++) {
		const asset = pluginAssets[i];
		if (asset.mime === 'text/css') {
			headers[asset.name] = `<link rel="stylesheet" href="pluginAssets/${asset.name}">`;
		} else if (asset.mime === 'application/javascript') {
			// NOT TESTED!!
			headers[asset.name] = `<script type="application/javascript" src="pluginAssets/${asset.name}"></script>`;
		}
	}

	if (options.asHtml) {
		const output = [];
		for (const name in headers) {
			output.push(headers[name]);
		}
		return output.join('');
	}

	return headers;
}

// module.exports = assetsToHeaders;
