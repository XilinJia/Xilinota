import Setting from '@xilinota/lib/models/Setting';
import bridge from './bridge';


export default async (linuxSafeRestart = true) => {
	Setting.setValue('wasClosedSuccessfully', true);
	await Setting.saveAll();

	bridge().restart(linuxSafeRestart);
};
