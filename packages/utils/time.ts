export const msleep = (ms: number) => {
	return new Promise(resolve => setTimeout(resolve, ms));
};

// Use the utility functions below to easily measure performance of a block or
// line of code.
interface PerfTimer {
	name: string;
	startTime: number;
}

const perfTimers_: PerfTimer[] = [];

export function timerPush(name: string): void {
	perfTimers_.push({ name, startTime: Date.now() });
}

export function timerPop(): void {
	const t = perfTimers_.pop() as PerfTimer;

	console.info(`Time: ${t.name}: ${Date.now() - t.startTime}`);
}
