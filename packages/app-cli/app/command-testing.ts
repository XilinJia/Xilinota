const BaseCommand = require('./base-command').default;
import { reg } from '@xilinota/lib/registry';
import Note from '@xilinota/lib/models/Note';
import uuid from '@xilinota/lib/uuid_';
import populateDatabase from '@xilinota/lib/services/debug/populateDatabase';
import { readCredentialFile } from '@xilinota/lib/utils/credentialFiles';
import XilinotaServerApi from '@xilinota/lib/XilinotaServerApi';

function randomElement(array: any[]): any {
	if (!array.length) return null;
	return array[Math.floor(Math.random() * array.length)];
}

function itemCount(args: any) {
	const count = Number(args.arg0);
	if (!count || isNaN(count)) throw new Error('Note count must be specified');
	return count;
}

class Command extends BaseCommand {
	public usage() {
		return 'testing <command> [arg0]';
	}

	public description() {
		return 'testing';
	}

	public enabled() {
		return false;
	}

	public options(): any[] {
		return [
			['--folder-count <count>', 'Folders to create'],
			['--note-count <count>', 'Notes to create'],
			['--tag-count <count>', 'Tags to create'],
			['--tags-per-note <count>', 'Tags per note'],
			['--silent', 'Silent'],
		];
	}

	public async action(args: any) {
		const { command, options } = args;

		if (command === 'populate') {
			await populateDatabase(reg.db(), {
				folderCount: options['folder-count'],
				noteCount: options['note-count'],
				tagCount: options['tag-count'],
				tagsPerNote: options['tags-per-note'],
				silent: options['silent'],
			});
		}

		const promises: any[] = [];

		if (command === 'createRandomNotes') {
			const noteCount = itemCount(args);

			for (let i = 0; i < noteCount; i++) {
				promises.push(Note.save({
					title: `Note ${uuid.createNano()}`,
				}));
			}
		}

		if (command === 'updateRandomNotes') {
			const noteCount = itemCount(args);

			const noteIds = await Note.allIds();

			for (let i = 0; i < noteCount; i++) {
				const noteId = randomElement(noteIds);
				promises.push(Note.save({
					id: noteId,
					title: `Note ${uuid.createNano()}`,
				}));
			}
		}

		if (command === 'deleteRandomNotes') {
			const noteCount = itemCount(args);
			const noteIds = await Note.allIds();

			for (let i = 0; i < noteCount; i++) {
				const noteId = randomElement(noteIds);
				promises.push(Note.delete(noteId));
			}
		}

		if (command === 'xilinotaServerParallelItemUpdate') {
			const randomContent = () => {
				const charCount = Math.random() * 1000;
				return 'a'.repeat(charCount);
			};

			const xilinotaServerAuth = JSON.parse(await readCredentialFile('xilinota-server-test.json'));

			const api = new XilinotaServerApi({
				baseUrl: () => xilinotaServerAuth.baseUrl,
				userContentBaseUrl: () => xilinotaServerAuth.userContentBaseUrl,
				username: () => xilinotaServerAuth.email,
				password: () => xilinotaServerAuth.password,
			});

			const apiPut = async () => {
				await api.exec('PUT', 'api/items/root:/testing:/content', {}, randomContent(), {
					'Content-Type': 'application/octet-stream',
				});
			};

			await apiPut();

			const promises = [];
			for (let i = 0; i < 100; i++) {
				promises.push(void apiPut());
			}
			await Promise.all(promises);

			// eslint-disable-next-line no-console
			console.info(await api.exec('GET', 'api/items/root:/testing:'));
		}

		await Promise.all(promises);
	}

}

module.exports = Command;
