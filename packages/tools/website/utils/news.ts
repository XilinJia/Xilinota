/* eslint-disable import/prefer-default-export */

import { FrontMatter } from './frontMatter';
import { basename } from 'path';
import moment from 'moment';

export const getNewsDateString = (info: FrontMatter, mdFilePath: string): string => {
	return moment(getNewsDate(info, mdFilePath)).format('D MMM YYYY');
};

export const getNewsDate = (info: FrontMatter, mdFilePath: string): Date => {
	// If the date is set in the metadata, we get it from there. Otherwise we
	// derive it from the filename (eg. 20220224-release-2-7.md)

	if (info.created) {
		return info.created;
	} else {
		const filenameNoExt = basename(mdFilePath, '.md');
		const s = filenameNoExt.split('-');
		return moment.utc(s[0], 'YYYYMMDD').toDate();
	}
};
