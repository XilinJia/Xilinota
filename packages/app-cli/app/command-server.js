const BaseCommand = require('./base-command').default;
const { _ } = require('@xilinota/lib/locale');
const Setting = require('@xilinota/lib/models/Setting').default;
const Logger = require('@xilinota/utils/Logger').default;
const shim = require('@xilinota/lib/shim').default;

class Command extends BaseCommand {

	usage() {
		return 'server <command>';
	}

	description() {
		return `${_('Start, stop or check the API server. To specify on which port it should run, set the api.port config variable. Commands are (%s).', ['start', 'stop', 'status'].join('|'))} This is an experimental feature - use at your own risks! It is recommended that the server runs off its own separate profile so that no two CLI instances access that profile at the same time. Use --profile to specify the profile path.`;
	}

	async action(args) {
		const command = args.command;

		const ClipperServer = require('@xilinota/lib/ClipperServer').default;
		ClipperServer.instance().initialize();
		const stdoutFn = (...s) => this.stdout(s.join(' '));
		const clipperLogger = new Logger();
		clipperLogger.addTarget('file', { path: `${Setting.value('profileDir')}/log-clipper.txt` });
		clipperLogger.addTarget('console', { console: {
			info: stdoutFn,
			warn: stdoutFn,
			error: stdoutFn,
		} });
		ClipperServer.instance().setDispatch(() => {});
		ClipperServer.instance().setLogger(clipperLogger);

		const pidPath = `${Setting.value('profileDir')}/clipper-pid.txt`;
		const runningOnPort = await ClipperServer.instance().isRunning();

		if (command === 'start') {
			if (runningOnPort) {
				this.stdout(_('Server is already running on port %d', runningOnPort));
			} else {
				await shim.fsDriver().writeFile(pidPath, process.pid.toString(), 'utf-8');
				await ClipperServer.instance().start(); // Never exit
			}
		} else if (command === 'status') {
			this.stdout(runningOnPort ? _('Server is running on port %d', runningOnPort) : _('Server is not running.'));
		} else if (command === 'stop') {
			if (!runningOnPort) {
				this.stdout(_('Server is not running.'));
				return;
			}
			const pid = await shim.fsDriver().readFile(pidPath);
			if (!pid) return;
			process.kill(pid, 'SIGTERM');
		}
	}

}

module.exports = Command;
