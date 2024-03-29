import { useEffect } from 'react';
import PlatformImplementation from '../../../services/plugins/PlatformImplementation';

export default function usePluginServiceRegistration(ref: any) {
	useEffect(() => {
		PlatformImplementation.instance().registerComponent('textEditor', ref);

		return () => {
			PlatformImplementation.instance().unregisterComponent('textEditor');
		};
		
	}, []);
}
