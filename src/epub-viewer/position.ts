import { getTextNodes } from './dom-utils';
import { chapterPoint, pointFromDom, type LBPRange } from './lbp';
/** Capture content coordinates at the viewport top; layout pixels never leave this function. */
export function captureReadingPosition(container: HTMLElement, bookId: string): LBPRange | null {
  const viewport = container.getBoundingClientRect();
  for (const root of Array.from(container.querySelectorAll<HTMLElement>('.epub-chapter-body'))) {
    const rect = root.getBoundingClientRect();
    if (rect.bottom <= viewport.top + 4 || rect.top >= viewport.bottom) continue;
    const chapter = Number(root.dataset.spine);
    for (const node of getTextNodes(root)) {
      if (!node.textContent?.trim()) continue;
      const range = root.ownerDocument.createRange(); range.selectNodeContents(node);
      const bounds = range.getBoundingClientRect();
      if (bounds.bottom <= viewport.top + 4 || !bounds.height || bounds.top >= viewport.bottom) continue;
      let low = 0, high = node.length;
      while (low < high) {
        const mid = Math.floor((low + high) / 2);
        range.setStart(node, mid); range.setEnd(node, Math.min(mid + 1, node.length));
        if (range.getBoundingClientRect().bottom <= viewport.top + 4) low = mid + 1; else high = mid;
      }
      return pointFromDom(bookId, chapter, root, node, low);
    }
    return chapterPoint(bookId, chapter);
  }
  return null;
}
