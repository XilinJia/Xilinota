import { BaseItemEntity } from '../../services/database/types';
import { StateShare } from '../../services/share/reducer';

export default function(item: BaseItemEntity, share: StateShare): boolean {
	// Note has been published - currently we don't encrypt
	if (item.is_shared) return false;

	// Item has been shared with user, but sharee is not encrypting his notes,
	// so we shouldn't encrypt it either. Otherwise sharee will not be able to
	// view the note anymore. https://github.com/XilinJia/Xilinota/issues/6645
	if (item.share_id && (!share || !share.master_key_id)) return false;

	return true;
}
