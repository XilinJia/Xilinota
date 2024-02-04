import { _ } from '@xilinota/lib/locale';
import { MarkupToHtml } from '@xilinota/lib/renderer';
import { TinyMceEditorEvents } from './types';
const taboverride = require('taboverride');

interface SourceInfo {
	openCharacters: string;
	closeCharacters: string;
	content: string;
	node: any;
	language: string;
}

function dialogTextArea_keyDown(event: any) {
	if (event.key === 'Tab') {
		window.requestAnimationFrame(() => event.target.focus());
	}
}

// Allows pressing tab in a textarea to input an actual tab (instead of changing focus)
// taboverride will take care of actually inserting the tab character, while the keydown
// event listener will override the default behaviour, which is to focus the next field.
function enableTextAreaTab(enable: boolean) {
	const textAreas = document.getElementsByClassName('tox-textarea');
	for (const textArea of textAreas) {
		taboverride.set(textArea, enable);

		if (enable) {
			textArea.addEventListener('keydown', dialogTextArea_keyDown);
		} else {
			textArea.removeEventListener('keydown', dialogTextArea_keyDown);
		}
	}
}

function findBlockSource(node: any): SourceInfo {
	const sources = node.getElementsByClassName('xilinota-source');
	if (!sources.length) throw new Error('No source for node');
	const source = sources[0];

	return {
		openCharacters: source.getAttribute('data-xilinota-source-open'),
		closeCharacters: source.getAttribute('data-xilinota-source-close'),
		content: source.textContent,
		node: source,
		language: source.getAttribute('data-xilinota-language') || '',
	};
}

function newBlockSource(language = '', content = '', previousSource: SourceInfo | null = null): SourceInfo {
	let fence = '```';

	if (language === 'katex') {
		if (previousSource && previousSource.openCharacters === '$') {
			fence = '$';
		} else {
			fence = '$$';
		}
	}

	const fenceLanguage = language === 'katex' ? '' : language;

	return {
		openCharacters: fence === '$' ? '$' : `\n${fence}${fenceLanguage}\n`,
		closeCharacters: fence === '$' ? '$' : `\n${fence}\n`,
		content: content,
		node: null,
		language: language,
	};
}

function editableInnerHtml(html: string): string {
	const temp = document.createElement('div');
	temp.innerHTML = html;
	const editable = temp.getElementsByClassName('xilinota-editable');
	if (!editable.length) throw new Error(`Invalid xilinota-editable: ${html}`);
	return editable[0].innerHTML;
}


export default function openEditDialog(editor: any, markupToHtml: any, dispatchDidUpdate: Function, editable: any) {
	const source = editable ? findBlockSource(editable) : newBlockSource();

	editor.windowManager.open({
		title: _('Edit'),
		size: 'large',
		initialData: {
			codeTextArea: source.content,
			languageInput: source.language,
		},
		onSubmit: async (dialogApi: any) => {
			const newSource = newBlockSource(dialogApi.getData().languageInput, dialogApi.getData().codeTextArea, source);
			const md = `${newSource.openCharacters}${newSource.content.trim()}${newSource.closeCharacters}`;
			const result = await markupToHtml.current(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, md, { bodyOnly: true });

			// markupToHtml will return the complete editable HTML, but we only
			// want to update the inner HTML, so as not to break additional props that
			// are added by TinyMCE on the main node.

			if (editable) {
				editable.innerHTML = editableInnerHtml(result.html);
			} else {
				editor.insertContent(result.html);
			}

			dialogApi.close();
			editor.fire(TinyMceEditorEvents.XilinotaChange);
			dispatchDidUpdate(editor);
		},
		onClose: () => {
			enableTextAreaTab(false);
		},
		body: {
			type: 'panel',
			items: [
				{
					type: 'input',
					name: 'languageInput',
					label: 'Language',
					// Katex is a special case with special opening/closing tags
					// and we don't currently handle switching the language in this case.
					disabled: source.language === 'katex',
				},
				{
					type: 'textarea',
					name: 'codeTextArea',
					value: source.content,
				},
			],
		},
		buttons: [
			{
				type: 'submit',
				text: 'OK',
			},
		],
	});

	window.requestAnimationFrame(() => {
		enableTextAreaTab(true);
	});
}
