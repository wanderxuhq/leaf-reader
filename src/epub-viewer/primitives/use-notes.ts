import { t } from '../../i18n';
import { createResource, onCleanup, type Accessor } from 'solid-js';
import { Notice, type App } from 'obsidian';
import { loadNotes } from '../note-repository';
export type { NoteHighlightEntry } from '../note-format';
export function useNotes(app: App, bookId: Accessor<string>, containerRef: Accessor<HTMLElement | undefined>) {
  const [notes, { refetch }] = createResource(bookId, async id => {
    try { return await loadNotes(app,id); } catch (error) { console.error(error); new Notice(t('readNotesFailed')); return []; }
  });
  let ownerWindow: Window = window;
  let timer: number | undefined;
  const refresh = () => { ownerWindow.clearTimeout(timer); ownerWindow = containerRef()?.ownerDocument.defaultView ?? window; timer = ownerWindow.setTimeout(() => { void refetch(); }, 150); };
  const changed = app.metadataCache.on('changed', refresh);
  const deleted = app.vault.on('delete', refresh);
  const renamed = app.vault.on('rename', refresh);
  onCleanup(() => { ownerWindow.clearTimeout(timer); app.metadataCache.offref(changed); app.vault.offref(deleted); app.vault.offref(renamed); });
  return { notes, refetchNotes: refresh };
}
