import { resolveHref, decodePath } from './epub-path';
/**
 * EPUB Parser Module
 * Core parser that orchestrates all sub-parsers
 * Returns Publication directly (custom implementation)
 */

import type { App } from 'obsidian';
import { TFile } from 'obsidian';
import { ZipArchive } from './parsers/zip-parser';
import { parseContainerXml } from './parsers/xml-parser';
import { parseOpf } from './parsers/opf-parser';
import { parseNcx } from './parsers/ncx-parser';
import { parseNavDocument } from './parsers/nav-parser';
import {
	type EpubTocItem,
	type EpubManifestItem,
	type EpubMetadata,
	EpubParseError,
	EpubErrorType,
	Publication,
	Manifest,
	PublicationMetadata,
	Link,
	Links,
	ReadingProgression,
	type ParsedEpub,
} from './types';
import { createEpubFetcher } from './epub-fetcher';
import { normalizePath } from './utils';



/**
 * Parse an EPUB file and return Readium Publication
 *
 * @param app - Obsidian App instance
 * @param filePath - Path to the EPUB file in Obsidian vault
 * @returns Promise resolving to ParsedEpub with Publication
 * @throws EpubParseError when parsing fails
 */
export async function parseEpub(app: App, filePath: string): Promise<ParsedEpub> {
	// Validate file path
	if (!filePath || typeof filePath !== 'string') {
		throw new EpubParseError(
			EpubErrorType.INVALID_FORMAT,
			'Invalid file path: path must be a non-empty string'
		);
	}

	const normalizedPath = normalizePath(filePath);

	try {
		// Read EPUB file as ArrayBuffer
		const fileContent = await readEpubFile(app, normalizedPath);

		// Open ZIP archive
		const zip = await ZipArchive.fromBuffer(fileContent);

		// Parse container.xml to find OPF file
		const containerXml = await zip.readText('META-INF/container.xml');
		const container = parseContainerXml(containerXml);

		// Parse OPF package document
		const opfXml = await zip.readText(container.rootfilePath);
		const opf = parseOpf(opfXml);

		// Get base path for resolving relative paths
		const basePath = container.rootfilePath.substring(0, container.rootfilePath.lastIndexOf('/') + 1);

		// Parse TOC (try EPUB 3 nav first, then fallback to NCX)
		const toc = await parseToc(zip, opf.manifest, basePath);

		// Extract cover if available
		if (opf.metadata.cover && opf.manifest[opf.metadata.cover]) {
			const coverItem = opf.manifest[opf.metadata.cover];
			if (coverItem) {
				try {
					opf.metadata.cover = await zip.readAsDataUrl(basePath + coverItem.href);
				} catch {
					// Ignore cover extraction errors
				}
			}
		}

		// Create Readium Publication
		const publication = createPublication(opf, toc, basePath, zip);

		return {
			publication,
			zip,
			basePath,
			manifest: opf.manifest,
		};
	} catch (error) {
		if (error instanceof EpubParseError) {
			throw error;
		}

		const err = error as Error;
		if (err.message?.includes('ENOENT') || err.message?.includes('not found')) {
			throw new EpubParseError(
				EpubErrorType.FILE_NOT_FOUND,
				`EPUB file not found: ${normalizedPath}`,
				err
			);
		}
		if (err.message?.includes('invalid') || err.message?.includes('format')) {
			throw new EpubParseError(
				EpubErrorType.PARSE_ERROR,
				`Invalid EPUB format: ${err.message}`,
				err
			);
		}

		throw new EpubParseError(
			EpubErrorType.PARSE_ERROR,
			`Unexpected error parsing EPUB file: ${err.message ?? String(error)}`,
			err
		);
	}
}

/**
 * Create Publication from parsed OPF data
 */
