const imageMimeTypes = [
	'image/cgm',
	'image/fits',
	'image/g3fax',
	'image/gif',
	'image/ief',
	'image/jp2',
	'image/jpeg',
	'image/jpm',
	'image/jpx',
	'image/naplps',
	'image/png',
	'image/prs.btif',
	'image/prs.pti',
	'image/svg+xml',
	'image/t38',
	'image/tiff',
	'image/tiff-fx',
	'image/vnd.adobe.photoshop',
	'image/vnd.cns.inf2',
	'image/vnd.djvu',
	'image/vnd.dwg',
	'image/vnd.dxf',
	'image/vnd.fastbidsheet',
	'image/vnd.fpx',
	'image/vnd.fst',
	'image/vnd.fujixerox.edmics-mmr',
	'image/vnd.fujixerox.edmics-rlc',
	'image/vnd.globalgraphics.pgb',
	'image/vnd.microsoft.icon',
	'image/vnd.mix',
	'image/vnd.ms-modi',
	'image/vnd.net-fpx',
	'image/vnd.sealed.png',
	'image/vnd.sealedmedia.softseal.gif',
	'image/vnd.sealedmedia.softseal.jpg',
	'image/vnd.svf',
	'image/vnd.wap.wbmp',
	'image/vnd.xiff',
];

const escapeQuotes = (str: string) => str.replace(/"/g, '&quot;');

const attributesToStr = (attributes: { [s: string]: any; } | ArrayLike<any>) =>
	Object.entries(attributes)
		.map(([key, value]) => ` ${key}="${escapeQuotes(value)}"`)
		.join('');

const attachmentElement = ({ src, attributes, id }: { src: string; attributes: Record<string, string>; id : string }) =>
	[
		`<a href=':/${id}' ${attributesToStr(attributes)}>`,
		`  ${attributes.alt || src}`,
		'</a>',
	].join('');

const imgElement = ({ src, attributes } : { src: string; attributes: Record<string, string> }) =>
	`<img src="${src}" ${attributesToStr(attributes)} />`;

const audioElement = ({ src, alt, id }: { src: string; alt: Record<string, string>; id : string }) =>
	[
		'<audio controls preload="none" style="width:480px;">',
		`	<source src="${src}" type="audio/mp4" />`,
		'	<p>',
		'		Your browser does not support HTML5 audio.',
		'	</p>',
		'</audio>',
		'<p>',
		`  <a href="${src}">`,
		`    ${alt || src || id || 'Download audio'}`,
		'  </a>',
		'</p>',
	].join('');

const resourceUtils = {
	imgElement,
	audioElement,
	attachmentElement,
	attributesToStr,
	isImageMimeType: (m: string) => imageMimeTypes.indexOf(m) >= 0,
};

export default resourceUtils;

// module.exports = resourceUtils;
