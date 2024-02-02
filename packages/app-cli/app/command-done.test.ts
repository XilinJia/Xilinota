import Note from '@xilinota/lib/models/Note';
import { NoteEntity } from '@xilinota/lib/services/database/types';
import { setupDatabaseAndSynchronizer, switchClient } from '@xilinota/lib/testing/test-utils';
import { setupCommandForTesting, setupApplication } from './utils/testUtils';
const Command = require('./command-done');

describe('command-done', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
		await setupApplication();
	});

	it('should make a note as "done"', async () => {
		const note = await Note.save({ title: 'hello', is_todo: 1, todo_completed: 0 });

		const command = setupCommandForTesting(Command);

		const now = Date.now();
		await command.action({ note: note.id });

		const checkNote: NoteEntity = (await Note.load(note.id!))!;
		expect(checkNote.todo_completed).toBeGreaterThanOrEqual(now);
	});

});
