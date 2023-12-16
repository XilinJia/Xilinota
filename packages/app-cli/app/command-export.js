const BaseCommand = require('./base-command').default;
const InteropService = require('@xilinota/lib/services/interop/InteropService').default;
const BaseModel = require('@xilinota/lib/BaseModel').default;
const { app } = require('./app.js');
const { _ } = require('@xilinota/lib/locale');

class Command extends BaseCommand {
	usage() {
		return 'export <path>';
	}

	description() {
		return _('Exports Xilinota data to the given path. By default, it will export the complete database including notebooks, notes, tags and resources.');
	}

	options() {
		const service = InteropService.instance();
		const formats = service
			.modules()
			.filter(m => m.type === 'exporter' && m.format !== 'html')
			.map(m => m.format + (m.description ? ` (${m.description})` : ''));

		return [['--format <format>', _('Destination format: %s', formats.join(', '))], ['--note <note>', _('Exports only the given note.')], ['--notebook <notebook>', _('Exports only the given notebook.')]];
	}

	async action(args) {
		const exportOptions = {};
		exportOptions.path = args.path;

		exportOptions.format = args.options.format ? args.options.format : 'jex';

		if (exportOptions.format === 'html') throw new Error('HTML export is not supported. Please use the desktop application.');

		if (args.options.note) {
			const notes = await app().loadItems(BaseModel.TYPE_NOTE, args.options.note, { parent: app().currentFolder() });
			if (!notes.length) throw new Error(_('Cannot find "%s".', args.options.note));
			exportOptions.sourceNoteIds = notes.map(n => n.id);
		} else if (args.options.notebook) {
			const folders = await app().loadItems(BaseModel.TYPE_FOLDER, args.options.notebook);
			if (!folders.length) throw new Error(_('Cannot find "%s".', args.options.notebook));
			exportOptions.sourceFolderIds = folders.map(n => n.id);
		}

		const service = InteropService.instance();
		const result = await service.export(exportOptions);

		result.warnings.map(w => this.stdout(w));
	}
}

module.exports = Command;
