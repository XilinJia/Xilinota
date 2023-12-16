import { Theme, ThemeAppearance } from '../../themes/type';
import themeToCss from './themeToCss';

const input: Theme = {
	appearance: ThemeAppearance.Light,

	// Color scheme "1" is the basic one, like used to display the note
	// content. It's basically dark gray text on white background
	backgroundColor: '#ffffff',
	backgroundColorTransparent: 'rgba(255,255,255,0.9)',
	oddBackgroundColor: '#eeeeee',
	color: '#32373F', // For regular text
	colorError: 'red',
	colorCorrect: 'green',
	colorWarn: 'rgb(228,86,0)',
	colorWarnUrl: '#155BDA',
	colorFaded: '#7C8B9E', // For less important text
	dividerColor: '#dddddd',
	selectedColor: '#e5e5e5',
	urlColor: '#155BDA',

	// Color scheme "2" is used for the sidebar. It's white text over
	// dark blue background.
	backgroundColor2: '#313640',
	color2: '#ffffff',
	selectedColor2: '#131313',
	colorError2: '#ff6c6c',
	colorWarn2: '#ffcb81',
	colorWarn3: '#ff7626',

	// Color scheme "3" is used for the config screens for example/
	// It's dark text over gray background.
	backgroundColor3: '#F4F5F6',
	backgroundColorHover3: '#CBDAF1',
	color3: '#738598',

	// Color scheme "4" is used for secondary-style buttons. It makes a white
	// button with blue text.
	backgroundColor4: '#ffffff',
	color4: '#2D6BDC',

	raisedBackgroundColor: '#e5e5e5',
	raisedColor: '#222222',
	searchMarkerBackgroundColor: '#F7D26E',
	searchMarkerColor: 'black',

	warningBackgroundColor: '#FFD08D',

	tableBackgroundColor: 'rgb(247, 247, 247)',
	codeBackgroundColor: 'rgb(243, 243, 243)',
	codeBorderColor: 'rgb(220, 220, 220)',
	codeColor: 'rgb(0,0,0)',

	blockQuoteOpacity: 0.7,

	codeMirrorTheme: 'default',
	codeThemeCss: 'atom-one-light.css',
};

const expected = `
:root {
	--xilinota-appearance: light;
	--xilinota-background-color: #ffffff;
	--xilinota-background-color2: #313640;
	--xilinota-background-color3: #F4F5F6;
	--xilinota-background-color4: #ffffff;
	--xilinota-background-color-hover3: #CBDAF1;
	--xilinota-background-color-transparent: rgba(255,255,255,0.9);
	--xilinota-block-quote-opacity: 0.7;
	--xilinota-code-background-color: rgb(243, 243, 243);
	--xilinota-code-border-color: rgb(220, 220, 220);
	--xilinota-code-color: rgb(0,0,0);
	--xilinota-code-mirror-theme: default;
	--xilinota-code-theme-css: atom-one-light.css;
	--xilinota-color: #32373F;
	--xilinota-color2: #ffffff;
	--xilinota-color3: #738598;
	--xilinota-color4: #2D6BDC;
	--xilinota-color-correct: green;
	--xilinota-color-error: red;
	--xilinota-color-error2: #ff6c6c;
	--xilinota-color-faded: #7C8B9E;
	--xilinota-color-warn: rgb(228,86,0);
	--xilinota-color-warn2: #ffcb81;
	--xilinota-color-warn3: #ff7626;
	--xilinota-color-warn-url: #155BDA;
	--xilinota-divider-color: #dddddd;
	--xilinota-odd-background-color: #eeeeee;
	--xilinota-raised-background-color: #e5e5e5;
	--xilinota-raised-color: #222222;
	--xilinota-search-marker-background-color: #F7D26E;
	--xilinota-search-marker-color: black;
	--xilinota-selected-color: #e5e5e5;
	--xilinota-selected-color2: #131313;
	--xilinota-table-background-color: rgb(247, 247, 247);
	--xilinota-url-color: #155BDA;
	--xilinota-warning-background-color: #FFD08D;
}`;

describe('themeToCss', () => {

	it('should a theme to a CSS string', async () => {
		const actual = themeToCss(input);
		expect(actual.trim()).toBe(expected.trim());
	});

});
