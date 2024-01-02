import * as React from 'react';
import { useState, useCallback, useEffect, useRef } from 'react';
import SearchInput from '../lib/SearchInput/SearchInput';
import Setting from '@xilinota/lib/models/Setting';
import { stateUtils } from '@xilinota/lib/reducer';
import BaseModel from '@xilinota/lib/BaseModel';
import uuid from '@xilinota/lib/uuid_';
const { connect } = require('react-redux');
import Note from '@xilinota/lib/models/Note';
import { AppState } from '../../app.reducer';
const debounce = require('debounce');
const styled = require('styled-components').default;

export const Root = styled.div`
	position: relative;
	display: flex;
	width: 100%;
	min-width: 30px;
`;

interface Props {
	inputRef?: any;
	notesParentType: string;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	dispatch?: Function;
	selectedNoteId: string;
	isFocused?: boolean;
}

function SearchBar(props: Props) {
	const [query, setQuery] = useState('');
	const [searchStarted, setSearchStarted] = useState(false);
	const searchId = useRef(uuid.create());

	useEffect(() => {
		// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
		function search(searchId: string, query: string, dispatch: Function) {
			dispatch({
				type: 'SEARCH_UPDATE',
				search: {
					id: searchId,
					title: query,
					query_pattern: query,
					query_folder_id: null,
					type_: BaseModel.TYPE_SEARCH,
				},
			});

			dispatch({
				type: 'SEARCH_SELECT',
				id: searchId,
			});
		}

		const debouncedSearch = debounce(search, 500);
		if (searchStarted) debouncedSearch(searchId.current, query, props.dispatch);
		return () => {
			debouncedSearch.clear();
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [query, searchStarted]);

	const onExitSearch = useCallback(async (navigateAway = true) => {
		setQuery('');
		setSearchStarted(false);

		if (navigateAway) {
			const note = props.selectedNoteId ? await Note.load(props.selectedNoteId) : null;

			if (note) {
				props.dispatch({
					type: 'FOLDER_AND_NOTE_SELECT',
					folderId: note.parent_id,
					noteId: note.id,
				});
			} else {
				const folderId = Setting.value('activeFolderId');
				if (folderId) {
					props.dispatch({
						type: 'FOLDER_SELECT',
						id: folderId,
					});
				}
			}
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [props.selectedNoteId]);

	function onChange(event: any) {
		if (event.value.length === 0) {
			// Revert to previous state if query string becomes empty
			void onExitSearch();
			return;
		}
		setSearchStarted(true);
		setQuery(event.value);
	}

	function onFocus() {
		props.dispatch({
			type: 'FOCUS_SET',
			field: 'globalSearch',
		});
	}

	function onBlur() {
		// Do it after a delay so that the "Clear" button
		// can be clicked on (otherwise the field loses focus
		// and is resized before the click event has been processed)
		setTimeout(() => {
			props.dispatch({
				type: 'FOCUS_CLEAR',
				field: 'globalSearch',
			});
		}, 300);
	}

	const onKeyDown = useCallback((event: any) => {
		if (event.key === 'Escape') {
			if (document.activeElement) (document.activeElement as any).blur();
			void onExitSearch();
		}
	}, [onExitSearch]);

	const onSearchButtonClick = useCallback(() => {
		if (props.isFocused || searchStarted) {
			void onExitSearch();
		} else {
			setSearchStarted(true);
			props.inputRef.current.focus();
			props.dispatch({
				type: 'FOCUS_SET',
				field: 'globalSearch',
			});
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [onExitSearch, props.isFocused, searchStarted]);

	useEffect(() => {
		if (props.notesParentType !== 'Search') {
			void onExitSearch(false);
		}
	}, [props.notesParentType, onExitSearch]);

	// When the searchbar is remounted, exit the search if it was previously open
	// or else other buttons stay hidden (e.g. when opening Layout Editor and closing it)
	// https://github.com/XilinJia/Xilinota/issues/5953
	useEffect(() => {
		if (props.notesParentType === 'Search' || props.isFocused) {
			if (props.isFocused) {
				props.dispatch({
					type: 'FOCUS_CLEAR',
					field: 'globalSearch',
				});
			}
			void onExitSearch(true);
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, []);

	return (
		<Root className="search-bar">
			<SearchInput
				inputRef={props.inputRef}
				value={query}
				onChange={onChange}
				onFocus={onFocus}
				onBlur={onBlur}
				onKeyDown={onKeyDown}
				onSearchButtonClick={onSearchButtonClick}
				searchStarted={searchStarted}
			/>
		</Root>
	);
}

const mapStateToProps = (state: AppState) => {
	return {
		notesParentType: state.notesParentType,
		selectedNoteId: stateUtils.selectedNoteId(state),
		isFocused: state.focusedField === 'globalSearch',
	};
};

export default connect(mapStateToProps)(SearchBar);
