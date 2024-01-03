const urlUtils = {};

// this file is a sunset of the homonymous file under packages/lib
const resourceRegex = /^(xilinota:\/\/|:\/|\.resources\/)([0-9a-zA-Z]{32})(|#[^\s]*)(|\s".*?")$/;

urlUtils.urlDecode = function(string) {
	return decodeURIComponent((`${string}`).replace(/\+/g, '%20'));
};

urlUtils.isResourceUrl = function(url) {
	return !!url.match(resourceRegex);
};

urlUtils.parseResourceUrl = function(url) {
	if (!urlUtils.isResourceUrl(url)) return null;

	const match = url.match(resourceRegex);

	const itemId = match[2];
	let hash = match[3].trim();

	// In general we want the hash to be decoded so that non-alphabetical languages
	// appear as-is without being encoded with %.
	// Fixes https://github.com/XilinJia/Xilinota/issues/1870
	if (hash) hash = urlUtils.urlDecode(hash.substr(1)); // Remove the first #

	return {
		itemId: itemId,
		hash: hash,
	};
};

module.exports = urlUtils;
