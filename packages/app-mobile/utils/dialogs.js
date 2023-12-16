const DialogBox = require('react-native-dialogbox').default;
const { Keyboard } = require('react-native');

// Add this at the bottom of the component:
//
// <DialogBox ref={dialogbox => { this.dialogbox = dialogbox }}/>

const dialogs = {};

dialogs.confirmRef = (ref, message) => {
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

dialogs.confirm = (parentComponent, message) => {
	if (!parentComponent) throw new Error('parentComponent is required');
	if (!('dialogbox' in parentComponent)) throw new Error('A "dialogbox" component must be defined on the parent component!');

	return dialogs.confirmRef(parentComponent.dialogbox, message);
};

dialogs.pop = (parentComponent, message, buttons, options = null) => {
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

dialogs.error = (parentComponent, message) => {
	Keyboard.dismiss();
	return parentComponent.dialogbox.alert(message);
};

dialogs.info = (parentComponent, message) => {
	Keyboard.dismiss();
	return parentComponent.dialogbox.alert(message);
};

dialogs.DialogBox = DialogBox;

module.exports = { dialogs };
