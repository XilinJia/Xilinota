import urlUtils from './urlUtils';
import { encode } from 'html-entities';
import { escapeHtml } from './string-utils';

// [\s\S] instead of . for multiline matching
// https://stackoverflow.com/a/16119722/561309
const imageRegex = /<img([\s\S]*?)src=["']([\s\S]*?)["']([\s\S]*?)>/gi;
const anchorRegex = /<a([\s\S]*?)href=["']([\s\S]*?)["']([\s\S]*?)>/gi;
const embedRegex = /<embed([\s\S]*?)src=["']([\s\S]*?)["']([\s\S]*?)>/gi;
const objectRegex = /<object([\s\S]*?)data=["']([\s\S]*?)["']([\s\S]*?)>/gi;
const pdfUrlRegex = /[\s\S]*?\.pdf$/i;

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

class HtmlUtils {

	public headAndBodyHtml(doc: { head: { innerHTML: string; }; body: { innerHTML: string; }; }): string {
		const output: string[] = [];
		if (doc.head) output.push(doc.head.innerHTML);
		if (doc.body) output.push(doc.body.innerHTML);
		return output.join('\n');
	}

	public isSelfClosingTag(tagName: string): boolean {
		return selfClosingElements.includes(tagName.toLowerCase());
	}

	// Returns the **encoded** URLs, so to be useful they should be decoded again before use.
	private extractUrls(regex: RegExp, html: string): string[] {
		if (!html) return [];

		const output = [];
		let matches;
		while ((matches = regex.exec(html))) {
			output.push(matches[2]);
		}

		return output.filter(url => !!url);
	}

	// Returns the **encoded** URLs, so to be useful they should be decoded again before use.
	public extractImageUrls(html: string): string[] {
		return this.extractUrls(imageRegex, html);
	}

	// Returns the **encoded** URLs, so to be useful they should be decoded again before use.
	public extractPdfUrls(html: string): string[] {
		return [...this.extractUrls(embedRegex, html), ...this.extractUrls(objectRegex, html)].filter(url => pdfUrlRegex.test(url));
	}

	// Returns the **encoded** URLs, so to be useful they should be decoded again before use.
	public extractAnchorUrls(html: string): string[] {
		return this.extractUrls(anchorRegex, html);
	}

	// Returns the **encoded** URLs, so to be useful they should be decoded again before use.
	public extractFileUrls(html: string): string[] {
		return this.extractImageUrls(html).concat(this.extractAnchorUrls(html));
	}

	public replaceResourceUrl(html: string, urlToReplace: string, id: string): string {
		const htmlLinkRegex = `(?<=(?:src|href)=["'])${urlToReplace}(?=["'])`;
		const htmlReg = new RegExp(htmlLinkRegex, 'g');
		return html.replace(htmlReg, `:/${id}`);
	}

	public replaceImageUrls(html: string, callback: Function): string {
		return this.processImageTags(html, (data: any) => {
			const newSrc = callback(data.src);
			return {
				type: 'replaceSource',
				src: newSrc,
			};
		});
	}

	public replaceEmbedUrls(html: string, callback: Function): string {
		if (!html) return '';
		// We are adding the link as <a> since xilinota disabled <embed>, <object> tags due to security reasons.
		// See: CVE-2020-15930
		html = html.replace(embedRegex, (_v: string, _before: string, src: string, _after: string) => {
			const link = callback(src);
			return `<a href="${link}">${escapeHtml(src)}</a>`;
		});
		html = html.replace(objectRegex, (_v: string, _before: string, src: string, _after: string) => {
			const link = callback(src);
			return `<a href="${link}">${escapeHtml(src)}</a>`;
		});
		return html;
	}

	public replaceMediaUrls(html: string, callback: Function): string {
		html = this.replaceImageUrls(html, callback);
		html = this.replaceEmbedUrls(html, callback);
		return html;
	}

	// Note that the URLs provided by this function are URL-encoded, which is
	// usually what you want for web URLs. But if they are file:// URLs and the
	// file path is going to be used, it will need to be unescaped first. The
	// transformed SRC, must also be escaped before being sent back to this
	// function.
	public processImageTags(html: string, callback: Function): string {
		if (!html) return '';

		return html.replace(imageRegex, (_v: string, before: string, src: string, after: string) => {
			const action = callback({ src: src });

			if (!action) return `<img${before}src="${src}"${after}>`;

			if (action.type === 'replaceElement') {
				return action.html;
			}

			if (action.type === 'replaceSource') {
				return `<img${before}src="${action.src}"${after}>`;
			}

			if (action.type === 'setAttributes') {
				const attrHtml = this.attributesHtml(action.attrs);
				return `<img${before}${attrHtml}${after}>`;
			}

			throw new Error(`Invalid action: ${action.type}`);
		});
	}

	public prependBaseUrl(html: string, baseUrl: string): string {
		if (!html) return '';

		return html.replace(anchorRegex, (_v: string, before: string, href: string, after: string) => {
			const newHref = urlUtils.prependBaseUrl(href, baseUrl);
			return `<a${before}href="${newHref}"${after}>`;
		});
	}

	public attributesHtml(attr: any): string {
		const output: string[] = [];

		for (const n in attr) {
			if (!attr.hasOwnProperty(n)) continue;
			output.push(`${n}="${encode(attr[n])}"`);
		}

		return output.join(' ');
	}

}

export default new HtmlUtils();

export function plainTextToHtml(plainText: string): string {
	const lines = plainText
		.replace(/\r\n/g, '\n')
		.split('\n');

	if (lines.length === 1) return escapeHtml(lines[0]);

	// Step 1: Merge adjacent lines into paragraphs, with each line separated by
	// '<br/>'. So 'one\ntwo' will become '<p>one</br>two</p>'

	const step1: string[] = [];
	let currentLine = '';

	for (let line of lines) {
		line = line.trim();
		if (!line) {
			if (currentLine) {
				step1.push(`<p>${currentLine}</p>`);
				currentLine = '';
			}
			step1.push(line);
		} else {
			if (currentLine) {
				currentLine += `<br/>${escapeHtml(line)}`;
			} else {
				currentLine = escapeHtml(line);
			}
		}
	}

	if (currentLine) step1.push(`<p>${currentLine}</p>`);

	// Step 2: Convert the remaining empty lines to <br/> tags. Note that `n`
	// successive empty lines should produced `n-1` <br/> tags. This makes more
	// sense when looking at the tests.

	const step2: string[] = [];
	let newLineCount = 0;
	for (let i = 0; i < step1.length; i++) {
		const line = step1[i];

		if (!line) {
			newLineCount++;
			if (newLineCount >= 2) step2.push('');
		} else {
			newLineCount = 0;
			step2.push(line);
		}
	}

	// Step 3: Actually convert the empty lines to <br/> tags

	const step3: string[] = [];
	for (const line of step2) {
		step3.push(line ? line : '<br/>');
	}

	return step3.join('');
}
