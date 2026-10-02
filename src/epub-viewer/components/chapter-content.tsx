import { createEffect, createResource, createSignal, onCleanup, onMount, Show } from 'solid-js';
import type { ReaderStore } from '../epub-store';
import type { ChapterLoader } from '../chapter-loader';
import { scopeChapterStyles } from '../chapter-styles';
let nextChapterId = 0;
export function ChapterContent(props: { index: number; store: ReaderStore; loader: ChapterLoader; container: () => HTMLElement | undefined; ready: () => void }) {
  let wrapper!: HTMLDivElement;
  const id = 'epub-chapter-' + ++nextChapterId;
  const [visible,setVisible] = createSignal(false);
  const active = () => visible() || Math.abs(props.index - props.store.state.chapterIndex) <= props.store.state.settings.renderAheadCount;
  createEffect(() => { if (active()) setVisible(true); });
  const [content, { refetch }] = createResource(active, async enabled => {
    if (!enabled) return null;
    try { return { chapter: await props.loader.load(props.index), error: '' }; }
    catch (error) { return { chapter: null, error: error instanceof Error ? error.message : String(error) }; }
  });
  onMount(() => {
    const observer = new IntersectionObserver(entries => { if (entries.some(e => e.isIntersecting)) setVisible(true); },
      { root: props.container(), rootMargin: props.store.state.settings.scrollPadding + 'px' });
    observer.observe(wrapper); onCleanup(() => observer.disconnect());
    const resize = new ResizeObserver(() => props.ready()); resize.observe(wrapper); onCleanup(() => resize.disconnect());
  });
  createEffect(() => { content(); void content.loading; const frame = requestAnimationFrame(props.ready); onCleanup(() => cancelAnimationFrame(frame)); });
  return <div ref={wrapper} id={id} class="epub-chapter-wrapper" data-chapter-index={props.index}
    data-load-state={content.loading ? 'loading' : content()?.error ? 'error' : content()?.chapter ? 'ready' : 'idle'}>
    <Show when={content()?.chapter} fallback={<div class="epub-chapter-loading">
      {content()?.error || '加载章节…'}
      <Show when={content()?.error}><button onClick={() => void refetch()}>重试</button></Show>
    </div>}>
      {chapter => <>
        <style>{scopeChapterStyles(chapter().styles, '#' + id)}</style>
        <div class="epub-chapter-body" data-spine={props.index} innerHTML={chapter().html}
          style={{ 'font-size': props.store.state.settings.fontSize + 'px', 'line-height': props.store.state.settings.lineHeight,
            'font-family': props.store.state.settings.fontFamily }} />
      </>}
    </Show>
  </div>;
}
