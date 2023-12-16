import { _ } from '../../locale';
import { ItemFlow, ListRenderer } from '../plugins/api/noteListType';

interface Props {
	note: {
		id: string;
		title: string;
		is_todo: number;
		todo_completed: number;
	};
	item: {
		size: {
			height: number;
		};
		selected: boolean;
	};
}

const defaultListRenderer: ListRenderer = {
	id: 'compact',

	label: async () => _('Compact'),

	flow: ItemFlow.TopToBottom,

	itemSize: {
		width: 0,
		height: 34,
	},

	dependencies: [
		'item.selected',
		'item.size.height',
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
			padding-left: 16px;
	
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
				text-decoration: none;
				color: var(--xilinota-color);
				cursor: default;
				white-space: nowrap;
				flex: 1 1 0%;
				display: flex;
				align-items: center;
				overflow: hidden;

				> .watchedicon {
					display: none;
					padding-right: 4px;
					color: var(--xilinota-color);
				}
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
			{{#note.is_todo}}
				<div class="checkbox">
					<input data-id="todo-checkbox" type="checkbox" {{#note.todo_completed}}checked="checked"{{/note.todo_completed}}>
				</div>
			{{/note.is_todo}}	
			<div class="title" data-id="{{note.id}}">
				<i class="watchedicon fa fa-share-square"></i>
				<span>{{{note.titleHtml}}}</span>
			</div>
		</div>
	`,

	onRenderNote: async (props: Props) => {
		return props;
	},
};

export default defaultListRenderer;
