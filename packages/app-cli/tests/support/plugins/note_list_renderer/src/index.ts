import xilinota from 'api';
import { ItemFlow, OnChangeEvent, OnChangeHandler } from 'api/noteListType';

const thumbnailCache_:Record<string, string> = {};

// This renderer displays the notes top to bottom. It's a minimal example that
// only displays the note title. For a full renderer, it's recommended to also
// handle whether the notes is a regular note or to-do (in which case a checkbox
// should be displayed).
const registerSimpleTopToBottomRenderer = async () => {
	await xilinota.views.noteList.registerRenderer({
		id: 'simpleTopToBottom',

		label: async () => 'Simple top-to-bottom renderer',

		flow: ItemFlow.TopToBottom,
	
		itemSize: {
			width: 0,
			height: 34,
		},
	
		dependencies: [
			'item.selected',
			'note.titleHtml',
		],

		itemCss: // css
			`
			> .content {
				display: flex;
				align-items: center;
				width: 100%;
				box-sizing: border-box;
				padding-left: 10px;
			}

			> .content.-selected {
				border: 1px solid var(--xilinota-color);
			}
			`,
	
		itemTemplate: // html
			`
			<div class="content {{#item.selected}}-selected{{/item.selected}}">
				{{{note.titleHtml}}}
			</div>
		`,
	
		onRenderNote: async (props: any) => {
			return props;
		},
	});
}

// This renderer displays the notes from left to right - it takes the first
// resource in the note, if any, and displays it as a thumbnail for the note. If
// no thumbnail is available, it displays the note title.
const registerSimpleLeftToRightRenderer = async() => {
	await xilinota.views.noteList.registerRenderer({
		id: 'simpleLeftToRight',

		label: async () => 'Simple left-to-right renderer',

		flow: ItemFlow.LeftToRight,
	
		itemSize: {
			width: 100,
			height: 100,
		},
	
		dependencies: [
			'note.id',
			'item.selected',
			'note.titleHtml',
			'note.body',
		],

		itemCss: // css
			`
			> .content {
				display: flex;
				align-items: center;
				justify-content: center;
				width: 100%;
				box-sizing: border-box;
				padding: 10px;
				border: 1px solid var(--xilinota-divider-color);

				> .thumbnail {
					display: flex;
					max-width: 80px;
					max-height: 80px;
				}
			}

			> .content.-selected {
				border: 1px solid var(--xilinota-color);
			}
			`,
	
		itemTemplate: // html
			`
			<div class="content {{#item.selected}}-selected{{/item.selected}}">
				{{#thumbnailFilePath}}
					<img class="thumbnail" src="file://{{thumbnailFilePath}}"/>
				{{/thumbnailFilePath}}
				{{^thumbnailFilePath}}
					{{{note.titleHtml}}}
				{{/thumbnailFilePath}}
			</div>
		`,
	
		onRenderNote: async (props: any) => {
			const resources = await xilinota.data.get(['notes', props.note.id, 'resources']);
			const resource = resources.items.length ? resources.items[0] : null;
			let thumbnailFilePath = '';

			if (resource) {
				const existingFilePath = thumbnailCache_[resource.id];
				if (existingFilePath) {
					thumbnailFilePath = existingFilePath;
				} else {
					const imageHandle = await xilinota.imaging.createFromResource(resource.id);
					const resizedImageHandle =  await xilinota.imaging.resize(imageHandle, { width: 80 });
					thumbnailFilePath = (await xilinota.plugins.dataDir()) + '/thumb_' + resource.id + '.jpg';
					await xilinota.imaging.toJpgFile(resizedImageHandle, thumbnailFilePath, 70);
					await xilinota.imaging.free(imageHandle);
					await xilinota.imaging.free(resizedImageHandle);
					thumbnailCache_[resource.id] = thumbnailFilePath;
				}
			}
			
			return {
				thumbnailFilePath,
				...props
			};
		},
	});
}

// This renderer displays an editable text input to change the note title
// directly from the note list.
const registerBuildInEditorRenderer = async () => {
	await xilinota.views.noteList.registerRenderer({
		id: 'buildInEditor',

		label: async () => 'Viewer with editor',

		flow: ItemFlow.TopToBottom,
	
		itemSize: {
			width: 0,
			height: 34,
		},
	
		dependencies: [
			'item.selected',
			'note.title',
		],

		itemCss: // css
			`
			> .content {
				display: flex;
				align-items: center;
				width: 100%;
				box-sizing: border-box;
				padding-left: 10px;
			}

			> .content.-selected {
				border: 1px solid var(--xilinota-color);
			}
			`,
	
		itemTemplate: // html
			`
			<div class="content {{#item.selected}}-selected{{/item.selected}}">
				<input data-id="noteTitleInput" type="text" value="{{note.title}}" />
			</div>
		`,
	
		onRenderNote: async (props: any) => {
			return props;
		},

		onChange: async (event: OnChangeEvent): Promise<void> => {
			if (event.elementId === 'noteTitleInput') {
				await xilinota.data.put(['notes', event.noteId], null, { title: event.value });	
			}
		},
	});
}

xilinota.plugins.register({
	onStart: async function() {
		await registerSimpleTopToBottomRenderer();
		await registerSimpleLeftToRightRenderer();	
		await registerBuildInEditorRenderer();		
	},
});
