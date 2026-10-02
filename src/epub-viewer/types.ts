/**
 * EPUB Type Definitions
 * Core type interfaces for EPUB parsing and reading
 */

// ============================================================
// Parser Types — used by XML parsers (OPF, NCX, NAV)
// ============================================================

/** EPUB metadata (from OPF) */
export interface EpubMetadata {
	title: string;
	authors: string[];
	description?: string;
	publisher?: string;
	pubDate?: string;
	language?: string;
	identifier?: string;
	cover?: string;
	rights?: string;
	subjects?: string[];
	modified?: string;
}

/** TOC entry (shared by NCX and NAV parsers) */
export interface EpubTocItem {
	title: string;
	href: string;
	id?: string;
	playOrder?: number;
	children: EpubTocItem[];
	level: number;
}

/** Spine item (reading order entry from OPF) */
export interface EpubSpineItem {
	idref: string;
	linear: boolean;
}

/** Manifest item (resource entry from OPF) */
export interface EpubManifestItem {
	id: string;
	href: string;
	mediaType: string;
	title?: string;
	fallback?: string;
	mediaOverlay?: string;
}

// ============================================================
// Error Types
// ============================================================

export enum EpubErrorType {
	FILE_NOT_FOUND = 'FILE_NOT_FOUND',
	INVALID_FORMAT = 'INVALID_FORMAT',
	CORRUPTED_FILE = 'CORRUPTED_FILE',
	UNSUPPORTED_VERSION = 'UNSUPPORTED_VERSION',
	PARSE_ERROR = 'PARSE_ERROR',
	EXTRACTION_ERROR = 'EXTRACTION_ERROR',
}

export class EpubParseError extends Error {
	constructor(
		public type: EpubErrorType,
		message: string,
		public cause?: Error
	) {
		super(message);
		this.name = 'EpubParseError';
	}
}

// ============================================================
// View / Reading Types
// ============================================================

export enum ViewMode {
	PAGINATED = 'paginated',
	SCROLL = 'scroll',
}

export enum Direction {
	Prev = 'prev',
	Next = 'next',
}

// ============================================================
// Publication Model (replaces Readium dependency)
// ============================================================

export interface Link {
	href: string;
	type?: string;
	title?: string;
	rels?: Set<string>;
	children?: Links;
	id?: string; // OPF manifest item id
}

export class Links {
	items: Link[];

	constructor(items: Link[] = []) {
		this.items = items;
	}
}

export enum ReadingProgression {
	ltr = 'ltr',
	rtl = 'rtl',
}

export interface PublicationMetadata {
	title: string;
	identifier: string;
	language: string[];
	authors: string[];
	readingProgression: ReadingProgression;
	subjects?: string[];
}

export interface Manifest {
	metadata: PublicationMetadata;
	readingOrder: Links;
	toc?: Links;
}

export interface Resource {
	readAsString(): Promise<string | null>;
	readAsBlobUrl(): Promise<string | null>;
	close(): Promise<void>;
}

export interface Fetcher {
	get(link: Link): Resource;
	supportsPartial: boolean;
}

export class Publication {
	manifest: Manifest;
	fetcher: Fetcher;
	private _readingOrderItems: Link[];

	constructor(options: { manifest: Manifest; fetcher: Fetcher }) {
		this.manifest = options.manifest;
		this.fetcher = options.fetcher;
		this._readingOrderItems = options.manifest.readingOrder.items;
	}

	get(link: Link): Resource {
		return this.fetcher.get(link);
	}

	get readingOrder(): { items: Link[] } {
		return { items: this._readingOrderItems };
	}

	get toc(): { items: Link[] } | undefined {
		return this.manifest.toc ? { items: this.manifest.toc.items } : undefined;
	}

	get metadata(): PublicationMetadata {
		return this.manifest.metadata;
	}
}

// ============================================================
// Locator (reading position)
// ============================================================

export interface LocatorData {
	href: string;
	type: string;
	title?: string;
	locations?: {
		progression?: number;
		position?: number;
	};
}

export class Locator implements LocatorData {
	href: string;
	type: string;
	title?: string;
	locations?: { progression?: number; position?: number };

	constructor(data: LocatorData) {
		this.href = data.href;
		this.type = data.type;
		this.title = data.title;
		this.locations = data.locations;
	}

	serialize(): LocatorData {
		return {
			href: this.href,
			type: this.type,
			title: this.title,
			locations: this.locations,
		};
	}

	static deserialize(data: LocatorData): Locator {
		return new Locator(data);
	}
}

// ============================================================
// Parse Result
// ============================================================

export interface ParsedEpub {
	publication: Publication;
	zip: import('./parsers/zip-parser').ZipArchive;
	basePath: string;
	manifest: Record<string, { id: string; href: string; mediaType: string }>;
}
