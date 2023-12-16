import { readFile } from 'fs-extra';
import { getRootDir } from '@xilinota/utils';
import { fetchWithRetry } from '@xilinota/utils/net';
import { githubOauthToken } from '../tool-utils';

export interface GithubSponsor {
	name: string;
	id: string;
}

export interface Sponsors {
	github: GithubSponsor[];
	orgs: OrgSponsor[];
}

export interface OrgSponsor {
	url: string;
	urlWebsite?: string;
	title: string;
	imageName: string;
}

export const loadSponsors = async (): Promise<Sponsors> => {
	const sponsorsPath = `${await getRootDir()}/packages/tools/sponsors.json`;
	const output: Sponsors = JSON.parse(await readFile(sponsorsPath, 'utf8'));

	output.orgs = output.orgs.map(o => {
		if (o.urlWebsite) o.url = o.urlWebsite;
		return o;
	});

	const oauthToken = await githubOauthToken();

	for (const ghSponsor of output.github) {
		const userResponse = await fetchWithRetry(`https://api.github.com/users/${ghSponsor.name}`, {
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `token ${oauthToken}`,
			},
		});

		if (!userResponse.ok) throw new Error(await userResponse.text());
		const user = await userResponse.json();
		ghSponsor.id = user.id;
	}

	return output;
};