function createPublication(
	opf: ReturnType<typeof parseOpf>,
	toc: EpubTocItem[],
	basePath: string,
	zip: ZipArchive
): Publication {
	// Create reading order from spine items (use relative href, basePath will be added by Fetcher)
	const readingOrder = new Links(
		opf.spine.map((item, index) => {
			const manifestItem = opf.manifest[item.idref];
			return {
				href: manifestItem?.href || item.idref,
				type: manifestItem?.mediaType || "application/xhtml+xml",
				title: manifestItem?.title,
				rels: index === 0 ? new Set(["start"]) : undefined,
				id: item.idref, // OPF manifest item id for navigation
			};
		})
	);

	// Create TOC from parsed TOC
	const tocLinks = createTocLinks(toc);

	// Create metadata
	const metadata = createMetadata(opf.metadata);

	// Create manifest
	const manifest: Manifest = {
		metadata,
		readingOrder,
		toc: tocLinks,
	};

	// Create fetcher for resource access
	const fetcher = createEpubFetcher(zip, basePath);

	// Create and return publication
	return new Publication({ manifest, fetcher });
}

/**
 * Create PublicationMetadata from EPUB metadata
 */
function createMetadata(epubMeta: EpubMetadata): PublicationMetadata {
	// Determine reading progression
	const readingProgression = inferReadingProgression(epubMeta.language);

	return {
		title: epubMeta.title || "Untitled",
		identifier: epubMeta.identifier || "",
		language: epubMeta.language ? [epubMeta.language] : [],
		authors: epubMeta.authors,
		readingProgression,
		subjects: epubMeta.subjects,
	};
}

/**
 * Infer reading progression from language
 */
function inferReadingProgression(language?: string): ReadingProgression {
	if (!language) return ReadingProgression.ltr;

	const rtlLanguages = ["ar", "he", "fa", "ur", "yi"];
	const langCode = language.split("-")[0]?.toLowerCase() || "";

	if (rtlLanguages.includes(langCode)) {
		return ReadingProgression.rtl;
	}
	return ReadingProgression.ltr;
}

/**
 * Create TOC links from parsed TOC items
 */
function createTocLinks(tocItems: EpubTocItem[]): Links {
	return new Links(tocItems.map(item => createTocLink(item)));
}

/**
 * Create a single TOC link (recursive for nested items)
 */
function createTocLink(item: EpubTocItem): Link {
	// Build children recursively if present
	const children = item.children && item.children.length > 0
		? createTocLinks(item.children)
		: undefined;

	return {
		href: item.href,
		title: item.title,
		children,
	};
}

/**
 * Read EPUB file from Obsidian vault
 */
async function readEpubFile(app: App, filePath: string): Promise<ArrayBuffer> {
	const file = app.vault.getAbstractFileByPath(filePath);
	if (!file || !(file instanceof TFile)) {
		throw new EpubParseError(
			EpubErrorType.FILE_NOT_FOUND,
			`File not found: ${filePath}`
		);
	}

	const content = await app.vault.readBinary(file);

	// Handle both ArrayBuffer and Uint8Array returns
	//if (content instanceof Uint8Array) {
	//	return content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength);
	//}

	return content;
}

/**
 * Parse table of contents
 */
async function parseToc(
	zip: ZipArchive,
	manifest: Record<string, EpubManifestItem>,
	basePath: string
): Promise<EpubTocItem[]> {
	// Try EPUB 3 navigation document first
	for (const item of Object.values(manifest)) {
		if (item.mediaType === 'application/xhtml+xml') {
			const href = decodePath(resolveHref(item.href, basePath + 'package.opf'));
			if (zip.hasFile(href)) {
				try {
					const content = await zip.readText(href);
					// Check if this is a nav document
					if (content.includes('epub:type="toc"') || content.includes('role="doc-toc"')) {
						return resolveTocPaths(parseNavDocument(content), item.href);
					}
				} catch {
					// Continue to next item
				}
			}
		}
	}

	// Fallback to NCX
	for (const item of Object.values(manifest)) {
		if (item.mediaType === 'application/x-dtbncx+xml') {
			const href = decodePath(resolveHref(item.href, basePath + 'package.opf'));
			if (zip.hasFile(href)) {
				try {
					const content = await zip.readText(href);
					return resolveTocPaths(parseNcx(content), item.href);
				} catch {
					// Continue
				}
			}
		}
	}

	return [];
}

/**
 * Check if a file is an EPUB file
 */
export function isEpubFile(filePath: string): boolean {
	return filePath.toLowerCase().endsWith('.epub');
}

function resolveTocPaths(items: EpubTocItem[], source: string): EpubTocItem[] {
 return items.map(item => ({ ...item, href: resolveHref(item.href, source), children: resolveTocPaths(item.children ?? [], source) }));
}
