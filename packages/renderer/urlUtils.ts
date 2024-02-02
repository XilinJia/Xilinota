
// this file is a sunset of the homonymous file under packages/lib
const resourceRegex = /^(xilinota:\/\/|:\/|\.resources\/)([0-9a-zA-Z]{32})(|#[^\s]*)(|\s".*?")$/;
// import { urlDecode } from './string-utils';

const urlDecode = function urlDecode(str: string) : string {
	return decodeURIComponent((`${str}`).replace(/\+/g, '%20'));
}

const isResourceUrl = function(url: string) {
	if (!url) return false;
	const matches = url.match(resourceRegex);
	return !!matches;
};

const parseResourceUrl = function(url: string) {
	if (!isResourceUrl(url)) return null;

	const match = url.match(resourceRegex);

	if (match) {
		const itemId = match[2];
		let hash = match[3].trim();

		// In general we want the hash to be decoded so that non-alphabetical languages
		// appear as-is without being encoded with %.
		// Fixes https://github.com/XilinJia/Xilinota/issues/1870
		if (hash) hash = urlDecode(hash.substring(1)); // Remove the first #

		return {
			itemId: itemId,
			hash: hash,
		};
	}
	return null;
};

const urlUtils = {
	urlDecode,
	isResourceUrl,
	parseResourceUrl,
}

export default urlUtils;
