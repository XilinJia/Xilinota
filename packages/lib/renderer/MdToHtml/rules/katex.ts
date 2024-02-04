import { RuleOptions } from '../../MdToHtml';

let katex = require('katex');
import md5 from 'md5';
const mhchemModule = require('./katex_mhchem.js');

// Katex macros include circular references so we need
// to serialize them with json-stringify-safe
const stringifySafe = require('json-stringify-safe');

function stringifyKatexOptions(options: any) {
	if (!options) return '';

	const newOptions = { ...options };

	// The Katex macro structure is extremely verbose and slow to cache,
	// so we need bespoke code to serialize it.

	// macros:
	//     \hb: {tokens: Array(1), numArgs: 0}
	//     \d: {tokens: Array(7), numArgs: 1}
	//     \e:
	//         tokens: Array(11)
	//             0: Token {text: "}", loc: SourceLocation, noexpand: undefined, treatAsRelax: undefined}
	//             1: Token {text: "1", loc: SourceLocation, noexpand: undefined, treatAsRelax: undefined}
	//             2: Token {text: "#", loc: SourceLocation, noexpand: undefined, treatAsRelax: undefined}
	//             3: Token {text: "{", loc: SourceLocation, noexpand: undefined, treatAsRelax: undefined}
	//             4: Token {text: "^", loc: SourceLocation, noexpand: undefined, treatAsRelax: undefined}
	//             5: Token {text: "}", loc: SourceLocation, noexpand: undefined, treatAsRelax: undefined}
	//             6: Token {text: "e", loc: SourceLocation, noexpand: undefined, treatAsRelax: undefined}
	//             7: Token {text: " ", loc: SourceLocation, noexpand: undefined, treatAsRelax: undefined}
	//             8: Token {text: "m", loc: SourceLocation, noexpand: undefined, treatAsRelax: undefined}
	//             9: Token {text: " ", loc: SourceLocation, noexpand: undefined, treatAsRelax: undefined}
	//             10: Token {text: "{", loc: SourceLocation, noexpand: undefined, treatAsRelax: undefined}
	//         numArgs: 1
	//     \dv: {tokens: Array(15), numArgs: 2}
	//     \ddv: {tokens: Array(19), numArgs: 2}
	//     \pdv: {tokens: Array(15), numArgs: 2}
	//     \pddv: {tokens: Array(15), numArgs: 2}
	//     \abs: {tokens: Array(10), numArgs: 1}
	//     \inflim: {tokens: Array(10), numArgs: 0}
	//     \infint: {tokens: Array(2), numArgs: 0}
	//     \prob: {tokens: Array(12), numArgs: 1}
	//     \expval: {tokens: Array(14), numArgs: 2}
	//     \wf: {tokens: Array(6), numArgs: 0}

	if (options.macros) {
		const toSerialize: any = {};
		for (const k of Object.keys(options.macros)) {
			const macroText: string[] = options.macros[k].tokens.map((t: any) => t.text);
			toSerialize[k] = `${macroText.join('')}_${options.macros[k].numArgs}`;
		}
		newOptions.macros = toSerialize;
	}

	return stringifySafe(newOptions);
}

katex = mhchemModule(katex);

function katexStyle() {
	return [
		{ name: 'katex.css' },
		// Note: Declaring the fonts is not needed for in-app rendering because
		// they will be loaded automatically from katex.css.
		// However they must be specified for exporting notes to HTML and PDF,
		// so that they can be bundled with the other assets.
		{ name: 'fonts/KaTeX_AMS-Regular.woff2' },
		{ name: 'fonts/KaTeX_Caligraphic-Bold.woff2' },
		{ name: 'fonts/KaTeX_Caligraphic-Regular.woff2' },
		{ name: 'fonts/KaTeX_Fraktur-Bold.woff2' },
		{ name: 'fonts/KaTeX_Fraktur-Regular.woff2' },
		{ name: 'fonts/KaTeX_Main-Bold.woff2' },
		{ name: 'fonts/KaTeX_Main-BoldItalic.woff2' },
		{ name: 'fonts/KaTeX_Main-Italic.woff2' },
		{ name: 'fonts/KaTeX_Main-Regular.woff2' },
		{ name: 'fonts/KaTeX_Math-BoldItalic.woff2' },
		{ name: 'fonts/KaTeX_Math-Italic.woff2' },
		{ name: 'fonts/KaTeX_SansSerif-Bold.woff2' },
		{ name: 'fonts/KaTeX_SansSerif-Italic.woff2' },
		{ name: 'fonts/KaTeX_SansSerif-Regular.woff2' },
		{ name: 'fonts/KaTeX_Script-Regular.woff2' },
		{ name: 'fonts/KaTeX_Size1-Regular.woff2' },
		{ name: 'fonts/KaTeX_Size2-Regular.woff2' },
		{ name: 'fonts/KaTeX_Size3-Regular.woff2' },
		{ name: 'fonts/KaTeX_Size4-Regular.woff2' },
		{ name: 'fonts/KaTeX_Typewriter-Regular.woff2' },
	];
}

