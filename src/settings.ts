import { t } from './i18n';
import {App, PluginSettingTab, Setting, type SettingDefinitionItem} from "obsidian";
import type EpubReaderPlugin from "./main";
import { ViewMode } from "./epub-viewer/types";

export { DEFAULT_SETTINGS } from './epub-viewer/settings';
export type { ReaderSettings as EpubPluginSettings } from './epub-viewer/settings';

export class EpubSettingTab extends PluginSettingTab {
	plugin: EpubReaderPlugin;

	constructor(app: App, plugin: EpubReaderPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	getSettingDefinitions(): SettingDefinitionItem[] {
		return [{ type: 'group', heading: t('reading'), items: [{
			name: t('defaultReadingMode'),
			desc: t('readingModeDescription'),
			control: { type: 'dropdown', key: 'viewMode', defaultValue: ViewMode.SCROLL,
				options: { [ViewMode.PAGINATED]: t('singleChapter'), [ViewMode.SCROLL]: t('continuousScroll') } },
		}] }];
	}

	async setControlValue(key: string, value: unknown): Promise<void> {
		if (key !== 'viewMode' || (value !== ViewMode.PAGINATED && value !== ViewMode.SCROLL)) return;
		this.plugin.settings.viewMode = value;
		await this.plugin.saveSettings();
	}

	// Hosts before 1.13 render this fallback instead of declarative settings.
	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl).setName(t('reading')).setHeading();

		new Setting(containerEl)
			.setName(t('defaultReadingMode'))
			.setDesc(t('readingModeDescription'))
			.addDropdown(dropdown => dropdown
				.addOption(ViewMode.PAGINATED, t('singleChapter'))
				.addOption(ViewMode.SCROLL, t('continuousScroll'))
				.setValue(this.plugin.settings.viewMode)
				.onChange(value => this.setControlValue('viewMode', value)));

	}
}
