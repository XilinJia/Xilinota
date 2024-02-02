const URL = require('url-parse');

export function isCallbackUrl(s: string): boolean {
	return s.startsWith('xilinota://x-callback-url/openNote?') ||
		s.startsWith('xilinota://x-callback-url/openFolder?') ||
		s.startsWith('xilinota://x-callback-url/openTag?');
}

export function getNoteCallbackUrl(noteId: string): string {
	return `xilinota://x-callback-url/openNote?id=${encodeURIComponent(noteId)}`;
}

export function getFolderCallbackUrl(folderId: string): string {
	return `xilinota://x-callback-url/openFolder?id=${encodeURIComponent(folderId)}`;
}

export function getTagCallbackUrl(tagId: string): string {
	return `xilinota://x-callback-url/openTag?id=${encodeURIComponent(tagId)}`;
}

export const enum CallbackUrlCommand {
	OpenNote = 'openNote',
	OpenFolder = 'openFolder',
	OpenTag = 'openTag',
}

export interface CallbackUrlInfo {
	command: CallbackUrlCommand;
	params: Record<string, string>;
}

export function parseCallbackUrl(s: string): CallbackUrlInfo {
	if (!isCallbackUrl(s)) throw new Error(`Invalid callback url ${s}`);
	const url = new URL(s, true);
	return {
		command: url.pathname.substring(url.pathname.lastIndexOf('/') + 1) as CallbackUrlCommand,
		params: url.query,
	};
}