// Test if potential opening or closing delimieter
// Assumes that there is a "$" at state.src[pos]
function isValidDelim(state: any, pos: number) {
	const max = state.posMax;

	let can_open = true,
		can_close = true;

	const prevChar = pos > 0 ? state.src.charCodeAt(pos - 1) : -1;
	const nextChar = pos + 1 <= max ? state.src.charCodeAt(pos + 1) : -1;

	// Check non-whitespace conditions for opening and closing, and
	// check that closing delimeter isn't followed by a number
	if (prevChar === 0x20 /* " " */ || prevChar === 0x09 /* \t */ || (nextChar >= 0x30 /* "0" */ && nextChar <= 0x39) /* "9" */) {
		can_close = false;
	}
	if (nextChar === 0x20 /* " " */ || nextChar === 0x09 /* \t */) {
		can_open = false;
	}

	return {
		can_open: can_open,
		can_close: can_close,
	};
}

function math_inline(state: any, silent: boolean) {
	let match, token, res, pos;

	if (state.src[state.pos] !== '$') {
		return false;
	}

	res = isValidDelim(state, state.pos);
	if (!res.can_open) {
		if (!silent) {
			state.pending += '$';
		}
		state.pos += 1;
		return true;
	}

	// First check for and bypass all properly escaped delimieters
	// This loop will assume that the first leading backtick can not
	// be the first character in state.src, which is known since
	// we have found an opening delimieter already.
	const start = state.pos + 1;
	match = start;
	while ((match = state.src.indexOf('$', match)) !== -1) {
		// Found potential $, look for escapes, pos will point to
		// first non escape when complete
		pos = match - 1;
		while (state.src[pos] === '\\') {
			pos -= 1;
		}

		// Even number of escapes, potential closing delimiter found
		if ((match - pos) % 2 === 1) {
			break;
		}
		match += 1;
	}

	// No closing delimter found.  Consume $ and continue.
	if (match === -1) {
		if (!silent) {
			state.pending += '$';
		}
		state.pos = start;
		return true;
	}

	// Check if we have empty content, ie: $$.  Do not parse.
	if (match - start === 0) {
		if (!silent) {
			state.pending += '$$';
		}
		state.pos = start + 1;
		return true;
	}

	// Check for valid closing delimiter
	res = isValidDelim(state, match);
	if (!res.can_close) {
		if (!silent) {
			state.pending += '$';
		}
		state.pos = start;
		return true;
	}

	if (!silent) {
		token = state.push('math_inline', 'math', 0);
		token.markup = '$';
		token.content = state.src.slice(start, match);
	}

	state.pos = match + 1;
	return true;
}

