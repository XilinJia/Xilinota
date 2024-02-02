import { useEffect, useRef, useState, MutableRefObject } from 'react';
import * as React from 'react';
import PdfDocument from './PdfDocument';
import Page from './Page';
import styled from 'styled-components';
import useScaledSize, { ScaledSizeParams } from './hooks/useScaledSize';
import useScrollSaver, { ScrollSaver } from './hooks/useScrollSaver';


const PagesHolder = styled.div<{ pageGap: number }>`
	display: flex;
	justify-content: center;
	align-items: center;
	flex-flow: column;
	min-width: 100%;
	width: fit-content;
	min-height: fit-content;
	row-gap: ${(props)=> props.pageGap || 2}px;
`;

export interface VerticalPagesProps {
	pdfDocument: PdfDocument;
	isDarkTheme: boolean;
	anchorPage?: number;
	rememberScroll: boolean;
	pdfId?: string;
	zoom: number;
	container: MutableRefObject<HTMLElement>;
	pageGap: number;
	widthPercent?: number;
	showPageNumbers: boolean;
	selectedPage?: number;
	textSelectable: boolean;
	onTextSelect?: (text: string)=> void;
	onPageClick?: (page: number)=> void;
	onActivePageChange?: (page: number)=> void;
	onDoubleClick?: (page: number)=> void;
}

export default function VerticalPages(props: VerticalPagesProps) {
	const [containerWidth, setContainerWidth] = useState<number>(0);
	const innerContainerEl = useRef<HTMLDivElement>(document.createElement('div'));

	const scaledSize = useScaledSize({
		pdfDocument: props.pdfDocument,
		pdfId: props.pdfId,
		containerWidth,
		rememberScroll: props.rememberScroll,
		anchorPage: props.anchorPage,
		container: props.container,
		innerContainerEl,
		pageGap: props.pageGap,
		zoom: props.zoom,
	} as ScaledSizeParams);

	useScrollSaver({
		container: props.container,
		scaledSize,
		pdfId: props.pdfId,
		rememberScroll: props.rememberScroll,
		pdfDocument: props.pdfDocument,
		pageGap: props.pageGap,
		onActivePageChange: props.onActivePageChange,
	} as ScrollSaver);

	useEffect(() => {
		let resizeTimer: number = 0;
		let cancelled = false;

		const updateWidth = () => {
			if (cancelled) return;
			const factor = (props.widthPercent || 100) / 100;
			setContainerWidth(props.container.current.clientWidth * factor);
		};

		const onResize = () => {
			if (resizeTimer) {
				clearTimeout(resizeTimer);
				resizeTimer = 0;
			}
			resizeTimer = window.setTimeout(updateWidth, 200);
		};

		updateWidth();
		window.addEventListener('resize', onResize);

		return () => {
			cancelled = true;
			window.removeEventListener('resize', onResize);
			if (resizeTimer) {
				clearTimeout(resizeTimer);
				resizeTimer = 0;
			}
		};
	}, [props.container, props.pdfDocument, props.widthPercent]);

	return (<PagesHolder pageGap={props.pageGap || 2} ref={innerContainerEl} >
		{scaledSize ?
			Array.from(Array(props.pdfDocument.pageCount).keys()).map((i: number) => {
				// setting focusOnLoad only after scaledSize is set so that the container height is set correctly
				return <Page pdfDocument={props.pdfDocument} pageNo={i + 1} focusOnLoad={!!scaledSize && !!props.anchorPage && props.anchorPage === i + 1}
					isAnchored={!!props.anchorPage && props.anchorPage === i + 1}
					showPageNumbers={props.showPageNumbers}
					isSelected={!!scaledSize && !!props.selectedPage && props.selectedPage === i + 1}
					onClick={props.onPageClick}
					textSelectable={props.textSelectable}
					onTextSelect={props.onTextSelect}
					onDoubleClick={props.onDoubleClick}
					isDarkTheme={props.isDarkTheme} scaledSize={scaledSize} container={props.container} key={i} />;
			},
			) : ''
		}
	</PagesHolder>);
}
