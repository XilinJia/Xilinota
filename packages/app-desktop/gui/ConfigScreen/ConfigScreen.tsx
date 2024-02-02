import * as React from 'react';
import Sidebar from './Sidebar';
import ButtonBar from './ButtonBar';
import Button, { ButtonLevel, ButtonSize } from '../Button/Button';
import { _ } from '@xilinota/lib/locale';
import bridge from '../../services/bridge';
import Setting, { AppType, SyncStartupOperation } from '@xilinota/lib/models/Setting';
import control_PluginsStates from './controls/plugins/PluginsStates';
import EncryptionConfigScreen from '../EncryptionConfigScreen/EncryptionConfigScreen';
import { reg } from '@xilinota/lib/registry';
import { connect } from 'react-redux';
import { themeStyle } from '@xilinota/lib/theme';
import { extractExecutablePath, unquotePath, quotePath } from '@xilinota/lib/path-utils';
import SyncTargetRegistry from '@xilinota/lib/SyncTargetRegistry';
import { shared } from '@xilinota/lib/components/shared/config/config-shared';
import ClipperConfigScreen from '../ClipperConfigScreen';
import restart from '../../services/restart';
import PluginService from '@xilinota/lib/services/plugins/PluginService';
import { getDefaultPluginsInstallState, updateDefaultPluginsInstallState } from '@xilinota/lib/services/plugins/defaultPlugins/defaultPluginsUtils';
import getDefaultPluginsInfo from '@xilinota/lib/services/plugins/defaultPlugins/desktopDefaultPluginsInfo';
import JoplinCloudConfigScreen from '../JoplinCloudConfigScreen';
import ToggleAdvancedSettingsButton from './controls/ToggleAdvancedSettingsButton';
import shouldShowMissingPasswordWarning from '@xilinota/lib/components/shared/config/shouldShowMissingPasswordWarning';
import MacOSMissingPasswordHelpLink from './controls/MissingPasswordHelpLink';
import { KeymapConfigScreen } from '../KeymapConfig/KeymapConfigScreen';
import { Dispatch } from 'redux';

const settingKeyToControl: any = {
	'plugins.states': control_PluginsStates,
};

interface Props {
	settings: any;
	defaultSection: any;
	themeId: number;
	style: any;

	dispatch: Dispatch;
};

interface State {
	settings: any;
	selectedSectionName: string;
	screenName: string;
	changedSettingKeys: string[];
	needRestart: boolean;
	checkSyncConfigResult: string;
	showAdvancedSettings: boolean;
};

class ConfigScreenComponent extends React.Component<Props, State> {

	private rowStyle_: any = null;

	public constructor(props: Props) {
		super(props);

		shared.init(this, reg);

		this.state = {
			settings: Setting,
			selectedSectionName: 'general',
			screenName: '',
			changedSettingKeys: [],
			needRestart: false,
			showAdvancedSettings: false,
			checkSyncConfigResult: '',
		};

		this.rowStyle_ = {
			marginBottom: 10,
		};

		this.sidebar_selectionChange = this.sidebar_selectionChange.bind(this);
		this.checkSyncConfig_ = this.checkSyncConfig_.bind(this);
		this.onCancelClick = this.onCancelClick.bind(this);
		this.onSaveClick = this.onSaveClick.bind(this);
		this.onApplyClick = this.onApplyClick.bind(this);
		this.renderLabel = this.renderLabel.bind(this);
		this.renderDescription = this.renderDescription.bind(this);
		this.renderHeader = this.renderHeader.bind(this);
		this.handleSettingButton = this.handleSettingButton.bind(this);
	}

	private async checkSyncConfig_(): Promise<void> {
		await shared.checkSyncConfig(this, this.state.settings);
	}

	public UNSAFE_componentWillMount(): void {
		this.setState({ settings: this.props.settings });
	}

	public componentDidMount(): void {
		if (this.props.defaultSection) {
			this.setState({ selectedSectionName: this.props.defaultSection }, () => {
				this.switchSection(this.props.defaultSection);
			});
		}
		updateDefaultPluginsInstallState(getDefaultPluginsInstallState(PluginService.instance(), Object.keys(getDefaultPluginsInfo())), this);
	}

