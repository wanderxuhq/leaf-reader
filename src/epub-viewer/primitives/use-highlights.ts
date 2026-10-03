import { createEffect, onCleanup, type Accessor } from 'solid-js';
import type { NoteHighlightEntry } from './use-notes';
import { LBPResolver } from '../lbp';
export function useHighlights(notes: Accessor<NoteHighlightEntry[]>, containerRef: Accessor<HTMLElement | undefined>,
  onNoteClick: (note: NoteHighlightEntry, el: HTMLElement) => void, contentReady?: Accessor<unknown>): void {
  createEffect(() => {
    const container = containerRef(), entries = notes(); contentReady?.();
    if (!container) return;
    const ownerWindow = container.ownerDocument.defaultView ?? window;
    const frame = ownerWindow.requestAnimationFrame(() => {
      container.querySelectorAll('.epub-note-highlight-container').forEach(el => el.remove());
      for (const root of Array.from(container.querySelectorAll<HTMLElement>('.epub-chapter-body'))) {
        const chapter = Number(root.dataset.spine), wrapper = root.parentElement!;
        const layer = wrapper.createDiv(); layer.className = 'epub-note-highlight-container'; layer.dataset.readerOverlay = 'true';
        const origin = wrapper.getBoundingClientRect();
        for (const note of entries) {
          if (!note.lbpRange) continue;
          const range = LBPResolver.rangeInChapter(root, chapter, note.lbpRange); if (!range || range.collapsed) continue;
          for (const rect of Array.from(range.getClientRects())) {
            if (!rect.width || !rect.height) continue;
            const mark = layer.createDiv(); mark.className = 'epub-note-highlight'; mark.dataset.noteId = note.id;
            Object.assign(mark.style, { left: (rect.left-origin.left)+'px', top: (rect.top-origin.top)+'px', width: rect.width+'px', height: rect.height+'px' });
            mark.addEventListener('click', event => { event.stopPropagation(); onNoteClick(note, mark); });
          }
        }
      }
    });
    onCleanup(() => ownerWindow.cancelAnimationFrame(frame));
  });
}
