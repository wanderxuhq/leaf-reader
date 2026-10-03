import { t } from '../../i18n';
import { Show } from 'solid-js';
import { ViewMode } from '../types';
import type { ReaderSettings } from '../settings';
import { ReaderPanel } from './reader-panel';

export interface SettingsPanelProps {
  settings: ReaderSettings;
  onViewModeChange: (mode: ViewMode) => void;
  onClose: () => void;
  isVisible: boolean;
  modal: boolean;
}
export function SettingsPanel(props: SettingsPanelProps) {
  return <Show when={props.isVisible}><ReaderPanel title={t('readingSettings')} kind="settings" modal={props.modal} onClose={props.onClose}>
    <div class="epub-panel-scroll epub-settings-scroll">
      <section class="epub-preference-group" aria-label={t('readingMode')}>
        <h3>{t('readingMode')}</h3>
        <div class="epub-mode-options" role="group" aria-label={t('readingMode')}>
          <button type="button" aria-pressed={props.settings.viewMode === ViewMode.PAGINATED} onClick={() => props.onViewModeChange(ViewMode.PAGINATED)}>{t('singleChapter')}</button>
          <button type="button" aria-pressed={props.settings.viewMode === ViewMode.SCROLL} onClick={() => props.onViewModeChange(ViewMode.SCROLL)}>{t('continuousScroll')}</button>
        </div>
      </section>
    </div>
    <footer class="epub-panel-footer"><button type="button" class="epub-panel-done" onClick={props.onClose}>{t('done')}</button></footer>
  </ReaderPanel></Show>;
}
