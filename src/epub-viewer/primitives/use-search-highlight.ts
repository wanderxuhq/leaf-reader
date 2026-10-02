import { createEffect, onCleanup, type Accessor } from 'solid-js';
import type { ReaderStore } from '../epub-store';
import { textRange } from '../dom-utils';
export function useSearchHighlight(containerRef: Accessor<HTMLElement | undefined>, store: ReaderStore, ready: Accessor<unknown>): void {
  createEffect(() => {
    const container = containerRef(), results = store.state.searchResults, current = store.state.currentSearchIndex;
    ready(); if (!container) return;
    const frame = requestAnimationFrame(() => {
      container.querySelectorAll('.epub-search-highlight-container').forEach(el => el.remove());
      for (const root of Array.from(container.querySelectorAll<HTMLElement>('.epub-chapter-body'))) {
        const wrapper = root.parentElement!, origin = wrapper.getBoundingClientRect();
        const layer = root.ownerDocument.createElement('div'); layer.className = 'epub-search-highlight-container'; layer.dataset.readerOverlay = 'true';
        for (let i = 0; i < results.length; i++) {
          const match = results[i]!; if (match.chapterIndex !== Number(root.dataset.spine)) continue;
          const range = textRange(root, match.charOffset, match.charOffset + match.length); if (!range) continue;
          for (const rect of Array.from(range.getClientRects())) {
            const mark = root.ownerDocument.createElement('div'); mark.className = 'epub-search-highlight' + (i === current ? ' is-current' : '');
            Object.assign(mark.style, { left: (rect.left-origin.left)+'px', top: (rect.top-origin.top)+'px', width: rect.width+'px', height: rect.height+'px' }); layer.append(mark);
          }
        }
        wrapper.append(layer);
      }
    });
    onCleanup(() => cancelAnimationFrame(frame));
  });
}
