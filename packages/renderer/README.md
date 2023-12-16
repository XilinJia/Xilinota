# Xilinota Renderer

This is the renderer used by [Xilinota](https://github.com/XilinJia/Xilinota) to render notes in Markdown or HTML format.

## Installation

	npm i -s xilinota-renderer

Certain plugins require additional assets like CSS, fonts, etc. These assets are in the `/assets` directory and should be copied to wherever the application can find them at runtime.

## Usage

```js
const { MarkupToHtml } = require('xilinota-renderer');

const options = {};

// The notes are rendered using the provided theme. The supported theme properties are in `defaultNoteStyle.js`
// and this is what is used if no theme is provided. A `theme` object can be provided to override default theme
// properties.
const theme = {};

const markdown = "Testing `MarkupToHtml` renderer";

const markupToHtml = new MarkupToHtml(options);
const result = await markupToHtml.render(MarkupToHtml.MARKUP_LANGUAGE_MARKDOWN, markdown, theme, options);

console.info('HTML:', result.html);
console.info('Plugin assets:', result.pluginAssets);
```

When calling `render()`, an object with the following properties is returned:

- `html`: The rendered HTML code
- `pluginAssets`: The assets required by the plugins

The assets need to be loaded by the calling application. For example this is how they are loaded in the Xilinota desktop application:

```js
function loadPluginAssets(assets) {
	for (let i = 0; i < assets.length; i++) {
		const asset = assets[i];

		if (asset.mime === 'text/css') {
			const link = document.createElement('link');
			link.rel = 'stylesheet';
			link.href = 'pluginAssets/' + asset.name;
			document.getElementById('xilinota-container-styleContainer').appendChild(link);
		}
	}
}
```

## Development

# Updating a markdown-it plugin

Whenever updating a Markdown-it plugin, such as Katex or Mermaid, make sure to run `npm run buildAssets`, which will compile the CSS and JS for use in the Xilinota applications.

### Adding asset files

A plugin (or rule) can have any number of assets, such as CSS or font files, associated with it. To add an asset to a plugin, follow these steps:

- Add the file under `/assets/PLUGIN_NAME/your-asset-file.css`
- Register this file within the plugin using `context.pluginAssets[PLUGIN_NAME] = [{ name: 'your-asset-file.css' }]`

See katex.js for an example of how this is done.

### Adding inline CSS

A plugin can ask for some CSS to be included inline in the rendered HTML. This is convenient as it means no extra file needs to be packaged. Use this syntax to do this:

```
context.pluginAssets[PLUGIN_NAME] = [
	{
		inline: true,
		text: ".my-css { background-color: 'green' }",
		mime: 'text/css',
	},
];
```