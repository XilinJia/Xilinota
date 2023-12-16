const BaseCommand = require('./base-command').default;
const InteropService = require('@xilinota/lib/services/interop/InteropService').default;
const BaseModel = require('@xilinota/lib/BaseModel').default;
const { cliUtils } = require('./cli-utils.js');
const { app } = require('./app.js');
const { _ } = require('@xilinota/lib/locale');

class Command extends BaseCommand {
	usage() {
		return 'import <path> [notebook]';
	}

	description() {
		return _('Imports data into Xilinota.');
	}

	options() {
		const service = InteropService.instance();
		const formats = service
			.modules()
			.filter(m => m.type === 'importer')
			.map(m => m.format);

		return [
			['--format <format>', _('Source format: %s', ['auto'].concat(formats).join(', '))],
			['-f, --force', _('Do not ask for confirmation.')],
			['--output-format <output-format>', _('Output format: %s', 'md, html')],
		];
	}

	async action(args) {
		const folder = await app().loadItem(BaseModel.TYPE_FOLDER, args.notebook);

		if (args.notebook && !folder) throw new Error(_('Cannot find "%s".', args.notebook));

		const importOptions = {};
		importOptions.path = args.path;
		importOptions.format = args.options.format ? args.options.format : 'auto';
		importOptions.destinationFolderId = folder ? folder.id : null;

		let lastProgress = '';

		// onProgress/onError supported by Enex import only

		importOptions.onProgress = progressState => {
			const line = [];
			line.push(_('Found: %d.', progressState.loaded));
			line.push(_('Created: %d.', progressState.created));
			if (progressState.updated) line.push(_('Updated: %d.', progressState.updated));
			if (progressState.skipped) line.push(_('Skipped: %d.', progressState.skipped));
			if (progressState.resourcesCreated) line.push(_('Resources: %d.', progressState.resourcesCreated));
			if (progressState.notesTagged) line.push(_('Tagged: %d.', progressState.notesTagged));
			lastProgress = line.join(' ');
			cliUtils.redraw(lastProgress);
		};

		importOptions.onError = error => {
			const s = error.stack ? error.stack : error.toString();
			this.stdout(s);
		};

		if (args.options.outputFormat) importOptions.outputFormat = args.options.outputFormat;

		app().gui().showConsole();
		this.stdout(_('Importing notes...'));
		const service = InteropService.instance();
		const result = await service.import(importOptions);
		result.warnings.map(w => this.stdout(w));
		cliUtils.redrawDone();
		if (lastProgress) this.stdout(_('The notes have been imported: %s', lastProgress));
	}
}

module.exports = Command;
