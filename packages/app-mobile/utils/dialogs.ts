const DialogBox = require('react-native-dialogbox').default;
import { Keyboard } from 'react-native';

// Add this at the bottom of the component:
//
// <DialogBox ref={dialogbox => { this.dialogbox = dialogbox }}/>


const confirmRef = (ref: { confirm: (arg0: { content: any; ok: { callback: () => void; }; cancel: { callback: () => void; }; }) => void; }, message: string) => {
	if (!ref) throw new Error('ref is required');

	return new Promise((resolve) => {
		Keyboard.dismiss();

		ref.confirm({
			content: message,

			ok: {
				callback: () => {
					resolve(true);
				},
			},

			cancel: {
				callback: () => {
					resolve(false);
				},
			},
		});
	});
};

const confirm = (parentComponent: { dialogbox: any; }, message: string) => {
	if (!parentComponent) throw new Error('parentComponent is required');
	if (!('dialogbox' in parentComponent)) throw new Error('A "dialogbox" component must be defined on the parent component!');

	return confirmRef(parentComponent.dialogbox, message);
};

const pop = (
	parentComponent: { dialogbox: { close: () => void; pop: (arg0: { content: any; btns: { text: any; callback: () => void; }[]; buttonFlow: any; }) => void; }; },
	message: string,
	buttons: any[],
	options: any = null) => {
	
	if (!parentComponent) throw new Error('parentComponent is required');
	if (!('dialogbox' in parentComponent)) throw new Error('A "dialogbox" component must be defined on the parent component!');

	if (!options) options = {};
	if (!('buttonFlow' in options)) options.buttonFlow = 'auto';

	return new Promise((resolve) => {
		Keyboard.dismiss();

		const btns = [];
		for (let i = 0; i < buttons.length; i++) {
			btns.push({
				text: buttons[i].text,
				callback: () => {
					parentComponent.dialogbox.close();
					resolve(buttons[i].id);
				},
			});
		}

		parentComponent.dialogbox.pop({
			content: message,
			btns: btns,
			buttonFlow: options.buttonFlow,
		});
	});
};

const error = (parentComponent: { dialogbox: { alert: (arg0: any) => any; }; }, message: string) => {
	Keyboard.dismiss();
	return parentComponent.dialogbox.alert(message);
};

const info = (parentComponent: { dialogbox: { alert: (arg0: any) => any; }; }, message: string) => {
	Keyboard.dismiss();
	return parentComponent.dialogbox.alert(message);
};

const dialogs = {
	confirmRef,
	confirm,
	pop,
	error,
	info,
	DialogBox,
};

dialogs.DialogBox = DialogBox;

export default dialogs;

// module.exports = { dialogs };
