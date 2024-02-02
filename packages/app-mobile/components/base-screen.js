import React from 'react';
import { StyleSheet } from 'react-native';
import { themeStyle } from './global-style';
const rootStyles_ = {};
export default class BaseScreenComponent extends React.Component {
    rootStyle(themeId) {
        const theme = themeStyle(themeId.toString());
        if (rootStyles_[themeId])
            return rootStyles_[themeId];
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
//# sourceMappingURL=base-screen.js.map