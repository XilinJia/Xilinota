import * as React from 'react';
import { useCallback, useMemo } from 'react';
import { _ } from '@xilinota/lib/locale';
import styled from 'styled-components';
import ToggleButton from '../../../lib/ToggleButton/ToggleButton';
import Button, { ButtonLevel } from '../../../Button/Button';
import { PluginManifest } from '@xilinota/lib/services/plugins/utils/types';
import bridge from '../../../../services/bridge';

export enum InstallState {
	NotInstalled = 1,
	Installing = 2,
	Installed = 3,
}

export enum UpdateState {
	Idle = 1,
	CanUpdate = 2,
	Updating = 3,
	HasBeenUpdated = 4,
}

export interface ItemEvent {
	item: PluginItem;
}

interface Props {
	item?: PluginItem;
	manifest?: PluginManifest;
	installState?: InstallState;
	updateState?: UpdateState;
	themeId: number;
	isCompatible: boolean;
	onToggle?: (event: ItemEvent)=> void;
	onDelete?: (event: ItemEvent)=> void;
	onInstall?: (event: ItemEvent)=> void;
	onUpdate?: (event: ItemEvent)=> void;
}

function manifestToItem(manifest: PluginManifest): PluginItem {
	return {
		manifest: manifest,
		enabled: true,
		deleted: false,
		devMode: false,
		hasBeenUpdated: false,
	};
}

export interface PluginItem {
	manifest: PluginManifest;
	enabled: boolean;
	deleted: boolean;
	devMode: boolean;
	hasBeenUpdated: boolean;
}

const CellRoot = styled.div<{ isCompatible: boolean }>`
	display: flex;
	box-sizing: border-box;
	background-color: ${props => props.theme.backgroundColor};
	flex-direction: column;
	align-items: flex-start;
	padding: 15px;
	border: 1px solid ${props => props.theme.dividerColor};
	border-radius: 6px;
	width: 320px;
	margin-right: 20px;
	margin-bottom: 20px;
	box-shadow: 1px 1px 3px rgba(0,0,0,0.2);

	opacity: ${props => props.isCompatible ? '1' : '0.6'};
`;

const CellTop = styled.div`
	display: flex;
	flex-direction: row;
	width: 100%;
	margin-bottom: 10px;
`;

const CellContent = styled.div`
	display: flex;
	margin-bottom: 10px;
	flex: 1;
`;

const CellFooter = styled.div`
	display: flex;
	flex-direction: row;
`;

const NeedUpgradeMessage = styled.span`
	font-family: ${props => props.theme.fontFamily};
	color: ${props => props.theme.colorWarn};
	font-size: ${props => props.theme.fontSize}px;
`;

const DevModeLabel = styled.div`
	border: 1px solid ${props => props.theme.color};
	border-radius: 4px;
	padding: 4px 6px;
	font-size: ${props => props.theme.fontSize * 0.75}px;
	color: ${props => props.theme.color};
`;

const StyledNameAndVersion = styled.div<{ mb: any }>`
	font-family: ${props => props.theme.fontFamily};
	color: ${props => props.theme.color};
	font-size: ${props => props.theme.fontSize}px;
	font-weight: bold;
	padding-right: 5px;
	flex: 1;
`;

const StyledName = styled.a`
	color: ${props => props.theme.color};

	&:hover {
		text-decoration: underline;
	}
`;

const StyledVersion = styled.span`
	color: ${props => props.theme.colorFaded};
	font-size: ${props => props.theme.fontSize * 0.9}px;
`;

const StyledDescription = styled.div`
	font-family: ${props => props.theme.fontFamily};
	color: ${props => props.theme.colorFaded};
	font-size: ${props => props.theme.fontSize}px;
	line-height: 1.6em;
`;

const RecommendedBadge = styled.a`
	font-family: ${props => props.theme.fontFamily};
	color: ${props => props.theme.colorWarn};
	font-size: ${props => props.theme.fontSize}px;
	border: 1px solid ${props => props.theme.colorWarn};
	padding: 5px;
	border-radius: 50px;
	opacity: 0.8;
	
	&:hover {
		opacity: 1;
	}
`;

