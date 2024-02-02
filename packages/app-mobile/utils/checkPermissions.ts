import { Platform, PermissionsAndroid, Permission, Rationale, PermissionStatus } from 'react-native';

import Logger from '@xilinota/utils/Logger';
const logger = Logger.create('checkPermissions');

// type rationale = {
// 	title: string;
// 	message: string;
// 	buttonPositive?: string;
// 	buttonNegative?: string;
// 	buttonNeutral?: string;
// };

export default async (permissions: Permission, rationale?: Rationale): Promise<true | PermissionStatus> => {
	// On iOS, permissions are prompted for by the system, so here we assume it's granted.
	if (Platform.OS !== 'android') return PermissionsAndroid.RESULTS.GRANTED;

	let result = await PermissionsAndroid.check(permissions);
	logger.info('Checked permission:', result);
	// if (result !== PermissionsAndroid.RESULTS.GRANTED) {
	// 	result = await PermissionsAndroid.request(permissions, rationale);
	// 	logger.info('Requested permission:', result);
	// }
	if (!result) {
		let result_ = await PermissionsAndroid.request(permissions, rationale);
		logger.info('Requested permission:', result_);
		result = !!result_;
	}
	return result;
};
