import { batch } from 'solid-js';
import { createStore } from 'solid-js/store';
import type { ReaderSettings } from './settings';
import { normalizeSettings } from './settings';
import type { ParsedEpub } from './types';
import type { SearchMatch } from './search-logic';
import { chapterPoint, type LBPRange } from './lbp';
import { sameResource, decodePath } from './epub-path';
export interface Navigation { id: number; chapter: number; lbp?: LBPRange; fragment?: string; search?: SearchMatch; align?: 'start' | 'end'; }
export function createReaderStore(parsed: ParsedEpub, bookId: string, settings: ReaderSettings, position: LBPRange | null,
  onPosition: (position: LBPRange) => void, onSettings: (settings: ReaderSettings) => void) {
  const count = parsed.publication.readingOrder.items.length;
  const initial = position?.bookId === bookId && position.end.spineIndex < count ? position : chapterPoint(bookId, 0);
  const navigation: Navigation = { id: 1, chapter: initial.start.spineIndex, lbp: initial };
  const [state, set] = createStore({
    ...parsed, bookId, totalChapters: count, chapterIndex: initial.start.spineIndex, displayChapterIndex: initial.start.spineIndex,
    settings: normalizeSettings(settings), currentLBP: initial,
    navigation,
    immersive: false, sidebarVisible: false, settingsVisible: false, searchVisible: false,
    searchQuery: '', searchResults: [] as SearchMatch[], currentSearchIndex: -1, searchBusy: false, pageRequest: { id: 0, direction: 1 },
  });
  let sequence = 1;
  const navigate = (target: Omit<Navigation, 'id'>) => {
    if (!Number.isInteger(target.chapter) || target.chapter < 0 || target.chapter >= count) return;
    if (target.lbp && (target.lbp.bookId !== bookId || target.lbp.end.spineIndex >= count)) return;
    batch(() => { set('chapterIndex', target.chapter); set('displayChapterIndex', target.chapter); set('navigation', { lbp: undefined, fragment: undefined, search: undefined, align: undefined, ...target, id: ++sequence }); });
  };
  const navigateToChapter = (chapter: number) => navigate({ chapter });
  const clearSearch = () => batch(() => { set('searchResults', []); set('currentSearchIndex', -1); });
  const setSidebarVisible = (value: boolean) => batch(() => { set('sidebarVisible', value); if (value) set('settingsVisible', false); });
  const setSettingsVisible = (value: boolean) => batch(() => { set('settingsVisible', value); if (value) set('sidebarVisible', false); });
  return {
    state, navigate, navigateToChapter,
    turnPage: (direction: number) => set('pageRequest', { id: state.pageRequest.id + 1, direction }),
    navigateToLBP: (lbp: LBPRange) => navigate({ chapter: lbp.start.spineIndex, lbp }),
    navigateToHref: (href: string) => {
      const chapter = state.publication.readingOrder.items.findIndex(item => sameResource(item.href, href));
      if (chapter >= 0) navigate({ chapter, fragment: decodePath(href.split('#').slice(1).join('#')) });
    },
    updatePosition: (lbp: LBPRange) => {
      if (lbp.bookId !== bookId) return;
      batch(() => { set('currentLBP', lbp); set('chapterIndex', lbp.start.spineIndex); set('displayChapterIndex', lbp.start.spineIndex); });
      onPosition(lbp);
    },
    setSettings: (value: ReaderSettings) => {
      const next = normalizeSettings(value);
      batch(() => { set('settings', next); navigate({ chapter: state.currentLBP.start.spineIndex, lbp: state.currentLBP }); });
      onSettings(next);
    },
    setSidebarVisible, setSettingsVisible,
    toggleSidebar: () => setSidebarVisible(!state.sidebarVisible),
    toggleSettings: () => setSettingsVisible(!state.settingsVisible),
    toggleSearch: () => { set('searchVisible', v => !v); if (!state.searchVisible) { set('searchQuery', ''); clearSearch(); } },
    setSearchQuery: (v: string) => { set('searchQuery', v); clearSearch(); },
    setSearchResults: (v: SearchMatch[]) => set('searchResults', v),
    setCurrentSearchIndex: (v: number) => set('currentSearchIndex', v),
    setSearchBusy: (v: boolean) => set('searchBusy', v),
    clearSearch,
  };
}
export type ReaderStore = ReturnType<typeof createReaderStore>;
