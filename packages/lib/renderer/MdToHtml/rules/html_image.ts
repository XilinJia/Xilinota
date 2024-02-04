import { RuleOptions } from '../../MdToHtml';
import { attributesHtml } from '../../htmlUtils';
import utils from '../../utils';

function renderImageHtml(before: string, src: string, after: string, ruleOptions: RuleOptions): string {
	const r = utils.imageReplacement(ruleOptions.ResourceModel, src, ruleOptions.resources, ruleOptions.resourceBaseUrl, ruleOptions.itemIdToUrl);
	if (typeof r === 'string') return r;
	if (r) return `<img ${before} ${attributesHtml(r)} ${after}/>`;
	return `[Image: ${src}]`;
}

function plugin(markdownIt: any, ruleOptions: RuleOptions): void {
	const Resource = ruleOptions.ResourceModel;

	const htmlBlockDefaultRender =
		markdownIt.renderer.rules.html_block ||
		function(tokens: any[], idx: number, options: any, _env: any, self: any) {
			return self.renderToken(tokens, idx, options);
		};

	const htmlInlineDefaultRender =
		markdownIt.renderer.rules.html_inline ||
		function(tokens: any[], idx: number, options: any, _env: any, self: any) {
			return self.renderToken(tokens, idx, options);
		};

	const imageRegex = /<img(.*?)src=["'](.*?)["'](.*?)>/gi;

	const handleImageTags = function(defaultRender: Function) {
		return function(tokens: any[], idx: number, options: any, env: any, self: any) {
			const token = tokens[idx];
			const content = token.content;

			if (!content.match(imageRegex)) return defaultRender(tokens, idx, options, env, self);

			return content.replace(imageRegex, (_v: any, before: string, src: string, after: string) => {
				if (!Resource.isResourceUrl(src) && !Resource.isResourceFileUrl(src)) return `<img${before}src="${src}"${after}>`;
				return renderImageHtml(before, src, after, ruleOptions);
			});
		};
	};

	// It seems images sometimes are inline, sometimes a block
	// to make sure they both render correctly.
	markdownIt.renderer.rules.html_block = handleImageTags(htmlBlockDefaultRender);
	markdownIt.renderer.rules.html_inline = handleImageTags(htmlInlineDefaultRender);
}

export default { plugin };
