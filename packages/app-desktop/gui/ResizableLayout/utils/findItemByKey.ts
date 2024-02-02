import { LayoutItem } from './types';

export default function findItemByKey(layout: LayoutItem, key: string): LayoutItem|null {
	if (!layout) throw new Error('Layout cannot be null');

	function recurseFind(item: LayoutItem): LayoutItem|null {
		if (item.key === key) return item;

		if (item.children) {
			for (const child of item.children) {
				const found = recurseFind(child);
				if (found) return found;
			}
		}
		return null;
	}

	return recurseFind(layout);
}
