"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
const util_1 = require("util");
const apiBaseUrl = 'https://api.github.com/repos/';
const defaultApiHeaders = (context) => ({
    'Authorization': `token ${context.githubToken}`,
    'X-GitHub-Api-Version': '2022-11-28',
    'Accept': 'application/vnd.github+json',
});
const getTargetRelease = (context, targetTag) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Fetching releases...');
    // Note: We need to fetch all releases, not just /releases/tag/tag-name-here.
    // The latter doesn't include draft releases.
    const result = yield fetch(`${apiBaseUrl}${context.repo}/releases`, {
        method: 'GET',
        headers: defaultApiHeaders(context),
    });
    const releases = yield result.json();
    if (!result.ok) {
        throw new Error(`Error fetching release: ${JSON.stringify(releases)}`);
    }
    for (const release of releases) {
        if (release.tag_name === targetTag) {
            return release;
        }
    }
    throw new Error(`No release with tag ${targetTag} found!`);
});
const updateReleaseAsset = (context, assetUrl, newName) => __awaiter(void 0, void 0, void 0, function* () {
    console.log('Updating asset with URL', assetUrl, 'to have name, ', newName);
    // See https://docs.github.com/en/rest/releases/assets?apiVersion=2022-11-28#update-a-release-asset
    const result = yield fetch(assetUrl, {
        method: 'PATCH',
        headers: defaultApiHeaders(context),
        body: JSON.stringify({
            name: newName,
        }),
    });
    if (!result.ok) {
        throw new Error(`Unable to update release asset: ${yield result.text()}`);
    }
});
// Renames release assets in Xilinota Desktop releases
const renameReleaseAssets = () => __awaiter(void 0, void 0, void 0, function* () {
    const args = (0, util_1.parseArgs)({
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
    const context = {
        repo: args.values.repo,
        githubToken: args.values.token,
    };
    console.log('Renaming release assets for tag', args.values.tag, context.repo);
    const release = yield getTargetRelease(context, args.values.tag);
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
                yield updateReleaseAsset(context, asset.url, newName);
                // Only rename a release once.
                break;
            }
        }
    }
});
void renameReleaseAssets();
//# sourceMappingURL=renameReleaseAssets.js.map