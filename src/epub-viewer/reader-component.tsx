import { FootnotePanel } from './components/footnote-panel';
import type { Footnote } from './footnotes';
import { createSignal, createEffect, Show, onMount, onCleanup } from 'solid-js';
import { Notice, type App, type TFile } from 'obsidian';
import type { ReaderStore } from './epub-store';
import { Direction } from './types';
import { ReaderHeader, ReaderSidebar, SettingsPanel, ChapterList, EpubErrorBoundary } from './components';
import { performSearch } from './search-logic';
export interface ReaderComponentProps { store: ReaderStore; app: App; file: TFile; onOpenNotes?: () => void; }
export function ReaderContent(props: ReaderComponentProps) {
  const store = props.store;
  let reader!: HTMLDivElement;
  const [footnote, setFootnote] = createSignal<Footnote>();
  createEffect(() => { void store.state.navigation.id; void store.state.sidebarVisible; void store.state.settingsVisible; setFootnote(undefined); });
  const [compact, setCompact] = createSignal(false);
  onMount(() => {
    const update = () => setCompact(reader.clientWidth <= 600);
    update();
    const resize = new ResizeObserver(update); resize.observe(reader);
    onCleanup(() => resize.disconnect());
  });
  let searchVersion = 0, disposed = false;
  const [searchError,setSearchError] = createSignal('');
  onCleanup(() => { disposed = true; searchVersion++; });
  const focusMatch = (index: number) => {
    const match = store.state.searchResults[index]; if (!match) return;
    store.setCurrentSearchIndex(index); store.jump({ chapter: match.chapterIndex, search: match });
  };
  const search = async () => {
    const version = ++searchVersion, query = store.state.searchQuery;
    const cancelled = () => disposed || version !== searchVersion || query !== store.state.searchQuery;
    store.clearSearch(); setSearchError(''); store.setSearchBusy(true);
    try {
      const results = await performSearch(store.state.publication,query,cancelled,reader.ownerDocument.defaultView ?? window);
      if (cancelled()) return;
      store.setSearchResults(results);
    } catch (error) {
      if (!cancelled()) { const message = error instanceof Error ? error.message : '搜索失败'; setSearchError(message); new Notice(message); }
    } finally { if (!disposed && version === searchVersion) store.setSearchBusy(false); }
  };
  const changeSetting = <K extends keyof typeof store.state.settings>(key: K,value: typeof store.state.settings[K]) => store.setSettings({ ...store.state.settings, [key]: value });
  return <EpubErrorBoundary><div ref={reader} class="epub-view-container" classList={{ 'has-toc': store.state.sidebarVisible }}>
    <div class="epub-reader-surface" inert={compact() && (store.state.sidebarVisible || store.state.settingsVisible || !!footnote())}>
    <ReaderHeader store={store} onOpenNotes={props.onOpenNotes} onSearch={() => void search()}
      onSearchNavigate={direction => { const total = store.state.searchResults.length; if (total) { const current = store.state.currentSearchIndex; focusMatch(current < 0 ? direction === Direction.Next ? 0 : total - 1 : (current + (direction === Direction.Next ? 1 : -1) + total) % total); } }}
      onNavigatePrevious={() => store.turnPage(-1)}
      onNavigateNext={() => store.turnPage(1)} />
    {store.state.searchBusy && <div class="epub-status" role="status">正在搜索…</div>}
    {searchError() && <div class="epub-error" role="alert">{searchError()}</div>}
    <div class="epub-main">
      <ChapterList onFootnote={setFootnote} store={store} app={props.app} file={props.file} />
    </div>
    </div>
      <ReaderSidebar publication={store.state.publication} chapterIndex={store.state.displayChapterIndex} totalChapters={store.state.totalChapters}
        isVisible={store.state.sidebarVisible} modal={compact()} onClose={() => store.setSidebarVisible(false)} onTocItemClick={href => { store.navigateToHref(href); if (compact()) store.setSidebarVisible(false); }} />
      <SettingsPanel settings={store.state.settings} isVisible={store.state.settingsVisible} modal={compact()} onClose={() => store.setSettingsVisible(false)}
        onViewModeChange={v => changeSetting('viewMode',v)} />
      <Show when={footnote()}>{note => <FootnotePanel note={note()} modal={compact()} reader={() => reader} onClose={() => setFootnote(undefined)} onNavigate={store.navigateToHref} />}</Show>
  </div></EpubErrorBoundary>;
}
