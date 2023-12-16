import Logger from '@xilinota/utils/Logger';
import { Notification } from '@xilinota/lib/models/Alarm';

const ReactNativeAN = require('@xilinota/react-native-alarm-notification').default;

export default class AlarmServiceDriver {

	private logger_: Logger;

	public constructor(logger: Logger) {
		this.logger_ = logger;
	}

	public hasPersistentNotifications() {
		return true;
	}

	public notificationIsSet() {
		throw new Error('Available only for non-persistent alarms');
	}

	public async clearNotification(id: number) {
		const alarm = await this.alarmByXilinotaNotificationId(id);
		if (!alarm) return;

		this.logger_.info('AlarmServiceDriver: Deleting alarm:', alarm);

		await ReactNativeAN.deleteAlarm(alarm.id);
	}

	// Returns -1 if could not be found
	private alarmXilinotaAlarmId(alarm: any): number {
		if (!alarm.data || !alarm.data.xilinotaNotificationId) {
			return -1;
		} else {
			return alarm.data.xilinotaNotificationId;
		}
	}

	private async alarmByXilinotaNotificationId(xilinotaNotificationId: number) {
		const alarms: any[] = await ReactNativeAN.getScheduledAlarms();
		for (const alarm of alarms) {
			const id = this.alarmXilinotaAlarmId(alarm);
			if (id === xilinotaNotificationId) return alarm;
		}

		this.logger_.warn('AlarmServiceDriver: Could not find alarm that matches Xilinota notification ID. It could be because it has already been triggered:', xilinotaNotificationId);
		return null;
	}

	public async scheduleNotification(notification: Notification) {
		const alarmNotifData = {
			title: notification.title,
			message: notification.body ? notification.body : '-', // Required
			channel: 'ac.mdiq.xilinota.notification',
			small_icon: 'ic_launcher_foreground', // Android requires the icon to be transparent
			color: 'blue',
			data: {
				xilinotaNotificationId: notification.id,
				noteId: notification.noteId,
			},
		};

		// ReactNativeAN expects a string as a date and it seems this utility
		// function converts it to the right format.
		const fireDate = ReactNativeAN.parseDate(notification.date);

		const alarm = await ReactNativeAN.scheduleAlarm({ ...alarmNotifData, fire_date: fireDate });

		this.logger_.info('AlarmServiceDriver: Created new alarm:', alarm);
	}
}
