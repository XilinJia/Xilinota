import React from 'react';

import { StyleSheet, View, TextInput, FlatList, TouchableHighlight } from 'react-native';
import { connect } from 'react-redux';
import ScreenHeader from '../ScreenHeader';

import Icon from 'react-native-vector-icons/Ionicons';
const DialogBox = require('react-native-dialogbox').default;

import { _ } from '@xilinota/lib/locale';
import Note from '@xilinota/lib/models/Note';
import BaseScreenComponent from '../base-screen';

import NoteItem from '../note-item';
import { themeStyle } from '../global-style';

import SearchEngineUtils from '@xilinota/lib/services/searchengine/SearchEngineUtils';
import SearchEngine from '@xilinota/lib/services/searchengine/SearchEngine';
import { AppState } from '../../utils/types';
import { NoteEntity } from '@xilinota/lib/services/database/types';
import { Dispatch } from 'redux';

// We need this to suppress the useless warning
// https://github.com/oblador/react-native-vector-icons/issues/1465

Icon.loadFont().catch((error: any) => { console.info(error); });

interface Props {
	themeId: number;
	query: any;
	visible: boolean;
	settings: any;
	noteSelectionEnabled: boolean;
	navigation: any;

	dispatch: Dispatch;
}

interface State {
	query: any;
	notes: NoteEntity[];
}
class SearchScreenComponent extends BaseScreenComponent<Props, State> {

	// private state: any = null;
	private isMounted_ = false;
	private styles_: any = {};
	private scheduleSearchTimer_: any = null;
	dialogbox: any;

	public static navigationOptions() {
		return { header: null } as any;
	}

	public constructor(props: Props) {
		super(props);
		this.state = {
			query: '',
			notes: [],
		};
	}

	public styles() {
		const theme = themeStyle(this.props.themeId.toString());

		if (this.styles_[this.props.themeId]) return this.styles_[this.props.themeId];
		this.styles_ = {};

		const styles: any = {
			body: {
				flex: 1,
			},
			searchContainer: {
				flexDirection: 'row',
				alignItems: 'center',
				borderWidth: 1,
				borderColor: theme.dividerColor,
			},
		};

		styles.searchTextInput = { ...theme.lineInput };
		styles.searchTextInput.paddingLeft = theme.marginLeft;
		styles.searchTextInput.flex = 1;
		styles.searchTextInput.backgroundColor = theme.backgroundColor;
		styles.searchTextInput.color = theme.color;

		styles.clearIcon = { ...theme.icon };
		styles.clearIcon.color = theme.colorFaded;
		styles.clearIcon.paddingRight = theme.marginRight;
		styles.clearIcon.backgroundColor = theme.backgroundColor;

		this.styles_[this.props.themeId] = StyleSheet.create(styles);
		return this.styles_[this.props.themeId];
	}

	public componentDidMount() {
		this.setState({ query: this.props.query });
		void this.refreshSearch(this.props.query);
		this.isMounted_ = true;
	}

	public componentWillUnmount() {
		this.isMounted_ = false;
	}

	private clearButton_press() {
		this.props.dispatch({
			type: 'SEARCH_QUERY',
			query: '',
		});

		this.setState({ query: '' });
		void this.refreshSearch('');
	}

	public async refreshSearch(query: string = '') {
		if (!this.props.visible) return;

		let notes: NoteEntity[] = [];

		if (query) {
			if (this.props.settings['db.ftsEnabled']) {
				notes = await SearchEngineUtils.notesForQuery(query, true);
			} else {
				const p = query.split(' ');
				const temp = [];
				for (let i = 0; i < p.length; i++) {
					const t = p[i].trim();
					if (!t) continue;
					temp.push(t);
				}

				notes = await Note.previews('', {
					anywherePattern: `*${temp.join('*')}*`,
				});
			}
		}

		if (!this.isMounted_) return;

		const parsedQuery = await SearchEngine.instance().parseQuery(query);
		const highlightedWords = SearchEngine.instance().allParsedQueryTerms(parsedQuery);

		this.props.dispatch({
			type: 'SET_HIGHLIGHTED',
			words: highlightedWords,
		});

		this.setState({ notes: notes });
	}

	public scheduleSearch() {
		if (this.scheduleSearchTimer_) clearTimeout(this.scheduleSearchTimer_);

		this.scheduleSearchTimer_ = setTimeout(() => {
			this.scheduleSearchTimer_ = null;
			void this.refreshSearch(this.state.query);
		}, 200);
	}

	private searchTextInput_changeText(text: string) {
		this.setState({ query: text });

		this.props.dispatch({
			type: 'SEARCH_QUERY',
			query: text,
		});

		this.scheduleSearch();
	}

	public render() {
		if (!this.isMounted_) return null;

		const theme = themeStyle(this.props.themeId.toString());

		const rootStyle = {
			flex: 1,
			backgroundColor: theme.backgroundColor,
		};

		if (!this.props.visible) {
			rootStyle.flex = 0.001; // This is a bit of a hack but it seems to work fine - it makes the component invisible but without unmounting it
		}

		const thisComponent = this;

		return (
			<View style={rootStyle}>
				<ScreenHeader
					title={_('Search')}
					parentComponent={thisComponent}
					folderPickerOptions={{
						enabled: this.props.noteSelectionEnabled,
						mustSelect: true,
					}}
					showSideMenuButton={false}
					showSearchButton={false}
				/>
				<View style={this.styles().body}>
					<View style={this.styles().searchContainer}>
						<TextInput
							style={this.styles().searchTextInput}
							autoFocus={this.props.visible}
							underlineColorAndroid="#ffffff00"
							onChangeText={text => this.searchTextInput_changeText(text)}
							value={this.state.query}
							selectionColor={theme.textSelectionColor}
							keyboardAppearance={theme.keyboardAppearance}
						/>
						<TouchableHighlight
							onPress={() => this.clearButton_press()}
							accessibilityLabel={_('Clear')}
						>
							<Icon name="close-circle" style={this.styles().clearIcon} />
						</TouchableHighlight>
					</View>

					<FlatList data={this.state.notes} keyExtractor={(item) => item.id ?? ''} renderItem={event => <NoteItem note={event.item} />} />
				</View>
				<DialogBox
					ref={(dialogbox: any) => {
						this.dialogbox = dialogbox;
					}}
				/>
			</View>
		);
	}
}

const SearchScreen = connect((state: AppState) => {
	return {
		query: state.searchQuery,
		themeId: state.settings.theme,
		settings: state.settings,
		noteSelectionEnabled: state.noteSelectionEnabled ?? false,
	};
})(SearchScreenComponent);

export default SearchScreen;

// module.exports = { SearchScreen };
