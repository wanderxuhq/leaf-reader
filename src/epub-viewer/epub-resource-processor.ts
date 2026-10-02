import type { ZipArchive } from './parsers/zip-parser';
import { resolveHref, decodePath } from './epub-path';
export interface ProcessedChapter { html: string; styles: string[]; }
const blockedElements = 'script, iframe, object, embed, form, input, button, textarea, select, base, meta, foreignObject';
/** Same normalization for rendered chapters and search, so text offsets cannot diverge. */
export function chapterDocument(html: string): Document {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll(blockedElements).forEach(el => el.remove());
  for (const el of Array.from(doc.querySelectorAll('*'))) {
    for (const attr of Array.from(el.attributes)) {
      if (/^on/i.test(attr.name) || /^(srcdoc|srcset|autofocus|contenteditable)$/i.test(attr.name) || /^data-(lidx|spine|reader|epub)/i.test(attr.name)) el.removeAttribute(attr.name);
      else if (/^(href|src|xlink:href|action)$/i.test(attr.name) && /^\s*(javascript|vbscript):/i.test(Array.from(attr.value).filter(char => char.charCodeAt(0) > 32).join(''))) el.removeAttribute(attr.name);
    }
  }
  return doc;
}
export class EpubResourceProcessor {
  private urls = new Map<string, Promise<string | null>>();
  private disposed = false;
  private created = new Set<string>();
  constructor(private zip: ZipArchive, private basePath = '') {}
  private archivePath(href: string): string { return decodePath(resolveHref(href, this.basePath + 'package.opf').split('#')[0]!); }
  private async resource(href: string): Promise<string | null> {
    if (this.disposed || /^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) return null;
    const path = this.archivePath(href);
    if (!this.zip.hasFile(path)) return null;
    let pending = this.urls.get(path);
    if (!pending) {
      pending = this.zip.readBinary(path).then(buffer => {
        if (this.disposed) return null;
        const extension = path.split('.').pop()?.toLowerCase() ?? '';
        const types: Record<string,string> = { png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif', svg:'image/svg+xml', webp:'image/webp', woff:'font/woff', woff2:'font/woff2', ttf:'font/ttf', otf:'font/otf', mp3:'audio/mpeg', mp4:'video/mp4' };
        const url = URL.createObjectURL(new Blob([buffer], { type: types[extension] ?? 'application/octet-stream' }));
        this.created.add(url); return url;
      });
      this.urls.set(path, pending);
    }
    return pending;
  }
  private async resourceReference(reference: string, source: string): Promise<string | null> {
    const value = reference.trim();
    // Fragments and raster data URLs are local references, not archive filenames.
    if (value.startsWith('#') || this.created.has(value)) return value;
    if (/^data:image\/(?:png|jpe?g|gif|webp|avif|bmp|x-icon|vnd\.microsoft\.icon)(?:;[^,]*)?,/i.test(value)) return value;
    if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(value)) return null;
    const resolved = resolveHref(value, source);
    const url = await this.resource(resolved);
    const fragment = resolved.indexOf('#');
    return url && fragment >= 0 ? url + resolved.slice(fragment) : url;
  }
  private async cssUrls(css: string, source: string): Promise<string> {
    const matches = Array.from(css.matchAll(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)]*))\s*\)/gi));
    for (const m of matches) {
      const value = (m[1] ?? m[2] ?? m[3] ?? '').trim();
      const url = await this.resourceReference(value, source);
      css = css.replace(m[0], 'url("' + (url ?? '') + '")');
    }
    return css.replace(/expression\s*\([^)]*\)/gi, '');
  }
  private async stylesheet(href: string, seen = new Set<string>()): Promise<string> {
    const path = this.archivePath(href);
    if (seen.has(path) || seen.size > 16 || !this.zip.hasFile(path)) return '';
    seen.add(path);
    let css = await this.zip.readText(path);
    const imports = Array.from(css.matchAll(/@import\s+(?:url\(\s*)?["']([^"']+)["']\s*\)?[^;]*;/gi));
    for (const m of imports) css = css.replace(m[0], await this.stylesheet(resolveHref(m[1]!, href), seen));
    css = css.replace(/@import[^;]*;/gi, '');
    return this.cssUrls(css, href);
  }
  async processChapter(html: string, chapterPath: string): Promise<ProcessedChapter> {
    const doc = chapterDocument(html);
    const styles: string[] = [];
    for (const el of Array.from(doc.querySelectorAll('style, link[rel="stylesheet"]'))) {
      if (el.tagName.toLowerCase() === 'style') styles.push(await this.cssUrls((el.textContent ?? '').replace(/@import[^;]*;/gi, ''), chapterPath));
      else styles.push(await this.stylesheet(resolveHref(el.getAttribute('href') ?? '', chapterPath)));
      el.remove();
    }
    for (const el of Array.from(doc.body.querySelectorAll('*'))) {
      if (el.hasAttribute('style')) el.setAttribute('style', await this.cssUrls(el.getAttribute('style')!, chapterPath));
      const svgResource = el.namespaceURI === 'http://www.w3.org/2000/svg' && el.localName !== 'a';
      for (const attribute of ['src', 'poster', ...(svgResource ? ['href', 'xlink:href'] : [])]) {
        const value = el.getAttribute(attribute);
        if (!value) continue;
        const url = await this.resourceReference(value, chapterPath);
        if (url) el.setAttribute(attribute, url); else el.removeAttribute(attribute);
      }
      if (el.tagName.toLowerCase() === 'a') {
        const href = el.getAttribute('href'); if (!href) continue;
        if (/^https?:|^mailto:/i.test(href)) { el.setAttribute('target', '_blank'); el.setAttribute('rel', 'noopener noreferrer'); }
        else if (/^(?:[a-z][a-z\d+.-]*:|\/\/)/i.test(href)) el.removeAttribute('href');
        else { el.setAttribute('data-epub-href', resolveHref(href, chapterPath)); el.setAttribute('href', '#'); }
      }
    }
    doc.querySelectorAll('link').forEach(el => el.remove());
    // Keep body classes and direct text in an addressable content element.
    const body = doc.createElement('div');
    body.className = 'epub-book-body ' + doc.body.className;
    body.append(...Array.from(doc.body.childNodes));
    if (doc.body.id) body.id = doc.body.id;
    if (doc.body.getAttribute('dir')) body.setAttribute('dir', doc.body.getAttribute('dir')!);
    const inject = (parent: Element) => Array.from(parent.children).forEach((child, index) => { child.setAttribute('data-lidx', String(index)); inject(child); });
    const wrapper = doc.createElement('div'); wrapper.append(body); inject(wrapper);
    return { html: wrapper.innerHTML, styles };
  }
  cleanup(): void { this.disposed = true; for (const url of this.created) URL.revokeObjectURL(url); this.created.clear(); this.urls.clear(); }
}
