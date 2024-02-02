import * as React from 'react';
import { FocusEventHandler, KeyboardEventHandler, MouseEventHandler, useCallback } from 'react';
import CommandService from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';

import StyledInput from '../../style/StyledInput';
import styled from 'styled-components';

export const Root = styled.div`
	position: relative;
	display: flex;
	width: 100%;
`;

export const SearchButton = styled.button`
	position: absolute;
	right: 0;
	background: none;
	border: none;
	height: 100%;
	opacity: ${(props: any) => props.disabled ? 0.5 : 1};
`;

export const SearchButtonIcon = styled.span`
	font-size: ${(props: any) => props.theme.toolbarIconSize}px;
	color: ${(props: any) => props.theme.color4};
`;

export const SearchInput = styled(StyledInput)`
	padding-right: 20px;
	flex: 1;
	width: 10px;
`;

interface Props {
	inputRef?: any;
	value: string;
	onChange(event: OnChangeEvent): void;
	onFocus?: FocusEventHandler<HTMLInputElement>;
	onBlur?: FocusEventHandler<HTMLInputElement>;
	onKeyDown?: KeyboardEventHandler<HTMLInputElement>;
	onSearchButtonClick: MouseEventHandler<HTMLButtonElement>;
	searchStarted: boolean;
	placeholder?: string;
	disabled?: boolean;
}

export interface OnChangeEvent {
	value: string;
}

export default function(props: Props) {
	const iconName = !props.searchStarted ? CommandService.instance().iconName('search') : 'fa fa-times';

	const onChange = useCallback((event: any) => {
		props.onChange({ value: event.currentTarget.value });
	}, [props.onChange]);

	return (
		<Root>
			<SearchInput
				ref={props.inputRef}
				value={props.value}
				type="text"
				placeholder={props.placeholder || _('Search...')}
				onChange={onChange}
				onFocus={props.onFocus}
				onBlur={props.onBlur}
				onKeyDown={props.onKeyDown}
				spellCheck={false}
				disabled={props.disabled}
			/>
			<SearchButton onClick={props.onSearchButtonClick}>
				<SearchButtonIcon className={iconName}/>
			</SearchButton>
		</Root>
	);
}
