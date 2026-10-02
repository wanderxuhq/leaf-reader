import {App, PluginSettingTab, Setting} from "obsidian";
import EpubReaderPlugin from "./main";
import { ViewMode } from "./epub-viewer/types";

export { DEFAULT_SETTINGS } from './epub-viewer/settings';
export type { ReaderSettings as EpubPluginSettings } from './epub-viewer/settings';

export class EpubSettingTab extends PluginSettingTab {
	plugin: EpubReaderPlugin;

	constructor(app: App, plugin: EpubReaderPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const {containerEl} = this;

		containerEl.empty();

		new Setting(containerEl).setName('Reading').setHeading();

		new Setting(containerEl)
			.setName('Default reading mode')
			.setDesc('Read one chapter at a time or scroll continuously')
			.addDropdown(dropdown => dropdown
				.addOption(ViewMode.PAGINATED, 'Single chapter')
				.addOption(ViewMode.SCROLL, 'Continuous scroll')
				.setValue(this.plugin.settings.viewMode)
				.onChange(async (value) => {
					this.plugin.settings.viewMode = value as ViewMode;
					await this.plugin.saveSettings();
				}));

	}
}
