import type { Publication } from './types';
import { chapterDocument } from './epub-resource-processor';
export interface SearchMatch { id: string; chapterIndex: number; chapterTitle: string; previewText: string; charOffset: number; length: number; }
export async function performSearch(publication: Publication, query: string, cancelled: () => boolean = () => false): Promise<SearchMatch[]> {
  if (!query.trim()) return [];
  const results: SearchMatch[] = [];
  const escaped = query.split('').map(char => '\\u' + char.charCodeAt(0).toString(16).padStart(4, '0')).join('');
  for (let chapterIndex = 0; chapterIndex < publication.readingOrder.items.length; chapterIndex++) {
    if (cancelled()) return [];
    const link = publication.readingOrder.items[chapterIndex]!;
    const html = await publication.get(link).readAsString();
    if (html === null) throw new Error('无法搜索章节：' + (link.title ?? link.href));
    const doc = chapterDocument(html); doc.querySelectorAll('style,link').forEach(el => el.remove());
    const text = doc.body.textContent ?? '';
    const pattern = new RegExp(escaped, 'giu');
    for (const match of text.matchAll(pattern)) {
      const offset = match.index;
      results.push({ id: chapterIndex + '-' + offset, chapterIndex, chapterTitle: link.title ?? 'Chapter ' + (chapterIndex+1),
        charOffset: offset, length: match[0].length, previewText: text.slice(Math.max(0,offset-40),offset+match[0].length+40) });
    }
    await new Promise(resolve => setTimeout(resolve, 0));
  }
  return cancelled() ? [] : results;
}
