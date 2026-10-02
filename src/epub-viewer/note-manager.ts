import { Modal, Notice, type App } from 'obsidian';
import { saveNote } from './note-repository';
export type { NoteEntry } from './note-format';
export async function saveHighlight(app: App, bookId: string, selectedText: string, lbp: string, content = ''): Promise<void> {
  const file = await saveNote(app, bookId, { timestamp: new Date().toISOString(), content, lbp, selectedText });
  new Notice('已保存到 ' + file.path);
}
export function handleAddNote(app: App, bookId: string, selectedText: string, lbp: string, onSaved?: () => void): void {
  new NoteInputModal(app, selectedText, async content => { await saveHighlight(app, bookId, selectedText, lbp, content); onSaved?.(); }).open();
}
class NoteInputModal extends Modal {
  constructor(app: App, private quote: string, private submit: (content: string) => Promise<void>) { super(app); }
  onOpen(): void {
    this.contentEl.createEl('h2', { text: '添加读书笔记' });
    this.contentEl.createEl('blockquote', { text: this.quote });
    const input = this.contentEl.createEl('textarea', { attr: { placeholder: '写下你的想法', rows: '6' } });
    input.classList.add('epub-note-input');
    const save = this.contentEl.createEl('button', { text: '保存', cls: 'mod-cta' });
    save.addEventListener('click', () => {
      save.disabled = true;
      void this.submit(input.value).then(() => this.close()).catch(error => {
        console.error(error); new Notice('笔记保存失败，请重试'); save.disabled = false;
      });
    });
    input.focus();
  }
  onClose(): void { this.contentEl.empty(); }
}
