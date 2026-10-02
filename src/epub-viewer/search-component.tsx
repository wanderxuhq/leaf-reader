/**
 * Search Component for EPUB Reader
 */

import { onMount } from 'solid-js';

interface SearchInputProps {
	value: string;
	onInput: (value: string) => void;
	onKeyDown: (e: KeyboardEvent) => void;
	onClose: () => void;
	placeholder?: string;
}

export function SearchInput(props: SearchInputProps) {
	let inputRef: HTMLInputElement | undefined;

	onMount(() => {
		if (inputRef) {
			inputRef.focus();
		}
	});

	return (
		<div class="epub-toolbar-search">
			<svg class="epub-toolbar-search-icon" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
				<circle cx="11" cy="11" r="8"></circle>
				<line x1="21" y1="21" x2="16.65" y2="16.65"></line>
			</svg>
			<input
				ref={inputRef}
				type="text"
				class="epub-toolbar-search-input"
				placeholder={props.placeholder || 'Search...'}
				value={props.value}
				onInput={(e) => props.onInput(e.currentTarget.value)}
				onKeyDown={(e) => props.onKeyDown(e)}
			/>
		</div>
	);
}