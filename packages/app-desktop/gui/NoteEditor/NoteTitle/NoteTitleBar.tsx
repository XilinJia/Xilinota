import * as React from 'react';
import { _ } from '@xilinota/lib/locale';
import CommandService from '@xilinota/lib/services/CommandService';
import { ChangeEvent, useCallback } from 'react';
import NoteToolbar from '../../NoteToolbar/NoteToolbar';
import { buildStyle } from '@xilinota/lib/theme';
import time from '@xilinota/lib/time';
import styled from 'styled-components';

const StyledRoot = styled.div`
	display: flex;
	flex-direction: column;
	padding-left: ${props => props.theme.editorPaddingLeft}px;

	@media (max-width: 800px) {
		flex-direction: column;
		width: 100%;
	}
`;

const InfoGroup = styled.div`
	display: flex;
	flex-direction: row;
	align-items: center;
	justify-content: space-between;

	@media (max-width: 800px) {
		flex-direction: row;
		width: 100%;
	}
`;

interface Props {
	themeId: number;
	noteUserCreatedTime: number;
	noteUserUpdatedTime: number;
	noteTitle: string;
	noteIsTodo: number;
	isProvisional: boolean;
	titleInputRef: React.LegacyRef<HTMLInputElement>;
	onTitleChange(event: ChangeEvent<HTMLInputElement>): void;
	disabled: boolean;
}

function styles_(props: Props): Record<string, any> {
	return buildStyle(['NoteEditorTitleBar'], props.themeId, (theme: any) => {
		return {
			titleInput: {
				flex: 1,
				display: 'inline-block',
				flexDirection: 'row',
				alignItems: 'flex-start',
				paddingTop: 5,
				minHeight: 38,
				boxSizing: 'border-box',
				fontWeight: 'bold',
				paddingBottom: 5,
				paddingLeft: 0,
				paddingRight: 8,
				color: theme.textStyle.color,
				fontSize: Math.round(theme.textStyle.fontSize * 1.5),
				backgroundColor: theme.backgroundColor,
				border: 'none',
				width: '100%',
				textAlign: 'left',
			},

			titleDate: {
				...theme.textStyle,
				color: theme.colorFaded,
				paddingLeft: 8,
				whiteSpace: 'nowrap',
			},
			toolbarStyle: {
				marginBottom: 0,
			},
		};
	});
}

export default function NoteTitleBar(props: Props): React.JSX.Element {
	const styles = styles_(props);

	const onTitleKeydown = useCallback((event: { keyCode: any; preventDefault: () => void; shiftKey: any; }): void => {
		const keyCode = event.keyCode;

		if (keyCode === 9) { // TAB
			event.preventDefault();

			if (event.shiftKey) {
				void CommandService.instance().execute('focusElement', 'noteList');
			} else {
				void CommandService.instance().execute('focusElement', 'noteBody');
			}
		}
	}, []);

	function renderDate(): React.JSX.Element {
		return <span className="created-time-label" style={styles.titleDate}>{`${time.formatMsToLocal(props.noteUserCreatedTime)} ${time.formatMsToLocal(props.noteUserUpdatedTime)}`}</span>;
	}

	// function renderUpdateDate() {
	// 	return <span className="updated-time-label" style={styles.titleDate}>{time.formatMsToLocal(props.noteUserUpdatedTime)}</span>;
	// }

	function renderNoteToolbar(): React.JSX.Element {
		return <NoteToolbar
			themeId={props.themeId}
			style={styles.toolbarStyle}
			disabled={props.disabled}
		/>;
	}

	return (
		<StyledRoot>
			<InfoGroup>
				{renderDate()}
				{renderNoteToolbar()}
			</InfoGroup>
			<input
				className="title-input"
				type="text"
				ref={props.titleInputRef}
				placeholder={props.isProvisional ? (props.noteIsTodo ? _('Creating new to-do...') : _('Creating new note...')) : ''}
				style={styles.titleInput}
				readOnly={props.disabled}
				onChange={props.onTitleChange}
				onKeyDown={onTitleKeydown}
				value={props.noteTitle}
			/>
		</StyledRoot>
	);
}
