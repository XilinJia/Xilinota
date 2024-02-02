import { BackHandler } from 'react-native';

class BackButtonService {
	static defaultHandler_: (() => any) | null;
	static handlers_: (() => any)[];

	static initialize(defaultHandler: any) {
		this.defaultHandler_ = defaultHandler;

		const syncBack = () => {
			return !!(this.back().then((it) => { return it }));
		};
		BackHandler.addEventListener('hardwareBackPress', () => {
			return syncBack();
		});
	}

	static async back() {
		if (this.handlers_.length) {
			const r = await this.handlers_[this.handlers_.length - 1]();
			if (r) return r;
		}

		return this.defaultHandler_ ? await this.defaultHandler_() : null;
	}

	static addHandler(handler: any) {
		for (let i = this.handlers_.length - 1; i >= 0; i--) {
			const h = this.handlers_[i];
			if (h === handler) return;
		}

		return this.handlers_.push(handler);
	}

	static removeHandler(hanlder: any) {
		for (let i = this.handlers_.length - 1; i >= 0; i--) {
			const h = this.handlers_[i];
			if (h === hanlder) this.handlers_.splice(i, 1);
		}
	}
}

BackButtonService.defaultHandler_ = null;
BackButtonService.handlers_ = [];

export default BackButtonService;

// module.exports = { BackButtonService };
