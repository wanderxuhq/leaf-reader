import { preferMarkdown, preferNotes } from './notes-view-mode';
import { Component, FileView, MarkdownRenderer, Notice, type TAbstractFile, type ViewStateResult } from 'obsidian';
import { noteTarget, type NoteRecord } from './note-repository';
import { parseNotes } from './note-format';
import { openEpubInView } from './epub-view';

export const NOTES_VIEW_TYPE = 'leaf-reader-notes';
export interface BookNotesState { book: string; title: string; chapters: string[]; }

/** A file-backed alternative to the Markdown editor, never an extension override. */
export class BookNotesView extends FileView {
  private book: BookNotesState = { book: '', title: '', chapters: [] };
  private entries: NoteRecord[] = [];
  private query = '';
  private list?: HTMLElement;
  private generation = 0;
  private timer?: number;
  private ownerWindow?: Window;
  private markdown?: Component;
  private closed = false;
  getViewType(): string { return NOTES_VIEW_TYPE; }
  getDisplayText(): string { return this.file?.basename ?? '读书笔记'; }
  getIcon(): string { return 'notebook-pen'; }
  // Enter only via an explicit view switch, never by opening an arbitrary .md.
  canAcceptExtension(): boolean { return false; }
  getState(): Record<string, unknown> { return { ...super.getState(), file: this.file?.path, ...this.book }; }
  async setState(value: unknown, result: ViewStateResult): Promise<void> {
    const state = value && typeof value === 'object' ? value as Partial<BookNotesState> & { file?: string } : {};
    this.book = { book: typeof state.book === 'string' ? state.book : '', title: typeof state.title === 'string' ? state.title : '',
      chapters: Array.isArray(state.chapters) ? state.chapters.filter((item): item is string => typeof item === 'string') : [] };
    this.entries = []; this.query = ''; this.renderShell();
    const previous = this.file;
    await super.setState(state, result);
    if (this.file === previous) await this.refresh();
  }
  async onOpen(): Promise<void> {
    this.closed = false;
    this.ownerWindow = this.contentEl.ownerDocument.defaultView ?? window;
    this.contentEl.addClass('epub-notes-view');
    const schedule = (file: TAbstractFile) => {
      if (file.path !== this.file?.path) return;
      this.ownerWindow?.clearTimeout(this.timer);
      this.timer = this.ownerWindow?.setTimeout(() => { void this.refresh(); }, 150);
    };
    this.registerEvent(this.app.metadataCache.on('changed', schedule));
    this.registerEvent(this.app.vault.on('modify', schedule));
    this.renderShell();
  }
  async onLoadFile(): Promise<void> { await this.refresh(); }
  async onUnloadFile(): Promise<void> {
    ++this.generation; this.ownerWindow?.clearTimeout(this.timer);
    this.entries = []; this.markdown?.unload(); this.contentEl.empty();
  }
  async onClose(): Promise<void> { this.closed = true; await this.onUnloadFile(); }
  private renderShell(): void {
    this.markdown?.unload(); this.markdown = undefined;
    this.contentEl.empty();
    const heading = this.contentEl.createDiv({ cls: 'epub-notes-heading' });
    heading.createEl('h2', { text: this.book.title || this.file?.basename || '读书笔记' });
    heading.createEl('button', { text: 'Markdown', attr: { 'aria-label': '切换到 Markdown 编辑器' } }).addEventListener('click', () => { void this.editMarkdown(); });
    const filter = this.contentEl.createEl('input', { type: 'search', placeholder: '搜索引文和笔记…', attr: { 'aria-label': '搜索读书笔记' } });
    filter.value = this.query;
    filter.addEventListener('input', () => { this.query = filter.value; if (this.list) this.list.scrollTop = 0; this.renderEntries(); });
    this.list = this.contentEl.createDiv({ cls: 'epub-notes-list', attr: { 'aria-live': 'polite' } });
  }
  private async editMarkdown(): Promise<void> {
    const file = this.file; if (!file) return;
    try {
      if (this.closed || this.file !== file) return;
      preferMarkdown(this.leaf, file.path);
      await this.leaf.setViewState({ type: 'markdown', state: { file: file.path, mode: 'source' }, active: true });
    } catch (error) { preferNotes(this.leaf); console.error(error); new Notice('无法打开 Markdown'); }
  }
  private async refresh(): Promise<void> {
    const version = ++this.generation, file = this.file;
    if (!file || this.closed) return;
    try {
      const content = await this.app.vault.read(file);
      if (version !== this.generation || this.closed || this.file !== file) return;
      const book = noteTarget(content);
      if (book !== this.book.book) this.book = { book: book ?? '', title: '', chapters: [] };
      const scroll = this.list?.scrollTop ?? 0;
      this.entries = book ? parseNotes(content, book).map(note => ({ ...note, sourcePath: file.path })) : [];
      // Keep the search field intact when Markdown content changes.
      if (!this.list?.isConnected) this.renderShell();
      const heading = this.contentEl.querySelector('h2'); if (heading) heading.textContent = this.book.title || file.basename;
      if (!book) { this.list?.empty(); this.list?.createEl('p', { text: '这不是读书笔记文件，请使用 Markdown 编辑器打开。' }); return; }
      this.renderEntries(); if (this.list) this.list.scrollTop = scroll;
    } catch (error) {
      if (version !== this.generation || this.closed) return;
      console.error('Failed to read book notes', error); this.entries = [];
      this.list?.empty(); this.list?.createEl('p', { text: '无法读取笔记。' });
      this.list?.createEl('button', { text: '重试' }).addEventListener('click', () => { void this.refresh(); });
    }
  }
  private renderEntries(): void {
    const list = this.list; if (!list) return;
    const scrollTop = list.scrollTop;
    this.markdown?.unload(); this.markdown = new Component(); this.markdown.load();
    list.empty();
    const query = this.query.trim().toLocaleLowerCase();
    const entries = this.entries.filter(note => (note.selectedText + '\n' + note.content).toLocaleLowerCase().includes(query))
      .sort((a,b) => a.lbpRange.start.spineIndex - b.lbpRange.start.spineIndex);
    if (!entries.length) { list.createEl('p', { cls: 'epub-panel-empty', text: query ? '没有匹配的笔记' : '选中文字，添加划线或笔记后会显示在这里。' }); return; }
    let chapter = -1, section = list;
    for (const note of entries) {
      const index = note.lbpRange.start.spineIndex;
      if (index !== chapter) {
        chapter = index; section = list.createEl('section');
        section.createEl('h3', { text: this.book.chapters[index] || '第 ' + (index + 1) + ' 章' });
      }
      const entry = section.createEl('article', { cls: 'epub-notes-entry' });
      const quote = entry.createEl('button', { cls: 'epub-notes-quote', text: note.selectedText || '返回原文', attr: { 'aria-label': '返回原文：' + note.selectedText } });
      quote.addEventListener('click', () => { void openEpubInView(this.app, this.book.book, note.lbpRange).catch(error => { console.error(error); new Notice('无法打开原文'); }); });
      if (note.content) {
        const annotation = entry.createDiv({ cls: 'epub-annotation' });
        const body = annotation.createDiv({ cls: 'epub-notes-content' });
        void MarkdownRenderer.render(this.app, note.content, body, note.sourcePath, this.markdown).catch(error => { console.error(error); body.textContent = note.content; });
      }
    }
    list.scrollTop = scrollTop;
  }
}
