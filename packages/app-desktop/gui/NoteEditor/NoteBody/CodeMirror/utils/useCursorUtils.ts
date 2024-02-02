// seeme not used?

import markdownUtils from '@xilinota/lib/markdownUtils';
import Setting from '@xilinota/lib/models/Setting';

export function modifyListLines(lines: string[], num: number, listSymbol: string) {
	const isNotNumbered = num === 1;
	for (let j = 0; j < lines.length; j++) {
		const line = lines[j];
		if (!line && j === lines.length - 1) continue;
		// Only add the list token if it's not already there
		// if it is, remove it
		if (num) {
			const lineNum = markdownUtils.olLineNumber(line);
			if (!lineNum && isNotNumbered) {
				lines[j] = `${num.toString()}. ${line}`;
				num++;
			} else {
				const listToken = markdownUtils.extractListToken(line);
				lines[j] = line.substring(listToken.length, line.length - listToken.length);
			}
		} else {
			if (!line.startsWith(listSymbol)) {
				lines[j] = listSymbol + line;
			} else {
				lines[j] = line.substring(listSymbol.length, line.length - listSymbol.length);
			}
		}
	}
	return lines;
}
// Helper functions that use the cursor
export default function useCursorUtils(this: any, CodeMirror: any) {
	const self = this;

	CodeMirror.defineExtension('insertAtCursor', function(text: string) {
		// This is also the method to get all cursors
		const ranges = self.listSelections();
		// Batches the insert operations, if this wasn't done the inserts
		// could potentially overwrite one another
		self.operation(() => {
			for (let i = 0; i < ranges.length; i++) {
				// anchor is where the selection starts, and head is where it ends
				// this changes based on how the uses makes a selection
				const { anchor, head } = ranges[i];
				// We want the selection that comes first in the document
				let range = anchor;
				if (head.line < anchor.line || (head.line === anchor.line && head.ch < anchor.ch)) {
					range = head;
				}
				self.replaceRange(text, range);
			}
		});
	});

	CodeMirror.defineExtension('getCurrentLine', function() {
		const curs = self.getCursor('anchor');

		return self.getLine(curs.line);
	});

	CodeMirror.defineExtension('getPreviousLine', function() {
		const curs = self.getCursor('anchor');

		if (curs.line > 0) { return self.getLine(curs.line - 1); }
		return '';
	});

	// this updates the body in a way that registers with the undo/redo
	CodeMirror.defineExtension('updateBody', function(newBody: string) {
		const start = { line: self.firstLine(), ch: 0 };
		const last = self.getLine(self.lastLine());
		const end = { line: self.lastLine(), ch: last ? last.length : 0 };

		self.replaceRange(newBody, start, end);
	});

	CodeMirror.defineExtension('wrapSelections', function(string1: string, string2: string) {
		const selectedStrings = self.getSelections();

		// Batches the insert operations, if this wasn't done the inserts
		// could potentially overwrite one another
		self.operation(() => {
			for (let i = 0; i < selectedStrings.length; i++) {
				const selected = selectedStrings[i];

				// Remove white space on either side of selection
				const start = selected.search(/[^\s]/);
				const end = selected.search(/[^\s](?=[\s]*$)/);
				const core = selected.substring(start, end - start + 1);

				// If selection can be toggled do that
				if (core.startsWith(string1) && core.endsWith(string2)) {
					const inside = core.substring(string1.length, core.length - string1.length - string2.length);
					selectedStrings[i] = selected.substring(0, start) + inside + selected.substring(end + 1);
				} else {
					selectedStrings[i] = selected.substring(0, start) + string1 + core + string2 + selected.substring(end + 1);
				}
			}
			self.replaceSelections(selectedStrings, 'around');
		});
	});

	CodeMirror.defineExtension('wrapSelectionsByLine', function(string1: string) {
		const selectedStrings = self.getSelections();

		// Batches the insert operations, if this wasn't done the inserts
		// could potentially overwrite one another
		self.operation(() => {
			for (let i = 0; i < selectedStrings.length; i++) {
				const selected = selectedStrings[i];

				const num = markdownUtils.olLineNumber(string1);

				const lines = selected.split(/\r?\n/);
				//  Save the newline character to restore it later
				const newLines = selected.match(/\r?\n/);
				modifyListLines(lines, num, string1);
				const newLine = newLines ? newLines[0] : '\n';
				selectedStrings[i] = lines.join(newLine);
			}
			self.replaceSelections(selectedStrings, 'around');
		});
	});

	// params are the oncontextmenu params
	CodeMirror.defineExtension('alignSelection', function(params: any) {
		// The below is a HACK that uses the selectionText from electron and the coordinates of
		// the click to determine what the codemirror selection should be
		const alignStrings = (s1: string, s2: string) => {
			for (let i = 0; i < s1.length; i++) {
				if (s1.substring(i, s2.length) === s2) { return i; }
			}
			return -1;
		};

		// CodeMirror coordsChar doesn't properly scale values when zoomed
		// we need to manually apply the zoom
		const zoomFactor = Setting.value('windowContentZoomFactor') / 100;

		const selectionText = params.selectionText;
		const coords = self.coordsChar({ left: params.x / zoomFactor, top: params.y / zoomFactor });
		const { anchor, head } = self.findWordAt(coords);
		const selectedWord = self.getRange(anchor, head);

		if (selectionText.length > selectedWord.length) {
			const offset = alignStrings(selectionText, selectedWord);
			anchor.ch -= offset;
			head.ch = anchor.ch + selectionText.length;
		} else if (selectionText.length < selectedWord.length) {
			const offset = alignStrings(selectedWord, selectionText);
			anchor.ch += offset;
			head.ch = anchor.ch + selectionText.length;
		}

		self.setSelection(anchor, head);
	});

	//
	//  START of HACK to support contenteditable
	//

	// This is a HACK to enforce proper cursor positioning when using
	// codemirror in contenteditable mode
	// The problem is that chrome collapses trailing whitespace (for wrapped lines)
	// so when codemirror places the cursor after the trailing whitespace, chrome will
	// register that as being the start of the following line.
	//
	// An alternative fix for this would be to disable codemirror handling of Left/Right and Home/End
	// but that breaks multicursor support in codemirror.
	CodeMirror.defineExtension('isAfterTrailingWhitespace', function() {
		const { line, ch } = self.getCursor('head');
		const beforeCursor = self.charCoords({ line: line, ch: ch - 1 });
		const afterCursor = self.charCoords({ line: line, ch: ch });

		const currentLine = self.getLine(line);

		return beforeCursor.top < afterCursor.top && !!currentLine[ch - 1].match(/\s/);
	});

	CodeMirror.commands.goLineRightSmart = function(cm: any) {
		// Only apply the manual cursor adjustments for contenteditable mode
		if (cm.options.inputStyle !== 'contenteditable') {
			cm.execCommand('goLineRight');
			return;
		}

		// This detects the condition where the cursor is visibly placed at the beginning of
		// the current line, but codemirror treats it like it was on the end of the
		// previous line.
		// The fix is to step forward twice, then re-initiate goLineRight
		if (cm.isAfterTrailingWhitespace()) {
			cm.execCommand('goColumnRight');
			cm.execCommand('goColumnRight');
			cm.execCommand('goLineRightSmart');
			return;
		}

		cm.execCommand('goLineRight');

		// This detects the situation where the cursor moves to the end of a wrapped line
		// and is placed after a whitespace character.
		// In this situation we step the curso back once to put it on the correct line.
		if (cm.isAfterTrailingWhitespace()) {
			cm.execCommand('goCharLeft');
		}
	};

	CodeMirror.commands.goLineUpSmart = function(cm: any) {
		if (cm.options.inputStyle !== 'contenteditable') {
			cm.execCommand('goLineUp');
			return;
		}

		// In this situation the codemirror editor thinks it's a line above where it is.
		if (cm.isAfterTrailingWhitespace()) {
			cm.execCommand('goCharLeft');
			cm.execCommand('goLineLeft');
		} else {
			cm.execCommand('goLineUp');
		}
	};

	CodeMirror.commands.goLineDownSmart = function(cm: any) {
		if (cm.options.inputStyle !== 'contenteditable') {
			cm.execCommand('goLineDown');
			return;
		}

		// In this situation the codemirror editor thinks it's a line above where it is.
		if (cm.isAfterTrailingWhitespace()) {
			cm.execCommand('goLineRightSmart');
			cm.execCommand('goCharRight');
		} else {
			cm.execCommand('goLineDown');
		}
	};

	//
	//  END of HACK to support contenteditable
	//
}
