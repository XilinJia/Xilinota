import { shell } from 'electron';

import { CommandRuntime, CommandDeclaration, CommandContext } from '@xilinota/lib/services/CommandService';
import shim from '@xilinota/lib/shim';
import { _ } from '@xilinota/lib/locale';
import bridge from '../../../services/bridge';
import { openItemById } from '../../NoteEditor/utils/contextMenu';
import urlUtils from '@xilinota/lib/urlUtils';
import { fileUriToPath } from '@xilinota/utils/url';
import { urlDecode } from '@xilinota/lib/string-utils';

export const declaration: CommandDeclaration = {
	name: 'openItem',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, link: string) => {
			if (!link) throw new Error('Link cannot be empty');

			if (link.startsWith('xilinota://') || link.startsWith(':/')) {
				const parsedUrl = urlUtils.parseResourceUrl(link);
				if (parsedUrl) {
					const { itemId, hash } = parsedUrl;
					await openItemById(itemId, context.dispatch, hash);
				} else {
					void shell.openExternal(link);
				}
			} else if (urlUtils.urlProtocol(link)) {
				if (link.indexOf('file://') === 0) {
					// When using the file:// protocol, openPath doesn't work (does
					// nothing) with URL-encoded paths.
					//
					// shell.openPath seems to work with file:// urls on Windows,
					// but doesn't on macOS, so we need to convert it to a path
					// before passing it to openPath.
					const decodedPath = fileUriToPath(urlDecode(link), shim.platformName());
					void shell.openPath(decodedPath);
				} else {
					void shell.openExternal(link);
				}
			} else {
				bridge().showErrorMessageBox(_('Unsupported link or message: %s', link));
			}
		},
	};
};
