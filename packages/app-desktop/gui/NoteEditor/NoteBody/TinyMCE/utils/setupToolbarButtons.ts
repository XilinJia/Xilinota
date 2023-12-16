import { _ } from '@xilinota/lib/locale';

interface ButtonDefinition {
	name: string;
	tooltip: string;
	icon: string;
	grouped?: boolean;
}

function buttonDefinitions(): ButtonDefinition[] {
	return [
		{
			name: 'xilinotaHighlight',
			tooltip: _('Highlight'),
			icon: 'highlight-bg-color',
		},
		{
			name: 'xilinotaStrikethrough',
			tooltip: _('Strikethrough'),
			icon: 'strike-through',
		},
		{
			name: 'xilinotaInsert',
			tooltip: _('Insert'),
			icon: 'underline',
			grouped: true,
		},
		{
			name: 'xilinotaSup',
			tooltip: _('Superscript'),
			icon: 'superscript',
			grouped: true,
		},
		{
			name: 'xilinotaSub',
			tooltip: _('Subscript'),
			icon: 'subscript',
			grouped: true,
		},
	];
}

export default function(editor: any) {
	const definitions = buttonDefinitions();

	for (const def of definitions) {
		editor.ui.registry.addToggleButton(def.name, {
			tooltip: def.tooltip,
			icon: def.icon,
			onAction: async function() {
				editor.execCommand('mceToggleFormat', false, def.name);
			},
			onSetup: function(api: any) {
				editor.formatter.formatChanged(def.name, (state: boolean) => {
					api.setActive(state);
				});
			},
		});
	}

	const items: string[] = definitions.filter(d => !!d.grouped).map(d => d.name);

	editor.ui.registry.addGroupToolbarButton('formattingExtras', {
		icon: 'image-options',
		items: items.join(' '),
	});
}
