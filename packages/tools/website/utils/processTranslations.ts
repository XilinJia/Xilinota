import { mkdirp, readFile, writeFile } from 'fs-extra';
import { dirname } from 'path';
import { Translations } from '../../utils/translation';
import applyTranslations from './applyTranslations';

export default async (englishFilePath: string, translatedFilePath: string, languageCode: string, translations: Translations) => {
	let content = await readFile(englishFilePath, 'utf8');
	content = content.replace('<html lang="en-gb">', `<html lang="${languageCode}">`);
	const translatedContent = await applyTranslations(content, languageCode, translations);
	const translatedDirname = dirname(translatedFilePath);
	await mkdirp(translatedDirname);
	await writeFile(translatedFilePath, translatedContent, 'utf8');
};
