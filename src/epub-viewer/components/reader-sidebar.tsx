import { createMemo, createSignal, For, Show, onMount, onCleanup } from 'solid-js';
import type { Publication, Link } from '../types';
import { sameResource } from '../epub-path';
import { ReaderPanel } from './reader-panel';
import { IconButton } from './icon-button';

export interface ReaderSidebarProps {
  publication: Publication | null;
  onTocItemClick: (href: string) => void;
  chapterIndex: number;
  totalChapters: number;
  isVisible: boolean;
  modal: boolean;
  onClose: () => void;
}
interface TocEntry { link: Link; key: string; level: number; children: TocEntry[]; }
const matches = (entry: TocEntry, query: string): boolean => !query || (entry.link.title ?? '').toLocaleLowerCase().includes(query) || entry.children.some(child => matches(child, query));

function TocContents(props: ReaderSidebarProps) {
  const [query, setQuery] = createSignal('');
  const filter = createMemo(() => query().trim().toLocaleLowerCase());
  const entries = createMemo(() => {
    const toc = props.publication?.toc?.items;
    const links = toc?.length ? toc : props.publication?.readingOrder.items ?? [];
    const tree = (items: readonly Link[], level = 0, prefix = ''): TocEntry[] => items.map((link, index) => ({
      link: { ...link, title: link.title || '第 ' + (index + 1) + ' 节' }, key: prefix + index, level,
      children: tree(link.children?.items ?? [], level + 1, prefix + index + '-'),
    }));
    return tree(links);
  });
  const activeKey = createMemo(() => {
    const href = props.publication?.readingOrder.items[props.chapterIndex]?.href;
    const flatten = (items: TocEntry[]): TocEntry[] => items.flatMap(item => [item, ...flatten(item.children)]);
    return href ? flatten(entries()).find(item => sameResource(item.link.href, href))?.key : undefined;
  });
  let list!: HTMLDivElement;
  onMount(() => {
    const ownerWindow = list.ownerDocument.defaultView ?? window;
    const frame = ownerWindow.requestAnimationFrame(() => list.querySelector('[aria-current="location"]')?.scrollIntoView({ block: 'nearest' }));
    onCleanup(() => ownerWindow.cancelAnimationFrame(frame));
  });
  function Branch(branch: { entry: TocEntry }) {
    const [collapsed, setCollapsed] = createSignal(false);
    const expanded = () => !!filter() || !collapsed();
    return <Show when={matches(branch.entry, filter())}>
      <li class="epub-toc-branch">
        <div class="epub-toc-row" style={{ '--toc-depth': Math.min(branch.entry.level, 4) }}>
          <Show when={branch.entry.children.length} fallback={<span class="epub-toc-spacer" />}>
            <IconButton name={expanded() ? 'chevron-down' : 'chevron-right'} ariaLabel={(expanded() ? '收起 ' : '展开 ') + branch.entry.link.title}
              expanded={expanded()} class="epub-toc-toggle" onClick={() => setCollapsed(value => !value)} disabled={!!filter()} />
          </Show>
          <button type="button" class="epub-toc-link" title={branch.entry.link.title} aria-current={activeKey() === branch.entry.key ? 'location' : undefined}
            onClick={() => props.onTocItemClick(branch.entry.link.href)}>{branch.entry.link.title}</button>
        </div>
        <Show when={branch.entry.children.length && expanded()}><ul class="epub-toc-tree"><For each={branch.entry.children}>{entry => <Branch entry={entry} />}</For></ul></Show>
      </li>
    </Show>;
  }
  return <>
    <div class="epub-toc-filter"><input type="search" aria-label="筛选目录" placeholder="查找章节…" value={query()} onInput={event => setQuery(event.currentTarget.value)} /></div>
    <div ref={list} class="epub-panel-scroll epub-toc-scroll">
      <nav aria-label="书籍目录"><ul class="epub-toc-tree"><For each={entries()}>{entry => <Branch entry={entry} />}</For></ul></nav>
      <Show when={!entries().some(entry => matches(entry, filter()))}><p class="epub-panel-empty" role="status">没有匹配的章节</p></Show>
    </div>
    <footer class="epub-panel-footer"><span>当前章节</span><strong>{props.chapterIndex + 1} / {props.totalChapters}</strong></footer>
  </>;
}
export function ReaderSidebar(props: ReaderSidebarProps) {
  return <Show when={props.isVisible}><ReaderPanel title="目录" subtitle={props.publication?.metadata.title} kind="toc" modal={props.modal} onClose={props.onClose}><TocContents {...props} /></ReaderPanel></Show>;
}
