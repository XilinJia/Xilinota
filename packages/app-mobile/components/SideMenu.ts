import { connect } from 'react-redux';
import SideMenu_ from '@rexovolt/react-native-side-menu';
// import { Dimensions } from 'react-native';
import { State } from '@xilinota/lib/reducer';

class SideMenuComponent extends SideMenu_ {

	public onLayoutChange(e: { nativeEvent: { layout: { width: number; height: number; }; }; }): void {
		const { width, height } = e.nativeEvent.layout;
		// const openMenuOffsetPercentage = this.props.openMenuOffset ?? 0 / Dimensions.get('window').width;
		const openMenuOffset = width * 0.67;
		// console.log('onLayoutChange:', this.props.openMenuOffset, width)
		// const openMenuOffset = width * 0.4;
		const hiddenMenuOffset = width * this.state.hiddenMenuOffsetPercentage;
		// const hiddenMenuOffset = width * 0.1;
		this.setState({ width, height, openMenuOffset, hiddenMenuOffset });
	}
}

const SideMenu = connect((state: State) => {
	return {
		isOpen: state.showSideMenu,
		overlayOpacity: 1,
		animateOverlayOpacity: true,
	};
})(SideMenuComponent);

export default SideMenu;