	private async handleSettingButton(key: string): Promise<void> {
		if (key === 'sync.clearLocalSyncStateButton') {
			if (!confirm('This cannot be undone. Do you want to continue?')) return;
			Setting.setValue('sync.startupOperation', SyncStartupOperation.ClearLocalSyncState);
			await Setting.saveAll();
			await restart();
		} else if (key === 'sync.clearLocalDataButton') {
			if (!confirm('This cannot be undone. Do you want to continue?')) return;
			Setting.setValue('sync.startupOperation', SyncStartupOperation.ClearLocalData);
			await Setting.saveAll();
			await restart();
		} else if (key === 'sync.openSyncWizard') {
			this.props.dispatch({
				type: 'DIALOG_OPEN',
				name: 'syncWizard',
			});
		} else {
			throw new Error(`Unhandled key: ${key}`);
		}
	}

	public sectionByName(name: string) {
		const sections = shared.settingsSections({ device: 'desktop', settings: this.state.settings });
		for (const section of sections) {
			if (section.name === name) return section;
		}

		throw new Error(`Invalid section name: ${name}`);
	}

	public screenFromName(screenName: string): React.JSX.Element {
		if (screenName === 'encryption') return <EncryptionConfigScreen />;
		// TODO: themeId doesn't exist?
		// if (screenName === 'server') return <ClipperConfigScreen themeId={this.props.themeId}/>;
		if (screenName === 'server') return <ClipperConfigScreen />;
		if (screenName === 'keymap') return <KeymapConfigScreen themeId={this.props.themeId} />;
		if (screenName === 'joplinCloud') return <JoplinCloudConfigScreen />;

		throw new Error(`Invalid screen name: ${screenName}`);
	}

	public switchSection(name: string): void {
		const section = this.sectionByName(name);
		let screenName = '';
		if (section.isScreen) {
			screenName = section.name;

			if (this.hasChanges()) {
				const ok = confirm(_('This will open a new screen. Save your current changes?'));
				if (ok) shared.saveSettings(this);
			}
		}

		this.setState({ selectedSectionName: section.name, screenName: screenName });
	}

	private sidebar_selectionChange(event: any): void {
		this.switchSection(event.section.name);
	}

	public renderSectionDescription(section: any): React.JSX.Element | null {
		const description = Setting.sectionDescription(section.name);
		if (!description) return null;

		const theme = themeStyle(this.props.themeId);
		return (
			<div style={{ ...theme.textStyle, marginBottom: 15 }}>
				{description}
			</div>
		);
	}

	public sectionToComponent(key: string, section: any, settings: any, selected: boolean): React.JSX.Element {
		const theme = themeStyle(this.props.themeId);

		const createSettingComponents = (advanced: boolean) => {
			const output = [];

			for (let i = 0; i < section.metadatas.length; i++) {
				const md = section.metadatas[i];
				if (!!md.advanced !== advanced) continue;
				const settingComp = this.settingToComponent(md.key, settings[md.key]);
				output.push(settingComp);
			}
			return output;
		};

		const settingComps = createSettingComponents(false);
		const advancedSettingComps = createSettingComponents(true);

		const sectionWidths: Record<string, any> = {
			plugins: '100%',
		};

		const sectionStyle: any = {
			marginTop: 20,
			marginBottom: 20,
			maxWidth: sectionWidths[section.name] ? sectionWidths[section.name] : 640,
		};

		if (!selected) sectionStyle.display = 'none';

		if (section.name === 'general') {
			sectionStyle.borderTopWidth = 0;
		}

		if (section.name === 'sync') {
			const syncTargetMd = SyncTargetRegistry.idToMetadata(settings['sync.target']);
			const statusStyle = { ...theme.textStyle, marginTop: 10 };
			const warningStyle = { ...theme.textStyle, color: theme.colorWarn };

			// Don't show the missing password warning if the user just changed the sync target (but hasn't
			// saved yet).
			const matchesSavedTarget = settings['sync.target'] === this.props.settings['sync.target'];
			if (matchesSavedTarget && shouldShowMissingPasswordWarning(settings['sync.target'], settings)) {
				settingComps.push(
					<p key='missing-password-warning' style={warningStyle}>
						{_('%s: Missing password.', _('Warning'))}
						{' '}
						<MacOSMissingPasswordHelpLink
							theme={theme}
							text={_('Help')}
						/>
					</p>,
				);
			}

			if (syncTargetMd.supportsConfigCheck) {
				const messages = shared.checkSyncConfigMessages(this);
				const statusComp = !messages.length ? null : (
					<div style={statusStyle}>
						{messages[0]}
						{messages.length >= 1 ? <p>{messages[1]}</p> : null}
					</div>
				);

				settingComps.push(
					<div key="check_sync_config_button" style={this.rowStyle_}>
						<Button
							title={_('Check synchronisation configuration')}
							level={ButtonLevel.Secondary}
							disabled={this.state.checkSyncConfigResult === 'checking'}
							onClick={this.checkSyncConfig_}
						/>
						{statusComp}
					</div>,
				);
			}
		}

		let advancedSettingsButton = null;
		const advancedSettingsSectionStyle = { display: 'none' };

		if (advancedSettingComps.length) {
			advancedSettingsButton = (
				<ToggleAdvancedSettingsButton
					onClick={() => shared.advancedSettingsButton_click(this)}
					advancedSettingsVisible={this.state.showAdvancedSettings}
				/>
			);
			advancedSettingsSectionStyle.display = this.state.showAdvancedSettings ? 'block' : 'none';
		}

		return (
			<div key={key} style={sectionStyle}>
				{this.renderSectionDescription(section)}
				<div>{settingComps}</div>
				{advancedSettingsButton}
				<div style={advancedSettingsSectionStyle}>{advancedSettingComps}</div>
			</div>
		);
	}

