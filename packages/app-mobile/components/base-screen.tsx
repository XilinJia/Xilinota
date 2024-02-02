import React from 'react';

import { StyleSheet } from 'react-native';

import { themeStyle } from './global-style';

const rootStyles_: Record<string, any> = {};

export default class BaseScreenComponent<Props = {}, States = {}> extends React.Component<Props, States> {

	rootStyle(themeId: string | number) :any {
		const theme = themeStyle(themeId.toString());
		if (rootStyles_[themeId]) return rootStyles_[themeId];
		rootStyles_[themeId] = StyleSheet.create({
			root: {
				flex: 1,
				backgroundColor: theme.backgroundColor,
			},
		});
		return rootStyles_[themeId];
	}
}

// module.exports = { BaseScreenComponent };
