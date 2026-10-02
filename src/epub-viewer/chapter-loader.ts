import type { ParsedEpub } from './types';
import { EpubResourceProcessor, type ProcessedChapter } from './epub-resource-processor';
/** One resource owner per open book, with a bounded processing queue. */
export class ChapterLoader {
  private processor: EpubResourceProcessor;
  private cache = new Map<number, Promise<ProcessedChapter>>();
  private active = 0;
  private queue: Array<() => void> = [];
  private disposed = false;
  constructor(private parsed: ParsedEpub) { this.processor = new EpubResourceProcessor(parsed.zip,parsed.basePath); }
  load(index: number): Promise<ProcessedChapter> {
    const existing = this.cache.get(index); if (existing) return existing;
    const task = new Promise<ProcessedChapter>((resolve,reject) => {
      this.queue.push(() => {
        this.active++;
        void this.read(index).then(resolve,reject).finally(() => { this.active--; this.pump(); });
      });
    });
    this.cache.set(index,task); this.pump();
    void task.catch(() => { if (this.cache.get(index) === task) this.cache.delete(index); });
    return task;
  }
  private pump(): void { while (this.active < 2 && this.queue.length) this.queue.shift()!(); }
  private async read(index: number): Promise<ProcessedChapter> {
    if (this.disposed) throw new Error('Reader closed');
    const link = this.parsed.publication.readingOrder.items[index];
    if (!link) throw new Error('Chapter not found');
    const raw = await this.parsed.publication.get(link).readAsString();
    if (raw === null) throw new Error('无法读取章节 ' + link.href);
    const result = await this.processor.processChapter(raw,link.href);
    if (this.disposed) throw new Error('Reader closed');
    return result;
  }
  dispose(): void { this.disposed = true; this.processor.cleanup(); this.cache.clear(); this.pump(); }
}
