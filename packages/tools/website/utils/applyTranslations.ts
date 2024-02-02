import { unique } from '@xilinota/lib/ArrayUtils';
import { attributesHtml, isSelfClosingTag } from '@xilinota/renderer/htmlUtils';
import { Translations } from '../../utils/translation';
import { encode } from 'html-entities';

const htmlparser2 = require('@xilinota/fork-htmlparser2');

const trimHtml = (content: string) => {
	return content
		.replace(/\n/g, '')
		.replace(/^(&tab;)+/i, '')
		.replace(/^(&nbsp;)+/i, '')
		.replace(/(&tab;)+$/i, '')
		.replace(/(&nbsp;)+$/i, '')
		.replace(/^\t+/, '')
		.replace(/\t+$/, '');
};

const findTranslation = (englishString: string, translations: Translations): string => {
	const stringsToTry = unique([
		englishString,
		englishString.replace(/<br\/>/gi, '<br>'),
		englishString.replace(/<br \/>/gi, '<br>'),
		englishString
			.replace(/&apos;/gi, '\'')
			.replace(/&quot;/gi, '"'),
	]) as string[];

	for (const stringToTry of stringsToTry) {
		// Note that we don't currently support plural forms for the website
		if (translations[stringToTry] && translations[stringToTry].length) return translations[stringToTry][0];
	}

	return englishString;
};

const encodeHtml = (decodedText: string): string => {
	return encode(decodedText)
		.replace(/&Tab;/gi, '\t')
		.replace(/{{&gt; /gi, '{{> '); // Don't break Mustache partials
};

export default (html: string, _languageCode: string, translations: Translations) => {
	const output: string[] = [];

	interface State {
		// When inside a block that needs to be translated, this array
		// accumulates the opening tags. For example, this text:
		//
		// <div translate>Hello <b>world</b></div>
		//
		// will have the tags ['div', 'b']
		//
		// This is used to track when we've processed all the content, including
		// HTML content, within a translatable block. Once that stack is empty,
		// we reached the end, and can translate the string that we got.
		translateStack: string[];

		// Keep a reference to the opening tag. For example in:
		//
		// <div translate>Hello <b>world</b></div>
		//
		// The opening tag is "div".
		currentTranslationTag: string[];

		// Once we finished processing the translable block, this will contain
		// the string to be translated. It may contain HTML.
		currentTranslationContent: string[];

		// Tells if we're at the beginning of a translable block.
		translateIsOpening: boolean;

		inScript: boolean;
	}

	const state: State = {
		translateStack: [],
		currentTranslationTag: [],
		currentTranslationContent: [],
		translateIsOpening: false,
		inScript: false,
	};

	const pushContent = (state: State, content: string) => {
		if (state.translateStack.length) {
			if (state.translateIsOpening) {
				state.currentTranslationTag.push(content);
			} else {
				state.currentTranslationContent.push(content);
			}
		} else {
			output.push(content);
		}
	};

	const parser = new htmlparser2.Parser({

		onopentag: (name: string, attrs: any) => {
			if (name === 'script') state.inScript = true;

			if ('translate' in attrs) {
				if (state.translateStack.length) throw new Error(`Cannot have a translate block within another translate block. At tag "${name}" attrs: ${JSON.stringify(attrs)}`);
				state.translateStack.push(name);
				state.currentTranslationContent = [];
				state.currentTranslationTag = [];
				state.translateIsOpening = true;
			} else if (state.translateStack.length) {
				state.translateStack.push(name);
			}

			let attrHtml = attributesHtml(attrs);
			if (attrHtml) attrHtml = ` ${attrHtml}`;
			const closingSign = isSelfClosingTag(name) ? '/>' : '>';

			pushContent(state, `<${name}${attrHtml}${closingSign}`);
			state.translateIsOpening = false;
		},

		ontext: (decodedText: string) => {
			const encodedText = state.inScript ? decodedText : encodeHtml(decodedText);
			pushContent(state, encodedText);
		},

		onclosetag: (name: string) => {
			if (state.translateStack.length) {
				state.translateStack.pop();

				if (!state.translateStack.length) {
					const stringToTranslate = trimHtml(state.currentTranslationContent.join(''));
					const translation = findTranslation(stringToTranslate, translations);
					output.push(state.currentTranslationTag[0]);
					output.push(translation);
				}
			}

			if (name === 'script') state.inScript = false;

			if (isSelfClosingTag(name)) return;
			pushContent(state, `</${name}>`);
		},

	}, { decodeEntities: true });

	parser.write(html);
	parser.end();

	return output.join('\n');
};
