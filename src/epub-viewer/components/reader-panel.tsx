import { Show, createUniqueId, createEffect, onMount, onCleanup, type JSX } from 'solid-js';
import { IconButton } from './icon-button';

/** Mounted only while open. Keeps focus and dismissal inside this reader. */
export function ReaderPanel(props: { title: string; subtitle?: string; kind: 'toc' | 'settings'; modal: boolean; onClose: () => void; children: JSX.Element }) {
  const titleId = createUniqueId();
  let panel!: HTMLElement;
  let opener: HTMLElement | null = null;
  onMount(() => { opener = panel.ownerDocument.activeElement as HTMLElement | null; });
  createEffect(() => { if (props.modal) panel.querySelector<HTMLButtonElement>('.epub-panel-close')?.focus({ preventScroll: true }); });
  onMount(() => {
    const outside = (event: PointerEvent) => {
      const target = event.target as Element;
      if (!props.modal && props.kind === 'settings' && !panel.contains(target) && !target.closest('.epub-header')) props.onClose();
    };
    panel.ownerDocument.addEventListener('pointerdown', outside);
    onCleanup(() => panel.ownerDocument.removeEventListener('pointerdown', outside));
  });
  onCleanup(() => {
    const restore = props.modal || panel.contains(panel.ownerDocument.activeElement);
    if (restore) queueMicrotask(() => { if (opener?.isConnected) opener.focus({ preventScroll: true }); });
  });
  const keydown = (event: KeyboardEvent) => {
    if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); props.onClose(); }
    if (!props.modal || event.key !== 'Tab') return;
    const controls = Array.from(panel.querySelectorAll<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled), summary, [tabindex="0"]')).filter(el => el.getClientRects().length);
    const first = controls[0], last = controls[controls.length - 1];
    if (event.shiftKey && panel.ownerDocument.activeElement === first) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && panel.ownerDocument.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  return <div class="epub-panel-layer" classList={{ 'is-modal': props.modal }}>
    <div class="epub-panel-backdrop" onClick={props.onClose} aria-hidden="true" />
    <section ref={panel} class={'epub-reader-panel epub-reader-panel-' + props.kind} role="dialog" aria-modal={props.modal ? true : undefined} aria-labelledby={titleId} onKeyDown={keydown}>
      <header class="epub-panel-heading">
        <div><h2 id={titleId}>{props.title}</h2><Show when={props.subtitle}><p>{props.subtitle}</p></Show></div>
        <IconButton name="x" ariaLabel={'关闭' + props.title} class="epub-panel-close" onClick={props.onClose} />
      </header>
      {props.children}
    </section>
  </div>;
}
