import { TFile, parseYaml, type App } from 'obsidian';
import { formatNote, parseNotes, type NoteEntry, type NoteHighlightEntry } from './note-format';
export function noteTarget(content: string): string | null {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  if (!frontmatter) return null;
  try { const value = (parseYaml(frontmatter[1]!) as Record<string,unknown> | null)?.['epub-target']; return typeof value === 'string' && /\.epub$/i.test(value) ? value : null; } catch { return null; }
}
export async function findNoteFiles(app: App, bookId: string): Promise<TFile[]> {
  const files = app.vault.getMarkdownFiles().filter(file => app.metadataCache.getFileCache(file)?.frontmatter?.['epub-target'] === bookId);
  const defaultPath = bookId.replace(/\.epub$/i, '') + '.notes.md';
  const adjacent = app.vault.getAbstractFileByPath(defaultPath);
  if (adjacent instanceof TFile && !files.some(f => f.path === adjacent.path) && noteTarget(await app.vault.read(adjacent)) === bookId) files.push(adjacent);
  return files.sort((a,b) => a.path.localeCompare(b.path));
}
export interface NoteRecord extends NoteHighlightEntry { sourcePath: string; }
export async function loadNotes(app: App, bookId: string): Promise<NoteRecord[]> {
  const files = await findNoteFiles(app, bookId);
  const notes: NoteRecord[] = [];
  for (const file of files) {
    const content = await app.vault.read(file);
    // Metadata can lag behind an edit; the file itself is the final authority.
    if (noteTarget(content) !== bookId) continue;
    notes.push(...parseNotes(content, bookId).map(note => ({ ...note, sourcePath: file.path })));
  }
  return notes;
}
const pending = new WeakMap<App, Map<string, Promise<TFile>>>();
async function findOrCreate(app: App, bookId: string): Promise<TFile> {
  const found = (await findNoteFiles(app, bookId))[0]; if (found) return found;
  const base = bookId.replace(/\.epub$/i, '') + '.notes';
  let path = base + '.md', index = 1;
  while (app.vault.getAbstractFileByPath(path)) path = base + '-' + index++ + '.md';
  return app.vault.create(path, '---\nepub-target: ' + JSON.stringify(bookId) + '\n---\n');
}
export async function saveNote(app: App, bookId: string, entry: NoteEntry): Promise<TFile> {
  let books = pending.get(app); if (!books) { books = new Map(); pending.set(app,books); }
  const previous = books.get(bookId);
  const operation = (async () => {
    // Serialize the entire create/append transaction for simultaneous reader panes.
    if (previous) { try { await previous; } catch { /* A failed write does not block retries. */ } }
    const file = await findOrCreate(app, bookId);
    const id = 'epub-' + crypto.randomUUID();
    await app.vault.process(file, content => content + formatNote(entry, id));
    return file;
  })();
  books.set(bookId, operation);
  try { return await operation; } finally { if (books.get(bookId) === operation) books.delete(bookId); }
}
