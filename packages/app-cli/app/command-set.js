const BaseCommand = require('./base-command').default;
const { app } = require('./app.js');
const { _ } = require('@xilinota/lib/locale');
const BaseModel = require('@xilinota/lib/BaseModel').default;
const Database = require('@xilinota/lib/database').default;
const Note = require('@xilinota/lib/models/Note').default;

class Command extends BaseCommand {
	usage() {
		return 'set <note> <name> [value]';
	}

	description() {
		const fields = Note.fields();
		const s = [];
		for (let i = 0; i < fields.length; i++) {
			const f = fields[i];
			if (f.name === 'id') continue;
			s.push(`${f.name} (${Database.enumName('fieldType', f.type)})`);
		}

		return _('Sets the property <name> of the given <note> to the given [value]. Possible properties are:\n\n%s', s.join(', '));
	}

	async action(args) {
		const title = args['note'];
		const propName = args['name'];
		let propValue = args['value'];
		if (!propValue) propValue = '';

		const notes = await app().loadItems(BaseModel.TYPE_NOTE, title);
		if (!notes.length) throw new Error(_('Cannot find "%s".', title));

		for (let i = 0; i < notes.length; i++) {
			this.encryptionCheck(notes[i]);

			const timestamp = Date.now();

			const newNote = {
				id: notes[i].id,
				type_: notes[i].type_,
				updated_time: timestamp,
			};
			newNote[propName] = propValue;

			if (!newNote.id) newNote.created_time = timestamp;

			await Note.save(newNote, {
				autoTimestamp: false, // No auto-timestamp because user may have provided them
			});
		}
	}
}

module.exports = Command;
