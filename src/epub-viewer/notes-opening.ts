import { t } from '../i18n';
import { preferNotes, staysInMarkdown } from './notes-view-mode';
import { FileView, Notice, Platform, TFile, type App, type Plugin, type WorkspaceLeaf } from 'obsidian';
import { NOTES_VIEW_TYPE, type BookNotesState } from './notes-view';
import { findNoteFiles, noteTarget } from './note-repository';

export async function openNotesFile(app: App, file: TFile, preferred?: WorkspaceLeaf, context?: BookNotesState): Promise<void> {
  if (file.extension !== 'md' || !noteTarget(await app.vault.read(file))) { new Notice(t('notNotesFile')); return; }
  const existing = app.workspace.getLeavesOfType(NOTES_VIEW_TYPE).find(leaf => leaf.view.getState().file === file.path);
  const leaf = preferred ?? existing ?? (Platform.isMobile ? app.workspace.getLeaf(true) : app.workspace.getRightLeaf(true) ?? app.workspace.getLeaf(true));
  preferNotes(leaf);
  await leaf.setViewState({ type: NOTES_VIEW_TYPE, state: { ...context, file: file.path }, active: true });
  await app.workspace.revealLeaf(leaf);
}

export async function openBookNotes(app: App, state: BookNotesState): Promise<void> {
  const file = (await findNoteFiles(app, state.book))[0];
  if (!file) { new Notice(t('noNotesYet')); return; }
  await openNotesFile(app, file, undefined, state);
}

/** Associated notes open automatically; ordinary Markdown keeps its normal view. */
export function registerNotesOpening(plugin: Plugin): void {
  const app = plugin.app;
  let disposed = false;
  const requests = new WeakMap<WorkspaceLeaf, number>();
  plugin.register(() => { disposed = true; });
  const autoOpen = () => {
    const view = app.workspace.getActiveViewOfType(FileView);
    if (!view || view.getViewType() !== 'markdown' || !view.file) return;
    const file = view.file, leaf = view.leaf;
    if (staysInMarkdown(leaf, file.path) || file.extension !== 'md') return;
    const request = (requests.get(leaf) ?? 0) + 1; requests.set(leaf, request);
    void app.vault.read(file).then(async content => {
      if (disposed || requests.get(leaf) !== request || leaf.view !== view || view.file !== file || app.workspace.getActiveViewOfType(FileView) !== view || staysInMarkdown(leaf, file.path)) return;
      if (!noteTarget(content)) return;
      await leaf.setViewState({ type: NOTES_VIEW_TYPE, state: { file: file.path }, active: true });
    }).catch(error => { if (!disposed) console.error('Failed to open reading notes', error); });
  };
  plugin.registerEvent(app.workspace.on('file-open', autoOpen));
  plugin.registerEvent(app.workspace.on('active-leaf-change', autoOpen));
  plugin.registerEvent(app.metadataCache.on('changed', file => {
    if (app.workspace.getActiveViewOfType(FileView)?.file === file) autoOpen();
  }));
  app.workspace.onLayoutReady(autoOpen);
  const eligible = (file: TFile | null): file is TFile => !!file && file.extension === 'md' && typeof app.metadataCache.getFileCache(file)?.frontmatter?.['epub-target'] === 'string';
  const open = (file: TFile, leaf?: WorkspaceLeaf) => { void openNotesFile(app, file, leaf).catch(error => { console.error(error); new Notice(t('openNotesFailed')); }); };
  plugin.registerEvent(app.workspace.on('file-menu', (menu, file, _source, leaf) => {
    if (!(file instanceof TFile) || !eligible(file)) return;
    menu.addItem(item => item.setTitle(t('openAsNotes')).setIcon('notebook-pen').onClick(() => open(file, leaf)));
  }));
  plugin.addCommand({ id: 'open-reading-notes', name: t('openAsNotes'), checkCallback: checking => {
    const view = app.workspace.getActiveViewOfType(FileView);
    if (!view || !eligible(view.file)) return false;
    if (!checking) open(view.file, view.leaf);
    return true;
  } });
}