function math_block(state: any, start: number, end: number, silent: boolean) {
	let firstLine,
		lastLine,
		next,
		lastPos,
		found = false,
		pos = state.bMarks[start] + state.tShift[start],
		max = state.eMarks[start];

	if (pos + 2 > max) {
		return false;
	}
	if (state.src.slice(pos, pos + 2) !== '$$') {
		return false;
	}

	pos += 2;
	firstLine = state.src.slice(pos, max);

	if (silent) {
		return true;
	}
	if (firstLine.trim().slice(-2) === '$$') {
		// Single line expression
		firstLine = firstLine.trim().slice(0, -2);
		found = true;
	}

	for (next = start; !found;) {
		next++;

		if (next >= end) {
			break;
		}

		pos = state.bMarks[next] + state.tShift[next];
		max = state.eMarks[next];

		if (pos < max && state.tShift[next] < state.blkIndent) {
			// non-empty line with negative indent should stop the list:
			break;
		}

		if (
			state.src
				.slice(pos, max)
				.trim()
				.slice(-2) === '$$'
		) {
			lastPos = state.src.slice(0, max).lastIndexOf('$$');
			lastLine = state.src.slice(pos, lastPos);
			found = true;
		}
	}

	state.line = next + 1;

	const contentLines = [];
	if (firstLine && firstLine.trim()) {
		contentLines.push(firstLine);
	}

	const includeTrailingNewline = false;
	const interiorLines = state.getLines(start + 1, next, state.tShift[start], includeTrailingNewline);
	if (interiorLines.length > 0) {
		contentLines.push(interiorLines);
	}

	if (lastLine && lastLine.trim()) {
		contentLines.push(lastLine);
	}

	const token = state.push('math_block', 'math', 0);
	token.block = true;
	token.content = contentLines.join('\n');
	token.map = [start, state.line];
	token.markup = '$$';
	return true;
}

const cache_: any = {};

function renderToStringWithCache(latex: string, katexOptions: any) {
	const cacheKey = md5(escape(latex) + escape(stringifyKatexOptions(katexOptions)));
	if (cacheKey in cache_) {
		return cache_[cacheKey];
	} else {
		const beforeMacros = stringifyKatexOptions(katexOptions.macros);
		const output = katex.renderToString(latex, katexOptions);
		const afterMacros = stringifyKatexOptions(katexOptions.macros);

		// Don't cache the formulas that add macros, otherwise
		// they won't be added on second run.
		if (beforeMacros === afterMacros) cache_[cacheKey] = output;
		return output;
	}
}

function renderKatexError(latex: string, error: any): string {
	console.error('Katex error for:', latex, error);
	return `<div class="inline-code">${error.message}</div>`;
}

export default {
	plugin: function(markdownIt: any, options: RuleOptions) {
		// Keep macros that persist across Katex blocks to allow defining a macro
		// in one block and re-using it later in other blocks.
		// https://github.com/XilinJia/Xilinota/issues/1105
		if (!options.context.userData.__katex) options.context.userData.__katex = { macros: {} };

		const katexOptions: any = {};
		katexOptions.macros = options.context.userData.__katex.macros;
		katexOptions.trust = true;

		// set KaTeX as the renderer for markdown-it-simplemath
		const katexInline = function(latex: string) {
			katexOptions.displayMode = false;
			let outputHtml = '';
			try {
				outputHtml = renderToStringWithCache(latex, katexOptions);
			} catch (error) {
				outputHtml = renderKatexError(latex, error);
			}
			return `<span class="xilinota-editable"><span class="xilinota-source" data-xilinota-language="katex" data-xilinota-source-open="$" data-xilinota-source-close="$">${markdownIt.utils.escapeHtml(latex)}</span>${outputHtml}</span>`;
		};

		const inlineRenderer = function(tokens: any[], idx: number) {
			return katexInline(tokens[idx].content);
		};

		const katexBlock = function(latex: string) {
			katexOptions.displayMode = true;
			let outputHtml = '';
			try {
				outputHtml = renderToStringWithCache(latex, katexOptions);
			} catch (error) {
				outputHtml = renderKatexError(latex, error);
			}

			return `<div class="xilinota-editable"><pre class="xilinota-source" data-xilinota-language="katex" data-xilinota-source-open="$$&#10;" data-xilinota-source-close="&#10;$$&#10;">${markdownIt.utils.escapeHtml(latex)}</pre>${outputHtml}</div>`;
		};

		const blockRenderer = function(tokens: any[], idx: number) {
			return `${katexBlock(tokens[idx].content)}\n`;
		};

		markdownIt.inline.ruler.after('escape', 'math_inline', math_inline);
		markdownIt.block.ruler.after('blockquote', 'math_block', math_block, {
			alt: ['paragraph', 'reference', 'blockquote', 'list'],
		});
		markdownIt.renderer.rules.math_inline = inlineRenderer;
		markdownIt.renderer.rules.math_block = blockRenderer;
	},

	assets: katexStyle,
};
