import Logger from '@xilinota/utils/Logger';
import Setting from './models/Setting';
import shim from './shim';
import SyncTargetRegistry from './SyncTargetRegistry';
import XilinotaError from './XilinotaError';
import Database from './database';
import XilinotaDatabase from './XilinotaDatabase';

class Registry {

	private syncTargets_: Record<number, any> = {};
	private logger_: Logger | null = null;
	private schedSyncCalls_: boolean[] = [];
	private waitForReSyncCalls_: boolean[] = [];
	private setupRecurrentCalls_: boolean[] = [];
	private timerCallbackCalls_: boolean[] = [];
	private showErrorMessageBoxHandler_: any;
	private scheduleSyncId_: number | null = null;
	private recurrentSyncId_: number | null = null;
	private db_: XilinotaDatabase | null = null;
	private isOnMobileData_ = false;

	public logger(): Logger {
		if (!this.logger_) {
			// console.warn('Calling logger before it is initialized');
			return new Logger();
		}

		return this.logger_;
	}

	public setLogger(l: Logger): void {
		this.logger_ = l;
	}

	public setShowErrorMessageBoxHandler(v: any): void {
		this.showErrorMessageBoxHandler_ = v;
	}

	public showErrorMessageBox(message: string): void {
		if (!this.showErrorMessageBoxHandler_) return;
		this.showErrorMessageBoxHandler_(message);
	}

	// If isOnMobileData is true, the doWifiConnectionCheck is not set
	// and the sync.mobileWifiOnly setting is true it will cancel the sync.
	public setIsOnMobileData(isOnMobileData: boolean): void {
		this.isOnMobileData_ = isOnMobileData;
	}

	public resetSyncTarget(syncTargetId: number = -1): void {
		if (syncTargetId === -1) syncTargetId = Setting.value('sync.target');
		delete this.syncTargets_[syncTargetId];
	}

	public syncTargetNextcloud(): any {
		return this.syncTarget(SyncTargetRegistry.nameToId('nextcloud'));
	}

	public syncTarget = (syncTargetId: number = -1): any => {
		if (syncTargetId === -1) syncTargetId = Setting.value('sync.target');
		if (this.syncTargets_[syncTargetId]) return this.syncTargets_[syncTargetId];

		const SyncTargetClass = SyncTargetRegistry.classById(syncTargetId);
		if (!this.db()) throw new Error('Cannot initialize sync without a db');

		const target = new SyncTargetClass(this.db());
		target.setLogger(this.logger());
		this.syncTargets_[syncTargetId] = target;
		return target;
	};

	// This can be used when some data has been modified and we want to make
	// sure it gets synced. So we wait for the current sync operation to
	// finish (if one is running), then we trigger a sync just after.
	public waitForSyncFinishedThenSync = async (): Promise<void> => {
		if (!Setting.value('sync.target')) {
			this.logger().info('waitForSyncFinishedThenSync - cancelling because no sync target is selected.');
			return;
		}

		this.waitForReSyncCalls_.push(true);
		try {
			const synchronizer = await this.syncTarget().synchronizer();
			await synchronizer.waitForSyncToFinish();
			await this.scheduleSync(0);
		} finally {
			this.waitForReSyncCalls_.pop();
		}
	};

