import { t } from '../../i18n';
import type { ReaderStore } from '../epub-store';
import { IconButton } from './icon-button';

export function HistoryControl(props: { store: ReaderStore }) {
  return <div class="epub-history-control" role="group" aria-label={t('history')}>
    <IconButton name="arrow-left" ariaLabel={t('back')} disabled={!props.store.state.historyBack.length} onClick={() => props.store.travel(-1)} />
    <IconButton name="arrow-right" ariaLabel={t('forward')} disabled={!props.store.state.historyForward.length} onClick={() => props.store.travel(1)} />
  </div>;
}
