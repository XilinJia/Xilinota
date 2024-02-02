#!/usr/bin/env node

// Use njstrace to find out what Node.js might be spending time on
// var njstrace = require('njstrace').inject();

const compareVersion = require('compare-version');
const nodeVersion = process && process.versions && process.versions.node ? process.versions.node : '0.0.0';
if (compareVersion(nodeVersion, '10.0.0') < 0) {
	console.error(`Xilinota requires Node 10+. Detected version ${nodeVersion}`);
	process.exit(1);
}

const { app } = require('./app.js');
const Folder = require('@xilinota/lib/models/Folder').default;
const Resource = require('@xilinota/lib/models/Resource').default;
const BaseItem = require('@xilinota/lib/models/BaseItem').default;
const Note = require('@xilinota/lib/models/Note').default;
const Tag = require('@xilinota/lib/models/Tag').default;
const NoteTag = require('@xilinota/lib/models/NoteTag').default;
const MasterKey = require('@xilinota/lib/models/MasterKey').default;
const Setting = require('@xilinota/lib/models/Setting').default;
const Revision = require('@xilinota/lib/models/Revision').default;
const Logger = require('@xilinota/utils/Logger').default;
const FsDriverNode = require('@xilinota/lib/fs-driver-node').default;
const sharp = require('sharp');
const { shimInit } = require('@xilinota/lib/shim-init-node.js');
const shim = require('@xilinota/lib/shim').default;
const { _ } = require('@xilinota/lib/locale');
const FileApiDriverLocal = require('@xilinota/lib/file-api-driver-local').default;
const EncryptionService = require('@xilinota/lib/services/e2ee/EncryptionService').default;
const envFromArgs = require('@xilinota/lib/envFromArgs');
const nodeSqlite = require('sqlite3').verbose();
const initLib = require('@xilinota/lib/initLib').default;

const env = envFromArgs(process.argv);

const fsDriver = new FsDriverNode();
Logger.fsDriver_ = fsDriver;
Resource.fsDriver_ = fsDriver;
EncryptionService.fsDriver_ = fsDriver;
FileApiDriverLocal.fsDriver_ = fsDriver;

// That's not good, but it's to avoid circular dependency issues
// in the BaseItem class.
BaseItem.loadClass('Note', Note);
BaseItem.loadClass('Folder', Folder);
BaseItem.loadClass('Resource', Resource);
BaseItem.loadClass('Tag', Tag);
BaseItem.loadClass('NoteTag', NoteTag);
BaseItem.loadClass('MasterKey', MasterKey);
BaseItem.loadClass('Revision', Revision);
BaseItem.loadClass('Setting', Setting);

Setting.setConstant('appId', `ac.mdiq.xilinota${env === 'dev' ? 'dev' : ''}-cli`);
Setting.setConstant('appType', 'cli');

let keytar;
try {
	keytar = shim.platformSupportsKeyChain() ? require('keytar') : null;
} catch (error) {
	console.error('Cannot load keytar - keychain support will be disabled', error);
	keytar = null;
}

function appVersion() {
	const p = require('./package.json');
	return p.version;
}

shimInit({ sharp, keytar, appVersion, nodeSqlite });

const logger = new Logger();
Logger.initializeGlobalLogger(logger);
initLib(logger);

const application = app();

if (process.platform === 'win32') {
	const rl = require('readline').createInterface({
		input: process.stdin,
		output: process.stdout,
	});

	rl.on('SIGINT', () => {
		process.emit('SIGINT');
	});
}

process.stdout.on('error', (error) => {
	// https://stackoverflow.com/questions/12329816/error-write-epipe-when-piping-node-output-to-head#15884508
	if (error.code === 'EPIPE') {
		process.exit(0);
	}
});

application.start(process.argv).catch(error => {
	if (error.code === 'flagError') {
		console.error(error.message);
		console.error(_('Type `xilinota help` for usage information.'));
	} else {
		console.error(_('Fatal error:'));
		console.error(error);
	}

	process.exit(1);
});
