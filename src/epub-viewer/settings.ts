import { ViewMode } from './types';
export interface ReaderSettings {
  fontSize: number; lineHeight: number; fontFamily: string; viewMode: ViewMode;
  scrollPadding: number; renderAheadCount: number;
}
export const DEFAULT_SETTINGS: ReaderSettings = {
  fontSize: 18, lineHeight: 1.8, fontFamily: 'system-ui, -apple-system, sans-serif',
  viewMode: ViewMode.SCROLL, scrollPadding: 200, renderAheadCount: 2,
};
export function normalizeSettings(value: unknown): ReaderSettings {
  const v = value && typeof value === 'object' ? value as Partial<ReaderSettings> : {};
  const number = (n: unknown, min: number, max: number, fallback: number) => typeof n === 'number' && Number.isFinite(n) ? Math.max(min, Math.min(max, n)) : fallback;
  return {
    fontSize: number(v.fontSize, 12, 28, 18), lineHeight: number(v.lineHeight, 1.2, 2.5, 1.8),
    fontFamily: typeof v.fontFamily === 'string' && v.fontFamily.trim() ? v.fontFamily : DEFAULT_SETTINGS.fontFamily,
    viewMode: v.viewMode === ViewMode.PAGINATED ? ViewMode.PAGINATED : ViewMode.SCROLL,
    scrollPadding: number(v.scrollPadding, 0, 1000, 200), renderAheadCount: Math.round(number(v.renderAheadCount, 0, 5, 2)),
  };
}
