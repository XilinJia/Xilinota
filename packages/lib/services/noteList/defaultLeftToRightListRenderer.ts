import { _ } from '../../locale';
import { MarkupLanguage, MarkupToHtml } from '../../renderer';
import { ItemFlow, ListRenderer } from '../plugins/api/noteListType';

interface Props {
	note: {
		id: string;
		title: string;
		is_todo: number;
		todo_completed: number;
		body: string;
	};
	item: {
		size: {
			width: number;
			height: number;
		};
		selected: boolean;
	};
}

const defaultLeftToRightItemRenderer: ListRenderer = {
	id: 'detailed',

	label: async () => _('Detailed'),

	flow: ItemFlow.LeftToRight,

	itemSize: {
		width: 150,
		height: 150,
	},

	dependencies: [
		'item.selected',
		'item.size.width',
		'item.size.height',
		'note.body',
		'note.id',
		'note.is_shared',
		'note.is_todo',
		'note.isWatched',
		'note.titleHtml',
		'note.todo_completed',
	],

	itemCss: // css
		`			
		&:before {
			content: '';
			border-bottom: 1px solid var(--xilinota-divider-color);
			width: 90%;
			position: absolute;
			bottom: 0;
			left: 5%;
		}
	
		> .content.-selected {
			background-color: var(--xilinota-selected-color);
		}

		&:hover {
			background-color: var(--xilinota-background-color-hover3);
		}
	
		> .content {
			display: flex;
			box-sizing: border-box;
			position: relative;
			width: 100%;
			padding: 16px;
			align-items: flex-start;
			overflow-y: hidden;
			flex-direction: column;
			user-select: none;
	
			> .checkbox {
				display: flex;
				align-items: center;

				> input {
					margin: 0px 10px 1px 0px;
				}
			}
	
			> .title {
				font-family: var(--xilinota-font-family);
				font-size: var(--xilinota-font-size);
				color: var(--xilinota-color);
				cursor: default;
				flex: 0;
				display: flex;
				align-items: flex-start;
				margin-bottom: 8px;

				> .checkbox {
					margin: 0 6px 0 0;
				}

				> .watchedicon {
					display: none;
					padding-right: 4px;
					color: var(--xilinota-color);
				}

				> .titlecontent {
					word-break: break-all;
					overflow: hidden;
					text-overflow: ellipsis;
					text-wrap: nowrap;
				}
			}

			> .preview {
				overflow-y: hidden;
				font-family: var(--xilinota-font-family);
				font-size: var(--xilinota-font-size);
				color: var(--xilinota-color);
				cursor: default;
			}
		}

		> .content.-shared {
			> .title {
				color: var(--xilinota-color-warn3);
			}
		}

		> .content.-completed {
			> .title {
				opacity: 0.5;
			}
		}

		> .content.-watched {
			> .title {
				> .watchedicon {
					display: inline;
				}
			}
		}
	`,

	itemTemplate: // html
		`
		<div class="content {{#item.selected}}-selected{{/item.selected}} {{#note.is_shared}}-shared{{/note.is_shared}} {{#note.todo_completed}}-completed{{/note.todo_completed}} {{#note.isWatched}}-watched{{/note.isWatched}}">
			<div style="width: {{titleWidth}}px;" class="title" data-id="{{note.id}}">
				{{#note.is_todo}}
					<input class="checkbox" data-id="todo-checkbox" type="checkbox" {{#note.todo_completed}}checked="checked"{{/note.todo_completed}}>
				{{/note.is_todo}}
				<i class="watchedicon fa fa-share-square"></i>
				<div class="titlecontent">{{{note.titleHtml}}}</div>
			</div>
			<div class="preview">{{notePreview}}</div>
		</div>
	`,

	onRenderNote: async (props: Props) => {
		const markupToHtml_ = new MarkupToHtml();

		return {
			...props,
			notePreview: markupToHtml_.stripMarkup(MarkupLanguage.Markdown, props.note.body).substring(0, 200),
			titleWidth: props.item.size.width - 32,
		};
	},
};

export default defaultLeftToRightItemRenderer;
