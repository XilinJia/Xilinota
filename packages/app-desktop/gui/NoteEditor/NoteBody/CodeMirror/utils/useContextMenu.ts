
import { ContextMenuParams } from 'electron';
import { useEffect, RefObject } from 'react';
import { _ } from '@xilinota/lib/locale';
import Setting from '@xilinota/lib/models/Setting';
import { PluginStates } from '@xilinota/lib/services/plugins/reducer';
import { MenuItemLocation } from '@xilinota/lib/services/plugins/api/types';
import MenuUtils from '@xilinota/lib/services/commands/MenuUtils';
import CommandService from '@xilinota/lib/services/CommandService';
import convertToScreenCoordinates from '../../../../utils/convertToScreenCoordinates';
import SpellCheckerService from '@xilinota/lib/services/spellChecker/SpellCheckerService';
import { EditContextMenuFilterObject } from '@xilinota/lib/services/plugins/api/JoplinWorkspace';
import type CodeMirrorControl from '@xilinota/lib/editor/CodeMirror/CodeMirrorControl';
import eventManager from '@xilinota/lib/eventManager';
import bridge from '../../../../../services/bridge';

const Menu = bridge().Menu;
const MenuItem = bridge().MenuItem;
const menuUtils = new MenuUtils(CommandService.instance());


interface ContextMenuProps {
	plugins: PluginStates;
	editorCutText: () => void;
	editorCopyText: () => void;
	editorPaste: () => void;
	editorRef: RefObject<CodeMirrorControl>;
	editorClassName: string;
}

const useContextMenu = (props: ContextMenuProps): void => {
	const editorRef = props.editorRef;

	// The below code adds support for spellchecking when it is enabled
	// It might be buggy, refer to the below issue
	// https://github.com/XilinJia/Xilinota/pull/3974#issuecomment-718936703
	useEffect(() => {
		const isAncestorOfCodeMirrorEditor = (elem: HTMLElement) => {
			for (; elem.parentElement; elem = elem.parentElement) {
				if (elem && elem.classList.contains(props.editorClassName)) {
					return true;
				}
			}

			return false;
		};

		let lastInCodeMirrorContextMenuTimestamp = 0;

		// The browser's contextmenu event provides additional information about the
		// target of the event, not provided by the Electron context-menu event.
		const onBrowserContextMenu = (event: Event) => {
			if (isAncestorOfCodeMirrorEditor(event.target as HTMLElement)) {
				lastInCodeMirrorContextMenuTimestamp = Date.now();
			}
		};

		function pointerInsideEditor(params: ContextMenuParams) {
			const x = params.x, y = params.y, isEditable = params.isEditable;
			const elements = document.getElementsByClassName(props.editorClassName);

			// Note: We can't check inputFieldType here. When spellcheck is enabled,
			// params.inputFieldType is "none". When spellcheck is disabled,
			// params.inputFieldType is "plainText". Thus, such a check would be inconsistent.
			if (!elements.length || !isEditable) return false;

			const maximumMsSinceBrowserEvent = 100;
			if (Date.now() - lastInCodeMirrorContextMenuTimestamp > maximumMsSinceBrowserEvent) {
				return false;
			}

			const rect = convertToScreenCoordinates(Setting.value('windowContentZoomFactor'), elements[0].getBoundingClientRect());
			return rect.x < x && rect.y < y && rect.right > x && rect.bottom > y;
		}

		// XJ: somehow the original function signature causes complaint on bridge().window().webContents.off('context-menu', onContextMenu);
		// async function onContextMenu(event: ContextMenuEvent, params: ContextMenuParams)
		async function onContextMenu(event: any, params: any) {
			if (!pointerInsideEditor(params)) return;

			// Don't show the default menu.
			event.preventDefault();

			const menu = new Menu();

			const hasSelectedText = editorRef.current && !!editorRef.current.getSelection();

			menu.append(
				new MenuItem({
					label: _('Cut'),
					enabled: hasSelectedText ?? false,
					click: async () => {
						props.editorCutText();
					},
				}),
			);

			menu.append(
				new MenuItem({
					label: _('Copy'),
					enabled: hasSelectedText ?? false,
					click: async () => {
						props.editorCopyText();
					},
				}),
			);

			menu.append(
				new MenuItem({
					label: _('Paste'),
					enabled: true,
					click: async () => {
						props.editorPaste();
					},
				}),
			);

			const spellCheckerMenuItems = SpellCheckerService.instance().contextMenuItems(params.misspelledWord, params.dictionarySuggestions);

			for (const item of spellCheckerMenuItems) {
				menu.append(new MenuItem(item));
			}

			// CodeMirror 5 only:
			// Typically CodeMirror handles all interactions itself (highlighting etc.)
			// But in the case of clicking a mispelled word, we need electron to handle the click
			// The result is that CodeMirror doesn't know what's been selected and doesn't
			// move the cursor into the correct location.
			// and when the user selects a new spelling it will be inserted in the wrong location
			// So in this situation, we use must manually align the internal codemirror selection
			// to the contextmenu selection
			if (editorRef.current && !editorRef.current.cm6 && spellCheckerMenuItems.length > 0) {
				(editorRef.current as any).alignSelection(params);
			}

			let filterObject: EditContextMenuFilterObject = {
				items: [],
			};

			filterObject = await eventManager.filterEmit('editorContextMenu', filterObject);

			for (const item of filterObject.items) {
				menu.append(new MenuItem({
					label: item.label,
					click: async () => {
						const args = item.commandArgs || [];
						if (item.commandName) void CommandService.instance().execute(item.commandName, ...args);
					},
					type: item.type,
				}));
			}


			menuUtils.pluginContextMenuItems(props.plugins, MenuItemLocation.EditorContextMenu).forEach((item: any) => {
				menu.append(new MenuItem(item));
			});

			menu.popup();
		}

		// Prepend the event listener so that it gets called before
		// the listener that shows the default menu.
		bridge().window().webContents.prependListener('context-menu', onContextMenu);

		window.addEventListener('contextmenu', onBrowserContextMenu);

		return () => {
			if (bridge().window().webContents?.off) {
				bridge().window().webContents.off('context-menu', onContextMenu);
			}
			window.removeEventListener('contextmenu', onBrowserContextMenu);
		};
	}, [
		props.plugins, props.editorClassName, editorRef,
		props.editorCutText, props.editorCopyText, props.editorPaste,
	]);
};

export default useContextMenu;
