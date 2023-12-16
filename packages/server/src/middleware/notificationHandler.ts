import { AppContext, KoaNext, NotificationView } from '../utils/types';
import { isApiRequest } from '../utils/requestUtils';
import { NotificationLevel } from '../services/database/types';
import { defaultAdminEmail, defaultAdminPassword } from '../db';
import { _ } from '@xilinota/lib/locale';
import Logger from '@xilinota/utils/Logger';
import { NotificationKey } from '../models/NotificationModel';
import { helpUrl, profileUrl } from '../utils/urlUtils';
import { userFlagToString } from '../models/UserFlagModel';
import renderMarkdown from '../utils/renderMarkdown';

const logger = Logger.create('notificationHandler');

async function handleChangeAdminPasswordNotification(ctx: AppContext) {
	if (!ctx.xilinota.owner.is_admin) return;

	const defaultAdmin = await ctx.xilinota.models.user().login(defaultAdminEmail, defaultAdminPassword);
	const notificationModel = ctx.xilinota.models.notification();

	if (defaultAdmin) {
		await notificationModel.add(
			ctx.xilinota.owner.id,
			NotificationKey.ChangeAdminPassword,
			NotificationLevel.Important,
			_('The default admin password is insecure and has not been changed! [Change it now](%s)', profileUrl()),
		);
	} else {
		await notificationModel.setRead(ctx.xilinota.owner.id, NotificationKey.ChangeAdminPassword);
	}
}

// Special notification that cannot be dismissed.
async function handleUserFlags(ctx: AppContext): Promise<NotificationView> {
	const user = ctx.xilinota.owner;

	const flags = await ctx.xilinota.models.userFlag().allByUserId(ctx.xilinota.owner.id);
	const flagStrings = flags.map(f => `- ${userFlagToString(f)}`).join('\n');

	if (!user.enabled || !user.can_upload) {
		return {
			id: 'accountDisabled',
			messageHtml: renderMarkdown(`Your account is disabled for the following reason(s):\n\n${flagStrings}\n\nPlease check the [help section](${helpUrl()}) for further information or contact support.`),
			levelClassName: levelClassName(NotificationLevel.Error),
			closeUrl: '',
		};
	} else if (flags.length) {
		// Actually currently all flags result in either disabled upload or
		// disabled account, but keeping that here anyway just in case.
		return {
			id: 'accountFlags',
			messageHtml: renderMarkdown(`The following issues have been detected on your account:\n\n${flagStrings}\n\nPlease check the [help section](${helpUrl()}) for further information or contact support.`),
			levelClassName: levelClassName(NotificationLevel.Important),
			closeUrl: '',
		};
	}

	return null;
}

async function handleConfirmEmailNotification(ctx: AppContext): Promise<NotificationView> {
	if (!ctx.xilinota.owner) return null;

	if (!ctx.xilinota.owner.email_confirmed) {
		return {
			id: 'confirmEmail',
			messageHtml: renderMarkdown(`An email has been sent to you containing an activation link to complete your registration. If you did not receive it, you may send it again from [your profile page](${profileUrl()}).\n\nMake sure you click it to secure your account and keep access to it.`),
			levelClassName: levelClassName(NotificationLevel.Important),
			closeUrl: '',
		};
	}

	return null;
}


// async function handleSqliteInProdNotification(ctx: AppContext) {
// 	if (!ctx.xilinota.owner.is_admin) return;

// 	const notificationModel = ctx.xilinota.models.notification();

// 	if (config().database.client === 'sqlite3' && ctx.xilinota.env === 'prod') {
// 		await notificationModel.add(
// 			ctx.xilinota.owner.id,
// 			NotificationKey.UsingSqliteInProd
// 		);
// 	}
// }

function levelClassName(level: NotificationLevel): string {
	if (level === NotificationLevel.Important) return 'is-warning';
	if (level === NotificationLevel.Normal) return 'is-info';
	if (level === NotificationLevel.Error) return 'is-danger';
	throw new Error(`Unknown level: ${level}`);
}

async function makeNotificationViews(ctx: AppContext): Promise<NotificationView[]> {
	const notificationModel = ctx.xilinota.models.notification();
	const notifications = await notificationModel.allUnreadByUserId(ctx.xilinota.owner.id);
	const views: NotificationView[] = [];
	for (const n of notifications) {
		views.push({
			id: n.id,
			messageHtml: renderMarkdown(n.message),
			levelClassName: levelClassName(n.level),
			closeUrl: notificationModel.closeUrl(n.id),
		});
	}

	return views;
}

// The role of this middleware is to inspect the system and to generate
// notifications for any issue it finds. It is only active for logged in users
// on the website. It is inactive for API calls.
export default async function(ctx: AppContext, next: KoaNext): Promise<void> {
	ctx.xilinota.notifications = [];

	try {
		if (isApiRequest(ctx)) return next();
		if (!ctx.xilinota.owner) return next();

		await handleChangeAdminPasswordNotification(ctx);
		await handleConfirmEmailNotification(ctx);
		// await handleSqliteInProdNotification(ctx);
		const notificationViews = await makeNotificationViews(ctx);

		const nonDismisableViews = [
			await handleUserFlags(ctx),
			await handleConfirmEmailNotification(ctx),
		];

		for (const nonDismisableView of nonDismisableViews) {
			if (nonDismisableView) notificationViews.push(nonDismisableView);
		}

		ctx.xilinota.notifications = notificationViews;
	} catch (error) {
		logger.error(error);
	}

	return next();
}
