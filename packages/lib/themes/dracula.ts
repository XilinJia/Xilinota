import { Theme } from './type';
import theme_dark from './dark';

const theme: Theme = {
	...theme_dark,

	backgroundColor: '#282a36',
	backgroundColorTransparent: 'rgba(40, 42, 54, 0.9)',
	oddBackgroundColor: '#282a36',
	color: '#f8f8f2', // For regular text
	colorError: '#ff5555',
	colorWarn: '#ffb86c',
	colorFaded: '#6272a4', // For less important text;
	dividerColor: '#bd93f9',
	selectedColor: '#44475a',
	urlColor: '#8be9fd',

	backgroundColor2: '#21222C',
	color2: '#bd93f9',
	selectedColor2: '#44475a',
	colorError2: '#ff5555',

	raisedBackgroundColor: '#44475a',
	raisedColor: '#bd93f9',

	warningBackgroundColor: '#ffb86c',

	tableBackgroundColor: '#6272a4',
	codeBackgroundColor: '#44475a',
	codeBorderColor: '#f8f8f2',
	codeColor: '#50fa7b',

	codeMirrorTheme: 'dracula',
	codeThemeCss: 'atom-one-dark-reasonable.css',
};

export default theme;
