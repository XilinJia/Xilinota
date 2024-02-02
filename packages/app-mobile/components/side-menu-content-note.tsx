import React from 'react';
const Component = React.Component;
import { TouchableOpacity, Text, StyleSheet, ScrollView, View, GestureResponderEvent } from 'react-native';
import { connect } from 'react-redux';
import { AppState } from '../utils/types';
import { themeStyle } from './global-style';

import Icon from 'react-native-vector-icons/Ionicons';

// We need this to suppress the useless warning
// https://github.com/oblador/react-native-vector-icons/issues/1465

Icon.loadFont().catch((error: Error) => { console.info(error); });

interface Props {
	themeId: number;
	options: any;
	opacity: number;
}

class SideMenuContentNoteComponent extends Component<Props> {
	styles_: any;

	constructor(props: Props) {
		super(props);

		this.styles_ = {};
	}

	styles() {
		const theme = themeStyle(this.props.themeId.toString());

		if (this.styles_[this.props.themeId]) return this.styles_[this.props.themeId];
		this.styles_ = {};

		const styles: any = {
			menu: {
				flex: 1,
				backgroundColor: theme.backgroundColor,
			},
			button: {
				flex: 1,
				flexDirection: 'row',
				height: 36,
				alignItems: 'center',
				paddingLeft: theme.marginLeft,
				paddingRight: theme.marginRight,
			},
			sidebarIcon: {
				fontSize: 22,
				color: theme.color,
			},
			sideButtonText: {
				color: theme.color,
			},
		};

		styles.sideButton = { ...styles.button, flex: 0 };
		styles.sideButtonDisabled = { ...styles.sideButton, opacity: 0.6 };

		this.styles_[this.props.themeId] = StyleSheet.create(styles);
		return this.styles_[this.props.themeId];
	}

	renderDivider(key: React.Key | null | undefined) {
		const theme = themeStyle(this.props.themeId.toString());
		return <View style={{ marginTop: 15, marginBottom: 15, flex: -1, borderBottomWidth: 1, borderBottomColor: theme.dividerColor }} key={key}></View>;
	}

	renderSidebarButton(key: React.Key | null | undefined, title: string | number | boolean | React.ReactElement<any, string | React.JSXElementConstructor<any>> | Iterable<React.ReactNode> | React.ReactPortal | null | undefined, iconName: null, onPressHandler: ((event: GestureResponderEvent) => void) | undefined) {
		const content = (
			<View key={key} style={onPressHandler ? this.styles().sideButton : this.styles().sideButtonDisabled}>
				{!iconName ? null : <Icon name={iconName} style={this.styles().sidebarIcon} />}
				<Text style={this.styles().sideButtonText}>{title}</Text>
			</View>
		);

		if (!onPressHandler) return content;

		return (
			<TouchableOpacity key={key} onPress={onPressHandler}>
				{content}
			</TouchableOpacity>
		);
	}

	render() {
		const theme = themeStyle(this.props.themeId.toString());

		const items = [];

		const options = this.props.options ? this.props.options : [];
		let dividerIndex = 0;

		for (const option of options) {
			if (option.isDivider) {
				items.push(this.renderDivider(`divider_${dividerIndex++}`));
			} else {
				items.push(this.renderSidebarButton(option.title, option.title, null, option.onPress));
			}
		}

		const style = {
			flex: 1,
			borderRightWidth: 1,
			borderRightColor: theme.dividerColor,
			backgroundColor: theme.backgroundColor,
			paddingTop: 10,
		};

		return (
			<View style={style}>
				<View style={{ flex: 1, opacity: this.props.opacity }}>
					<ScrollView scrollsToTop={false} style={this.styles().menu}>
						{items}
					</ScrollView>
				</View>
			</View>
		);
	}
}

const SideMenuContentNote = connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
	};
})(SideMenuContentNoteComponent);

export default SideMenuContentNote;

// module.exports = { SideMenuContentNote };
