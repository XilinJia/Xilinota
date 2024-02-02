import { Translations } from '../../utils/translation';
import applyTranslations from './applyTranslations';

// defining the type is necessary for TS to correctly handle translations
interface Test {
	html: string,
	translations: Translations,
	htmlTranslated: string
}

describe('applyTranslations', () => {

	it('should apply translations', async () => {
		const tests: Test[] = [
			{
				html: '<div><span translate>Translate me</span></div>',
				translations: {
					'Translate me': ['Traduis moi'],
					'Translate it': ['Traduis le'],
				},
				htmlTranslated: '<div>\n<span translate>\nTraduis moi\n</span>\n</div>',
			},
			{
				html: '<div><span translate>Translate me</span></div>',
				translations: {
					'Translate it': ['Traduis le'],
				},
				htmlTranslated: '<div>\n<span translate>\nTraduis moi\n</span>\n</div>',
			},
			{
				html: '<div><span translate>Missing translation</span></div>',
				translations: {},
				htmlTranslated: '<div>\n<span translate>\nMissing translation\n</span>\n</div>',
			},
			{
				html: '<h1 translate class="text-center">\nFree your <span class="frame-bg frame-bg-blue">notes</span>\n</h1>',
				translations: {
                    'Free your <span class="frame-bg frame-bg-blue">notes</span>': ['Libérez vos <span class="frame-bg frame-bg-blue">notes</span>'],
				},
				htmlTranslated: '<h1 translate class="text-center">\nLibérez vos <span class="frame-bg frame-bg-blue">notes</span>\n</h1>',
			},
			{
				html: '<h1 translate class="text-center">\nFree your <span class="frame-bg frame-bg-blue">notes</span>\n</h1>',
				translations: {
					'Free your &lt;span class="frame-bg frame-bg-blue"&gt;notes&lt;/span&gt;': ['Libérez vos &lt;span class="frame-bg frame-bg-blue"&gt;notes&lt;/span&gt;'],
				},
				htmlTranslated: '<h1 translate class="text-center">\nLibérez vos <span class="frame-bg frame-bg-blue">notes</span>\n</h1>',
			},
			{
				html: '<div translate>Save <span class="frame-bg frame-bg-blue">web pages</span> <br />as notes</div>',
				translations: {
					'Save <span class="frame-bg frame-bg-blue">web pages</span> <br>as notes': ['Sauvegardez vos <span class="frame-bg frame-bg-blue">pages web</span> <br>en notes'],
				},
				htmlTranslated: '<div translate>\nSauvegardez vos <span class="frame-bg frame-bg-blue">pages web</span> <br>en notes\n</div>',
			},
		];

		for (const test of tests) {
			const actual = applyTranslations(test.html, 'fr_FR', test.translations);
			expect(actual).toEqual(test.htmlTranslated);
		}
	});

});
