import { t } from './i18n';
import { BookNotesView, NOTES_VIEW_TYPE } from './epub-viewer/notes-view';
import { openBookNotes, registerNotesOpening } from './epub-viewer/notes-opening';
import { normalizeSettings } from './epub-viewer/settings';
import { App, Modal, Notice, Plugin, TFile } from 'obsidian';
import { EpubPluginSettings, EpubSettingTab } from "./settings";
import { EpubView, EPUB_VIEW_TYPE, openEpubInView } from "./epub-viewer/epub-view";
import { parseLBP } from "./epub-viewer/lbp";

export default class EpubReaderPlugin extends Plugin {
	settings: EpubPluginSettings;

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerView(EPUB_VIEW_TYPE, (leaf) => new EpubView(leaf, {
      get: () => this.settings,
      save: async settings => { this.settings = settings; await this.saveSettings(); },
      openNotes: state => openBookNotes(this.app, state),
    }));
    this.registerView(NOTES_VIEW_TYPE, leaf => new BookNotesView(leaf));
    registerNotesOpening(this);
		this.registerExtensions(['epub'], EPUB_VIEW_TYPE);

		this.addCommand({
			id: 'open-epub',
			name: t('openEpub'),
			callback: () => {
				void this.openEpubFile();
			},
		});

		this.registerObsidianProtocolHandler('epub-ref', (params) => {
			void this.handleEpubRefLink(params);
		});

		this.addSettingTab(new EpubSettingTab(this.app, this));
	}

	onunload(): void {
	}

	async loadSettings(): Promise<void> {
		const data = (await this.loadData()) as Partial<EpubPluginSettings>;
		this.settings = normalizeSettings(data);
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	async openEpubFile(): Promise<void> {
		const epubFiles = this.app.vault.getFiles().filter(file => file.extension === 'epub');

		if (epubFiles.length === 0) {
			new Notice(t('noEpub'));
			return;
		}

		if (epubFiles.length === 1) {
			const file = epubFiles[0];
			if (file) {
				const leaf = this.app.workspace.getLeaf(true);
				await leaf.openFile(file);
			}
			return;
		}

		const files = epubFiles.map(f => ({ path: f.path, name: f.name }));
		new EpubFileSelectorModal(this.app, files, async (filePath) => {
			const leaf = this.app.workspace.getLeaf(true);
			const file = this.app.vault.getAbstractFileByPath(filePath);
			if (file instanceof TFile) {
				await leaf.openFile(file);
			}
		}).open();
	}

	async handleEpubRefLink(params: Record<string, string>): Promise<void> {
		try {
			const lbpData = params.data;
			if (!lbpData) {
				new Notice(t('invalidLink'));
				return;
			}

			const lbpRange = parseLBP(lbpData);
			if (!lbpRange) {
				new Notice(t('invalidLink'));
				return;
			}

			const filePath = lbpRange.bookId;
			const epubFile = this.app.vault.getAbstractFileByPath(filePath);
			if (!epubFile || !(epubFile instanceof TFile)) {
				new Notice(t('bookNotFound', { path: filePath }));
				return;
			}

			await openEpubInView(this.app, filePath, lbpRange);
		} catch (error) {
			console.error('[EpubPlugin] Error handling epub-ref link:', error);
			new Notice(t('openLinkFailed'));
		}
	}
}

/**
 * Modal for selecting an EPUB file from the vault
 */
class EpubFileSelectorModal extends Modal {
	private files: Array<{ path: string; name: string }>;
	private onSelect: (filePath: string) => Promise<void>;

	constructor(app: App, files: Array<{ path: string; name: string }>, onSelect: (filePath: string) => Promise<void>) {
		super(app);
		this.files = files;
		this.onSelect = onSelect;
	}

	onOpen(): void {
		const { contentEl } = this;
		contentEl.empty();

		contentEl.createEl('h2', { text: t('selectEpub') });

		const fileList = contentEl.createDiv({ cls: 'epub-file-list' });

		for (const file of this.files) {
			const fileItem = fileList.createDiv({ cls: 'epub-file-item' });
			fileItem.createSpan({ text: file.name });
			fileItem.addEventListener('click', () => {
				void this.onSelect(file.path).then(() => this.close()).catch((error: unknown) => {
					console.error('Failed to open EPUB', error);
					new Notice(t('bookOpenFailed'));
				});
			});
		}
	}

	onClose(): void {
		const { contentEl } = this;
		contentEl.empty();
	}
}
