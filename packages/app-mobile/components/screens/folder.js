const React = require('react');

const { View, StyleSheet } = require('react-native');
const { connect } = require('react-redux');
const Folder = require('@xilinota/lib/models/Folder').default;

const LocalFile = require('@xilinota/lib/models/LocalFiles').default;
const BaseModel = require('@xilinota/lib/BaseModel').default;
const { ScreenHeader } = require('../ScreenHeader');
const { BaseScreenComponent } = require('../base-screen.js');
const { dialogs } = require('../../utils/dialogs.js');
import { PeersFolder } from '@xilinota/lib/models/Peers.js';
const { _ } = require('@xilinota/lib/locale');
const { default: FolderPicker } = require('../FolderPicker');
const TextInput = require('../TextInput').default;

class FolderScreenComponent extends BaseScreenComponent {
	static navigationOptions() {
		return { header: null };
	}

	constructor() {
		super();
		this.state = {
			folder: Folder.new(),
			lastSavedFolder: null,
		};
	}

	UNSAFE_componentWillMount() {
		if (!this.props.folderId) {
			const folder = Folder.new();
			this.setState({
				folder: folder,
				lastSavedFolder: { ...folder },
			});
		} else {
			// eslint-disable-next-line promise/prefer-await-to-then -- Old code before rule was applied
			Folder.load(this.props.folderId).then(folder => {
				this.setState({
					folder: folder,
					lastSavedFolder: { ...folder },
				});
			});
		}
	}

	isModified() {
		if (!this.state.folder || !this.state.lastSavedFolder) return false;
		const diff = BaseModel.diffObjects(this.state.folder, this.state.lastSavedFolder);
		delete diff.type_;
		return !!Object.getOwnPropertyNames(diff).length;
	}

	folderComponent_change(propName, propValue) {
		this.setState((prevState) => {
			const folder = { ...prevState.folder };
			folder[propName] = propValue;
			return { folder: folder };
		});
	}

	title_changeText(text) {
		this.folderComponent_change('title', text);
	}

	parent_changeValue(parent) {
		this.folderComponent_change('parent_id', parent);
	}

	async saveFolderButton_press() {
		let folder = { ...this.state.folder };

		try {
			if (folder.id && !(await Folder.canNestUnder(folder.id, folder.parent_id))) throw new Error(_('Cannot move notebook to this location'));
			// eslint-disable-next-line no-console
			console.log('saveFolderButton_press', folder.parent_id, ' ', this.state.lastSavedFolder.parent_id);
			if (folder.parent_id !== this.state.lastSavedFolder.parent_id) {
				LocalFile.moveFolder(folder.id, folder.parent_id);
				await PeersFolder.moveOnPeers(folder.id);

			} else if (folder.title !== this.state.lastSavedFolder.title) {
				LocalFile.renameFolder(folder.id, folder.title);
			}
			folder = await Folder.save(folder, { userSideValidation: true });
		} catch (error) {
			dialogs.error(this, _('The notebook could not be saved: %s', error.message));
			return;
		}

		this.setState({
			lastSavedFolder: { ...folder },
			folder: folder,
		});

		this.props.dispatch({
			type: 'NAV_GO',
			routeName: 'Notes',
			folderId: folder.id,
		});
	}

	render() {
		const saveButtonDisabled = !this.isModified() || !this.state.folder.title;

		return (
			<View style={this.rootStyle(this.props.themeId).root}>
				<ScreenHeader title={_('Edit notebook')} showSaveButton={true} saveButtonDisabled={saveButtonDisabled} onSaveButtonPress={() => this.saveFolderButton_press()} showSideMenuButton={false} showSearchButton={false} />
				<TextInput
					themeId={this.props.themeId}
					placeholder={_('Enter notebook title')}
					autoFocus={true}
					value={this.state.folder.title}
					onChangeText={text => this.title_changeText(text)}
					disabled={this.state.folder.encryption_applied}
				/>
				<View style={styles.folderPickerContainer}>
					<FolderPicker
						themeId={this.props.themeId}
						placeholder={_('Select parent notebook')}
						folders={this.props.folders}
						selectedFolderId={this.state.folder.parent_id}
						onValueChange={newValue => this.parent_changeValue(newValue)}
						mustSelect
						darkText
					/>
				</View>
				<View style={{ flex: 1 }} />
				<dialogs.DialogBox
					ref={dialogbox => {
						this.dialogbox = dialogbox;
					}}
				/>
			</View>
		);
	}
}

const FolderScreen = connect(state => {
	return {
		folderId: state.selectedFolderId,
		themeId: state.settings.theme,
		folders: state.folders.filter((folder) => folder.id !== state.selectedFolderId),
	};
})(FolderScreenComponent);

const styles = StyleSheet.create({
	folderPickerContainer: {
		height: 46,
		paddingLeft: 14,
		paddingRight: 14,
		paddingTop: 12,
		paddingBottom: 12,
	},
});

module.exports = { FolderScreen };
