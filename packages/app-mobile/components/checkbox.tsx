import React from 'react';

const Component = React.Component;
import { View, TouchableHighlight, StyleProp, ViewStyle } from 'react-native';

import Icon from 'react-native-vector-icons/Ionicons';
// We need this to suppress the useless warning
// https://github.com/oblador/react-native-vector-icons/issues/1465

Icon.loadFont().catch((error: Error) => { console.info(error); });

const styles = {
	checkboxIcon: {
		fontSize: 20,
		height: 22,
		// marginRight: 10,
	},
};

interface Props {
	checked: boolean;
	style: any;
	accessibilityLabel?: string;
	onChange: (arg0: boolean) => void;
}

interface State {
	checked: boolean;
}
class Checkbox extends Component<Props, State> {
	constructor(props: Props) {
		super(props);
		this.state = {
			checked: false,
		};
	}

	UNSAFE_componentWillMount() {
		this.setState({ checked: this.props.checked });
	}

	UNSAFE_componentWillReceiveProps(newProps: { checked: any; }) {
		if ('checked' in newProps) {
			this.setState({ checked: newProps.checked });
		}
	}

	onPress() {
		const newChecked = !this.state.checked;
		this.setState({ checked: newChecked });
		if (this.props.onChange) this.props.onChange(newChecked);
	}

	render() {
		const iconName = this.state.checked ? 'checkbox-outline' : 'square-outline';

		const style: any = this.props.style ? { ...this.props.style } : {};
		style.justifyContent = 'center';
		style.alignItems = 'center';

		const checkboxIconStyle: any = { ...styles.checkboxIcon };
		if (style.color) checkboxIconStyle.color = style.color;

		if (style.paddingTop) checkboxIconStyle.marginTop = style.paddingTop;
		if (style.paddingBottom) checkboxIconStyle.marginBottom = style.paddingBottom;
		if (style.paddingLeft) checkboxIconStyle.marginLeft = style.paddingLeft;
		if (style.paddingRight) checkboxIconStyle.marginRight = style.paddingRight;

		const thStyle: StyleProp<ViewStyle> = {
			justifyContent: 'center',
			alignItems: 'center',
		};

		if (style && style.display === 'none') return <View />;

		// if (style.display) thStyle.display = style.display;

		return (
			<TouchableHighlight
				onPress={() => this.onPress()}
				style={thStyle}
				accessibilityRole="checkbox"
				accessibilityState={{
					checked: this.state.checked,
				}}
				accessibilityLabel={this.props.accessibilityLabel ?? ''}>
				<Icon name={iconName} style={checkboxIconStyle} />
			</TouchableHighlight>
		);
	}
}

export default Checkbox;
// module.exports = { Checkbox };
