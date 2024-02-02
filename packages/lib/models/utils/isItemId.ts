export default (id: string): RegExpMatchArray | null => {
	return id.match(/^[0-9a-zA-Z]{32}$/);
};
