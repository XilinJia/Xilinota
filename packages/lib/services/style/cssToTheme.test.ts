import cssToTheme from './cssToTheme';

describe('cssToTheme', () => {

	it('should convert a CSS string to a theme', async () => {
		const input = `
			:root {
				--xilinota-appearence: light;
				--xilinota-color: #333333;
				--xilinota-background-color: #778899;

				/* Should skip this comment and empty lines */

				--xilinota-background-color-transparent: rgba(255,255,255,0.9);
			}`;

		const expected = {
			appearence: 'light',
			color: '#333333',
			backgroundColor: '#778899',
			backgroundColorTransparent: 'rgba(255,255,255,0.9)',
		};

		const actual = cssToTheme(input, 'test.css');
		expect(actual).toEqual(expected);
	});

});
