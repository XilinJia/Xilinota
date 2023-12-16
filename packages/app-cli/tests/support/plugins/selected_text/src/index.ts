import xilinota from 'api';
import { ToolbarButtonLocation } from 'api/types';

function allEqual(input:string, char:string) {
	return input.split('').every(c => c === char);
}

xilinota.plugins.register({
	onStart: async function() {
		xilinota.commands.register({
			name: 'prettyMarkdownTable',
			label: 'Reformat the selected Markdown table',
			iconName: 'fas fa-music',
			execute: async () => {
				const selectedText = (await xilinota.commands.execute('selectedText') as string);
				
				const lines = selectedText.split('\n');

				const cellWidths = [];

				for (let line of lines) {
					const cells = line.split('|');
					for (let i = 0; i < cells.length; i++) {
						const c = cells[i].trim();

						if (i >= cellWidths.length) cellWidths.push(0);

						if (c.length > cellWidths[i]) {
							cellWidths[i] = c.length;
						}
					}
				}

				const newLines = [];

				for (let line of lines) {
					const cells = line.split('|');
					const newCells = [];
					for (let i = 0; i < cells.length; i++) {
						const c = cells[i].trim();
						const newContent = c.padEnd(cellWidths[i], allEqual(c, '-') ? '-' : ' ');
						newCells.push(newContent);
					}

					newLines.push(newCells.join(' | '));
				}

				await xilinota.commands.execute('replaceSelection', newLines.join('\n'));
			},
		});
		
		xilinota.views.toolbarButtons.create('prettyMarkdownTableButton', 'prettyMarkdownTable', ToolbarButtonLocation.EditorToolbar);
	},
});
