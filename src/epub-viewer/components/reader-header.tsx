/**
 * Reader Header Component
 * Contains navigation, search, and settings controls
 */

import { createMemo } from 'solid-js';
import type { ReaderStore } from '../epub-store';
import { Direction } from '../types';
import { IconButton } from './icon-button';
import { SearchInput } from '../search-component';

export interface ReaderHeaderProps {
	store: ReaderStore;
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
					ariaLabel="Toggle table of contents"
          expanded={props.store.state.sidebarVisible}
					onClick={() => props.store.toggleSidebar()}
				/>
			</div>
			{props.store.state.searchVisible ? (
				<div class="epub-header-search-area">
					<SearchInput
						value={props.store.state.searchQuery}
						onInput={(v) => props.store.setSearchQuery(v)}
						onKeyDown={handleSearchKeyDown}
						onClose={() => props.store.toggleSearch()}
						placeholder="搜索书中文字…"
					/>
				</div>
			) : (
				<div class="epub-header-center">
					<IconButton
					name="chevron-left"
					ariaLabel="Previous page"
					onClick={() => props.onNavigatePrevious()}
					class="epub-nav-btn-prev"
				/>
					<div class="epub-page-info" title="当前章节 / 总章节数" aria-label={'第 ' + displayPage() + ' 章，共 ' + totalPages() + ' 章'}>
						<span class="epub-current-page">{displayPage()}</span>
						<span class="epub-page-separator"> / </span>
						<span class="epub-total-pages">{totalPages()}</span>
					</div>
					<IconButton
					name="chevron-right"
					ariaLabel="Next page"
					onClick={() => props.onNavigateNext()}
					class="epub-nav-btn-next"
				/>
				</div>
			)}
			<div class="epub-header-right">
				{props.store.state.searchVisible && (
					<>
						<IconButton
							name="chevron-up"
							ariaLabel="Previous match"
							onClick={() => props.onSearchNavigate(Direction.Prev)}
							class={props.store.state.searchResults.length === 0 ? 'is-disabled' : ''}
							disabled={props.store.state.searchResults.length === 0}
						/>
						<div class="epub-search-count">
							{currentCount()} / {props.store.state.searchResults.length || '-'}
						</div>
						<IconButton
							name="chevron-down"
							ariaLabel="Next match"
							onClick={() => props.onSearchNavigate(Direction.Next)}
							class={props.store.state.searchResults.length === 0 ? 'is-disabled' : ''}
							disabled={props.store.state.searchResults.length === 0}
						/>
					</>
				)}
				<IconButton
					name={props.store.state.searchVisible ? "x" : "search"}
					ariaLabel={props.store.state.searchVisible ? "Close search" : "Search"}
					onClick={() => props.store.toggleSearch()}
				/>
				<IconButton
					name="settings"
					ariaLabel="Settings"
          expanded={props.store.state.settingsVisible}
					onClick={() => props.store.toggleSettings()}
				/>
			</div>
		</div>
	);
}
