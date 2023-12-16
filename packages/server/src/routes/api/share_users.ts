import { ErrorBadRequest, ErrorNotFound } from '../../utils/errors';
import { bodyFields } from '../../utils/requestUtils';
import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { AclAction } from '../../models/BaseModel';

const router = new Router(RouteType.Api);

router.patch('api/share_users/:id', async (path: SubPath, ctx: AppContext) => {
	const shareUserModel = ctx.xilinota.models.shareUser();
	const shareUser = await shareUserModel.load(path.id);
	if (!shareUser) throw new ErrorNotFound();

	await shareUserModel.checkIfAllowed(ctx.xilinota.owner, AclAction.Update, shareUser);

	const body = await bodyFields<any>(ctx.req);

	if ('status' in body) {
		return shareUserModel.setStatus(shareUser.share_id, shareUser.user_id, body.status);
	} else {
		throw new ErrorBadRequest('Only setting status is supported');
	}
});

router.del('api/share_users/:id', async (path: SubPath, ctx: AppContext) => {
	const shareUser = await ctx.xilinota.models.shareUser().load(path.id);
	if (!shareUser) throw new ErrorNotFound();

	await ctx.xilinota.models.shareUser().checkIfAllowed(ctx.xilinota.owner, AclAction.Delete, shareUser);
	await ctx.xilinota.models.shareUser().delete(shareUser.id);
});

router.get('api/share_users', async (_path: SubPath, ctx: AppContext) => {
	const shareUsers = await ctx.xilinota.models.shareUser().byUserId(ctx.xilinota.owner.id);

	const items: any[] = [];
	for (const su of shareUsers) {
		const share = await ctx.xilinota.models.share().load(su.share_id);
		const sharer = await ctx.xilinota.models.user().load(share.owner_id);

		items.push({
			id: su.id,
			status: su.status,
			master_key: su.master_key,
			share: {
				id: share.id,
				folder_id: share.folder_id,
				user: {
					full_name: sharer.full_name,
					email: sharer.email,
				},
			},
		});
	}

	return {
		items: items,
		has_more: false,
	};
});

export default router;
