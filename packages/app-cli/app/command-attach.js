const BaseCommand = require('./base-command').default;
const { app } = require('./app.js');
const { _ } = require('@xilinota/lib/locale');
const BaseModel = require('@xilinota/lib/BaseModel').default;
const shim = require('@xilinota/lib/shim').default;

class Command extends BaseCommand {
	usage() {
		return 'attach <note> <file>';
	}

	description() {
		return _('Attaches the given file to the note.');
	}

	async action(args) {
		const title = args['note'];

		const note = await app().loadItem(BaseModel.TYPE_NOTE, title, { parent: app().currentFolder() });
		this.encryptionCheck(note);
		if (!note) throw new Error(_('Cannot find "%s".', title));

		const localFilePath = args['file'];

		await shim.attachFileToNote(note, localFilePath);
	}
}

module.exports = Command;
