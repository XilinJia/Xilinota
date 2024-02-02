import { useState } from 'react';
import { ListRenderer } from '@xilinota/lib/services/plugins/api/noteListType';
import Note from '@xilinota/lib/models/Note';
import { NoteEntity, TagEntity } from '@xilinota/lib/services/database/types';
import useAsyncEffect from '@xilinota/lib/hooks/useAsyncEffect';
import { createHash } from 'crypto';
import getNoteTitleHtml from './getNoteTitleHtml';
import prepareViewProps from './prepareViewProps';
import * as Mustache from 'mustache';
import Tag from '@xilinota/lib/models/Tag';

interface RenderedNote {
	id: string;
	hash: string;
	html: string;
}

const hashContent = (content: any) => {
	return createHash('sha1').update(JSON.stringify(content)).digest('hex');
};

export default (note: NoteEntity, isSelected: boolean, isWatched: boolean, listRenderer: ListRenderer, highlightedWords: string[]): RenderedNote => {
	const [renderedNote, setRenderedNote] = useState<RenderedNote>({id:'', hash:'', html:''});

	useAsyncEffect(async (event) => {
		const renderNote = async (): Promise<void> => {
			let noteTags: TagEntity[] = [];

			if (note.id && listRenderer.dependencies.includes('note.tags')) {
				noteTags = await Tag.tagsByNoteId(note.id, { fields: ['id', 'title'] });
			}

			// Note: with this hash we're assuming that the list renderer
			// properties never changes. It means that later if we support
			// dynamic list renderers, we should include these into the hash.
			const viewHash = hashContent([
				listRenderer.id,
				note.updated_time,
				isSelected,
				isWatched,
				highlightedWords,
				note.encryption_applied,
				noteTags.map(t => t.title).sort().join(','),
			]);

			if (renderedNote && renderedNote.hash === viewHash) return;

			// console.info('RENDER', note.id, renderedNote ? renderedNote.hash : 'NULL', viewHash);

			const titleHtml = getNoteTitleHtml(highlightedWords, Note.displayTitle(note));
			const viewProps = await prepareViewProps(
				listRenderer.dependencies,
				note,
				listRenderer.itemSize,
				isSelected,
				titleHtml,
				isWatched,
				noteTags,
			);

			if (event.cancelled) return;

			const view = await listRenderer.onRenderNote(viewProps);

			if (event.cancelled) return;

			setRenderedNote({
				id: note.id??'',
				hash: viewHash,
				html: Mustache.render(listRenderer.itemTemplate, view),
			});
		};

		void renderNote();
	}, [note, isSelected, isWatched, listRenderer, renderedNote]);

	return renderedNote;
};
