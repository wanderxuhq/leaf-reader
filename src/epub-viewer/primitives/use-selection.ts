import { createEffect, onCleanup, type Accessor } from 'solid-js';
import { Notice, type App, type TFile } from 'obsidian';
import { handleAddNote, saveHighlight } from '../note-manager';
import { rangeFromSelection, serializeLBP } from '../lbp';
import type { NoteHighlightEntry } from './use-notes';
export function useSelection(app: App, file: TFile, containerRef: Accessor<HTMLElement | undefined>, refetchNotes: () => void) {
  let toolbar: HTMLElement | undefined, popup: HTMLElement | undefined;
  const close = () => { toolbar?.remove(); toolbar = undefined; popup?.remove(); popup = undefined; };
  const place = (el: HTMLElement, rect: DOMRect, container: HTMLElement) => {
    const origin = container.getBoundingClientRect();
    el.classList.add('epub-floating-note');
    // Measure in the viewport before positioning, including long note popups.
    el.style.maxWidth = Math.max(0, container.clientWidth - 16) + 'px';
    el.style.maxHeight = Math.max(0, container.clientHeight - 16) + 'px';
    el.style.left = container.scrollLeft + 'px';
    el.style.top = container.scrollTop + 'px';
    container.append(el);
    const bounds = el.getBoundingClientRect();
    const inset = 8;
    const left = Math.max(inset, Math.min(container.clientWidth - bounds.width - inset, rect.left - origin.left));
    const below = rect.bottom - origin.top + inset;
    const preferredTop = below + bounds.height <= container.clientHeight - inset ? below : rect.top - origin.top - bounds.height - inset;
    const top = Math.max(inset, Math.min(container.clientHeight - bounds.height - inset, preferredTop));
    el.style.left = (container.scrollLeft + left) + 'px';
    el.style.top = (container.scrollTop + top) + 'px';
  };
  createEffect(() => {
    const container = containerRef(); if (!container) return;
    const doc = container.ownerDocument;
    const ownerWindow = doc.defaultView ?? window;
    let timer: number | undefined;
    const inspect = () => {
      const selection = doc.getSelection();
      if (!selection || selection.isCollapsed || !selection.rangeCount) { toolbar?.remove(); toolbar = undefined; return; }
      const range = selection.getRangeAt(0);
      const lbp = rangeFromSelection(file.path, range, container); if (!lbp) { close(); return; }
      const text = selection.toString(); if (!text.trim()) return;
      const serialized = serializeLBP(lbp), rect = range.getBoundingClientRect();
      close(); toolbar = container.createDiv(); toolbar.className = 'global-note-button-container'; toolbar.dataset.readerOverlay = 'true';
      const button = (label: string, action: () => void) => {
        const el = toolbar!.createEl('button'); el.textContent = label;
        el.addEventListener('pointerdown', event => event.preventDefault());
        el.addEventListener('click', event => { event.stopPropagation(); action(); close(); });
      };
      button('划线', () => { void saveHighlight(app,file.path,text,serialized).then(refetchNotes).catch(error => { console.error(error); new Notice('划线保存失败'); }); });
      button('笔记', () => handleAddNote(app,file.path,text,serialized,refetchNotes));
      place(toolbar, rect, container);
    };
    const schedule = () => { ownerWindow.clearTimeout(timer); timer = ownerWindow.setTimeout(inspect, 80); };
    doc.addEventListener('selectionchange', schedule);
    container.addEventListener('pointerup', schedule);
    container.addEventListener('scroll', close, { passive: true });
    onCleanup(() => { ownerWindow.clearTimeout(timer); doc.removeEventListener('selectionchange', schedule); container.removeEventListener('pointerup', schedule); container.removeEventListener('scroll', close); close(); });
  });
  return { showNotePopup: (note: NoteHighlightEntry, mark: HTMLElement) => {
    const container = containerRef(); if (!container) return; close();
    popup = container.createDiv(); popup.className = 'epub-note-popup'; popup.dataset.readerOverlay = 'true';
    const quote = popup.createEl('blockquote'); quote.textContent = note.selectedText;
    const text = popup.createEl('p'); text.textContent = note.content || '已划线';
    const dismiss = popup.createEl('button'); dismiss.textContent = '关闭'; dismiss.addEventListener('click', close);
    place(popup, mark.getBoundingClientRect(),container);
  } };
}
