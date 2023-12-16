import xilinota from 'api';
import { ModelType } from 'api/types';

xilinota.plugins.register({
	onStart: async function() {
		const folder = await xilinota.data.post(['folders'], null, { title: "test" });
		const note = await xilinota.data.post(['notes'], null, { title: "test", parent_id: folder.id });
		
		await xilinota.data.userDataSet(ModelType.Note, note.id, 'mykey', 'abcd');

		console.info('Got back user data:', await xilinota.data.userDataGet(ModelType.Note, note.id, 'mykey'));

		await xilinota.data.userDataDelete(ModelType.Note, note.id, 'mykey');
	
		console.info('Got back user data:', await xilinota.data.userDataGet(ModelType.Note, note.id, 'mykey'));
	},
});
