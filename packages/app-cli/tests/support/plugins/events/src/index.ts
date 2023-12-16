import xilinota from 'api';

xilinota.plugins.register({
	onStart: async function() {
		xilinota.workspace.onNoteAlarmTrigger(async (event:any) => {
			const note = await xilinota.data.get(['notes', event.noteId]);
			console.info('Alarm was triggered for note: ', note);
		});

		xilinota.workspace.onSyncStart(async (event:any) => {
			console.info('Sync has started...');
		});

		xilinota.workspace.onSyncComplete(async (event:any) => {
			console.info('Sync has completed');
			console.info('With errors:', event.withErrors);
		});
	},
});
