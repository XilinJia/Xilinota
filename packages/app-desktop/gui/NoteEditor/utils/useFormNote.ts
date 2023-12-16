import { useState, useEffect, useCallback } from 'react';
import { FormNote, defaultFormNote, ResourceInfos } from './types';
import { clearResourceCache, attachedResources } from './resourceHandling';
import AsyncActionQueue from '@xilinota/lib/AsyncActionQueue';
import { handleResourceDownloadMode } from './resourceHandling';
import { splitHtml } from '@xilinota/renderer/HtmlToHtml';
import Setting from '@xilinota/lib/models/Setting';
import usePrevious from '../../hooks/usePrevious';
import ResourceEditWatcher from '@xilinota/lib/services/ResourceEditWatcher/index';

const { MarkupToHtml } = require('@xilinota/renderer');
import Note from '@xilinota/lib/models/Note';
import { reg } from '@xilinota/lib/registry';
import ResourceFetcher from '@xilinota/lib/services/ResourceFetcher';
import DecryptionWorker from '@xilinota/lib/services/DecryptionWorker';
// import { toFileProtocolPath, filename } from '@xilinota/lib/path-utils';
// import path = require('path');

export interface OnLoadEvent {
	formNote: FormNote;
}

export interface HookDependencies {
	syncStarted: boolean;
	decryptionStarted: boolean;
	noteId: string;
	isProvisional: boolean;
	titleInputRef: any;
	editorRef: any;
	onBeforeLoad(event: OnLoadEvent): void;
	onAfterLoad(event: OnLoadEvent): void;
}

// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
function installResourceChangeHandler(onResourceChangeHandler: Function) {
	ResourceFetcher.instance().on('downloadComplete', onResourceChangeHandler);
	ResourceFetcher.instance().on('downloadStarted', onResourceChangeHandler);
	DecryptionWorker.instance().on('resourceDecrypted', onResourceChangeHandler);
	ResourceEditWatcher.instance().on('resourceChange', onResourceChangeHandler);
}

// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
function uninstallResourceChangeHandler(onResourceChangeHandler: Function) {
	ResourceFetcher.instance().off('downloadComplete', onResourceChangeHandler);
	ResourceFetcher.instance().off('downloadStarted', onResourceChangeHandler);
	DecryptionWorker.instance().off('resourceDecrypted', onResourceChangeHandler);
	ResourceEditWatcher.instance().off('resourceChange', onResourceChangeHandler);
}

// function resourceInfosChanged(a: ResourceInfos, b: ResourceInfos): boolean {
// 	if (Object.keys(a).length !== Object.keys(b).length) return true;

// 	for (const id in a) {
// 		const r1 = a[id];
// 		const r2 = b[id];
// 		if (!r2) return true;
// 		if (r1.item.updated_time !== r2.item.updated_time) return true;
// 		if (r1.item.encryption_applied !== r2.item.encryption_applied) return true;
// 		if (r1.item.is_shared !== r2.item.is_shared) return true;
// 		if (r1.localState.fetch_status !== r2.localState.fetch_status) return true;
// 	}

// 	return false;
// }

