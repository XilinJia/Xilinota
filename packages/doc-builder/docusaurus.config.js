// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

// To make their weird linter happy
process.env.WEBSITE_BASE_URL = process.env.WEBSITE_BASE_URL || '';

/** @type {import('@docusaurus/types').Config} */
const config = {
	title: 'Xilinota',
	tagline: 'Free your notes!',
	favicon: 'favicon.ico',

	// Set the production url of your site here
	url: process.env.WEBSITE_BASE_URL,
	// Set the /<baseUrl>/ pathname under which your site is served
	// For GitHub pages deployment, it is often '/<projectName>/'
	baseUrl: '/',

	onBrokenLinks: 'throw',
	onBrokenMarkdownLinks: 'warn',

	// Even if you don't use internalization, you can use this field to set useful
	// metadata like html lang. For example, if your site is Chinese, you may want
	// to replace "en" with "zh-Hans".
	i18n: {
		defaultLocale: 'en',
		locales: ['en', 'fr'],
	},

	plugins: [
		[
			require.resolve('docusaurus-lunr-search'),
			{
				// Options here
			},
		],
	],

	presets: [
		[
			'classic',
			/** @type {import('@docusaurus/preset-classic').Options} */
			({
				docs: {
					path: 'help',
					routeBasePath: 'help',
					sidebarPath: require.resolve('./sidebars.js'),
					breadcrumbs: false,
					editUrl: (params) => {
						return `https://github.com/XilinJia/Xilinota/tree/dev/readme/${params.docPath}`;
					},
				},
				blog: {
					showReadingTime: true,
					blogSidebarCount: 'ALL',
					path: 'news',
					routeBasePath: 'news',
					editUrl: (params) => {
						return `https://github.com/XilinJia/Xilinota/tree/dev/readme/news/${params.blogPath}`;
					},
				},
				theme: {
					customCss: require.resolve('./src/css/custom.css'),
				},
				sitemap: {
					changefreq: 'weekly',
					priority: 0.5,
					filename: 'sitemap.xml',
				},
			}),
		],
	],

	themeConfig:
		/** @type {import('@docusaurus/preset-classic').ThemeConfig} */
		({
			navbar: {
				title: '',
				logo: {
					alt: 'Xilinota',
					src: 'images/logo-text-blue.svg',
					href: process.env.WEBSITE_BASE_URL,
					target: '_self',
				},
				items: [
					{
						to: '/news',
						label: 'News',
						position: 'right',
					},
					{
						type: 'docSidebar',
						sidebarId: 'helpSidebar',
						position: 'right',
						label: 'Help',
					},
					{
						to: 'https://discourse.xilinotaapp.org',
						label: 'Forum',
						position: 'right',
					},
					{
						to: `${process.env.WEBSITE_BASE_URL}/plans`,
						label: 'Joplin Cloud',
						position: 'right',
						className: 'navbar-custom-buttons plans-button',
						target: '_self',
					},
					{
						to: `${process.env.WEBSITE_BASE_URL}/donate`,
						label: '♡ Support us',
						position: 'right',
						className: 'navbar-custom-buttons sponsor-button',
						target: '_self',
					},
					{
						type: 'localeDropdown',
						position: 'right',
					},
				],
			},
			footer: {
				style: 'dark',
				links: [
					{
						title: 'Community',
						items: [
							{
								label: 'Twitter',
								href: 'https://twitter.com/xilinotaapp',
							},
							{
								label: 'Patreon',
								href: 'https://www.patreon.com/xilinota',
							},
							{
								label: 'LinkedIn',
								href: 'https://www.linkedin.com/company/xilinota',
							},
							{
								label: 'Discord',
								href: 'https://discord.gg/VSj7AFHvpq',
							},
							{
								label: 'Mastodon',
								href: 'https://mastodon.social/@xilinotaapp',
							},
							{
								label: 'Lemmy',
								href: 'https://sopuli.xyz/c/xilinotaapp',
							},
							{
								label: 'GitHub',
								href: 'https://github.com/XilinJia/Xilinota/',
							},
						],
					},
					{
						title: 'Legal',
						items: [
							{
								label: 'Privacy Policy',
								to: `${process.env.WEBSITE_BASE_URL}/privacy`,
							},
						],
					},
				],
				copyright: `Copyright © 2016-${new Date().getFullYear()} Laurent Cozic`,
			},
			prism: {
				theme: lightCodeTheme,
				darkTheme: darkCodeTheme,
			},
		}),
};

module.exports = config;
