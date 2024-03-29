import { CommandDeclaration, CommandRuntime, CommandContext } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';
import { AppState } from '../../../app.reducer';

export const declaration: CommandDeclaration = {
	name: 'toggleLayoutMoveMode',
	label: () => _('Change application layout'),
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, value: boolean|null = null) => {
			const newValue = value !== null ? value : !(context.state as AppState).layoutMoveMode;
			context.dispatch({
				type: 'LAYOUT_MOVE_MODE_SET',
				value: newValue,
			});
		},
	};
};
