import { LogBox, NativeEventEmitter, NativeModules, Platform } from 'react-native';

LogBox.ignoreLogs(['new NativeEventEmitter']); // Ignore log notification by message

export interface SharedData {
	title?: string;
	text?: string;
	resources?: string[];
}

let eventEmitter: NativeEventEmitter | undefined;

const ShareExtension = (NativeModules.ShareExtension) ?
	{
		data: () => NativeModules.ShareExtension.data(),
		close: () => NativeModules.ShareExtension.close(),
		shareURL: (Platform.OS === 'ios') ? NativeModules.ShareExtension.getConstants().SHARE_EXTENSION_SHARE_URL : '',
		addShareListener: (Platform.OS === 'android') ? ((handler: (event: any)=> void) => {
			if (!eventEmitter) {
				eventEmitter = new NativeEventEmitter(NativeModules.ShareExtension);
			}
			return eventEmitter.addListener('new_share_intent', handler).remove;
		}) : (() => {}),
	} :
	{
		data: () => {},
		close: () => {},
		shareURL: '',
		addShareListener: () => {},
	};

export default ShareExtension;
