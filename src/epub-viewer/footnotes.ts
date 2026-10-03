import { chapterDocument, EpubResourceProcessor } from './epub-resource-processor';
import { decodePath, sameResource } from './epub-path';
import type { ParsedEpub } from './types';

export interface Footnote { html: string; href: string; anchor: HTMLElement; }
const hasType = (element: Element, type: string) => (element.getAttribute('epub:type') ?? '').split(/\s+/).includes(type);

/** Only declared note references or semantically marked targets become previews. */
export class FootnoteLoader {
  private processor: EpubResourceProcessor;
  constructor(private parsed: ParsedEpub) { this.processor = new EpubResourceProcessor(parsed.zip, parsed.basePath); }
  async read(anchor: HTMLElement): Promise<Footnote | null> {
    const href = anchor.dataset.epubHref;
    if (!href || !href.includes('#')) return null;
    const fragment = decodePath(href.slice(href.indexOf('#') + 1));
    if (!fragment) return null;
    const item = Object.values(this.parsed.manifest).find(item => sameResource(item.href, href));
    if (!item || !/^(application\/xhtml\+xml|text\/html)$/.test(item.mediaType)) return null;
    const raw = await this.parsed.publication.get(item).readAsString();
    if (raw === null) return null;
    const doc = chapterDocument(raw);
    const target = Array.from(doc.querySelectorAll('[id],[name]')).find(el => el.id === fragment || el.getAttribute('name') === fragment);
    if (!target) return null;
    const semantic = (el: Element) => hasType(el, 'footnote') || hasType(el, 'endnote') || ['doc-footnote', 'doc-endnote'].includes(el.getAttribute('role') ?? '');
    let note = target;
    while (!semantic(note) && note.parentElement && note.parentElement !== doc.body) note = note.parentElement;
    const declared = hasType(anchor, 'noteref') || anchor.getAttribute('role') === 'doc-noteref';
    if (!semantic(note)) {
      if (!declared) return null;
      note = target.textContent?.trim() ? target : target.closest('li,p,aside') ?? target;
    }
    if (!note.textContent?.trim() && !note.querySelector('img')) return null;
    // Process only the selected note: no stylesheets, unrelated images or full-book cache.
    const processed = await this.processor.processChapter(note.outerHTML, item.href);
    const preview = new DOMParser().parseFromString(processed.html, 'text/html');
    for (const el of Array.from(preview.querySelectorAll('*'))) {
      for (const attr of ['style', 'class', 'id', 'name', 'hidden', 'data-lidx']) el.removeAttribute(attr);
      if (el.localName === 'a' && (hasType(el, 'backlink') || el.getAttribute('role') === 'doc-backlink')) el.remove();
    }
    preview.querySelectorAll('audio,video,svg,link,style').forEach(el => el.remove());
    return { html: preview.body.innerHTML, href, anchor };
  }
  dispose(): void { this.processor.cleanup(); }
}
