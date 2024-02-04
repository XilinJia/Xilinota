import { MarkupLanguageUtils as BaseMarkupLanguageUtils } from '@xilinota/lib/markupLanguageUtils';
import { PluginStates } from '@xilinota/lib/services/plugins/reducer';
import { contentScriptsToRendererRules } from '@xilinota/lib/services/plugins/utils/loadContentScripts';
import { Options } from '@xilinota/lib/renderer/MarkupToHtml';

class MarkupLanguageUtils extends BaseMarkupLanguageUtils {

	public newMarkupToHtml(plugins: PluginStates = {}, options: Options = {}) {
		// plugins = plugins || {};

		return super.newMarkupToHtml(null, {
			extraRendererRules: contentScriptsToRendererRules(plugins),
			...options,
		});
	}

}

const markupLanguageUtils = new MarkupLanguageUtils();

export default markupLanguageUtils;
