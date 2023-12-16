/* eslint-disable no-unused-vars */
const { setupDatabaseAndSynchronizer, switchClient, createNTestFolders, createNTestNotes, createNTestTags, TestApp } = require('@xilinota/lib/testing/test-utils.js');
const Setting = require('@xilinota/lib/models/Setting').default;
const Folder = require('@xilinota/lib/models/Folder').default;
const Note = require('@xilinota/lib/models/Note').default;
const Tag = require('@xilinota/lib/models/Tag').default;
const time = require('@xilinota/lib/time').default;

let testApp = null;

describe('integration_NoteList', () => {

	beforeEach(async () => {
		testApp = new TestApp();
		await testApp.start(['--no-welcome']);
	});

	afterEach(async () => {
		if (testApp !== null) await testApp.destroy();
		testApp = null;
	});

	// Reference: https://github.com/XilinJia/Xilinota/issues/2709
	it('should leave a conflict note in the conflict folder when it modified', (async () => {
		const folder = await Folder.save({ title: 'test' });
		const note = await Note.save({ title: 'note 1', parent_id: folder.id, is_conflict: 1 });
		await testApp.wait();

		testApp.dispatch({ type: 'FOLDER_SELECT', id: Folder.conflictFolderId() });
		await testApp.wait();

		testApp.dispatch({ type: 'NOTE_SELECT',	id: note.id });
		await testApp.wait();

		// Check that the conflict folder is selected and that the conflict note is inside
		let state = testApp.store().getState();
		expect(state.selectedFolderId).toBe(Folder.conflictFolderId());
		expect(state.selectedNoteIds[0]).toBe(note.id);

		await Note.save({ id: note.id, title: 'note 1 mod', is_conflict: 1 });
		await testApp.wait();

		// Check that the conflict folder is still selected with the note still inside
		state = testApp.store().getState();
		expect(state.selectedFolderId).toBe(Folder.conflictFolderId());
		expect(state.selectedNoteIds[0]).toBe(note.id);
	}));

});