	private labelStyle(themeId: number) {
		const theme = themeStyle(themeId);
		return {
			...theme.textStyle, display: 'block',
			color: theme.color,
			fontSize: theme.fontSize * 1.083333,
			fontWeight: 500,
			marginBottom: theme.mainPadding / 2
		};
	}

	private descriptionStyle(themeId: number) {
		const theme = themeStyle(themeId);
		return {
			...theme.textStyle, color: theme.colorFaded,
			fontStyle: 'italic',
			maxWidth: '70em',
			marginTop: 5
		};
	}

	private renderLabel(themeId: number, label: string): React.JSX.Element {
		const labelStyle = this.labelStyle(themeId);
		return (
			<div style={labelStyle}>
				<label>{label}</label>
			</div>
		);
	}

	private renderHeader(themeId: number, label: string, style: any = null): React.JSX.Element {
		const theme = themeStyle(themeId);

		const labelStyle = {
			...theme.textStyle, display: 'block',
			color: theme.color,
			fontSize: theme.fontSize * 1.25,
			fontWeight: 500,
			marginBottom: theme.mainPadding,
			...style
		};

		return (
			<div style={labelStyle}>
				<label>{label}</label>
			</div>
		);
	}

	private renderDescription(themeId: number, description: string): React.JSX.Element | null {
		return description ? <div style={this.descriptionStyle(themeId)}>{description}</div> : null;
	}

