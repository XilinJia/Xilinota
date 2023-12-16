import { AppContext, KoaNext } from '../utils/types';
import { isApiRequest } from '../utils/requestUtils';
import config from '../config';
import { ErrorPreconditionFailed } from '../utils/errors';
import { compareVersions } from 'compare-versions';

export default async function(ctx: AppContext, next: KoaNext): Promise<void> {
	if (!isApiRequest(ctx)) return next();

	const xilinotaServerVersion = config().xilinotaServerVersion;
	const minVersion = ctx.headers['x-api-min-version'] as string;

	// For now we don't require this header to be set to keep compatibility with
	// older clients.
	if (!minVersion) return next();

	const diff = compareVersions(xilinotaServerVersion, minVersion);

	// We only throw an error if the client requires a version of Xilinota Server
	// that's ahead of what's installed. This is mostly to automatically notify
	// those who self-host so that they know they need to upgrade Xilinota Server.
	if (diff < 0) {
		throw new ErrorPreconditionFailed(`Xilinota Server v${minVersion} is required but v${xilinotaServerVersion} is installed. Please upgrade Xilinota Server.`);
	}

	return next();
}
