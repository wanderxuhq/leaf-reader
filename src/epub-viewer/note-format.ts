import { parseLBP, type LBPRange } from './lbp';
export interface NoteHighlightEntry { id: string; selectedText: string; content: string; lbp: string; lbpRange: LBPRange; }
export interface NoteEntry { timestamp: string; content: string; lbp: string; selectedText: string; }
export function formatNote(entry: NoteEntry, id: string): string {
  const quote = entry.selectedText.replace(/\r\n?/g, '\n').split('\n').map(line => '> ' + line).join('\n');
  return '\n<!-- epub-note:' + id + ' -->\n[🔗](obsidian://epub-ref?data=' + encodeURIComponent(entry.lbp) + ')\n' + quote + '\n\n' + entry.content + '\n^' + id + '\n<!-- /epub-note -->\n';
}
export function parseNotes(markdown: string, bookId: string): NoteHighlightEntry[] {
  const notes: NoteHighlightEntry[] = [];
  const normalized = markdown.replace(/\r\n?/g, '\n');
  const blocks = /<!-- epub-note:([a-zA-Z0-9-]+) -->\n([\s\S]*?)\n<!-- \/epub-note -->/g;
  for (const match of normalized.matchAll(blocks)) {
    const lines = match[2]!.split('\n');
    const link = /^\[🔗\]\(obsidian:\/\/epub-ref\?data=([^)]*)\)$/.exec(lines.shift() ?? '');
    if (!link) continue;
    let lbp: string; try { lbp = decodeURIComponent(link[1]!); } catch { continue; }
    const lbpRange = parseLBP(lbp); if (!lbpRange || lbpRange.bookId !== bookId) continue;
    const quote: string[] = [];
    while (lines[0]?.startsWith('>')) quote.push(lines.shift()!.replace(/^> ?/, ''));
    if (lines[0] === '') lines.shift();
    if (lines[lines.length-1] === '^' + match[1]) lines.pop();
    notes.push({ id: match[1]!, selectedText: quote.join('\n'), content: lines.join('\n').trim(), lbp, lbpRange });
  }
  return notes;
}
