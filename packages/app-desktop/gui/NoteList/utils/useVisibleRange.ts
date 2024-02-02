import { Size } from '@xilinota/utils/types';
import { useMemo } from 'react';

const useVisibleRange = (itemsPerLine: number, scrollTop: number, listSize: Size, itemSize: Size, noteCount: number) => {
	const startLineIndexFloat = useMemo(() => {
		return scrollTop / (itemSize.height??50);
	}, [scrollTop, itemSize.height]);

	const endLineIndexFloat = useMemo(() => {
		return startLineIndexFloat + (listSize.height??50 / (itemSize.height??50));
	}, [startLineIndexFloat, listSize.height, itemSize.height]);

	const startLineIndex = useMemo(() => {
		return Math.floor(startLineIndexFloat);
	}, [startLineIndexFloat]);

	const endLineIndex = useMemo(() => {
		return Math.floor(endLineIndexFloat);
	}, [endLineIndexFloat]);

	const visibleLineCount = useMemo(() => {
		return endLineIndex - startLineIndex + 1;
	}, [endLineIndex, startLineIndex]);

	const visibleItemCount = useMemo(() => {
		return visibleLineCount * itemsPerLine;
	}, [visibleLineCount, itemsPerLine]);

	const startNoteIndex = useMemo(() => {
		return itemsPerLine * startLineIndex;
	}, [itemsPerLine, startLineIndex]);

	const endNoteIndex = useMemo(() => {
		let output = (endLineIndex + 1) * itemsPerLine - 1;
		if (output >= noteCount) output = noteCount - 1;
		return output;
	}, [endLineIndex, itemsPerLine, noteCount]);

	const totalLineCount = useMemo(() => {
		return Math.ceil(noteCount / itemsPerLine);
	}, [noteCount, itemsPerLine]);

	// console.info('itemsPerLine', itemsPerLine);
	// console.info('startLineIndexFloat', startLineIndexFloat);
	// console.info('endLineIndexFloat', endLineIndexFloat);
	// console.info('visibleLineCount', visibleLineCount);
	// console.info('startNoteIndex', startNoteIndex);
	// console.info('endNoteIndex', endNoteIndex);
	// console.info('startLineIndex', startLineIndex);
	// console.info('endLineIndex', endLineIndex);
	// console.info('totalLineCount', totalLineCount);
	// console.info('visibleItemCount', visibleItemCount);

	return [startNoteIndex, endNoteIndex, startLineIndex, endLineIndex, totalLineCount, visibleItemCount];
};

export default useVisibleRange;
