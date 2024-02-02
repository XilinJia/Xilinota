/* eslint-disable import/prefer-default-export */

import fetch from 'node-fetch';
import { writeFile, readFile, pathExists } from 'fs-extra';
import { dirname } from '@xilinota/lib/path-utils';
import markdownUtils from '@xilinota/lib/markdownUtils';
const yargParser = require('yargs-parser');
import { stripOffFrontMatter } from './website/utils/frontMatter';
import dayjs = require('dayjs');
import utc = require('dayjs/plugin/utc');
dayjs.extend(utc);

interface GitHubReleaseAsset {
	name: string;
	download_count: number;
}

interface GitHubRelease {
	assets: GitHubReleaseAsset[];
	prerelease: boolean;
	tag_name: string;
	published_at: string;
	body: string;
	draft: boolean;
}

interface Release extends GitHubRelease {
	windows_count: number | string;
	mac_count: number | string;
	linux_count: number | string;
	total_count: number | string;
}

const rootDir = dirname(dirname(__dirname));
const statsFilePath = `${rootDir}/readme/about/stats.md`;

function endsWith(str: string, suffix: string) {
	return str.indexOf(suffix, str.length - suffix.length) !== -1;
}

function downloadCounts(release: GitHubRelease) {
	const output = {
		mac_count: 0,
		windows_count: 0,
		linux_count: 0,
		total_count: 0,
	};

	for (let i = 0; i < release.assets.length; i++) {
		const asset = release.assets[i];
		const n = asset.name;
		if (endsWith(n, '-mac.zip') || endsWith(n, '.dmg')) {
			output.mac_count += asset.download_count;
		} else if (endsWith(n, '.AppImage') || endsWith(n, '.snap')) {
			output.linux_count += asset.download_count;
		} else if (endsWith(n, '.exe')) {
			output.windows_count += asset.download_count;
		}
	}

	output.total_count = output.mac_count + output.linux_count + output.windows_count;

	return output;
}

export const replaceGitHubInternalLinks = (body: string) => {
	body = body.replace(/#(\d+)(.{2})/g, (_match: string, v1: string, v2: string) => {
		if (v2.startsWith('](')) {
			// The issue number is already a link, so skip it
			return `#${v1}${v2}`;
		} else {
			return `[#${v1}](https://github.com/xilinjia/xilinota/issues/${v1})${v2}`;
		}
	});


	body = body.replace(/\(([0-9a-z]{7})\)/g, '([$1](https://github.com/xilinjia/xilinota/commit/$1))');

	return body;
};

function createChangeLog(releases: Release[]) {
	const output = [];

	output.push('# Xilinota Desktop Changelog');

	for (let i = 0; i < releases.length; i++) {
		const r = releases[i];
		const s = [];
		const preReleaseString = r.prerelease ? ' (Pre-release)' : '';
		s.push(`## ${r.tag_name}${preReleaseString} - ${r.published_at}`);
		s.push('');
		const body = replaceGitHubInternalLinks(r.body);
		s.push(body);
		output.push(s.join('\n'));
	}

	return output.join('\n\n');
}

