import { createSignal, onMount, onCleanup } from 'solid-js';
import type { Footnote } from '../footnotes';
import { ReaderPanel } from './reader-panel';

export function FootnotePanel(props: { note: Footnote; modal: boolean; reader: () => HTMLElement; onClose: () => void; onNavigate: (href: string) => void }) {
  const [position, setPosition] = createSignal({ left: '0px', top: '0px', width: '360px', 'max-height': '360px' });
  onMount(() => {
    const reader = props.reader(), ownerWindow = reader.ownerDocument.defaultView ?? window;
    const place = () => {
      const origin = reader.getBoundingClientRect(), anchor = props.note.anchor.getBoundingClientRect();
      const width = Math.min(380, reader.clientWidth - 16), height = Math.min(360, reader.clientHeight - 16);
      const left = Math.max(8, Math.min(anchor.left - origin.left, reader.clientWidth - width - 8));
      const below = anchor.bottom - origin.top + 8;
      const top = below + height <= reader.clientHeight - 8 ? below : Math.max(8, anchor.top - origin.top - height - 8);
      setPosition({ left: left + 'px', top: top + 'px', width: width + 'px', 'max-height': height + 'px' });
    };
    place(); ownerWindow.addEventListener('resize', place);
    const scroll = (event: Event) => { if ((event.target as Element).classList?.contains('epub-reading-viewport')) props.onClose(); };
    reader.addEventListener('scroll', scroll, true);
    onCleanup(() => { ownerWindow.removeEventListener('resize', place); reader.removeEventListener('scroll', scroll, true); });
  });
  return <ReaderPanel title="脚注" kind="footnote" modal={props.modal} style={props.modal ? undefined : position()} onClose={props.onClose}>
    <div class="epub-panel-scroll epub-footnote-content" innerHTML={props.note.html} onClick={event => {
      const anchor = (event.target as Element).closest<HTMLAnchorElement>('a[data-epub-href]');
      if (!anchor) return;
      event.preventDefault(); props.onNavigate(anchor.dataset.epubHref!); props.onClose();
    }} />
  </ReaderPanel>;
}
