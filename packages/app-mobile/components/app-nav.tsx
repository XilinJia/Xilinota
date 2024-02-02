import React from 'react';
import { connect } from 'react-redux';
import NotesScreen from './screens/Notes';
import SearchScreen from './screens/search';
import { KeyboardAvoidingView, Keyboard, Platform, View, KeyboardEvent, Dimensions, EmitterSubscription } from 'react-native';
import { AppState } from '../utils/types';
import { themeStyle } from './global-style';
import { Dispatch } from '@reduxjs/toolkit';

interface Props {
	themeId: number;
	route: any;
	screens: any;

	dispatch: Dispatch;
}

interface State {
	autoCompletionBarExtraHeight: number;
	floatingKeyboardEnabled: boolean;
}

class AppNavComponent extends React.Component<Props, State> {

	private previousRouteName_: string | null = null;
	private keyboardDidShowListener: EmitterSubscription | null = null;
	private keyboardDidHideListener: EmitterSubscription | null = null;
	private keyboardWillChangeFrameListener: EmitterSubscription | null = null;

	public constructor(props: Props) {
		super(props);

		this.previousRouteName_ = null;
		this.state = {
			autoCompletionBarExtraHeight: 0, // Extra padding for the auto completion bar at the top of the keyboard
			floatingKeyboardEnabled: false,
		};
	}

	public UNSAFE_componentWillMount(): void {
		if (Platform.OS === 'ios') {
			this.keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', this.keyboardDidShow.bind(this));
			this.keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', this.keyboardDidHide.bind(this));
			this.keyboardWillChangeFrameListener = Keyboard.addListener('keyboardWillChangeFrame', this.keyboardWillChangeFrame);
		}
	}

	public componentWillUnmount(): void {
		this.keyboardDidShowListener?.remove();
		this.keyboardDidHideListener?.remove();
		this.keyboardWillChangeFrameListener?.remove();

		this.keyboardDidShowListener = null;
		this.keyboardDidHideListener = null;
		this.keyboardWillChangeFrameListener = null;
	}

	public keyboardDidShow(): void {
		this.setState({ autoCompletionBarExtraHeight: 30 });
	}

	public keyboardDidHide(): void {
		this.setState({ autoCompletionBarExtraHeight: 0 });
	}

	private keyboardWillChangeFrame = (evt: KeyboardEvent): void => {
		const windowWidth = Dimensions.get('window').width;

		// If the keyboard isn't as wide as the window, the floating keyboard is diabled.
		// See https://github.com/facebook/react-native/issues/29473#issuecomment-696658937
		this.setState({
			floatingKeyboardEnabled: evt.endCoordinates.width < windowWidth,
		});
	};

	public render(): React.JSX.Element {
		if (!this.props.route) throw new Error('Route must not be null');

		// Note: certain screens are kept into memory, in particular Notes and Search
		// so that the scroll position is not lost when the user navigate away from them.

		const route = this.props.route;
		let Screen = null;
		let notesScreenVisible = false;
		let searchScreenVisible = false;

		if (route.routeName === 'Notes') {
			notesScreenVisible = true;
		} else if (route.routeName === 'Search') {
			searchScreenVisible = true;
		} else {
			Screen = this.props.screens[route.routeName].screen;
		}

		// Keep the search screen loaded if the user is viewing a note from that search screen
		// so that if the back button is pressed, the screen is still loaded. However, unload
		// it if navigating away.
		const searchScreenLoaded = searchScreenVisible || (this.previousRouteName_ === 'Search' && route.routeName === 'Note');

		this.previousRouteName_ = route.routeName;

		const theme = themeStyle(this.props.themeId.toString());

		const style = { flex: 1, backgroundColor: theme.backgroundColor };

		// When the floating keybaord is enabled, the KeyboardAvoidingView can have a very small
		// height. Don't use the KeyboardAvoidingView when the floating keyboard is enabled.
		// See https://github.com/facebook/react-native/issues/29473
		const keyboardAvoidingViewEnabled = !this.state.floatingKeyboardEnabled;

		return (
			<KeyboardAvoidingView
				enabled={keyboardAvoidingViewEnabled}
				behavior={Platform.OS === 'ios' ? 'padding' : undefined}
				style={style}
			>
				<NotesScreen visible={notesScreenVisible} navigation={{ state: route }} />
				{/* navigation not exist */}
				{searchScreenLoaded && <SearchScreen visible={searchScreenVisible} navigation={{ state: route }} />}
				{/* {searchScreenLoaded && <SearchScreen visible={searchScreenVisible} />} */}
				{!notesScreenVisible && !searchScreenVisible && <Screen navigation={{ state: route }} themeId={this.props.themeId} dispatch={this.props.dispatch} />}
				<View style={{ height: this.state.autoCompletionBarExtraHeight }} />
			</KeyboardAvoidingView>
		);
	}
}

const AppNav = connect((state: AppState) => {
	return {
		route: state.route,
		themeId: state.settings.theme,
	};
})(AppNavComponent);

export default AppNav;

// module.exports = { AppNav };
