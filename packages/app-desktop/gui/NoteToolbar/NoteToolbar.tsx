import * as React from 'react';
import CommandService from '@xilinota/lib/services/CommandService';
import ToolbarBase from '../ToolbarBase';
import { utils as pluginUtils } from '@xilinota/lib/services/plugins/reducer';
import ToolbarButtonUtils, { ToolbarButtonInfo } from '@xilinota/lib/services/commands/ToolbarButtonUtils';
import stateToWhenClauseContext from '../../services/commands/stateToWhenClauseContext';
import { connect } from 'react-redux';
import { buildStyle } from '@xilinota/lib/theme';

interface NoteToolbarProps {
	themeId: number;
	style: any;
	toolbarButtonInfos: ToolbarButtonInfo[];
	disabled: boolean;
}

function styles_(props: NoteToolbarProps) {
	return buildStyle('NoteToolbar', props.themeId, (theme: any) => {
		return {
			root: {
				...props.style,
				borderBottom: 'none',
				backgroundColor: theme.backgroundColor,
			},
		};
	});
}

function NoteToolbar(props: NoteToolbarProps) {
	const styles = styles_(props);
	return <ToolbarBase style={styles.root} items={props.toolbarButtonInfos} disabled={props.disabled}/>;
}

const toolbarButtonUtils = new ToolbarButtonUtils(CommandService.instance());

const mapStateToProps = (state: any) => {
	const whenClauseContext = stateToWhenClauseContext(state);

	return {
		toolbarButtonInfos: toolbarButtonUtils.commandsToToolbarButtons([
			'showSpellCheckerMenu',
			'editAlarm',
			'toggleVisiblePanes',
			'showNoteProperties',
		].concat(pluginUtils.commandNamesFromViews(state.pluginService.plugins, 'noteToolbar')), whenClauseContext),
	};
};

export default connect(mapStateToProps)(NoteToolbar);