async function main() {
	const argv = yargParser(process.argv);
	const types = argv.types ? argv.types.split(',') : ['stats', 'changelog'];
	// const updateIntervalDays = argv.updateInterval ? argv.updateInterval : 0; // in days
	// const updateInterval = updateIntervalDays * 86400000; // in days

	let updateStats = types.includes('stats');
	const updateChangelog = types.includes('changelog');

	if (updateStats && await pathExists(statsFilePath)) {
		const md = await readFile(statsFilePath, 'utf8');
		const info = stripOffFrontMatter(md).header;
		if (!info.updated) throw new Error('Missing front matter property: updated');

		const now = new Date();

		if (info.updated.getMonth() !== now.getMonth()) {
			console.info(`Proceeding with stat update because the file has not been updated this month (file date was ${info.updated.toString()})`);
		} else {
			console.info(`Skipping stat update because the file (from ${info.updated.toString()}) has already been updated this month`);
			updateStats = false;
		}
	}

	console.info(`Building docs: updateChangelog: ${updateChangelog}; updateStats: ${updateStats}`);
	if (!updateStats && !updateChangelog) {
		console.info('Nothing to do.');
		return;
	}

	const rows: Release[] = [];

	const totals = {
		windows_count: 0,
		mac_count: 0,
		linux_count: 0,
		windows_percent: 0,
		mac_percent: 0,
		linux_percent: 0,
	};

	const processReleases = (releases: GitHubRelease[]) => {
		for (let i = 0; i < releases.length; i++) {
			const release = releases[i];
			if (!release.tag_name.match(/^v\d+\.\d+\.\d+$/)) continue;
			if (release.draft) continue;

			const row: Release = {
				...release,
				...downloadCounts(release),
				tag_name: `[${release.tag_name}](https://github.com/xilinjia/xilinota/releases/tag/${release.tag_name})`,
				published_at: release.published_at,
				body: release.body,
				prerelease: release.prerelease,
			};

			totals.windows_count += row.windows_count as number;
			totals.mac_count += row.mac_count as number;
			totals.linux_count += row.linux_count as number;

			rows.push(row);
		}
	};

	console.info('Build stats: Downloading releases info...');

	const baseUrl = 'https://api.github.com/repos/xilinjia/xilinota/releases?page=';

	// GitHub release API has been broken for a few years now - a fetch for a
	// particular page may or may not return the page. So here we fetch the page
	// multiple times until we get it. If we don't get it after that, we can
	// assume there's really no page there. Without this hack, we get stuff like
	// this, where the changelog is partly cleared, then restored on next
	// update:
	//
	// - https://github.com/xilinjia/xilinota/commit/907422cefaeff52fe909278e40145812cc0d1303
	// - https://github.com/xilinjia/xilinota/commit/07535a494e5c700adce89835d1fb3dc077600240
	const multiFetch = async (url: string) => {
		for (let i = 0; i < 3; i++) {
			const response = await fetch(url);
			const output = await response.json();
			if (output && Array.isArray(output) && output.length) return output;
		}
		return null;
	};

	let pageNum = 1;
	while (true) {
		console.info(`Build stats: Page ${pageNum}`);
		const releases = await multiFetch(`${baseUrl}${pageNum}`);
		if (!releases || !releases.length) break;
		processReleases(releases);
		pageNum++;
	}

	if (updateChangelog) {
		console.info('Build stats: Updating changelog...');
		const changelogText = createChangeLog(rows);
		await writeFile(`${rootDir}/readme/about/changelog/desktop.md`, changelogText);
	}

	if (!updateStats) return;

	console.info('Build stats: Updating stats...');

	const grandTotal = totals.windows_count + totals.mac_count + totals.linux_count;
	totals.windows_percent = totals.windows_count / grandTotal;
	totals.mac_percent = totals.mac_count / grandTotal;
	totals.linux_percent = totals.linux_count / grandTotal;

	const formatter = new Intl.NumberFormat('en-US', { style: 'decimal' });

	const totalsMd = [
		{ name: 'Total Windows downloads', value: formatter.format(totals.windows_count) },
		{ name: 'Total macOs downloads', value: formatter.format(totals.mac_count) },
		{ name: 'Total Linux downloads', value: formatter.format(totals.linux_count) },
		{ name: 'Windows %', value: `${Math.round(totals.windows_percent * 100)}%` },
		{ name: 'macOS %', value: `${Math.round(totals.mac_percent * 100)}%` },
		{ name: 'Linux %', value: `${Math.round(totals.linux_percent * 100)}%` },
	];

	for (let i = 0; i < rows.length; i++) {
		rows[i].tag_name = rows[i].prerelease ? `${rows[i].tag_name} (p)` : rows[i].tag_name;
		rows[i].mac_count = formatter.format(rows[i].mac_count as number);
		rows[i].windows_count = formatter.format(rows[i].windows_count as number);
		rows[i].linux_count = formatter.format(rows[i].linux_count as number);
		rows[i].total_count = formatter.format(rows[i].total_count as number);
	}

	const statsMd = [
		'---',
		`updated: ${dayjs.utc().format()}`,
		'---',
		'',
		'# Xilinota statistics',
		'',
		markdownUtils.createMarkdownTable([
			{ name: 'name', label: 'Name' },
			{ name: 'value', label: 'Value' },
		], totalsMd),
		'',
		'(p) Indicates pre-releases',
		'',
		markdownUtils.createMarkdownTable([
			{ name: 'tag_name', label: 'Version' },
			{ name: 'published_at', label: 'Date' },
			{ name: 'windows_count', label: 'Windows' },
			{ name: 'mac_count', label: 'macOS' },
			{ name: 'linux_count', label: 'Linux' },
			{ name: 'total_count', label: 'Total' },
		], rows as any[]),
	];

	const statsText = statsMd.join('\n');
	await writeFile(statsFilePath, statsText);
}

if (require.main === module) {

	main().catch((error) => {
		console.error('Fatal error');
		console.error(error);
		process.exit(1);
	});
}
