import { rtrimSlashes } from './path-utils';
import { urlDecode } from './string-utils';

// a sunset of this file is under packages/renderer

const resourceRegex = /^(xilinota:\/\/|:\/|\.resources\/)([0-9a-zA-Z]{32})(|#[^\s]*)(|\s".*?")$/;


const hash = (url: string): string => {
	const s = url.split('#');
	if (s.length <= 1) return '';
	return s[s.length - 1];
};

const urlWithoutPath = function(url: string): string {
	const parsed = require('url').parse(url, true);
	return `${parsed.protocol}//${parsed.host}`;
};

const urlProtocol = function(url: string): string {
	if (!url) return '';
	const parsed = require('url').parse(url, true);
	return parsed.protocol;
};

const prependBaseUrl = function(url: string, baseUrl: string): string {
	baseUrl = rtrimSlashes(baseUrl).trim(); // All the code below assumes that the baseUrl does not end up with a slash
	url = url.trim();

	if (!url) url = '';
	if (!baseUrl) return url;
	if (url.indexOf('#') === 0) return url; // Don't prepend if it's a local anchor
	if (urlUtils.urlProtocol(url)) return url; // Don't prepend the base URL if the URL already has a scheme

	if (url.length >= 2 && url.indexOf('//') === 0) {
		// If it starts with // it's a protcol-relative URL
		return urlUtils.urlProtocol(baseUrl) + url;
	} else if (url && url[0] === '/') {
		// If it starts with a slash, it's an absolute URL so it should be relative to the domain (and not to the full baseUrl)
		return urlUtils.urlWithoutPath(baseUrl) + url;
	} else {
		return baseUrl + (url ? `/${url}` : '');
	}
};

const isResourceUrl = function(url: string): boolean {
	if (!url) return false;
	const matches = url.match(resourceRegex);
	return !!matches;
};

const parseResourceUrl = function(url: string): { itemId: string; hash: string; } | null {
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

const extractMarkdownResources = function(text: string): { itemId: string; hash: string; }[] {
	// XJ changed
	// const markdownLinksRE = /\]\((.*?)\)/g;
	const markdownLinksRE = /\]\(((\.resources|:)\/[0-9a-zA-Z]+)?.?[^\s]+/g;
	// const markdownLinksRE = /\]\(?(?::\/)?(?:\.resources\/)?([\da-fA-F]+)(?:\.|\b|\))/g;
	const output = [];
	let result = null;

	while ((result = markdownLinksRE.exec(text)) !== null) {
		const resourceUrlInfo = urlUtils.parseResourceUrl(result[1]);
		if (resourceUrlInfo) output.push(resourceUrlInfo);
	}
	return output;
};

const extractResourceUrls = function(text: string): { itemId: string; hash: string; }[] {
	const output = urlUtils.extractMarkdownResources(text);

	const htmlRegexes = [
		/<img[\s\S]*?src=["']:\/([a-zA-Z0-9]{32})["'][\s\S]*?>/gi,
		/<img[\s\S]*?src=["']\.resources\/([a-zA-Z0-9]{32})?.?[^\s]+["'][\s\S]*?>/gi,
		/<a[\s\S]*?href=["']:\/([a-zA-Z0-9]{32})["'][\s\S]*?>/gi,
		/<a[\s\S]*?href=["']\.resources\/([a-zA-Z0-9]{32})?.?[^\s]+["'][\s\S]*?>/gi,
	];

	for (const htmlRegex of htmlRegexes) {
		while (true) {
			const m = htmlRegex.exec(text);
			if (!m) break;
			output.push({ itemId: m[1], hash: '' });
		}
	}

	return output;
};

const objectToQueryString = function(query: { [x: string]: string | number | boolean }): string {
	if (!query) return '';

	let queryString = '';
	const s = [];
	for (const k in query) {
		if (!query.hasOwnProperty(k)) continue;
		s.push(`${encodeURIComponent(k)}=${encodeURIComponent(query[k])}`);
	}
	queryString = s.join('&');

	return queryString;
};

const urlUtils = {
	hash,
	urlWithoutPath,
	urlProtocol,
	prependBaseUrl,
	isResourceUrl,
	parseResourceUrl,
	extractMarkdownResources,
	extractResourceUrls,
	objectToQueryString,
}

export default urlUtils;

// module.exports = urlUtils;
