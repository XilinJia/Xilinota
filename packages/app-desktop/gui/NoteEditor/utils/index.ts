import { FormNote } from './types';

import HtmlToMd from '@xilinota/lib/HtmlToMd';
import Note from '@xilinota/lib/models/Note';
import { MarkupToHtml } from '@xilinota/renderer';

export async function htmlToMarkdown(markupLanguage: number, html: string, originalCss: string): Promise<string> {
	let newBody = '';

	if (markupLanguage === MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN) {
		const htmlToMd = new HtmlToMd();
		newBody = htmlToMd.parse(html, { preserveImageTagsWithSize: true });
		newBody = await Note.replaceResourceExternalToInternalLinks(newBody, { useAbsolutePaths: true });
	} else {
		newBody = await Note.replaceResourceExternalToInternalLinks(html, { useAbsolutePaths: true });
		if (originalCss) newBody = `<style>${originalCss}</style>\n${newBody}`;
	}

	return newBody;
}

export async function formNoteToNote(formNote: FormNote): Promise<any> {
	return {
		id: formNote.id,
		// Should also include parent_id so that the reducer can know in which folder the note should go when saving
		// https://discourse.xilinotaapp.org/t/experimental-wysiwyg-editor-in-xilinota/6915/57?u=laurent
		parent_id: formNote.parent_id,
		title: formNote.title,
		body: formNote.body,
	};
}
