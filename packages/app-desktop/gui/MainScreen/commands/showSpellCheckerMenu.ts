import { CommandContext, CommandDeclaration, CommandRuntime } from '@xilinota/lib/services/CommandService';
import { _ } from '@xilinota/lib/locale';
import bridge from '../../../services/bridge';
import SpellCheckerService from '@xilinota/lib/services/spellChecker/SpellCheckerService';
import { AppState } from '../../../app.reducer';

const Menu = bridge().Menu;

export const declaration: CommandDeclaration = {
	name: 'showSpellCheckerMenu',
	label: () => _('Spell checker'),
	iconName: 'fas fa-globe',
};

export const runtime = (): CommandRuntime => {
	return {
		execute: async (context: CommandContext, _selectedLanguages: string[] | null = [], useSpellChecker: boolean | null = null) => {
			let selectedLanguages = _selectedLanguages || [];
			selectedLanguages = selectedLanguages.length === 0 ? context.state.settings['spellChecker.languages'] : selectedLanguages;
			useSpellChecker = useSpellChecker === null ? context.state.settings['spellChecker.enabled'] : useSpellChecker;

			const menuItems = SpellCheckerService.instance().spellCheckerConfigMenuItems(selectedLanguages, useSpellChecker ?? false);
			const menu = Menu.buildFromTemplate(menuItems as any);
			menu.popup({ window: bridge().window() });
		},

		mapStateToTitle(state: AppState): string {
			if (!state.settings['spellChecker.enabled']) return '';
			const languages = state.settings['spellChecker.languages'];
			if (languages.length === 0) return '';
			const s: string[] = [];

			languages.forEach((language: string) => {
				s.push(language.split('-')[0]);
			});
			return s.join(', ');
		},
	};
};
