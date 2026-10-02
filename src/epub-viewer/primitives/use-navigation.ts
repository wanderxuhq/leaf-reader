import { captureReadingPosition } from '../position';
import { createEffect, onCleanup, type Accessor } from 'solid-js';
import type { ReaderStore } from '../epub-store';
import { chapterPoint, LBPResolver, rangeFromSelection } from '../lbp';
import { textRange } from '../dom-utils';
export function useNavigation(containerRef: Accessor<HTMLElement | undefined>, store: ReaderStore, ready: Accessor<unknown>) {
  let applied = 0, pending = true;
  createEffect(() => {
    const target = store.state.navigation, container = containerRef(); ready();
    if (!container || applied === target.id) return;
    pending = true;
    const frame = requestAnimationFrame(() => {
      const root = container.querySelector<HTMLElement>('.epub-chapter-body[data-spine="' + target.chapter + '"]');
      if (!root) {
        // A failed chapter is terminal for this attempt, but retry may still produce a root.
        const wrapper = container.querySelector<HTMLElement>('[data-chapter-index="' + target.chapter + '"]');
        if (wrapper?.dataset.loadState === 'error') pending = false;
        return;
      }
      let rect = root.getBoundingClientRect();
      let point = chapterPoint(store.state.bookId,target.chapter);
      if (target.lbp) {
        const range = LBPResolver.rangeInChapter(root,target.chapter,target.lbp);
        if (range) {
          const first = range.getClientRects()[0];
          const element = LBPResolver.resolveElement(root,target.lbp.start.elementPath);
          rect = first ?? element?.getBoundingClientRect() ?? rect;
          point = { ...target.lbp, end: { ...target.lbp.start } };
        } // A stale saved position falls back to its chapter without interrupting reading.
      } else if (target.search) {
        const range = textRange(root,target.search.charOffset,target.search.charOffset + target.search.length);
        if (range) { rect = range.getClientRects()[0] ?? rect; const lbp = rangeFromSelection(store.state.bookId,range,container); if (lbp) point = { ...lbp, end: { ...lbp.start } }; }
      } else if (target.fragment) {
        const anchor = Array.from(root.querySelectorAll<HTMLElement>('[id],[name]')).find(el => el.id === target.fragment || el.getAttribute('name') === target.fragment);
        if (anchor) {
          rect = anchor.getBoundingClientRect();
          const range = anchor.ownerDocument.createRange(); range.selectNodeContents(anchor);
          const lbp = rangeFromSelection(store.state.bookId,range,container); if (lbp) point = { ...lbp, end: { ...lbp.start } };
        }
      }
      container.scrollTop += target.align === 'end' ? root.getBoundingClientRect().bottom - container.getBoundingClientRect().bottom : rect.top - container.getBoundingClientRect().top - 8;
      applied = target.id; pending = false; store.updatePosition(target.align === 'end' ? captureReadingPosition(container, store.state.bookId) ?? point : point);
    });
    onCleanup(() => cancelAnimationFrame(frame));
  });
  return () => pending;
}
