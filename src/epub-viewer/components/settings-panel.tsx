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
  return <Show when={props.isVisible}><ReaderPanel title="阅读设置" kind="settings" modal={props.modal} onClose={props.onClose}>
    <div class="epub-panel-scroll epub-settings-scroll">
      <section class="epub-preference-group" aria-label="阅读模式">
        <h3>阅读模式</h3>
        <div class="epub-mode-options" role="group" aria-label="阅读模式">
          <button type="button" aria-pressed={props.settings.viewMode === ViewMode.PAGINATED} onClick={() => props.onViewModeChange(ViewMode.PAGINATED)}>按章阅读</button>
          <button type="button" aria-pressed={props.settings.viewMode === ViewMode.SCROLL} onClick={() => props.onViewModeChange(ViewMode.SCROLL)}>连续滚动</button>
        </div>
      </section>
    </div>
    <footer class="epub-panel-footer"><button type="button" class="epub-panel-done" onClick={props.onClose}>完成</button></footer>
  </ReaderPanel></Show>;
}
