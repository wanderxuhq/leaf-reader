import type { BookNotesState } from './notes-view';
import { FileView, WorkspaceLeaf, Notice, type ViewStateResult, type App, type TFile } from 'obsidian';
import { parseLBP, serializeLBP, type LBPRange } from './lbp';
import { ReaderContent } from './reader-component';
import { createReaderStore, type ReaderStore } from './epub-store';
import { render } from 'solid-js/web';
import { parseEpub } from './epub-parser';
import { DEFAULT_SETTINGS, type ReaderSettings } from './settings';
export const EPUB_VIEW_TYPE = 'epub-view';
export interface ReaderPreferences { get: () => ReaderSettings; save: (settings: ReaderSettings) => Promise<void>; openNotes?: (state: BookNotesState) => Promise<void>; }
export class EpubView extends FileView {
  private store?: ReaderStore;
  private disposeReader?: () => void;
  private loadVersion = 0;
  private closed = false;
  private requestedPosition: LBPRange | null = null;
  private loadedPath: string | null = null;
  private preferences: ReaderPreferences;
  constructor(leaf: WorkspaceLeaf, preferences?: ReaderPreferences) {
    super(leaf);
    this.preferences = preferences ?? { get: () => DEFAULT_SETTINGS, save: async () => {} };
  }
  getViewType(): string { return EPUB_VIEW_TYPE; }
  getDisplayText(): string { return this.file?.basename ?? 'Leaf Reader'; }
  getIcon(): string { return 'book-open'; }
  getState(): Record<string, unknown> {
    return { ...super.getState(), file: this.file?.path, lbp: this.store ? serializeLBP(this.store.state.currentLBP) : undefined };
  }
  async onOpen(): Promise<void> { this.closed = false; this.contentEl.addClass('epub-reader-container'); }
  async setState(state: unknown, result: ViewStateResult): Promise<void> {
    const value = state && typeof state === 'object' ? state as { file?: string; lbp?: string } : {};
    const position = parseLBP(value.lbp);
    this.requestedPosition = position && position.bookId === value.file ? position : null;
    // FileView owns file assignment and calls onLoadFile/onUnloadFile.
    await super.setState(value, result);
    if (this.requestedPosition && this.store && this.store.state.bookId === value.file && serializeLBP(this.store.state.currentLBP) !== serializeLBP(this.requestedPosition)) this.store.jump({ chapter: this.requestedPosition.start.spineIndex, lbp: this.requestedPosition });
    this.requestedPosition = null;
  }
  async onLoadFile(file: TFile): Promise<void> {
    const version = ++this.loadVersion;
    this.releaseReader();
    this.contentEl.empty();
    this.contentEl.createDiv({ cls: 'epub-loading', text: '正在打开书籍…' });
    const saved = parseLBP(this.app.loadLocalStorage('epub-lbp-' + file.path));
    const position = this.requestedPosition ?? saved;
    try {
      const parsed = await parseEpub(this.app, file.path);
      if (version !== this.loadVersion || this.closed) return;
      if (!parsed.publication.readingOrder.items.length) throw new Error('书籍没有可阅读的章节');
      this.loadedPath = file.path;
      const store = createReaderStore(parsed, file.path, this.preferences.get(), position,
        lbp => this.app.saveLocalStorage('epub-lbp-' + lbp.bookId, serializeLBP(lbp)),
        settings => { void this.preferences.save(settings).catch(error => { console.error(error); new Notice('阅读设置保存失败'); }); });
      this.store = store;
      this.contentEl.empty();
      const container = this.contentEl.createDiv({ cls: 'epub-solid-reader' });
      this.disposeReader = render(() => ReaderContent({ store, app: this.app, file, onOpenNotes: () => {
        void this.preferences.openNotes?.({ book: file.path, title: parsed.publication.metadata.title || file.basename,
          chapters: parsed.publication.readingOrder.items.map((item,index) => item.title || '第 ' + (index + 1) + ' 章') }).catch(error => { console.error(error); new Notice('无法打开读书笔记'); });
      } }), container);
    } catch (error) {
      if (version !== this.loadVersion || this.closed) return;
      console.error('EPUB load failed', error);
      this.contentEl.empty();
      this.contentEl.createDiv({ cls: 'epub-error', text: '无法打开书籍：' + (error instanceof Error ? error.message : String(error)) });
      const retry = this.contentEl.createEl('button', { text: '重试' });
      this.registerDomEvent(retry, 'click', () => { void this.onLoadFile(file); });
    }
  }
  async onUnloadFile(): Promise<void> { ++this.loadVersion; this.releaseReader(); }
  async onClose(): Promise<void> { this.closed = true; ++this.loadVersion; this.releaseReader(); }
  private releaseReader(): void {
    this.disposeReader?.(); this.disposeReader = undefined;
    if (this.store && this.loadedPath) this.app.saveLocalStorage('epub-lbp-' + this.loadedPath, serializeLBP(this.store.state.currentLBP));
    this.store = undefined; this.loadedPath = null;
  }
}
export async function openEpubInView(app: App, filePath: string, position: LBPRange): Promise<void> {
  const leaf = app.workspace.getLeavesOfType(EPUB_VIEW_TYPE).find(leaf => leaf.view instanceof EpubView && leaf.view.file?.path === filePath) ?? app.workspace.getLeaf(true);
  await leaf.setViewState({ type: EPUB_VIEW_TYPE, state: { file: filePath, lbp: serializeLBP(position) } });
  await app.workspace.revealLeaf(leaf);
}
