import { parseArgs } from 'util';

interface Context {
	repo: string; // {owner}/{repo}
	githubToken: string;
}

const apiBaseUrl = 'https://api.github.com/repos/';
const defaultApiHeaders = (context: Context) => ({
	'Authorization': `token ${context.githubToken}`,
	'X-GitHub-Api-Version': '2022-11-28',
	'Accept': 'application/vnd.github+json',
});

const getTargetRelease = async (context: Context, targetTag: string) => {
	console.log('Fetching releases...');

	// Note: We need to fetch all releases, not just /releases/tag/tag-name-here.
	// The latter doesn't include draft releases.

	const result = await fetch(`${apiBaseUrl}${context.repo}/releases`, {
		method: 'GET',
		headers: defaultApiHeaders(context),
	});

	const releases = await result.json();
	if (!result.ok) {
		throw new Error(`Error fetching release: ${JSON.stringify(releases)}`);
	}

	for (const release of releases) {
		if (release.tag_name === targetTag) {
			return release;
		}
	}

	throw new Error(`No release with tag ${targetTag} found!`);
};

const updateReleaseAsset = async (context: Context, assetUrl: string, newName: string) => {
	console.log('Updating asset with URL', assetUrl, 'to have name, ', newName);

	// See https://docs.github.com/en/rest/releases/assets?apiVersion=2022-11-28#update-a-release-asset
	const result = await fetch(assetUrl, {
		method: 'PATCH',
		headers: defaultApiHeaders(context),
		body: JSON.stringify({
			name: newName,
		}),
	});

	if (!result.ok) {
		throw new Error(`Unable to update release asset: ${await result.text()}`);
	}
};

// Renames release assets in Xilinota Desktop releases
const renameReleaseAssets = async () => {
	const args = parseArgs({
		options: {
			tag: { type: 'string' },
			token: { type: 'string' },
			repo: { type: 'string' },
		},
	});

	if (!args.values.tag || !args.values.token || !args.values.repo) {
		throw new Error([
			'Required arguments: --tag, --token, --repo',
			'  --tag should be a git tag with an associated release (e.g. v12.12.12)',
			'  --token should be a GitHub API token',
			'  --repo should be a string in the form user/reponame (e.g. xilinjia/xilinota)',
		].join('\n'));
	}


	const context: Context = {
		repo: args.values.repo,
		githubToken: args.values.token,
	};

	console.log('Renaming release assets for tag', args.values.tag, context.repo);

	const release = await getTargetRelease(context, args.values.tag);

	if (!release.assets) {
		console.log(release);
		throw new Error(`Release ${release.name} missing assets!`);
	}

	// Patterns used to rename releases
	const renamePatterns = [
		[/-arm64\.dmg$/, '-arm64.DMG'],
	];

	for (const asset of release.assets) {
		for (const [pattern, replacement] of renamePatterns) {
			if (asset.name.match(pattern)) {
				const newName = asset.name.replace(pattern, replacement);
				await updateReleaseAsset(context, asset.url, newName);

				// Only rename a release once.
				break;
			}
		}
	}
};

void renameReleaseAssets();
