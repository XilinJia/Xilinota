import Logger from '@xilinota/utils/Logger';
import FingerprintScanner, { Errors } from 'react-native-fingerprint-scanner';
import { _ } from '@xilinota/lib/locale';

const logger = Logger.create('biometricAuthenticate');

export default async () => {
	try {
		logger.info('Authenticate...');
		await FingerprintScanner.authenticate({ description: _('Verify your identity') });
		logger.info('Authenticate done');
	} catch (error) {
		const err = error as Errors;
		const errorName = err.name;

		let errorMessage = err.message as string;
		if (errorName === 'FingerprintScannerNotEnrolled' || errorName === 'FingerprintScannerNotAvailable') {
			errorMessage = 'Biometric unlock is not setup on the device. Please set it up in order to unlock Xilinota. If the device is on lockout, consider switching it off and on to reset biometrics scanning.';
		}

		// err.message = _('Could not verify your identify: %s', errorMessage);

		logger.warn('Could not verify your identify: %s', errorMessage);

		throw error;
	} finally {
		FingerprintScanner.release();
	}
};
