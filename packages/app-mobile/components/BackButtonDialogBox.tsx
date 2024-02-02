import BackButtonService from '../services/back-button';

// react-native-dialogbox appears a JS package, no types for import
const DialogBox = require('react-native-dialogbox').default;

export default class BackButtonDialogBox extends DialogBox {
	backHandler_: () => boolean;

	public constructor(props: any) {
		super(props);

		this.backHandler_ = () => {
			if (this.state.isVisible) {
				this.close();
				return true;
			}
			return false;
		};
	}

	public async componentDidUpdate(): Promise<void> {
		if (this.state.isVisible) {
			BackButtonService.addHandler(this.backHandler_);
		} else {
			BackButtonService.removeHandler(this.backHandler_);
		}
	}
}
