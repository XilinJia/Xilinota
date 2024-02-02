import KeychainServiceDriverBase from './KeychainServiceDriverBase';
import shim from '../../shim';

export default class KeychainServiceDriver extends KeychainServiceDriverBase {

	public async setPassword(name: string, password: string): Promise<boolean> {
		if (!shim.keytar()) return false;
		await shim.keytar().setPassword(`${this.appId}.${name}`, `${this.clientId}@xilinota`, password);
		return true;
	}

	public async password(name: string): Promise<string> {
		if (!shim.keytar()) return '';
		return shim.keytar().getPassword(`${this.appId}.${name}`, `${this.clientId}@xilinota`);
	}

	public async deletePassword(name: string): Promise<void> {
		if (!shim.keytar()) return;
		await shim.keytar().deletePassword(`${this.appId}.${name}`, `${this.clientId}@xilinota`);
	}

}
