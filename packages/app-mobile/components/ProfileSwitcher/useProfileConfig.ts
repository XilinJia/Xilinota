import useAsyncEffect, { AsyncEffectEvent } from '@xilinota/lib/hooks/useAsyncEffect';
import { ProfileConfig } from '@xilinota/lib/services/profileConfig/types';
import { useState } from 'react';
import { loadProfileConfig } from '../../services/profiles';

export default (timestamp = 0) => {
	const [profileConfig, setProfileConfig] = useState<ProfileConfig>();

	useAsyncEffect(async (event: AsyncEffectEvent) => {
		const load = async () => {
			const r = await loadProfileConfig();
			if (event.cancelled) return;
			setProfileConfig(r);
		};

		void load();
	}, [timestamp]);

	return profileConfig;
};