	public scheduleSync = async (delay: number | null = null, syncOptions: any = null, doWifiConnectionCheck = false) => {
		this.schedSyncCalls_.push(true);

		try {
			if (delay === null) delay = 1000 * 10;
			if (syncOptions === null) syncOptions = {};

			let promiseResolve: Function;
			const promise = new Promise((resolve) => {
				promiseResolve = resolve;
			});

			if (this.scheduleSyncId_) {
				shim.clearTimeout(this.scheduleSyncId_);
				this.scheduleSyncId_ = null;
			}

			if (Setting.value('env') === 'dev' && delay !== 0) {
				// this.logger().info('Schedule sync DISABLED!!!');
				// return;
			}

			this.logger().debug('Scheduling sync operation...', delay);

			const timeoutCallback = async () => {
				this.timerCallbackCalls_.push(true);
				try {
					const syncTargetId = Setting.value('sync.target');
					if (!syncTargetId) {
						// this.logger().info('Sync cancelled - no sync target is selected.');
						promiseResolve();
						return;
					}

					this.scheduleSyncId_ = null;
					this.logger().info('Preparing scheduled sync');

					if (doWifiConnectionCheck && Setting.value('sync.mobileWifiOnly') && this.isOnMobileData_) {
						this.logger().info('Sync cancelled because we\'re on mobile data');
						promiseResolve();
						return;
					}

					if (!(await this.syncTarget(syncTargetId).isAuthenticated())) {
						this.logger().info('Synchroniser is missing credentials - manual sync required to authenticate.');
						promiseResolve();
						return;
					}

					try {
						const sync = await this.syncTarget(syncTargetId).synchronizer();

						const contextKey = `sync.${syncTargetId}.context`;
						let context = Setting.value(contextKey);
						try {
							context = context ? JSON.parse(context) : {};
						} catch (error) {
							// Clearing the context is inefficient since it means all items are going to be re-downloaded
							// however it won't result in duplicate items since the synchroniser is going to compare each
							// item to the current state.
							this.logger().warn(`Could not parse JSON sync context ${contextKey}:`, context);
							this.logger().info('Clearing context and starting from scratch');
							context = null;
						}

						try {
							this.logger().info('Starting scheduled sync');
							const options = { ...syncOptions, context: context };
							if (!options.saveContextHandler) {
								options.saveContextHandler = (newContext: any) => {
									Setting.setValue(contextKey, JSON.stringify(newContext));
								};
							}
							const newContext = await sync.start(options);
							Setting.setValue(contextKey, JSON.stringify(newContext));
						} catch (error) {
							if (error instanceof XilinotaError && error.code === 'alreadyStarted') {
								this.logger().info(error.message);
							} else {
								promiseResolve();
								throw error;
							}
						}
					} catch (error) {
						this.logger().info('Could not run background sync:');
						this.logger().info(error);
					}
					this.setupRecurrentSync();
					promiseResolve();

				} finally {
					this.timerCallbackCalls_.pop();
				}
			};

			if (delay === 0) {
				void timeoutCallback();
			} else {
				this.scheduleSyncId_ = shim.setTimeout(timeoutCallback, delay);
			}
			return promise;

		} finally {
			this.schedSyncCalls_.pop();
		}
	};

	public setupRecurrentSync(): void {
		this.setupRecurrentCalls_.push(true);

		try {
			if (this.recurrentSyncId_) {
				shim.clearInterval(this.recurrentSyncId_);
				this.recurrentSyncId_ = null;
			}

			if (!Setting.value('sync.interval')) {
				this.logger().debug('Recurrent sync is disabled');
			} else {
				this.logger().debug(`Setting up recurrent sync with interval ${Setting.value('sync.interval')}`);

				if (Setting.value('env') === 'dev') {
					this.logger().info('Recurrent sync operation DISABLED!!!');
					return;
				}

				this.recurrentSyncId_ = shim.setInterval(() => {
					this.logger().info('Running background sync on timer...');
					void this.scheduleSync(0, null, true);
				}, 1000 * Setting.value('sync.interval'));
			}
		} finally {
			this.setupRecurrentCalls_.pop();
		}
	}

	public setDb = (v: XilinotaDatabase | null): void => {
		this.db_ = v;
	};

	public db(): XilinotaDatabase {
		if (!this.db_) throw ('Regidtry db_ is not assigned');
		return this.db_;
	}

	private cancelTimers_(): void {
		if (this.recurrentSyncId_) {
			shim.clearInterval(this.recurrentSyncId_);
			this.recurrentSyncId_ = null;
		}
		if (this.scheduleSyncId_) {
			shim.clearTimeout(this.scheduleSyncId_);
			this.scheduleSyncId_ = null;
		}
	}

	public cancelTimers = async () => {
		this.logger().info('Cancelling sync timers');
		this.cancelTimers_();

		return new Promise((resolve) => {
			shim.setInterval(() => {
				// ensure processing complete
				if (!this.setupRecurrentCalls_.length && !this.schedSyncCalls_.length && !this.timerCallbackCalls_.length && !this.waitForReSyncCalls_.length) {
					this.cancelTimers_();
					resolve(null);
				}
			}, 100);
		});
	};

}

const reg = new Registry();


export { reg };
