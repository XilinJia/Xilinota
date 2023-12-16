const BaseCommand = require('./base-command').default;
const { _ } = require('@xilinota/lib/locale');
const versionInfo = require('@xilinota/lib/versionInfo').default;

class Command extends BaseCommand {
	usage() {
		return 'version';
	}

	description() {
		return _('Displays version information');
	}

	async action() {
		this.stdout(versionInfo(require('./package.json'), {}).message);
	}
}

module.exports = Command;
