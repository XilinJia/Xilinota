import bridge from '../bridge';
import { Implementation as WindowImplementation } from '@xilinota/lib/services/plugins/api/JoplinWindow';
import { injectCustomStyles } from '@xilinota/lib/CssUtils';
import { VersionInfo } from '@xilinota/lib/services/plugins/api/types';
import Setting from '@xilinota/lib/models/Setting';
import { reg } from '@xilinota/lib/registry';
import BasePlatformImplementation, { Joplin } from '@xilinota/lib/services/plugins/BasePlatformImplementation';
import { Implementation as ImagingImplementation } from '@xilinota/lib/services/plugins/api/JoplinImaging';
const { clipboard, nativeImage } = require('electron');
const packageInfo = require('../../packageInfo');

interface Components {
	[key: string]: any;
}

// PlatformImplementation provides access to platform specific dependencies,
// such as the clipboard, message dialog, etc. It allows having the same plugin
// API for all platforms, but with different implementations.
export default class PlatformImplementation extends BasePlatformImplementation {

	private static instance_: PlatformImplementation;
	private joplin_: Joplin;
	private components_: Components;

	public static instance(): PlatformImplementation {
		if (!this.instance_) this.instance_ = new PlatformImplementation();
		return this.instance_;
	}

	public get versionInfo(): VersionInfo {
		return {
			version: packageInfo.version,
			syncVersion: Setting.value('syncVersion'),
			profileVersion: reg.db().version(),
		};
	}

	public get clipboard() {
		return clipboard;
	}

	public get nativeImage() {
		return nativeImage;
	}

	public get window(): WindowImplementation {
		return {
			injectCustomStyles: injectCustomStyles,
		};
	}

	public constructor() {
		super();

		this.components_ = {};

		this.joplin_ = {
			views: {
				dialogs: {
					showMessageBox: async function(message: string) {
						return bridge().showMessageBox(message);
					},
				},
			},
		};
	}

	public registerComponent(name: string, component: any) {
		this.components_[name] = component;
	}

	public unregisterComponent(name: string) {
		delete this.components_[name];
	}

	public get joplin(): Joplin {
		return this.joplin_;
	}

	public get imaging(): ImagingImplementation {
		return {
			nativeImage: nativeImage,
		};
	}

}
