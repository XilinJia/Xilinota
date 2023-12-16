import { ModelType } from '../../BaseModel';
import { UserData } from '../../services/database/types';
import { msleep, setupDatabaseAndSynchronizer, switchClient } from '../../testing/test-utils';
import Folder from '../Folder';
import Note from '../Note';
import Resource from '../BaseItem';
import Tag from '../Tag';
import { LoadOptions } from './types';
import { deleteItemUserData, deleteNoteUserData, getItemUserData, getNoteUserData, mergeUserData, setItemUserData, setNoteUserData } from './userData';

const loadOptions: LoadOptions = { fields: ['id', 'parent_id', 'user_data', 'updated_time'] };

describe('utils/userData', () => {

	beforeEach(async () => {
		await setupDatabaseAndSynchronizer(1);
		await switchClient(1);
	});

	it('should set and get user data on a note', async () => {
		const folder = await Folder.save({});
		let note = await Note.save({ parent_id: folder.id });
		note = await Note.load(note.id, loadOptions);
		await msleep(5);
		await setNoteUserData(note, 'org.xilinota', 'my-key', 'something');

		const noteReloaded = await Note.load(note.id);
		expect(await getNoteUserData(noteReloaded, 'org.xilinota', 'my-key')).toBe('something');

		// Check that the updated_time has been updated (for sync purposes), but
		// not the user_updated_time.
		expect(noteReloaded.updated_time).toBeGreaterThan(note.updated_time);
		expect(noteReloaded.user_updated_time).toBe(note.updated_time);

		// Check for non-existing props
		expect(await getNoteUserData(noteReloaded, 'org.doesntexist', 'my-key')).toBe(undefined);
		expect(await getNoteUserData(noteReloaded, 'org.xilinota', 'doesntexist')).toBe(undefined);
	});

	it('should set and get user data on any item', async () => {
		const folder = await Folder.save({});
		const tag = await Tag.save({});
		const resource = await Resource.save({ mime: 'plain/text' });

		await setItemUserData(ModelType.Folder, folder.id, 'foldertest', 'folderkey', 123);
		expect(await getItemUserData(ModelType.Folder, folder.id, 'foldertest', 'folderkey')).toBe(123);
		await deleteItemUserData(ModelType.Folder, folder.id, 'foldertest', 'folderkey');
		expect(await getItemUserData(ModelType.Folder, folder.id, 'foldertest', 'folderkey')).toBe(undefined);

		await setItemUserData(ModelType.Tag, tag.id, 'tagtest', 'tagkey', 123);
		expect(await getItemUserData(ModelType.Tag, tag.id, 'tagtest', 'tagkey')).toBe(123);
		await deleteItemUserData(ModelType.Tag, tag.id, 'tagtest', 'tagkey');
		expect(await getItemUserData(ModelType.Tag, tag.id, 'tagtest', 'tagkey')).toBe(undefined);

		await setItemUserData(ModelType.Resource, resource.id, 'resourcetest', 'resourcekey', 123);
		expect(await getItemUserData(ModelType.Resource, resource.id, 'resourcetest', 'resourcekey')).toBe(123);
		await deleteItemUserData(ModelType.Resource, resource.id, 'resourcetest', 'resourcekey');
		expect(await getItemUserData(ModelType.Resource, resource.id, 'resourcetest', 'resourcekey')).toBe(undefined);
	});

	it('should delete user data', async () => {
		const folder = await Folder.save({});
		let note = await Note.save({ parent_id: folder.id });
		note = await Note.load(note.id, loadOptions);
		await setNoteUserData(note, 'org.xilinota', 'my-key', 'something');

		let noteReloaded = await Note.load(note.id);
		expect(await getNoteUserData(noteReloaded, 'org.xilinota', 'my-key')).toBe('something');

		noteReloaded = await deleteNoteUserData(noteReloaded, 'org.xilinota', 'my-key');
		expect(await getNoteUserData(noteReloaded, 'org.xilinota', 'my-key')).toBe(undefined);

		// Check that it works if we set it again
		await setNoteUserData(note, 'org.xilinota', 'my-key', 'something else');
		noteReloaded = await Note.load(noteReloaded.id, loadOptions);
		expect(await getNoteUserData(noteReloaded, 'org.xilinota', 'my-key')).toBe('something else');
	});

	it('should merge user data', async () => {
		const testCases: [UserData, UserData, UserData][] = [
			[
				{
					'org.xilinota': {
						'k1': {
							v: 123,
							t: 0,
						},
						'k3': {
							v: 789,
							t: 5,
						},
						'k4': {
							v: 789,
							t: 5,
						},
					},
					'com.example': {},
				},
				{
					'org.xilinota': {
						'k1': {
							v: 456,
							t: 1,
						},
						'k2': {
							v: 'abc',
							t: 5,
						},
						'k4': {
							v: 111,
							t: 0,
						},
					},
				},
				{
					'org.xilinota': {
						'k1': {
							v: 456,
							t: 1,
						},
						'k2': {
							v: 'abc',
							t: 5,
						},
						'k3': {
							v: 789,
							t: 5,
						},
						'k4': {
							v: 789,
							t: 5,
						},
					},
					'com.example': {},
				},
			],

			[
				// Client 2 delete a prop
				// Later, client 1 update that prop
				// Then data is merged
				// => In that case, the data is restored using client 1 data
				{
					'org.xilinota': {
						'k1': {
							v: 123,
							t: 10,
						},
					},
				},
				{
					'org.xilinota': {
						'k1': {
							v: 0,
							t: 0,
							d: 1,
						},
					},
				},
				{
					'org.xilinota': {
						'k1': {
							v: 123,
							t: 10,
						},
					},
				},
			],

			[
				// Client 1 update a prop
				// Later, client 2 delete a prop
				// Then data is merged
				// => In that case, the data is deleted and the update from client 1 is lost
				{
					'org.xilinota': {
						'k1': {
							v: 123,
							t: 0,
						},
					},
				},
				{
					'org.xilinota': {
						'k1': {
							v: 0,
							t: 10,
							d: 1,
						},
					},
				},
				{
					'org.xilinota': {
						'k1': {
							v: 0,
							t: 10,
							d: 1,
						},
					},
				},
			],
		];

		for (const [target, source, expected] of testCases) {
			const actual = mergeUserData(target, source);
			expect(actual).toEqual(expected);
		}
	});

});
