import { useState } from 'react';
import useAsyncEffect from '@xilinota/lib/hooks/useAsyncEffect';
import { waitForElement } from '@xilinota/lib/dom';

const useRootElement = (elementId: string) => {
	const [rootElement, setRootElement] = useState<HTMLDivElement>(null);

	useAsyncEffect(async (event) => {
		const element = await waitForElement(document, elementId);
		if (event.cancelled) return;
		setRootElement(element);
	}, [document, elementId]);

	return rootElement;
};

export default useRootElement;
