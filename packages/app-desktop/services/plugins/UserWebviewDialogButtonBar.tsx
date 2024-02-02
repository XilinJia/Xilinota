import * as React from 'react';
import Button from '../../gui/Button/Button';
import { _ } from '@xilinota/lib/locale';
import { ButtonSpec } from '@xilinota/lib/services/plugins/api/types';
import styled from 'styled-components';
import { space } from 'styled-system';

interface Props {
	buttons: ButtonSpec[];
}

const StyledRoot = styled.div`
	display: flex;
	width: 100%;
	box-sizing: border-box;
	justify-content: flex-end;
	padding-top: ${(props: any) => props.theme.mainPadding}px;
`;

const StyledButton = styled(Button)`${space}`;

function buttonTitle(b: ButtonSpec) {
	if (b.title) return b.title;

	const defaultTitles: any = {
		'ok': _('OK'),
		'cancel': _('Cancel'),
		'yes': _('Yes'),
		'no': _('No'),
		'close': _('Close'),
	};

	return defaultTitles[b.id] ? defaultTitles[b.id] : b.id;
}

export default function UserWebviewDialogButtonBar(props: Props) {
	function renderButtons() {
		const output = [];
		for (let i = 0; i < props.buttons.length; i++) {
			const b = props.buttons[i];
			// const marginRight = i !== props.buttons.length - 1 ? '6px' : '0px';
			// mr not exist
			// output.push(<StyledButton key={b.id} onClick={b.onClick} title={buttonTitle(b)} mr={marginRight}/>);
			output.push(<StyledButton key={b.id} onClick={b.onClick} title={buttonTitle(b)} />);
		}
		return output;
	}

	return (
		<StyledRoot>
			{renderButtons()}
		</StyledRoot>
	);
}
