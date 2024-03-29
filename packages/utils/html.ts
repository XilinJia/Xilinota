/* eslint-disable import/prefer-default-export */

const selfClosingElements = [
	'area',
	'base',
	'basefont',
	'br',
	'col',
	'command',
	'embed',
	'frame',
	'hr',
	'img',
	'input',
	'isindex',
	'keygen',
	'link',
	'meta',
	'param',
	'source',
	'track',
	'wbr',
];

import { encode as htmlentities } from 'html-entities';
export { htmlentities };

// export const htmlentities = new Entities().encode;

export const attributesHtml = (attr: Record<string, any>): string => {
	const output = [];

	for (const n in attr) {
		if (!attr.hasOwnProperty(n)) continue;
		output.push(`${n}="${htmlentities(attr[n])}"`);
	}

	return output.join(' ');
};

export const isSelfClosingTag = (tagName: string): boolean => {
	return selfClosingElements.includes(tagName.toLowerCase());
};
