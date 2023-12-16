import xilinota from 'api';
const leftPad = require('left-pad');

xilinota.plugins.register({
	onStart: async function() {
		await xilinota.data.post(['folders'], null, { title: leftPad('foo', 5) });
	},
});
