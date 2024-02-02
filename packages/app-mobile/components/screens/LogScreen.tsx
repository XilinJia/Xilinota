import * as React from 'react';

import { FlatList, View, Text, Button, StyleSheet, Platform, Alert } from 'react-native';
import { connect } from 'react-redux';
import { reg } from '@xilinota/lib/registry.js';
import { ScreenHeader } from '../ScreenHeader';
import time from '@xilinota/lib/time';
import { themeStyle } from '../global-style';

import Logger, { LogLevel } from '@xilinota/utils/Logger';
import BaseScreenComponent from '../base-screen';
import { _ } from '@xilinota/lib/locale';
import { MenuOptionType } from '../ScreenHeader';
import { AppState } from '../../utils/types';
import Share from 'react-native-share';
import { writeTextToCacheFile } from '../../utils/ShareUtils';
import shim from '@xilinota/lib/shim';

const logger = Logger.create('LogScreen');

interface Props {
	themeId: number;
}
interface State {
	logEntries: any[];
	showErrorsOnly: boolean;
}
class LogScreenComponent extends BaseScreenComponent<Props, State> {
	private readonly menuOptions: MenuOptionType[];
	styles_: any;

	public static navigationOptions(): {
		header: null;
	} {
		return { header: null };
	}

	public constructor(props: Props) {
		super(props);

		this.state = {
			logEntries: [],
			showErrorsOnly: false,
		};
		this.styles_ = {};

		this.menuOptions = [
			{
				title: _('Share'),
				onPress: () => {
					void this.onSharePress();
				},
			},
		];
	}

	private async onSharePress(): Promise<void> {
		const limit: number | undefined = undefined; // no limit
		const levels = this.getLogLevels(this.state.showErrorsOnly);
		const allEntries: any[] = await reg.logger().lastEntries(limit, { levels });
		const logData = allEntries.map(entry => this.formatLogEntry(entry)).join('\n');

		let fileToShare;
		try {
			// Using a .txt file extension causes a "No valid provider found from URL" error
			// and blank share sheet on iOS for larger log files (around 200 KiB).
			fileToShare = await writeTextToCacheFile(logData, 'mobile-log.log');

			await Share.open({
				type: 'text/plain',
				filename: 'log.txt',
				url: `file://${fileToShare}`,
				failOnCancel: false,
			});
		} catch (e) {
			logger.error('Unable to share log data:', e);

			// Display a message to the user (e.g. in the case where the user is out of disk space).
			Alert.alert(_('Error'), _('Unable to share log data. Reason: %s', (e as Error).toString()));
		} finally {
			if (fileToShare) {
				await shim.fsDriver().remove(fileToShare);
			}
		}
	}

	public styles(): any {
		const theme = themeStyle(this.props.themeId.toString());

		if (this.styles_[this.props.themeId]) return this.styles_[this.props.themeId];
		this.styles_ = {};

		const styles: any = {
			row: {
				flexDirection: 'row',
				paddingLeft: 1,
				paddingRight: 1,
				paddingTop: 0,
				paddingBottom: 0,
			},
			rowText: {
				fontSize: 10,
				color: theme.color,
			},
		};

		if (Platform.OS !== 'ios') {
			// Crashes on iOS with error "Unrecognized font family 'monospace'"
			styles.rowText.fontFamily = 'monospace';
		}

		styles.rowTextError = { ...styles.rowText };
		styles.rowTextError.color = theme.colorError;

		styles.rowTextWarn = { ...styles.rowText };
		styles.rowTextWarn.color = theme.colorWarn;

		this.styles_[this.props.themeId] = StyleSheet.create(styles);
		return this.styles_[this.props.themeId];
	}

	public UNSAFE_componentWillMount(): void {
		void this.resfreshLogEntries();
	}

	private getLogLevels(showErrorsOnly: boolean): LogLevel[] {
		let levels = [Logger.LEVEL_DEBUG, Logger.LEVEL_INFO, Logger.LEVEL_WARN, Logger.LEVEL_ERROR];
		if (showErrorsOnly) levels = [Logger.LEVEL_WARN, Logger.LEVEL_ERROR];

		return levels;
	}

	private async resfreshLogEntries(showErrorsOnly: boolean | null = null): Promise<void> {
		if (showErrorsOnly === null) showErrorsOnly = this.state.showErrorsOnly;

		const levels = this.getLogLevels(showErrorsOnly!);

		this.setState({
			logEntries: await reg.logger().lastEntries(1000, { levels: levels }),
			showErrorsOnly: showErrorsOnly,
		});
	}

	private toggleErrorsOnly(): void {
		void this.resfreshLogEntries(!this.state.showErrorsOnly);
	}

	private formatLogEntry(item: any): string {
		return `${time.formatMsToLocal(item.timestamp, 'MM-DDTHH:mm:ss')}: ${item.message}`;
	}

	public render(): React.JSX.Element {
		const renderRow = ({ item }: any) => {
			let textStyle = this.styles().rowText;
			if (item.level === Logger.LEVEL_WARN) textStyle = this.styles().rowTextWarn;
			if (item.level === Logger.LEVEL_ERROR) textStyle = this.styles().rowTextError;

			return (
				<View style={this.styles().row}>
					<Text style={textStyle}>{this.formatLogEntry(item)}</Text>
				</View>
			);
		};

		// `enableEmptySections` is to fix this warning: https://github.com/FaridSafi/react-native-gifted-listview/issues/39

		return (
			<View style={this.rootStyle(this.props.themeId).root}>
				<ScreenHeader
					title={_('Log')}
					menuOptions={this.menuOptions} />
				<FlatList
					data={this.state.logEntries}
					renderItem={renderRow}
					keyExtractor={item => { return `${item.id}`; }}
				/>
				<View style={{ flexDirection: 'row' }}>
					<View style={{ flex: 1, marginRight: 5 }}>
						<Button
							title={_('Refresh')}
							onPress={() => {
								void this.resfreshLogEntries();
							}}
						/>
					</View>
					<View style={{ flex: 1 }}>
						<Button
							title={this.state.showErrorsOnly ? _('Show all') : _('Errors only')}
							onPress={() => {
								this.toggleErrorsOnly();
							}}
						/>
					</View>
				</View>
			</View>
		);
	}
}

const LogScreen = connect((state: AppState) => {
	return {
		themeId: state.settings.theme,
	};
})(LogScreenComponent);

export default LogScreen;