	public settingToComponent(key: string, value: any): React.JSX.Element | null {
		const theme = themeStyle(this.props.themeId);

		const output: React.JSX.Element | null = null;

		const rowStyle = {
			marginBottom: theme.mainPadding * 1.5,
		};

		const labelStyle = this.labelStyle(this.props.themeId);

		const subLabel = {
			...labelStyle, display: 'block',
			opacity: 0.7,
			marginBottom: labelStyle.marginBottom
		};

		const checkboxLabelStyle = {
			...labelStyle, marginLeft: 8,
			display: 'inline',
			backgroundColor: 'transparent'
		};

		const controlStyle = {
			display: 'inline-block',
			color: theme.color,
			fontFamily: theme.fontFamily,
			backgroundColor: theme.backgroundColor,
		};

		const textInputBaseStyle = {
			...controlStyle, fontFamily: theme.fontFamily,
			border: '1px solid',
			padding: '4px 6px',
			boxSizing: 'border-box',
			borderColor: theme.borderColor4,
			borderRadius: 3,
			paddingLeft: 6,
			paddingRight: 6,
			paddingTop: 4,
			paddingBottom: 4
		};

		const updateSettingValue = (key: string, value: any) => {
			const md = Setting.settingMetadata(key);
			if (md.needRestart) {
				this.setState({ needRestart: true });
			}
			shared.updateSettingValue(this, key, value);

			if (md.autoSave) {
				shared.scheduleSaveSettings(this);
			}
		};

		const md = Setting.settingMetadata(key);

		const descriptionText = Setting.keyDescription(key, AppType.Desktop);
		const descriptionComp = this.renderDescription(this.props.themeId, descriptionText);

		if (settingKeyToControl[key]) {
			const SettingComponent = settingKeyToControl[key];
			const label = md.label ? this.renderLabel(this.props.themeId, md.label()) : null;
			return (
				<div key={key} style={rowStyle}>
					{label}
					{this.renderDescription(this.props.themeId, md.description ? md.description() : null)}
					<SettingComponent
						metadata={md}
						value={value}
						themeId={this.props.themeId}
						onChange={(event: any) => {
							updateSettingValue(key, event.value);
						}}
						renderLabel={this.renderLabel}
						renderDescription={this.renderDescription}
						renderHeader={this.renderHeader}
					/>
				</div>
			);
		} else if (md.isEnum) {
			const items = [];
			const settingOptions = md.options?.();
			const array = Setting.enumOptionsToValueLabels(settingOptions, md.optionsOrder ? md.optionsOrder() : [], {
				valueKey: 'key',
				labelKey: 'label',
			});

			for (let i = 0; i < array.length; i++) {
				const e = array[i];
				items.push(
					<option value={e.key.toString()} key={e.key}>
						{settingOptions[e.key]}
					</option>,
				);
			}

			const selectStyle = {
				...controlStyle, paddingLeft: 6,
				paddingRight: 6,
				paddingTop: 4,
				paddingBottom: 4,
				borderColor: theme.borderColor4,
				borderRadius: 3
			};

			return (
				<div key={key} style={rowStyle}>
					<div style={labelStyle}>
						<label>{md.label?.()}</label>
					</div>
					<select
						value={value}
						style={selectStyle}
						onChange={(event: any) => {
							updateSettingValue(key, event.target.value);
						}}
					>
						{items}
					</select>
					{descriptionComp}
				</div>
			);
		} else if (md.type === Setting.TYPE_BOOL) {
			const onCheckboxClick = () => {
				updateSettingValue(key, !value);
			};

			const checkboxSize = theme.fontSize * 1.1666666666666;

			// Hack: The {key+value.toString()} is needed as otherwise the checkbox doesn't update when the state changes.
			// There's probably a better way to do this but can't figure it out.

			return (
				<div key={key + (`${value}`).toString()} style={rowStyle}>
					<div style={{ ...controlStyle, backgroundColor: 'transparent', display: 'flex', alignItems: 'center' }}>
						<input
							id={`setting_checkbox_${key}`}
							type="checkbox"
							checked={!!value}
							onChange={() => {
								onCheckboxClick();
							}}
							style={{ marginLeft: 0, width: checkboxSize, height: checkboxSize }}
						/>
						<label
							onClick={() => {
								onCheckboxClick();
							}}
							style={{ ...checkboxLabelStyle, marginLeft: 5, marginBottom: 0 }}
							htmlFor={`setting_checkbox_${key}`}
						>
							{md.label?.()}
						</label>
					</div>
					{descriptionComp}
				</div>
			);
		} else if (md.type === Setting.TYPE_STRING) {
			const inputStyle: any = {
				...textInputBaseStyle, width: '50%',
				minWidth: '20em'
			};
			const inputType = md.secure === true ? 'password' : 'text';

			if (md.subType === 'file_path_and_args' || md.subType === 'file_path' || md.subType === 'directory_path') {
				inputStyle.marginBottom = subLabel.marginBottom;

				const splitCmd = (cmdString: string) => {
					// Normally not necessary but certain plugins found a way to
					// set the set the value to "undefined", leading to a crash.
					// This is now fixed at the model level but to be sure we
					// check here too, to handle any already existing data.
					// https://github.com/XilinJia/Xilinota/issues/7621
					if (!cmdString) cmdString = '';
					const path = extractExecutablePath(cmdString);
					const args = cmdString.substring(path.length + 1);
					return [unquotePath(path), args];
				};

				const joinCmd = (cmdArray: string[]) => {
					if (!cmdArray[0] && !cmdArray[1]) return '';
					let cmdString = quotePath(cmdArray[0]);
					if (!cmdString) cmdString = '""';
					if (cmdArray[1]) cmdString += ` ${cmdArray[1]}`;
					return cmdString;
				};

				const onPathChange = (event: any) => {
					if (md.subType === 'file_path_and_args') {
						const cmd = splitCmd(this.state.settings[key]);
						cmd[0] = event.target.value;
						updateSettingValue(key, joinCmd(cmd));
					} else {
						updateSettingValue(key, event.target.value);
					}
				};

				const onArgsChange = (event: any) => {
					const cmd = splitCmd(this.state.settings[key]);
					cmd[1] = event.target.value;
					updateSettingValue(key, joinCmd(cmd));
				};

				const browseButtonClick = async () => {
					if (md.subType === 'directory_path') {
						const paths = await bridge().showOpenDialog({
							properties: ['openDirectory'],
						});
						if (!paths || !paths.length) return;
						updateSettingValue(key, paths[0]);
					} else {
						const paths = await bridge().showOpenDialog();
						if (!paths || !paths.length) return;

						if (md.subType === 'file_path') {
							updateSettingValue(key, paths[0]);
						} else {
							const cmd = splitCmd(this.state.settings[key]);
							cmd[0] = paths[0];
							updateSettingValue(key, joinCmd(cmd));
						}
					}
				};

				const cmd = splitCmd(this.state.settings[key]);
				const path = md.subType === 'file_path_and_args' ? cmd[0] : this.state.settings[key];

				const argComp = md.subType !== 'file_path_and_args' ? null : (
					<div style={{ ...rowStyle, marginBottom: 5 }}>
						<div style={subLabel}>{_('Arguments:')}</div>
						<input
							type={inputType}
							style={inputStyle}
							onChange={(event: any) => {
								onArgsChange(event);
							}}
							value={cmd[1]}
							spellCheck={false}
						/>
						<div style={{ width: inputStyle.width, minWidth: inputStyle.minWidth }}>
							{descriptionComp}
						</div>
					</div>
				);

				return (
					<div key={key} style={rowStyle}>
						<div style={labelStyle}>
							<label>{md.label?.()}</label>
						</div>
						<div style={{ display: 'flex' }}>
							<div style={{ flex: 1 }}>
								<div style={{ ...rowStyle, marginBottom: 5 }}>
									<div style={subLabel}>{_('Path:')}</div>
									<div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', marginBottom: inputStyle.marginBottom }}>
										<input
											type={inputType}
											style={{ ...inputStyle, marginBottom: 0, marginRight: 5 }}
											onChange={(event: any) => {
												onPathChange(event);
											}}
											value={path}
											spellCheck={false}
										/>
										<Button
											level={ButtonLevel.Secondary}
											title={_('Browse...')}
											onClick={browseButtonClick}
											size={ButtonSize.Small}
										/>
									</div>
								</div>
							</div>
						</div>
						{argComp}
					</div>
				);
			} else {
				const onTextChange = (event: any) => {
					updateSettingValue(key, event.target.value);
				};

				return (
					<div key={key} style={rowStyle}>
						<div style={labelStyle}>
							<label>{md.label?.()}</label>
						</div>
						<input
							type={inputType}
							style={inputStyle}
							value={this.state.settings[key]}
							onChange={(event: any) => {
								onTextChange(event);
							}}
							spellCheck={false}
						/>
						<div style={{ width: inputStyle.width, minWidth: inputStyle.minWidth }}>
							{descriptionComp}
						</div>
					</div>
				);
			}
		} else if (md.type === Setting.TYPE_INT) {
			const onNumChange = (event: any) => {
				updateSettingValue(key, event.target.value);
			};

			const label = [md.label?.()];
			if (md.unitLabel) label.push(`(${md.unitLabel()})`);

			const inputStyle: any = { ...textInputBaseStyle };

			return (
				<div key={key} style={rowStyle}>
					<div style={labelStyle}>
						<label>{label.join(' ')}</label>
					</div>
					<input
						type="number"
						style={inputStyle}
						value={this.state.settings[key]}
						onChange={(event: any) => {
							onNumChange(event);
						}}
						min={md.minimum}
						max={md.maximum}
						step={md.step}
						spellCheck={false}
					/>
					{descriptionComp}
				</div>
			);
		} else if (md.type === Setting.TYPE_BUTTON) {
			const labelComp = md.hideLabel ? null : (
				<div style={labelStyle}>
					<label>{md.label?.()}</label>
				</div>
			);

			return (
				<div key={key} style={rowStyle}>
					{labelComp}
					<Button level={ButtonLevel.Secondary} title={md.label?.()} onClick={md.onClick ? md.onClick : () => this.handleSettingButton(key)} />
					{descriptionComp}
				</div>
			);
		} else {
			console.warn(`Type not implemented: ${key}`);
		}

		return output;
	}

