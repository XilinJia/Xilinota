import shim from '../shim';
import useEventListener from './useEventListener';

interface Size {
	width: number;
	height: number;
}

function useElementSize(elementRef: any): Size {
	const { useCallback, useEffect, useState } = shim.react();

	const [size, setSize] = useState({
		width: 0,
		height: 0,
	});

	// Prevent too many rendering using useCallback
	const updateSize = useCallback(() => {
		const node = elementRef?.current;
		if (node) {
			setSize({
				width: node.offsetWidth || 0,
				height: node.offsetHeight || 0,
			});
		}
	}, [elementRef]);

	// Initial size on mount
	useEffect(() => {
		updateSize();
		
	}, []);

	useEventListener('resize', updateSize);

	return size;
}

export default useElementSize;