export default function(props: Props) {
	const item = useMemo(() => {
		return props.item ? props.item : manifestToItem(props.manifest);
	}, [props.item, props.manifest]);

	const onNameClick = useCallback(() => {
		const manifest = item.manifest;
		if (!manifest.homepage_url) return;
		void bridge().openExternal(manifest.homepage_url);
	}, [item]);

	const onRecommendedClick = useCallback(() => {
		void bridge().openExternal('https://github.com/xilinota/plugins/blob/master/readme/recommended.md#recommended-plugins');
	}, []);

	// For plugins in dev mode things like enabling/disabling or
	// uninstalling them doesn't make sense, as that should be done by
	// adding/removing them from wherever they were loaded from.

	function renderToggleButton() {
		if (!props.onToggle) return null;

		if (item.devMode) {
			return <DevModeLabel>DEV</DevModeLabel>;
		}

		return <ToggleButton
			themeId={props.themeId}
			value={item.enabled}
			onToggle={() => props.onToggle({ item })}
		/>;
	}

	function renderDeleteButton() {
		if (!props.onDelete) return null;
		return <Button level={ButtonLevel.Secondary} onClick={() => props.onDelete({ item })} title={_('Delete')}/>;
	}

	function renderInstallButton() {
		if (!props.onInstall) return null;

		let title = _('Install');
		if (props.installState === InstallState.Installing) title = _('Installing...');
		if (props.installState === InstallState.Installed) title = _('Installed');

		return <Button
			level={ButtonLevel.Secondary}
			disabled={props.installState !== InstallState.NotInstalled}
			onClick={() => props.onInstall({ item })}
			title={title}
		/>;
	}

	function renderUpdateButton() {
		if (!props.onUpdate) return null;

		let title = _('Update');
		if (props.updateState === UpdateState.Updating) title = _('Updating...');
		if (props.updateState === UpdateState.Idle) title = _('Updated');
		if (props.updateState === UpdateState.HasBeenUpdated) title = _('Updated');

		return <Button
			ml={1}
			level={ButtonLevel.Recommended}
			onClick={() => props.onUpdate({ item })}
			title={title}
			disabled={props.updateState === UpdateState.HasBeenUpdated}
		/>;
	}

	function renderFooter() {
		if (item.devMode) return null;

		if (!props.isCompatible) {
			return (
				<CellFooter>
					<NeedUpgradeMessage>
						{_('Please upgrade Xilinota to use this plugin')}
					</NeedUpgradeMessage>
				</CellFooter>
			);
		}

		return (
			<CellFooter>
				{renderDeleteButton()}
				{renderInstallButton()}
				{renderUpdateButton()}
				<div style={{ display: 'flex', flex: 1 }}/>
			</CellFooter>
		);
	}

	function renderRecommendedBadge() {
		if (props.onToggle) return null;
		if (!item.manifest._recommended) return null;
		return <RecommendedBadge href="#" title={_('The Xilinota team has vetted this plugin and it meets our standards for security and performance.')} onClick={onRecommendedClick}><i className="fas fa-crown"></i></RecommendedBadge>;
	}

	return (
		<CellRoot isCompatible={props.isCompatible}>
			<CellTop>
				<StyledNameAndVersion mb={'5px'}><StyledName onClick={onNameClick} href="#" style={{ marginRight: 5 }}>{item.manifest.name} {item.deleted ? _('(%s)', 'Deleted') : ''}</StyledName><StyledVersion>v{item.manifest.version}</StyledVersion></StyledNameAndVersion>
				{renderToggleButton()}
				{renderRecommendedBadge()}
			</CellTop>
			<CellContent>
				<StyledDescription>{item.manifest.description}</StyledDescription>
			</CellContent>
			{renderFooter()}
		</CellRoot>
	);
}
