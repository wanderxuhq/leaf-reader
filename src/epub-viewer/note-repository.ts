import { TFile, parseYaml, type App } from 'obsidian';
import { formatNote, parseNotes, type NoteEntry, type NoteHighlightEntry } from './note-format';
function target(content: string): unknown {
  const frontmatter = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/.exec(content);
  if (!frontmatter) return null;
  try { return (parseYaml(frontmatter[1]!) as Record<string,unknown> | null)?.['epub-target']; } catch { return null; }
}
export async function findNoteFiles(app: App, bookId: string): Promise<TFile[]> {
  const files = app.vault.getMarkdownFiles().filter(file => app.metadataCache.getFileCache(file)?.frontmatter?.['epub-target'] === bookId);
  const defaultPath = bookId.replace(/\.epub$/i, '') + '.notes.md';
  const adjacent = app.vault.getAbstractFileByPath(defaultPath);
  if (adjacent instanceof TFile && !files.some(f => f.path === adjacent.path) && target(await app.vault.read(adjacent)) === bookId) files.push(adjacent);
  return files.sort((a,b) => a.path.localeCompare(b.path));
}
export async function loadNotes(app: App, bookId: string): Promise<NoteHighlightEntry[]> {
  const files = await findNoteFiles(app, bookId);
  const notes: NoteHighlightEntry[] = [];
  for (const file of files) notes.push(...parseNotes(await app.vault.read(file), bookId));
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
