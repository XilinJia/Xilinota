import Logger from '@xilinota/utils/Logger';

export default class BaseService {

	public static logger_: Logger | null = null;
	protected static instanceLogger_: Logger | null = null;

	public static logger(): Logger {
		if (this.instanceLogger_) return this.instanceLogger_;
		if (!BaseService.logger_) throw new Error('BaseService.logger_ not set!!');
		return BaseService.logger_;
	}

	public static setLogger(v: Logger) {
		this.instanceLogger_ = v;
	}
}
