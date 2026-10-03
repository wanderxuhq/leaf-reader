import type { ReaderStore } from '../epub-store';
import { IconButton } from './icon-button';

export function HistoryControl(props: { store: ReaderStore }) {
  return <div class="epub-history-control" role="group" aria-label="阅读历史">
    <IconButton name="arrow-left" ariaLabel="后退" disabled={!props.store.state.historyBack.length} onClick={() => props.store.travel(-1)} />
    <IconButton name="arrow-right" ariaLabel="前进" disabled={!props.store.state.historyForward.length} onClick={() => props.store.travel(1)} />
  </div>;
}
