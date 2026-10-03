import { FootnoteLoader, type Footnote } from '../footnotes';
import { captureReadingPosition } from '../position';
import { getTextNodes } from '../dom-utils';
import { createSignal, createMemo, createEffect, untrack, For, Show, onCleanup } from 'solid-js';
import type { App, TFile } from 'obsidian';
import type { ReaderStore } from '../epub-store';
import { ViewMode } from '../types';
import { ChapterLoader } from '../chapter-loader';
import { ChapterContent } from './chapter-content';
import { useNotes } from '../primitives/use-notes';
import { useHighlights } from '../primitives/use-highlights';
import { useSelection } from '../primitives/use-selection';
import { useScrollTracker } from '../primitives/use-scroll-tracker';
import { useNavigation } from '../primitives/use-navigation';
import { useSearchHighlight } from '../primitives/use-search-highlight';
export interface ChapterListProps { store: ReaderStore; app: App; file: TFile; onFootnote?: (note: Footnote) => void; }
export function ChapterList(props: ChapterListProps) {
  const store = props.store;
  const loader = new ChapterLoader(store.state);
  const footnotes = new FootnoteLoader(store.state);
  let linkRequest = 0;
  onCleanup(() => { ++linkRequest; footnotes.dispose(); });
  onCleanup(() => loader.dispose());
  const [container,setContainer] = createSignal<HTMLDivElement>();
  const [revision,setRevision] = createSignal(0);
  const ready = () => setRevision(value => value+1);
  const { notes, refetchNotes } = useNotes(props.app, () => props.file.path, container);
  const { showNotePopup } = useSelection(props.app,props.file,container,refetchNotes);
  const decorations = createMemo(() => [revision(),store.state.settings.fontSize,store.state.settings.lineHeight,store.state.settings.fontFamily]);
  useHighlights(() => notes() ?? [],container,showNotePopup,decorations);
  useSearchHighlight(container,store,decorations);
  const navigating = useNavigation(container,store,revision);
  store.setPositionCapture(() => navigating() ? null : container() ? captureReadingPosition(container()!, store.state.bookId) : null);
  onCleanup(() => store.setPositionCapture());
  useScrollTracker(container,store,navigating);
  createEffect(() => {
    const el = container(); if (!el) return;
    const ownerWindow = el.ownerDocument.defaultView ?? window;
    let frame = 0, disposed = false, previousWidth = el.clientWidth, previousHeight = el.clientHeight;
    const restore = () => {
      ownerWindow.cancelAnimationFrame(frame);
      frame = ownerWindow.requestAnimationFrame(() => { if (!disposed && !navigating()) store.navigateToLBP(store.state.currentLBP); });
    };
    const resize = new ResizeObserver(() => {
      if (el.clientWidth !== previousWidth || el.clientHeight !== previousHeight) {
        previousWidth = el.clientWidth; previousHeight = el.clientHeight; restore();
      }
    });
    resize.observe(el);
    const assetLoaded = (event: Event) => { if ((event.target as Element).matches?.('img, image, video')) restore(); };
    el.addEventListener('load', assetLoaded, true);
    void el.ownerDocument.fonts.ready.then(() => { if (!disposed) restore(); });
    onCleanup(() => { disposed = true; ownerWindow.cancelAnimationFrame(frame); resize.disconnect(); el.removeEventListener('load', assetLoaded, true); });
  });
  createEffect(() => {
    const request = store.state.pageRequest;
    if (!request.id) return;
    untrack(() => {
      const el = container(); if (!el) return;
      const chapter = store.state.chapterIndex;
      const wrapper = el.querySelector<HTMLElement>('[data-chapter-index="' + chapter + '"]');
      if (wrapper?.dataset.loadState === 'error') {
        store.navigate({ chapter: chapter + Math.sign(request.direction), align: request.direction < 0 ? 'end' : 'start' });
        return;
      }
      if (navigating()) return;
      const step = Math.max(1, el.clientHeight * 0.9);
      const root = el.querySelector<HTMLElement>('.epub-chapter-body[data-spine="' + chapter + '"]');
      if (!root) return;
      const viewport = el.getBoundingClientRect(), bounds = root.getBoundingClientRect();
      const firstText = getTextNodes(root).find(node => node.textContent?.trim());
      let firstContentTop = bounds.top;
      if (firstText) {
        const range = root.ownerDocument.createRange(); range.setStart(firstText,0); range.setEnd(firstText,Math.min(1,firstText.length));
        firstContentTop = range.getBoundingClientRect().top;
        for (const image of Array.from(root.querySelectorAll('img,svg'))) firstContentTop = Math.min(firstContentTop,image.getBoundingClientRect().top);
      }
      if (store.state.settings.viewMode === ViewMode.PAGINATED && request.direction > 0 && bounds.bottom <= viewport.bottom + 2) {
        store.navigateToChapter(chapter+1);
      } else if (store.state.settings.viewMode === ViewMode.PAGINATED && request.direction < 0 && (el.scrollTop <= 1 || firstContentTop >= viewport.top - 10)) {
        store.navigate({ chapter: chapter-1, align: 'end' });
      } else {
        el.scrollTop += request.direction * step;
      }
    });
  });
  const linkClick = (event: MouseEvent) => {
    const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[data-epub-href]');
    if (!anchor) return; event.preventDefault();
    const request = ++linkRequest, navigation = store.state.navigation.id;
    void footnotes.read(anchor).then(note => {
      if (request !== linkRequest || navigation !== store.state.navigation.id || !anchor.isConnected) return;
      if (note && props.onFootnote) props.onFootnote(note); else store.navigateToHref(anchor.dataset.epubHref!);
    }).catch(error => {
      console.error('Failed to read footnote', error);
      if (request === linkRequest && navigation === store.state.navigation.id && anchor.isConnected) store.navigateToHref(anchor.dataset.epubHref!);
    });
  };
  return <div ref={setContainer} class="epub-reading-viewport" onClick={linkClick}>
    <div class="epub-chapter-container">
      <For each={store.state.publication.readingOrder.items}>{(_item,index) =>
        <Show when={store.state.settings.viewMode === ViewMode.SCROLL || index() === store.state.chapterIndex}>
          <ChapterContent index={index()} store={store} loader={loader} container={container} ready={ready} />
        </Show>
      }</For>
    </div>
  </div>;
}
