import { _ } from '@xilinota/lib/locale';


export default (cmd: any, stdout: Function | null, store: Function | null, gui: Function | null) => {
	cmd.setStdout((text: string) => {
		return stdout ? stdout(text) : '';
	});

	cmd.setDispatcher((action: any) => {
		if (store && store()) {
			return store().dispatch(action);
		} else {
			return () => { };
		}
	});

	cmd.setPrompt(async (message: string, options: any) => {
		if (!options) options = {};
		if (!options.type) options.type = 'boolean';
		if (!options.booleanAnswerDefault) options.booleanAnswerDefault = 'y';
		if (!options.answers) options.answers = options.booleanAnswerDefault === 'y' ? [_('Y'), _('n')] : [_('N'), _('y')];

		if (options.type === 'boolean') {
			message += ` (${options.answers.join('/')})`;
		}

		let answer = gui ? await gui().prompt('', `${message} `, options) : '';

		if (options.type === 'boolean') {
			if (answer === '') return false; // Pressed ESCAPE
			if (!answer) answer = options.answers[0];
			const positiveIndex = options.booleanAnswerDefault === 'y' ? 0 : 1;
			return answer.toLowerCase() === options.answers[positiveIndex].toLowerCase();
		} else {
			return answer;
		}
	});

	return cmd;
};
