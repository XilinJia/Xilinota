const { createSelector } = require('reselect');
const { themeStyle } = require('@xilinota/lib/theme');

const themeSelector = (state, props) => themeStyle(props.themeId);

const style = createSelector(
	themeSelector,
	(theme) => {
		const output = {
			button: {
				fontFamily: theme.fontFamily,
				minWidth: 52,
				border: 'none',
				flexDirection: 'column',
				display: 'flex',
				alignItems: 'center',
				padding: 9,
				backgroundColor: theme.backgroundColor,
				userSelect: 'none',
			},
			buttonIcon: {
				fontSize: 24,
				color: theme.iconColor,
			},
			buttonLabel: {
				display: 'flex',
				flex: 1,
				alignItems: 'flex-end',
				color: theme.colorFaded,
			},
			root: {
				minHeight: 58,
				display: 'flex',
				borderBottomWidth: 1,
				borderBottomStyle: 'solid',
				borderBottomColor: theme.dividerColor,
			},
			barButtons: {
				display: 'flex',
				flexDirection: 'row',
			},
		};

		output.buttonIconSelected = { ...output.buttonIcon, color: theme.highlightedColor };

		output.buttonLabelSelected = { ...output.buttonLabel, color: theme.color };

		return output;
	},
);

module.exports = style;
