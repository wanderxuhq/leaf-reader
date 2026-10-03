import { createEffect, onCleanup, type Accessor } from 'solid-js';
import type { ReaderStore } from '../epub-store';
import { captureReadingPosition } from '../position';
export function useScrollTracker(containerRef: Accessor<HTMLElement | undefined>, store: ReaderStore, navigating: () => boolean): void {
  createEffect(() => {
    const el = containerRef(); if (!el) return;
    const ownerWindow = el.ownerDocument.defaultView ?? window;
    let timer: number | undefined;
    const capture = () => { if (!navigating()) { const lbp = captureReadingPosition(el, store.state.bookId); if (lbp) store.updatePosition(lbp); } };
    const onScroll = () => { ownerWindow.clearTimeout(timer); timer = ownerWindow.setTimeout(capture, 120); };
    el.addEventListener('scroll', onScroll, { passive: true });
    onCleanup(() => { ownerWindow.clearTimeout(timer); capture(); el.removeEventListener('scroll', onScroll); });
  });
}
