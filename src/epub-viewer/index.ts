/**
 * EPUB Module Entry Point
 * Centralizes all EPUB-related exports for the Obsidian EPUB reader plugin
 */

// Type Definitions
export type {
	EpubMetadata,
	EpubTocItem,
	EpubSpineItem,
	EpubManifestItem,
} from "./types";

export {
	EpubErrorType,
	ViewMode,
	EpubParseError,
} from "./types";

// Parser Functions
export {
	parseEpub,
	isEpubFile,
} from "./epub-parser";

export type { ParsedEpub } from "./types";

// Fetcher
export {
	EpubFetcher,
	createEpubFetcher,
} from "./epub-fetcher";

// View Components
export {
	EpubView,
	EPUB_VIEW_TYPE,
} from "./epub-view";

export { normalizePath } from './utils';

// Default Export
export { EpubView as default } from "./epub-view";