	private restartMessage(): string {
		return _('The application must be restarted for these changes to take effect.');
	}

	private async restartApp(): Promise<void> {
		await Setting.saveAll();
		await restart();
	}

	private async checkNeedRestart(): Promise<void> {
		if (this.state.needRestart) {
			const doItNow = await bridge().showConfirmMessageBox(this.restartMessage(), {
				buttons: [_('Do it now'), _('Later')],
			});

			if (doItNow) await this.restartApp();
		}
	}

	public async onApplyClick(): Promise<void> {
		shared.saveSettings(this);
		await this.checkNeedRestart();
	}

	public async onSaveClick(): Promise<void> {
		shared.saveSettings(this);
		await this.checkNeedRestart();
		this.props.dispatch({ type: 'NAV_BACK' });
	}

	public onCancelClick(): void {
		this.props.dispatch({ type: 'NAV_BACK' });
	}

	public hasChanges(): boolean {
		return !!this.state.changedSettingKeys.length;
	}

	public render(): React.JSX.Element {
		const theme = themeStyle(this.props.themeId);

		const style = {
			...this.props.style,
			overflow: 'hidden',
			display: 'flex',
			flexDirection: 'column',
			backgroundColor: theme.backgroundColor3,
		};

		const settings = this.state.settings;

		const containerStyle = {
			overflow: 'auto',
			padding: theme.configScreenPadding,
			paddingTop: 0,
			display: 'flex',
			flex: 1,
		};

		const hasChanges = this.hasChanges();

		const settingComps = shared.settingsToComponents2(this, 'desktop', settings, this.state.selectedSectionName);

		// screenComp is a custom config screen, such as the encryption config screen or keymap config screen.
		// These screens handle their own loading/saving of settings and have bespoke rendering.
		// When screenComp is null, it means we are viewing the regular settings.
		const screenComp = this.state.screenName ? <div className="config-screen-content-wrapper" style={{ overflow: 'scroll', flex: 1 }}>{this.screenFromName(this.state.screenName)}</div> : null;

		if (screenComp) containerStyle.display = 'none';

		const sections = shared.settingsSections({ device: 'desktop', settings });

		const needRestartComp: any = this.state.needRestart ? (
			<div style={{ ...theme.textStyle, padding: 10, paddingLeft: 24, backgroundColor: theme.warningBackgroundColor, color: theme.color }}>
				{this.restartMessage()}
				<a style={{ ...theme.urlStyle, marginLeft: 10 }} href="#" onClick={() => { void this.restartApp(); }}>{_('Restart now')}</a>
			</div>
		) : null;

		const rightStyle = { ...style, flex: 1 };
		delete style.width;

		return (
			<div className="config-screen" style={{ display: 'flex', flexDirection: 'row', height: this.props.style.height }}>
				<Sidebar
					selection={this.state.selectedSectionName}
					onSelectionChange={this.sidebar_selectionChange}
					sections={sections}
				/>
				<div style={rightStyle}>
					{screenComp}
					{needRestartComp}
					<div style={containerStyle}>{settingComps}</div>
					<ButtonBar
						hasChanges={hasChanges}
						backButtonTitle={hasChanges && !screenComp ? _('Cancel') : _('Back')}
						onCancelClick={this.onCancelClick}
						onSaveClick={screenComp ? undefined : this.onSaveClick}
						onApplyClick={screenComp ? undefined : this.onApplyClick}
					/>
				</div>
			</div>
		);
	}
}

const mapStateToProps = (state: any) => {
	return {
		themeId: state.settings.theme,
		settings: state.settings,
		locale: state.settings.locale,
	};
};

export default connect(mapStateToProps)(ConfigScreenComponent);

