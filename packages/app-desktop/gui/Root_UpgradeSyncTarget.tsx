import * as React from 'react';
import { useEffect } from 'react';
import useSyncTargetUpgrade, { SyncTargetUpgradeResult } from '@xilinota/lib/services/synchronizer/gui/useSyncTargetUpgrade';

const { render } = require('react-dom');
const ipcRenderer = require('electron').ipcRenderer;
import Setting from '@xilinota/lib/models/Setting';
import restart from '../services/restart';

function useAppCloseHandler(upgradeResult: SyncTargetUpgradeResult) {
	useEffect(() => {
		async function onAppClose() {
			let canClose = true;

			if (!upgradeResult.done) {
				canClose = confirm('The synchronisation target upgrade is still running and it is recommanded to let it finish. Close the application anyway?');
			}

			if (canClose) {
				// We set the state back to IDLE so that the app can start normally and
				// potentially the user can fix issues if any, export the data, etc.
				// The message to upgrade will show up again if they try to sync.
				Setting.setValue('sync.upgradeState', Setting.SYNC_UPGRADE_STATE_IDLE);
				await Setting.saveAll();
			}

			ipcRenderer.send('asynchronous-message', 'appCloseReply', {
				canClose: canClose,
			});
		}

		ipcRenderer.on('appClose', onAppClose);

		return () => {
			ipcRenderer.off('appClose', onAppClose);
		};
	}, [upgradeResult.done]);
}

function useStyle() {
	useEffect(() => {
		const element = document.createElement('style');
		element.appendChild(document.createTextNode(`
			body {
				font-family: sans-serif;
				padding: 5px 20px;
				color: #333333;
			}

			.errorBox {
				border: 1px solid red;
				padding: 5px 20px;
				background-color: #ffeeee;
			}

			pre {
				overflow-x: scroll;
			}
		`));
		document.head.appendChild(element);
	}, []);
}

function useRestartOnDone(upgradeResult: SyncTargetUpgradeResult) {
	useEffect(() => {
		if (upgradeResult.done && !upgradeResult.error) {
			void restart();
		}
		// eslint-disable-next-line @seiyab/react-hooks/exhaustive-deps -- Old code before rule was applied
	}, [upgradeResult.done]);
}

function Root_UpgradeSyncTarget() {
	const upgradeResult = useSyncTargetUpgrade();

	useStyle();
	useRestartOnDone(upgradeResult);
	useAppCloseHandler(upgradeResult);

	function renderUpgradeError() {
		if (!upgradeResult.error) return null;

		return (
			<div className="errorBox">
				<h2>Error</h2>
				<p>The sync target could not be upgraded due to an error. For support, please copy the <em>complete</em> content of this page and paste it in the forum: https://discourse.xilinotaapp.org/</p>
				<p>The full error was:</p>
				<p>{upgradeResult.error.message}</p>
				<pre>{upgradeResult.error.stack}</pre>
			</div>
		);
	}

	return (
		<div>
			<h2>Xilinota upgrade in progress...</h2>
			<p>Please wait while the sync target is being upgraded. It may take a few seconds or a few minutes depending on the upgrade. The application will automatically restart once it is completed.</p>
			{renderUpgradeError()}
		</div>
	);
}

render(<Root_UpgradeSyncTarget />, document.getElementById('react-root'));
