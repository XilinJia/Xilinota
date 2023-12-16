import * as React from 'react';
import { themeStyle } from '@xilinota/lib/theme';
import { _ } from '@xilinota/lib/locale';
const { Modal, View, Button, Text, StyleSheet } = require('react-native');
import time from '@xilinota/lib/time';
const DateTimePickerModal = require('react-native-modal-datetime-picker').default;

const styles = StyleSheet.create({
	centeredView: {
		flex: 1,
		justifyContent: 'center',
		alignItems: 'center',
		marginTop: 22,
	},
	modalView: {
		display: 'flex',
		flexDirection: 'column',
		margin: 10,
		backgroundColor: 'white',
		borderRadius: 10,
		alignItems: 'center',
		shadowColor: '#000',
		shadowOffset: {
			width: 0,
			height: 2,
		},
		shadowOpacity: 0.25,
		shadowRadius: 4,
		elevation: 5,
	},
	button: {
		borderRadius: 20,
		padding: 10,
		elevation: 2,
	},
	buttonOpen: {
		backgroundColor: '#F194FF',
	},
	buttonClose: {
		backgroundColor: '#2196F3',
	},
	textStyle: {
		color: 'white',
		fontWeight: 'bold',
		textAlign: 'center',
	},
	modalText: {
		marginBottom: 15,
		textAlign: 'center',
	},
});

export default class SelectDateTimeDialog extends React.PureComponent<any, any> {

	public constructor(props: any) {
		super(props);

		this.state = {
			date: null,
			mode: 'date',
			showPicker: false,
		};

		this.onReject = this.onReject.bind(this);
		this.onPickerConfirm = this.onPickerConfirm.bind(this);
		this.onPickerCancel = this.onPickerCancel.bind(this);
		this.onSetDate = this.onSetDate.bind(this);
	}

	public UNSAFE_componentWillReceiveProps(newProps: any) {
		if (newProps.date !== this.state.date) {
			this.setState({ date: newProps.date });
		}
	}

	public onAccept() {
		if (this.props.onAccept) this.props.onAccept(this.state.date);
	}

	public onReject() {
		if (this.props.onReject) this.props.onReject();
	}

	public onClear() {
		if (this.props.onAccept) this.props.onAccept(null);
	}

	public onPickerConfirm(selectedDate: Date) {
		this.setState({ date: selectedDate, showPicker: false });
	}

	public onPickerCancel() {
		this.setState({ showPicker: false });
	}

	public onSetDate() {
		this.setState({ showPicker: true });
	}

	public renderContent() {
		const theme = themeStyle(this.props.themeId);

		return (
			<View style={{ flex: 0, margin: 20, alignItems: 'center' }}>
				<View style={{ flexDirection: 'row', alignItems: 'center' }}>
					{ this.state.date && <Text style={{ ...theme.normalText, color: theme.color, marginRight: 10 }}>{time.formatDateToLocal(this.state.date)}</Text> }
					<Button title="Set date" onPress={this.onSetDate} />
				</View>
				<DateTimePickerModal
					date={this.state.date ? this.state.date : new Date()}
					is24Hour={time.use24HourFormat()}
					isVisible={this.state.showPicker}
					mode="datetime"
					onConfirm={this.onPickerConfirm}
					onCancel={this.onPickerCancel}
				/>
			</View>
		);
	}

	public render() {
		const modalVisible = this.props.shown;

		if (!modalVisible) return null;

		const theme = themeStyle(this.props.themeId);

		return (
			<View style={styles.centeredView}>
				<Modal

					transparent={true}
					visible={modalVisible}
					onRequestClose={() => {
						this.onReject();
					}}
				>
					<View style={styles.centeredView}>
						<View style={{ ...styles.modalView, backgroundColor: theme.backgroundColor }}>
							<View style={{ padding: 15, paddingBottom: 0, flex: 0, width: '100%', borderBottomWidth: 1, borderBottomColor: theme.dividerColor, borderBottomStyle: 'solid' }}>
								<Text style={{ ...styles.modalText, color: theme.color, fontSize: 14, fontWeight: 'bold' }}>{_('Set alarm')}</Text>
							</View>
							{this.renderContent()}
							<View style={{ padding: 20, borderTopWidth: 1, borderTopStyle: 'solid', borderTopColor: theme.dividerColor }}>
								<View style={{ marginBottom: 10 }}>
									<Button title={_('Save alarm')} onPress={() => this.onAccept()} key="saveButton" />
								</View>
								<View style={{ marginBottom: 10 }}>
									<Button title={_('Clear alarm')} onPress={() => this.onClear()} key="clearButton" />
								</View>
								<View style={{ marginBottom: 10 }}>
									<Button title={_('Cancel')} onPress={() => this.onReject()} key="cancelButton" />
								</View>
							</View>
						</View>
					</View>
				</Modal>
			</View>
		);
	}

}
