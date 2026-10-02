import { createEffect, onCleanup, type Accessor } from 'solid-js';
import type { ReaderStore } from '../epub-store';
import { captureReadingPosition } from '../position';
export function useScrollTracker(containerRef: Accessor<HTMLElement | undefined>, store: ReaderStore, navigating: () => boolean): void {
  createEffect(() => {
    const el = containerRef(); if (!el) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const capture = () => { if (!navigating()) { const lbp = captureReadingPosition(el, store.state.bookId); if (lbp) store.updatePosition(lbp); } };
    const onScroll = () => { clearTimeout(timer); timer = setTimeout(capture, 120); };
    el.addEventListener('scroll', onScroll, { passive: true });
    onCleanup(() => { clearTimeout(timer); capture(); el.removeEventListener('scroll', onScroll); });
  });
}
