import * as React from 'react';
import { useState, useEffect } from 'react';
import ButtonBar from '../ConfigScreen/ButtonBar';
import { _ } from '@xilinota/lib/locale';

import { connect } from 'react-redux';
import Setting from '@xilinota/lib/models/Setting';
import { themeStyle } from '@xilinota/lib/theme';
import ReportService from '@xilinota/lib/services/ReportService';
import Button, { ButtonLevel } from '../Button/Button';
import bridge from '../../services/bridge';
import fs from 'fs-extra';
import styled from 'styled-components';

interface Props {
	themeId: number;
	style: any;
	dispatch: Function;
}

const StyledAdvancedToolItem = styled.div`
	margin-bottom: 1em;
`;

async function exportDebugReportClick() {
	const filename = `syncReport-${new Date().getTime()}.csv`;

	const filePath = await bridge().showSaveDialog({
		title: _('Please select where the sync status should be exported to'),
		defaultPath: filename,
	});

	if (!filePath) return;

	const service = new ReportService();
	const csv = await service.basicItemList({ format: 'csv' }) as string;
	await fs.writeFileSync(filePath, csv);
}

function StatusScreen(props: Props) {
	const [report, setReport] = useState<any[]>([]);

	async function resfreshScreen() {
		const service = new ReportService();
		const r = await service.status(Setting.value('sync.target'));
		setReport(r);
	}

	useEffect(() => {
		void resfreshScreen();
	}, []);

	const theme = themeStyle(props.themeId);
	const style = {
		...props.style,
		display: 'flex',
		flexDirection: 'column',
	};

	const retryStyle = { ...theme.urlStyle, marginLeft: 5 };
	const retryAllStyle = { ...theme.urlStyle, marginTop: 5, display: 'inline-block' };

	const containerPadding = theme.configScreenPadding;

	const containerStyle = {
		...theme.containerStyle, padding: containerPadding,
		flex: 1
	};

	function renderSectionTitleHtml(key: string, title: string) {
		return (
			<h2 key={`section_${key}`} style={theme.h2Style}>
				{title}
			</h2>
		);
	}

	function renderSectionRetryAllHtml(key: string, retryAllHandler: any) {
		return (
			<a key={`retry_all_${key}`} href="#" onClick={retryAllHandler} style={retryAllStyle}>
				{_('Retry All')}
			</a>
		);
	}

	const renderSectionHtml = (key: string, section: any) => {
		const itemsHtml = [];

		itemsHtml.push(renderSectionTitleHtml(section.title, section.title));

		let currentListKey = '';
		let listItems: any[] = [];
		for (const n in section.body) {
			if (!section.body.hasOwnProperty(n)) continue;
			const item = section.body[n];
			let text = '';

			let retryLink = null;
			let itemType = null;
			if (typeof item === 'object') {
				if (item.canRetry) {
					const onClick = async () => {
						await item.retryHandler();
						void resfreshScreen();
					};

					retryLink = (
						<a href="#" onClick={onClick} style={retryStyle}>
							{_('Retry')}
						</a>
					);
				}
				text = item.text;
				itemType = item.type;
			} else {
				text = item;
			}

			if (itemType === 'openList') {
				currentListKey = item.key;
				continue;
			}

			if (itemType === 'closeList') {
				itemsHtml.push(<ul key={currentListKey}>{listItems}</ul>);
				currentListKey = '';
				listItems = [];
				continue;
			}

			if (!text) text = '\xa0';

			if (currentListKey) {
				listItems.push(
					<li style={theme.textStyle} key={`item_${n}`}>
						<span>{text}</span>
						{retryLink}
					</li>,
				);
			} else {
				itemsHtml.push(
					<div style={theme.textStyle} key={`item_${n}`}>
						<span>{text}</span>
						{retryLink}
					</div>,
				);
			}
		}

		if (section.canRetryAll) {
			itemsHtml.push(renderSectionRetryAllHtml(section.title, async () => {
				await section.retryAllHandler();
				void resfreshScreen();
			}));
		}

		return <div key={key}>{itemsHtml}</div>;
	};

	function renderBodyHtml(report: any) {
		const sectionsHtml = [];

		for (let i = 0; i < report.length; i++) {
			const section = report[i];
			if (!section.body.length) continue;
			sectionsHtml.push(renderSectionHtml(`${i}`, section));
		}

		return <div>{sectionsHtml}</div>;
	}

	function renderTools() {
		return (
			<div>
				<h2 key="section_tools" style={theme.h2Style}>
					{_('Advanced tools')}
				</h2>
				<StyledAdvancedToolItem>
					<Button level={ButtonLevel.Primary} title={_('Export debug report')} onClick={() => exportDebugReportClick()} />
				</StyledAdvancedToolItem>
			</div>
		);
	}

	const body = renderBodyHtml(report);

	return (
		<div style={style}>
			<div style={containerStyle}>
				{renderTools()}
				{body}
			</div>
			<ButtonBar
				onCancelClick={() => props.dispatch({ type: 'NAV_BACK' })}
			/>
		</div>
	);
}

const mapStateToProps = (state: any) => {
	return {
		themeId: state.settings.theme,
		settings: state.settings,
		locale: state.settings.locale,
	};
};

export default connect(mapStateToProps)(StatusScreen);

