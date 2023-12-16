import { resolve, join, dirname } from 'path';
import { remove, mkdirp } from 'fs-extra';
import { _electron as electron, Page, ElectronApplication, test as base } from '@playwright/test';
import uuid from '@xilinota/lib/uuid';



type XilinotaFixtures = {
	electronApp: ElectronApplication;
	mainWindow: Page;
};

// A custom fixture that loads an electron app. See
// https://playwright.dev/docs/test-fixtures

export const test = base.extend<XilinotaFixtures>({
	// Playwright fails if we don't use the object destructuring
	// pattern in the first argument.
	//
	// See https://github.com/microsoft/playwright/issues/8798
	//
	// eslint-disable-next-line no-empty-pattern
	electronApp: async ({ }, use) => {
		const profilePath = resolve(join(dirname(__dirname), 'test-profile'));
		const profileSubdir = join(profilePath, uuid.createNano());
		await mkdirp(profileSubdir);

		const startupArgs = ['main.js', '--env', 'dev', '--profile', profileSubdir];
		const electronApp = await electron.launch({ args: startupArgs });

		await use(electronApp);

		await electronApp.firstWindow();
		await electronApp.close();
		await remove(profileSubdir);
	},

	mainWindow: async ({ electronApp }, use) => {
		const window = await electronApp.firstWindow();
		await use(window);
	},
});


export { expect } from '@playwright/test';
