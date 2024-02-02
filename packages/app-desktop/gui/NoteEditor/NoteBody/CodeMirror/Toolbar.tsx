import * as React from 'react';
import CommandService from '@xilinota/lib/services/CommandService';
import ToolbarBase from '../../../ToolbarBase';
import { utils as pluginUtils } from '@xilinota/lib/services/plugins/reducer';
import { connect } from 'react-redux';
import { AppState } from '../../../../app.reducer';
import ToolbarButtonUtils, { ToolbarButtonInfo } from '@xilinota/lib/services/commands/ToolbarButtonUtils';
import stateToWhenClauseContext from '../../../../services/commands/stateToWhenClauseContext';
import { buildStyle } from '@xilinota/lib/theme';

interface ToolbarProps {
	themeId: number;
	toolbarButtonInfos: ToolbarButtonInfo[];
	disabled?: boolean;
}

function styles_(props: ToolbarProps): Record<string, any> {
	return buildStyle('CodeMirrorToolbar', props.themeId, () => {
		return {
			root: {
				flex: 1,
				marginBottom: 0,
			},
		};
	});
}

const toolbarButtonUtils = new ToolbarButtonUtils(CommandService.instance());

function Toolbar(props: ToolbarProps): React.JSX.Element {
	const styles = styles_(props);
	return <ToolbarBase style={styles.root} items={props.toolbarButtonInfos} disabled={!!props.disabled} />;
}

const mapStateToProps = (state: AppState): { toolbarButtonInfos: ToolbarButtonInfo[]; } => {
	const whenClauseContext = stateToWhenClauseContext(state);

	const commandNames = [
		'historyBackward',
		'historyForward',
		'toggleExternalEditing',
		'-',
		'textBold',
		'textItalic',
		'-',
		'textLink',
		'textCode',
		'attachFile',
		'-',
		'textBulletedList',
		'textNumberedList',
		'textCheckbox',
		'textHeading',
		'textHorizontalRule',
		'insertDateTime',
		'toggleEditors',
	].concat(pluginUtils.commandNamesFromViews(state.pluginService.plugins, 'editorToolbar'));

	return {
		toolbarButtonInfos: toolbarButtonUtils.commandsToToolbarButtons(commandNames, whenClauseContext),
	};
};

export default connect(mapStateToProps)(Toolbar);
