import shim from '../shim';
const { useEffect, useRef } = shim.react();

function useEventListener(eventName: string, handler: any, element?: any,): void {
	// const { useEffect, useRef } = shim.react();

	// Create a ref that stores handler
	const savedHandler = useRef<any>();

	useEffect(() => {
		// Define the listening target
		const targetElement = element?.current || window;
		if (!(targetElement && targetElement.addEventListener)) {
			return () => { };
		}

		// Update saved handler if necessary
		if (savedHandler.current !== handler) {
			savedHandler.current = handler;
		}

		// Create event listener that calls handler function stored in ref
		const eventListener = (event: Event) => {
			if (!!savedHandler?.current) {
				savedHandler.current(event);
			}
		};

		targetElement.addEventListener(eventName, eventListener);

		// Remove event listener on cleanup
		return () => {
			targetElement.removeEventListener(eventName, eventListener);
		};
	}, [eventName, element, handler]);
}

export default useEventListener;
