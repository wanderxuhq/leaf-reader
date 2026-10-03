import { t } from '../../i18n';
import { HistoryControl } from './history-control';
/**
 * Reader Header Component
 * Contains navigation, search, and settings controls
 */

import { createMemo, Show } from 'solid-js';
import type { ReaderStore } from '../epub-store';
import { Direction } from '../types';
import { IconButton } from './icon-button';
import { SearchInput } from '../search-component';

export interface ReaderHeaderProps {
	store: ReaderStore;
  onOpenNotes?: () => void;
	onSearch: () => void;
	onSearchNavigate: (direction: Direction) => void;
	onNavigatePrevious: () => void;
	onNavigateNext: () => void;
}

export function ReaderHeader(props: ReaderHeaderProps) {
	const currentCount = createMemo(() =>
		props.store.state.currentSearchIndex >= 0 ? props.store.state.currentSearchIndex + 1 : 0
	);

	const displayPage = createMemo(() => props.store.state.displayChapterIndex + 1);
	const totalPages = createMemo(() => props.store.state.totalChapters);

	let lastQuery = '';

	const handleSearchKeyDown = (e: KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			const currentQuery = props.store.state.searchQuery;
			const hasResults = props.store.state.searchResults.length > 0;
			const queryMismatch = currentQuery !== lastQuery;

			if (e.shiftKey) {
				if (hasResults && !queryMismatch) {
					props.onSearchNavigate(Direction.Prev);
				}
			} else {
				if (hasResults && !queryMismatch) {
					props.onSearchNavigate(Direction.Next);
				} else {
					lastQuery = currentQuery;
					props.onSearch();
				}
			}
		}
	};

	return (
		<div class="epub-header" classList={{ 'is-searching': props.store.state.searchVisible }}>
			<div class="epub-header-left">
				<IconButton
					name="list"
					ariaLabel={t('tocToggle')}
          expanded={props.store.state.sidebarVisible}
					onClick={() => props.store.toggleSidebar()}
				/>
			<HistoryControl store={props.store} />
			</div>
			{props.store.state.searchVisible ? (
				<div class="epub-header-search-area">
					<SearchInput
						value={props.store.state.searchQuery}
						onInput={(v) => props.store.setSearchQuery(v)}
						onKeyDown={handleSearchKeyDown}
						onClose={() => props.store.toggleSearch()}
						placeholder={t('searchPlaceholder')}
					/>
				</div>
			) : (
				<div class="epub-header-center">
					<IconButton
					name="chevron-left"
					ariaLabel={t('previousPage')}
					onClick={() => props.onNavigatePrevious()}
					class="epub-nav-btn-prev"
				/>
					<div class="epub-page-info" title={t('chapterCountTitle')} aria-label={t('chapterCount', { current: displayPage(), total: totalPages() })}>
						<span class="epub-current-page">{displayPage()}</span>
						<span class="epub-page-separator"> / </span>
						<span class="epub-total-pages">{totalPages()}</span>
					</div>
					<IconButton
					name="chevron-right"
					ariaLabel={t('nextPage')}
					onClick={() => props.onNavigateNext()}
					class="epub-nav-btn-next"
				/>
				</div>
			)}
			<div class="epub-header-right">
        <Show when={!props.store.state.searchVisible}><IconButton name="notebook-pen" ariaLabel={t('notes')} onClick={() => props.onOpenNotes?.()} /></Show>
				{props.store.state.searchVisible && (
					<>
						<IconButton
							name="chevron-up"
							ariaLabel={t('previousMatch')}
							onClick={() => props.onSearchNavigate(Direction.Prev)}
							class={props.store.state.searchResults.length === 0 ? 'is-disabled' : ''}
							disabled={props.store.state.searchResults.length === 0}
						/>
						<div class="epub-search-count">
							{currentCount()} / {props.store.state.searchResults.length || '-'}
						</div>
						<IconButton
							name="chevron-down"
							ariaLabel={t('nextMatch')}
							onClick={() => props.onSearchNavigate(Direction.Next)}
							class={props.store.state.searchResults.length === 0 ? 'is-disabled' : ''}
							disabled={props.store.state.searchResults.length === 0}
						/>
					</>
				)}
				<IconButton
					name={props.store.state.searchVisible ? "x" : "search"}
					ariaLabel={props.store.state.searchVisible ? t('closeSearch') : t('search')}
					onClick={() => props.store.toggleSearch()}
				/>
				<Show when={!props.store.state.searchVisible}><IconButton
					name="settings"
					ariaLabel={t('settings')}
          expanded={props.store.state.settingsVisible}
					onClick={() => props.store.toggleSettings()}
				/></Show>
			</div>
		</div>
	);
}
