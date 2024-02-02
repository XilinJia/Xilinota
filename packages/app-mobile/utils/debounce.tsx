import PoorManIntervals from '@xilinota/lib/PoorManIntervals';

// function debounce(func: (...args: any[])=> void, timeout: number) {
// 	let timer: number;
// 	// const self: any = this;

// 	return (...args: any[]) => {
// 		PoorManIntervals.clearTimeout(timer);
// 		timer = PoorManIntervals.setTimeout(() => { func.apply(this, args); }.bind(this), timeout);
// 	};
// }

const debounce = (func: (...args: any[]) => void, timeout: number) => {
	let timer: number;
	// const self: any = this;

	return (...args: any[]) => {
		PoorManIntervals.clearTimeout(timer);
		timer = PoorManIntervals.setTimeout(() => { func.apply(this, args); }, timeout);
	};
};

export default debounce;
