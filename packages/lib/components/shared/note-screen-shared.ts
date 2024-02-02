import { ResourceEntity } from '../../services/database/types';
import { reg } from '../../registry';
import Note from '../../models/Note';
import Resource from '../../models/Resource';
import ResourceFetcher from '../../services/ResourceFetcher';
import DecryptionWorker from '../../services/DecryptionWorker';
import { Mutex } from 'async-mutex';
import { ResourceLocalStateEntity } from '../../services/database/types';

const saveNoteMutex_ = new Mutex();

interface ResourceProps {
	item: ResourceEntity,
	localState: ResourceLocalStateEntity,
}

export default class Shared {

	// If saveNoteButton_press is called multiple times in short intervals, it might result in
	// the same new note being created twice, so we need to a mutex to access this function.

	public static async aquireNoteMutex(): Promise<void> {
		await saveNoteMutex_.acquire();
	}

	private static resourceCache_: Record<string, any> = {};

	public static clearResourceCache(): void {
		this.resourceCache_ = {};
	};

	public static async attachedResources(noteBody: string): Promise<Record<string, ResourceProps>> {
		if (!noteBody) return {};
		const resourceIds: string[] = await Note.linkedResourceIds(noteBody);

		const output: Record<string, any> = {};
		for (let i = 0; i < resourceIds.length; i++) {
			const id = resourceIds[i];

			if (this.resourceCache_[id]) {
				output[id] = this.resourceCache_[id];
			} else {
				const resource: ResourceEntity | null = await Resource.load(id);
				const localState = resource ? await Resource.localState(resource) : {};
				if (!resource) continue;

				const o: ResourceProps = {
					item: resource,
					localState: localState,
				};


				this.resourceCache_[id] = o;
				output[id] = o;
			}
		}

		return output;
	};

	private static toggleCheckboxLine(ipcMessage: string, noteBody: string): [string[], number, string] {
		const newBody = noteBody.split('\n');
		const p = ipcMessage.split(':');
		const lineIndex = Number(p[p.length - 1]);
		if (lineIndex >= newBody.length) {
			reg.logger().warn('Checkbox line out of bounds: ', ipcMessage);
			return [[], 0, newBody.join('\n')];
		}

		let line = newBody[lineIndex];

		const noCrossIndex = line.trim().indexOf('- [ ] ');
		let crossIndex = line.trim().indexOf('- [x] ');
		if (crossIndex < 0) crossIndex = line.trim().indexOf('- [X] ');

		if (noCrossIndex < 0 && crossIndex < 0) {
			reg.logger().warn('Could not find matching checkbox for message: ', ipcMessage);
			return [[], 0, newBody.join('\n')];
		}

		let isCrossLine = false;

		if (noCrossIndex >= 0 && crossIndex >= 0) {
			isCrossLine = crossIndex < noCrossIndex;
		} else {
			isCrossLine = crossIndex >= 0;
		}

		if (!isCrossLine) {
			line = line.replace(/- \[ \] /, '- [x] ');
		} else {
			line = line.replace(/- \[x\] /i, '- [ ] ');
		}
		return [newBody, lineIndex, line];
	}

	public static toggleCheckboxRange(ipcMessage: string, noteBody: string): {
		line: string;
		from: { line: number; ch: number; };
		to: { line: number; ch: number; };
	} {
		const [, lineIndex, line] = this.toggleCheckboxLine(ipcMessage, noteBody);
		const from = { line: lineIndex, ch: 0 };
		const to = { line: lineIndex, ch: ((line as any).length as number) };
		return { line, from, to };
	};

	public static toggleCheckbox(ipcMessage: string, noteBody: string): string {
		const [newBody, lineIndex, line] = this.toggleCheckboxLine(ipcMessage, noteBody);
		(newBody as any)[lineIndex as any] = line;
		return (newBody as any).join('\n');
	};

	public static installResourceHandling(refreshResourceHandler: (...args: any[]) => void): void {
		ResourceFetcher.instance().on('downloadComplete', refreshResourceHandler);
		ResourceFetcher.instance().on('downloadStarted', refreshResourceHandler);
		DecryptionWorker.instance().on('resourceDecrypted', refreshResourceHandler);
	};

	public static uninstallResourceHandling(refreshResourceHandler: (...args: any[]) => void): void {
		ResourceFetcher.instance().off('downloadComplete', refreshResourceHandler);
		ResourceFetcher.instance().off('downloadStarted', refreshResourceHandler);
		DecryptionWorker.instance().off('resourceDecrypted', refreshResourceHandler);
	};

}
