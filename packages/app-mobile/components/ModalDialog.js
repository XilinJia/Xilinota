import React from 'react';
import { Text, View, StyleSheet, Button } from 'react-native';
import { themeStyle } from './global-style';
import { _ } from '@xilinota/lib/locale';
import Modal from './Modal';
class ModalDialog extends React.Component {
    styles_;
    constructor(props) {
        super(props);
        this.styles_ = {};
    }
    styles() {
        const themeId = this.props.themeId;
        const theme = themeStyle(themeId.toString());
        if (this.styles_[themeId])
            return this.styles_[themeId];
        this.styles_ = {};
        const styles = {
            modalWrapper: {
                flex: 1,
                justifyContent: 'center',
            },
            modalContentWrapper: {
                flex: 1,
                flexDirection: 'column',
                backgroundColor: theme.backgroundColor,
                borderWidth: 1,
                borderColor: theme.dividerColor,
                margin: 20,
                padding: 10,
                borderRadius: 5,
                elevation: 10,
            },
            modalContentWrapper2: {
                flex: 1,
            },
            title: { ...theme.normalText, borderBottomWidth: 1,
                borderBottomColor: theme.dividerColor,
                paddingBottom: 10,
                fontWeight: 'bold' },
            buttonRow: {
                flexDirection: 'row',
                borderTopWidth: 1,
                borderTopColor: theme.dividerColor,
                paddingTop: 10,
            },
        };
        this.styles_[themeId] = StyleSheet.create(styles);
        return this.styles_[themeId];
    }
    render() {
        const ContentComponent = this.props.ContentComponent;
        const buttonBarEnabled = this.props.buttonBarEnabled !== false;
        return (<View style={this.styles().modalWrapper}>
				<Modal transparent={true} visible={true} onRequestClose={() => { }} containerStyle={this.styles().modalContentWrapper}>
					<Text style={this.styles().title}>{this.props.title}</Text>
					<View style={this.styles().modalContentWrapper2}>{ContentComponent}</View>
					<View style={this.styles().buttonRow}>
						<View style={{ flex: 1 }}>
							<Button disabled={!buttonBarEnabled} title={_('OK')} onPress={this.props.onOkPress}></Button>
						</View>
						<View style={{ flex: 1, marginLeft: 5 }}>
							<Button disabled={!buttonBarEnabled} title={_('Cancel')} onPress={this.props.onCancelPress}></Button>
						</View>
					</View>
				</Modal>
			</View>);
    }
}
export default ModalDialog;
// module.exports = ModalDialog;
//# sourceMappingURL=ModalDialog.js.map