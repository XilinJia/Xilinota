import { useRef, useState, MutableRefObject } from 'react';
import useAsyncEffect, { AsyncEffectEvent } from '@xilinota/lib/hooks/useAsyncEffect';
import PdfDocument from '../PdfDocument';
import { ScaledSize } from '../types';

export interface ScaledSizeParams {
	pdfDocument: PdfDocument;
	pdfId: string;
	containerWidth: number;
	rememberScroll: boolean;
	anchorPage: number;
	container: MutableRefObject<HTMLElement>;
	innerContainerEl: MutableRefObject<HTMLElement>;
	pageGap: number;
	zoom: number;
}

const useScaledSize = ({ pdfDocument, pdfId, containerWidth, rememberScroll, anchorPage, container, innerContainerEl, pageGap, zoom }: ScaledSizeParams) => {
	const [scaledSize, setScaledSize] = useState<ScaledSize>();
	const currentScaleSize = useRef(scaledSize);

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		if (!pdfDocument || !containerWidth) return;
		// console.log('scaledSize calculation triggered');
		const effectiveWidth = Math.min(containerWidth - 20, 900) * (zoom || 1);
		const scaledSize_ = await pdfDocument.getScaledSize(0, effectiveWidth);
		if (event.cancelled) return;

		const oldScaleSize = currentScaleSize.current;
		const oldScrollTop = container.current.scrollTop;

		innerContainerEl.current.style.height = `${(scaledSize_.height + pageGap) * pdfDocument.pageCount}px`;

		// Adjust scroll position after window resize to keep the same page visible
		if (oldScaleSize && container.current) {
			container.current.scrollTop = oldScrollTop * (scaledSize_.scale / oldScaleSize.scale);
		}

		currentScaleSize.current = scaledSize_;
		setScaledSize(scaledSize_);

		// If loading after note rerender, try to retirive the old scroll position
		if (rememberScroll && pdfId && !oldScaleSize && !anchorPage) {
			const scrollOffset = parseInt(sessionStorage.getItem(`pdf.${pdfId}.scrollTop`)??'', 10);
			if (scrollOffset) {
				// Adjusting it according to the new scale
				container.current.scrollTop = scrollOffset * scaledSize_.scale;
				// console.log('scroll set',container.current.scrollTop);
			}
		}
	}, [pdfDocument, pdfId, rememberScroll, anchorPage, containerWidth, zoom]);

	return scaledSize;
};

export default useScaledSize;
