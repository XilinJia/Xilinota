// Helper functions to sync up scrolling
export default function useScrollUtils(this: any, CodeMirror: any) {
	
	CodeMirror.defineExtension('getScrollPercent', () => {
		const info = this.getScrollInfo();
		return info.top / (info.height - info.clientHeight);
	});

	CodeMirror.defineExtension('setScrollPercent', (p: number) => {
		const info = this.getScrollInfo();
		this.scrollTo(null, p * (info.height - info.clientHeight));
	});
}