export default function useFormNote(dependencies: HookDependencies) {
	const { syncStarted, decryptionStarted, noteId, isProvisional, titleInputRef, editorRef, onBeforeLoad, onAfterLoad } = dependencies;

	const [formNote, setFormNote] = useState<FormNote>(defaultFormNote());
	const [isNewNote, setIsNewNote] = useState(false);
	const prevSyncStarted = usePrevious(syncStarted);
	const prevDecryptionStarted = usePrevious(decryptionStarted);
	const previousNoteId = usePrevious(formNote.id);
	const [resourceInfos, setResourceInfos] = useState<ResourceInfos>({});

	// Increasing the value of this counter cancels any ongoing note refreshes and starts
	// a new refresh.
	const [formNoteRefeshScheduled, setFormNoteRefreshScheduled] = useState<number>(0);

	async function initNoteState(n: any) {
		let originalCss = '';

		if (n.markup_language === MarkupToHtml.MARKUP_LANGUAGE_HTML) {
			const splitted = splitHtml(n.body);
			originalCss = splitted.css;
		}

		const newFormNote = {
			id: n.id,
			title: n.title,
			body: n.body,
			is_todo: n.is_todo,
			parent_id: n.parent_id,
			bodyWillChangeId: 0,
			bodyChangeId: 0,
			markup_language: n.markup_language,
			saveActionQueue: new AsyncActionQueue(300),
			originalCss: originalCss,
			hasChanged: false,
			user_updated_time: n.user_updated_time,
			encryption_applied: n.encryption_applied,
		};

		// Note that for performance reason,the call to setResourceInfos should
		// be first because it loads the resource infos in an async way. If we
		// swap them, the formNote will be updated first and rendered, then the
		// the resources will load, and the note will be re-rendered.
		// XJ changed: the function is called anyway when note body is changed
		// setResourceInfos(await attachedResources(n.body));
		setFormNote(newFormNote);

		await handleResourceDownloadMode(n.body);

		return newFormNote;
	}

	useEffect(() => {
		if (formNoteRefeshScheduled <= 0) return () => {};

		reg.logger().info('Sync has finished and note has never been changed - reloading it');

		let cancelled = false;

		const loadNote = async () => {
			const n = await Note.load(noteId);
			if (cancelled) return;

			// Normally should not happened because if the note has been deleted via sync
			// it would not have been loaded in the editor (due to note selection changing
			// on delete)
			if (!n) {
				reg.logger().warn('Trying to reload note that has been deleted:', noteId);
				return;
			}

			await initNoteState(n);
			setFormNoteRefreshScheduled(0);
		};

		void loadNote();

		return () => {
			cancelled = true;
		};
	}, [formNoteRefeshScheduled, noteId]);

	const refreshFormNote = useCallback(() => {
		// Increase the counter to cancel any ongoing refresh attempts
		// and start a new one.
		setFormNoteRefreshScheduled(formNoteRefeshScheduled + 1);
	}, [formNoteRefeshScheduled]);

	useEffect(() => {
		// Check that synchronisation has just finished - and
		// if the note has never been changed, we reload it.
		// If the note has already been changed, it's a conflict
		// that's already been handled by the synchronizer.
		const decryptionJustEnded = prevDecryptionStarted && !decryptionStarted;
		const syncJustEnded = prevSyncStarted && !syncStarted;

		if (!decryptionJustEnded && !syncJustEnded) return;
		if (formNote.hasChanged) return;

		// Refresh the form note.
		// This is kept separate from the above logic so that when prevSyncStarted is changed
		// from true to false, it doesn't cancel the note from loading.
		refreshFormNote();
	}, [prevSyncStarted, syncStarted, prevDecryptionStarted, decryptionStarted, formNote.hasChanged, refreshFormNote]);

	useEffect(() => {
		if (!noteId) {
			if (formNote.id) setFormNote(defaultFormNote());
			return () => {};
		}

		if (formNote.id === noteId) return () => {};

		let cancelled = false;

		// reg.logger().debug('Saving previous note', formNote.id, formNote.title);
		// async function handleNote(): Promise<void> {
		// 	try {
		// 		const note = await formNoteToNote(formNote);
		// 		reg.logger().debug('Saving note...', note);
		// 		await Note.save(note);
		// 	} catch (error) {
		// 		console.error(error);
		// 	}
		// }
		// void handleNote();

		reg.logger().debug('Loading existing note', noteId);
		function handleAutoFocus(noteIsTodo: boolean) {
			if (!isProvisional) return;

			const focusSettingName = noteIsTodo ? 'newTodoFocus' : 'newNoteFocus';

			requestAnimationFrame(() => {
				if (Setting.value(focusSettingName) === 'title') {
					if (titleInputRef.current) titleInputRef.current.focus();
				} else {
					if (editorRef.current) editorRef.current.execCommand({ name: 'editor.focus' });
				}
			});
		}

		async function loadNote() {
			const n = await Note.load(noteId);
			if (cancelled) return;
			if (!n) throw new Error(`Cannot find note with ID: ${noteId}`);

			reg.logger().debug('Loaded note:', n);

			await onBeforeLoad({ formNote });

			const newFormNote = await initNoteState(n);

			setIsNewNote(isProvisional);

			await onAfterLoad({ formNote: newFormNote });

			handleAutoFocus(!!n.is_todo);
		}

		void loadNote();

		return () => {
			cancelled = true;
		};
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [noteId, isProvisional, formNote]);

	const onResourceChange = useCallback(
		async (event: any = null) => {
			reg.logger().info('useFormNote: onResourceChange called');
			const resourceIds = await Note.linkedResourceIds(formNote.body);
			if (!event || resourceIds.indexOf(event.id) >= 0) {
				clearResourceCache();
				setResourceInfos(await attachedResources(formNote.body));
			}
		},
		[formNote.body],
	);

	useEffect(() => {
		installResourceChangeHandler(onResourceChange);
		return () => {
			uninstallResourceChangeHandler(onResourceChange);
		};
	}, [onResourceChange]);

	useEffect(() => {
		if (previousNoteId !== formNote.id) {
			void onResourceChange();
		}
	}, [previousNoteId, formNote.id, onResourceChange]);

	// useEffect(() => {
	// 	let cancelled = false;

	// 	// eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
	// 	async function runEffect() {
	// 		reg.logger().info('useFormNote: runEffect called');
	// 		const r = await attachedResources(formNote.body);
	// 		if (cancelled) return;
	// 		setResourceInfos((previous: ResourceInfos) => {
	// 			return resourceInfosChanged(previous, r) ? r : previous;
	// 		});
	// 	}

	// 	// TODO: XJ changed, needs better handling of resource changes
	// 	// void runEffect();

	// 	return () => {
	// 		cancelled = true;
	// 	};
	// }, [formNote.body]);

	return { isNewNote, formNote, setFormNote, resourceInfos };
}
