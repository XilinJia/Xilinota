import { ErrorBadRequest, ErrorNotFound } from '../../utils/errors';
import { Share, ShareType } from '../../services/database/types';
import { bodyFields, ownerRequired } from '../../utils/requestUtils';
import { SubPath } from '../../utils/routeUtils';
import Router from '../../utils/Router';
import { RouteType } from '../../utils/types';
import { AppContext } from '../../utils/types';
import { AclAction } from '../../models/BaseModel';

interface ShareApiInput extends Share {
	folder_id?: string;
	note_id?: string;
	recursive?: number;
}

const router = new Router(RouteType.Api);

router.public = true;

router.post('api/shares', async (_path: SubPath, ctx: AppContext) => {
	ownerRequired(ctx);

	interface Fields {
		folder_id?: string;
		note_id?: string;
		master_key_id?: string;
		recursive?: number;
	}

	const shareModel = ctx.xilinota.models.share();
	const fields = await bodyFields<Fields>(ctx.req);
	const shareInput: ShareApiInput = shareModel.fromApiInput(fields) as ShareApiInput;
	if (fields.folder_id) shareInput.folder_id = fields.folder_id;
	if (fields.note_id) shareInput.note_id = fields.note_id;
	const masterKeyId = fields.master_key_id || '';

	// - The API end point should only expose two ways of sharing:
	//     - By folder_id (XilinotaRootFolder)
	//     - By note_id (Link)
	// - Additionally, the App method is available, but not exposed via the API.

	if (shareInput.folder_id) {
		return ctx.xilinota.models.share().shareFolder(ctx.xilinota.owner, shareInput.folder_id, masterKeyId);
	} else if (shareInput.note_id) {
		return ctx.xilinota.models.share().shareNote(ctx.xilinota.owner, shareInput.note_id, masterKeyId, fields.recursive === 1);
	} else {
		throw new ErrorBadRequest('Either folder_id or note_id must be provided');
	}
});

router.post('api/shares/:id/users', async (path: SubPath, ctx: AppContext) => {
	ownerRequired(ctx);

	interface UserInput {
		email: string;
		master_key?: string;
	}

	const fields = await bodyFields(ctx.req) as UserInput;
	const user = await ctx.xilinota.models.user().loadByEmail(fields.email);
	if (!user) throw new ErrorNotFound('User not found');

	const masterKey = fields.master_key || '';
	const shareId = path.id;

	await ctx.xilinota.models.shareUser().checkIfAllowed(ctx.xilinota.owner, AclAction.Create, {
		share_id: shareId,
		user_id: user.id,
		master_key: masterKey,
	});

	return ctx.xilinota.models.shareUser().addByEmail(shareId, user.email, masterKey);
});

router.get('api/shares/:id/users', async (path: SubPath, ctx: AppContext) => {
	ownerRequired(ctx);

	const shareId = path.id;
	const share = await ctx.xilinota.models.share().load(shareId);
	await ctx.xilinota.models.share().checkIfAllowed(ctx.xilinota.owner, AclAction.Read, share);

	const shareUsers = await ctx.xilinota.models.shareUser().byShareId(shareId, null);
	const users = await ctx.xilinota.models.user().loadByIds(shareUsers.map(su => su.user_id));

	const items = shareUsers.map(su => {
		const user = users.find(u => u.id === su.user_id);

		return {
			id: su.id,
			status: su.status,
			user: {
				id: user.id,
				email: user.email,
			},
		};
	});

	return {
		items,
		has_more: false,
	};
});

router.get('api/shares/:id', async (path: SubPath, ctx: AppContext) => {
	const shareModel = ctx.xilinota.models.share();
	const share = await shareModel.load(path.id);

	if (share && share.type === ShareType.Note) {
		// No authentication is necessary - anyone who knows the share ID is allowed
		// to access the file. It is essentially public.
		return shareModel.toApiOutput(share);
	}

	throw new ErrorNotFound();
});

// This end points returns both the shares owned by the user, and those they
// participate in.
router.get('api/shares', async (_path: SubPath, ctx: AppContext) => {
	ownerRequired(ctx);

	const ownedShares = ctx.xilinota.models.share().toApiOutput(await ctx.xilinota.models.share().sharesByUser(ctx.xilinota.owner.id)) as Share[];
	const participatedShares = ctx.xilinota.models.share().toApiOutput(await ctx.xilinota.models.share().participatedSharesByUser(ctx.xilinota.owner.id));

	// Fake paginated results so that it can be added later on, if needed.
	return {
		items: ownedShares.concat(participatedShares).map(share => {
			return {
				...share,
				user: {
					id: share.owner_id,
				},
			};
		}),
		has_more: false,
	};
});

router.del('api/shares/:id', async (path: SubPath, ctx: AppContext) => {
	ownerRequired(ctx);

	const share = await ctx.xilinota.models.share().load(path.id);
	await ctx.xilinota.models.share().checkIfAllowed(ctx.xilinota.owner, AclAction.Delete, share);
	await ctx.xilinota.models.share().delete(share.id);
});

export default router;
