export interface TinyMceCommand {
	name: string;
	value?: any;
	ui?: boolean;
}

interface XilinotaCommandToTinyMceCommands {
	[key: string]: TinyMceCommand | boolean;
}

// If the mapping is simply `true` it means that the command is supported via
// useWindowCommandHandlers.ts. We still add it here to have the complete list
// of supported commands.
export const xilinotaCommandToTinyMceCommands: XilinotaCommandToTinyMceCommands = {
	'textBold': { name: 'mceToggleFormat', value: 'bold' },
	'textItalic': { name: 'mceToggleFormat', value: 'italic' },
	'textCode': { name: 'mceToggleFormat', value: 'code' },
	'textLink': { name: 'mceLink' },
	'search': { name: 'SearchReplace' },
	'attachFile': { name: 'xilinotaAttach' },
	'insertDateTime': true,
};
