import * as React from 'react';

interface Props {
	style: any;
	itemHeight: number;
	items: any[];
	disabled?: boolean;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onKeyDown?: Function;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	itemRenderer: Function;
	className?: string;
	// eslint-disable-next-line @typescript-eslint/ban-types -- Old code before rule was applied
	onNoteDrop?: Function;
}

interface State {
	topItemIndex: number;
	bottomItemIndex: number;
}

class ItemList extends React.Component<Props, State> {

	private scrollTop_: number;
	private listRef: any;

	public constructor(props: Props) {
		super(props);

		this.scrollTop_ = 0;

		this.listRef = React.createRef();

		this.onScroll = this.onScroll.bind(this);
		this.onKeyDown = this.onKeyDown.bind(this);
		this.onDrop = this.onDrop.bind(this);
	}

	public visibleItemCount(props: Props = undefined) {
		if (typeof props === 'undefined') props = this.props;
		return Math.ceil(props.style.height / props.itemHeight);
	}

	public updateStateItemIndexes(props: Props = undefined) {
		if (typeof props === 'undefined') props = this.props;

		const topItemIndex = Math.floor(this.scrollTop_ / props.itemHeight);
		const visibleItemCount = this.visibleItemCount(props);

		let bottomItemIndex = topItemIndex + (visibleItemCount - 1);
		if (bottomItemIndex >= props.items.length) bottomItemIndex = props.items.length - 1;

		this.setState({
			topItemIndex: topItemIndex,
			bottomItemIndex: bottomItemIndex,
		});
	}

	public offsetTop() {
		return this.listRef.current ? this.listRef.current.offsetTop : 0;
	}

	public offsetScroll() {
		return this.scrollTop_;
	}

	public UNSAFE_componentWillMount() {
		this.updateStateItemIndexes();
	}

	public UNSAFE_componentWillReceiveProps(newProps: Props) {
		this.updateStateItemIndexes(newProps);
	}

	public onScroll(event: any) {
		this.scrollTop_ = event.target.scrollTop;
		this.updateStateItemIndexes();
	}

	public onKeyDown(event: any) {
		if (this.props.onKeyDown) this.props.onKeyDown(event);
	}

	public onDrop(event: any) {
		if (this.props.onNoteDrop) this.props.onNoteDrop(event);
	}

	public makeItemIndexVisible(itemIndex: number) {
		const top = Math.min(this.props.items.length - 1, this.state.topItemIndex);
		const bottom = Math.max(0, this.state.bottomItemIndex);

		if (itemIndex >= top && itemIndex <= bottom) return;

		let scrollTop = 0;
		if (itemIndex < top) {
			scrollTop = this.props.itemHeight * itemIndex;
		} else {
			scrollTop = this.props.itemHeight * itemIndex - (this.visibleItemCount() - 1) * this.props.itemHeight;
		}

		if (scrollTop < 0) scrollTop = 0;

		this.scrollTop_ = scrollTop;
		this.listRef.current.scrollTop = scrollTop;

		this.updateStateItemIndexes();
	}

	// shouldComponentUpdate(nextProps, nextState) {
	// 	for (const n in this.props) {
	// 		if (this.props[n] !== nextProps[n]) {
	// 			console.info('Props', n, nextProps[n]);
	// 		}
	// 	}

	// 	for (const n in this.state) {
	// 		if (this.state[n] !== nextState[n]) {
	// 			console.info('State', n, nextState[n]);
	// 		}
	// 	}

	// 	return true;
	// }

	public render() {
		const items = this.props.items;
		const style = { ...this.props.style, overflowX: 'hidden',
			overflowY: 'auto' };

		// if (this.props.disabled) style.opacity = 0.5;

		if (!this.props.itemHeight) throw new Error('itemHeight is required');

		const blankItem = function(key: string, height: number) {
			return <div key={key} style={{ height: height }}></div>;
		};

		const itemComps = [blankItem('top', this.state.topItemIndex * this.props.itemHeight)];

		for (let i = this.state.topItemIndex; i <= this.state.bottomItemIndex; i++) {
			const itemComp = this.props.itemRenderer(items[i], i);
			itemComps.push(itemComp);
		}

		itemComps.push(blankItem('bottom', (items.length - this.state.bottomItemIndex - 1) * this.props.itemHeight));

		const classes = ['item-list'];
		if (this.props.className) classes.push(this.props.className);

		return (
			<div ref={this.listRef} className={classes.join(' ')} style={style} onScroll={this.onScroll} onKeyDown={this.onKeyDown} onDrop={this.onDrop}>
				{itemComps}
			</div>
		);
	}
}

export default ItemList;
