import { PluginStates } from '@xilinota/lib/services/plugins/reducer';
import { useCallback, useMemo } from 'react';
import { ResourceInfos } from './types';
import markupLanguageUtils from '../../../utils/markupLanguageUtils';
import Setting from '@xilinota/lib/models/Setting';
import shim from '@xilinota/lib/shim';

import { themeStyle } from '@xilinota/lib/theme';
import Note from '@xilinota/lib/models/Note';

interface HookDependencies {
	themeId: number;
	customCss: string;
	plugins: PluginStates;
}

export interface MarkupToHtmlOptions {
	replaceResourceInternalToExternalLinks?: boolean;
	resourceInfos?: ResourceInfos;
	contentMaxWidth?: number;
	plugins?: Record<string, any>;
	bodyOnly?: boolean;
	mapsToLine?: boolean;
	useCustomPdfViewer?: boolean;
	noteId?: string;
	vendorDir?: string;
	platformName?: string;
}

export default function useMarkupToHtml(deps: HookDependencies) {
	const { themeId, customCss, plugins } = deps;

	const markupToHtml = useMemo(() => {
		return markupLanguageUtils.newMarkupToHtml(deps.plugins, {
			resourceBaseUrl: `file://${Setting.value('resourceDir')}/`,
			customCss: customCss || '',
		});
		
	}, [plugins, customCss]);

	return useCallback(async (markupLanguage: number, md: string, options: MarkupToHtmlOptions = {}): Promise<any> => {
		options = {
			replaceResourceInternalToExternalLinks: false,
			resourceInfos: {},
			platformName: shim.platformName(),
			...options,
		};

		md = md || '';

		const theme = themeStyle(themeId);
		let resources = {};

		if (options.replaceResourceInternalToExternalLinks) {
			md = await Note.replaceResourceInternalToExternalLinks(md, { useAbsolutePaths: true });
		} else {
			resources = options.resourceInfos??{};
		}

		delete options.replaceResourceInternalToExternalLinks;

		const result = await markupToHtml.render(markupLanguage, md, theme, { codeTheme: theme.codeThemeCss,
			resources: resources,
			postMessageSyntax: 'ipcProxySendToHost',
			splitted: true,
			externalAssetsOnly: true,
			codeHighlightCacheKey: 'useMarkupToHtml', ...options });

		return result;
		
	}, [themeId, customCss, markupToHtml]);
}
