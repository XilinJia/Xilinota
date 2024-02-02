import { useState } from 'react';
import useAsyncEffect, { AsyncEffectEvent } from '@xilinota/lib/hooks/useAsyncEffect';
import PdfDocument from '../PdfDocument';


const usePdfDocument = (pdfPath: string) => {
	const [pdfDocument, setPdfDocument] = useState<PdfDocument>();

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		const pdfData = new PdfDocument(document);
		await pdfData.loadDoc(pdfPath);
		if (event.cancelled) return;
		setPdfDocument(pdfData);
	}, [pdfPath]);

	return pdfDocument;
};

export default usePdfDocument;
