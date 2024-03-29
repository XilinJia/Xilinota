import { themeStyle } from '../components/global-style';

export default (themeId: number) => {
	const theme = themeStyle(themeId.toString());
	return {
		root: {
			flex: 1,
			backgroundColor: theme.backgroundColor,
		},
	};
};
