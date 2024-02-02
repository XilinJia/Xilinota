import React from 'react';

import { _ } from '@xilinota/lib/locale';
import ToolbarButton from './ToolbarButton';
import { ButtonSpec, StyleSheetData } from './types';
import MaterialIcon from 'react-native-vector-icons/MaterialIcons';

type OnToggleOverflowCallback = () => void;
interface ToggleOverflowButtonProps {
	overflowVisible: boolean;
	onToggleOverflowVisible: OnToggleOverflowCallback;
	styleSheet: StyleSheetData;
}

// Button that shows/hides the overflow menu.
const ToggleOverflowButton = (props: ToggleOverflowButtonProps) => {
	const spec: ButtonSpec = {
		icon: (
			<MaterialIcon name="more-horiz" style={props.styleSheet.styles.text} />
		),
		description:
			props.overflowVisible ? _('Hide more actions') : _('Show more actions'),
		active: props.overflowVisible,
		onPress: props.onToggleOverflowVisible,
	};

	return (
		<ToolbarButton
			styleSheet={props.styleSheet}
			spec={spec}
		/>
	);
};
export default ToggleOverflowButton;
