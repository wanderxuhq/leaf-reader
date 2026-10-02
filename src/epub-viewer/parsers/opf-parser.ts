/**
 * OPF Package Parser
 * Handles EPUB package document parsing (package.opf)
 */

import {
	parseXml,
	getElementText,
	getAttribute,
	getElementsByTagName,
	getElementByTagName,
	EPUB_NAMESPACES,
} from './xml-parser';
import type { EpubMetadata, EpubManifestItem, EpubSpineItem } from '../types';

/**
 * Parse OPF package document
 */
export interface OpfParseResult {
	metadata: EpubMetadata;
	manifest: Record<string, EpubManifestItem>;
	spine: EpubSpineItem[];
	version: string;
}

export function parseOpf(xmlString: string): OpfParseResult {
	const doc = parseXml(xmlString);
	
	// Get package version
	const packageElement = doc.documentElement;
	const version = getAttribute(packageElement, 'version');
	
	// Extract metadata
	const metadata = parseMetadata(doc);
	
	// Extract manifest
	const manifest = parseManifest(doc);
	
	// Extract spine
	const spine = parseSpine(doc);
	
	return {
		metadata,
		manifest,
		spine,
		version,
	};
}

/**
 * Parse metadata section
 */
function parseMetadata(doc: Document): EpubMetadata {
	const metadataElement = getElementByTagName(doc, 'metadata', EPUB_NAMESPACES.OPF);
	if (!metadataElement) {
		return createEmptyMetadata();
	}
	
	return {
		title: getDcElementText(metadataElement, 'title'),
		authors: getDcElementTexts(metadataElement, 'creator'),
		description: getDcElementText(metadataElement, 'description'),
		publisher: getDcElementText(metadataElement, 'publisher'),
		pubDate: getDcElementText(metadataElement, 'date'),
		language: getDcElementText(metadataElement, 'language'),
		identifier: getDcElementText(metadataElement, 'identifier'),
		rights: getDcElementText(metadataElement, 'rights'),
		subjects: getDcElementTexts(metadataElement, 'subject'),
		cover: extractCoverId(metadataElement),
		modified: extractModifiedDate(metadataElement),
	};
}

/**
 * Get text content from DC element
 */
function getDcElementText(parent: Element, tagName: string): string {
	const element = getElementByTagName(parent, tagName, EPUB_NAMESPACES.DC);
	return getElementText(element);
}

/**
 * Get text content from multiple DC elements
 */
function getDcElementTexts(parent: Element, tagName: string): string[] {
	const elements = getElementsByTagName(parent, tagName, EPUB_NAMESPACES.DC);
	return elements.map(el => getElementText(el)).filter(Boolean);
}

/**
 * Extract cover image ID from metadata
 */
function extractCoverId(metadataElement: Element): string | undefined {
	const metaElements = getElementsByTagName(metadataElement, 'meta', EPUB_NAMESPACES.OPF);
	for (const meta of metaElements) {
		if (getAttribute(meta, 'name') === 'cover') {
			return getAttribute(meta, 'content');
		}
	}
	return undefined;
}

/**
 * Extract modification date
 */
function extractModifiedDate(metadataElement: Element): string | undefined {
	const metaElements = getElementsByTagName(metadataElement, 'meta', EPUB_NAMESPACES.OPF);
	for (const meta of metaElements) {
		if (getAttribute(meta, 'property') === 'dcterms:modified') {
			return getElementText(meta);
		}
	}
	return undefined;
}

/**
 * Create empty metadata object
 */
function createEmptyMetadata(): EpubMetadata {
	return {
		title: 'Untitled',
		authors: ['Unknown Author'],
	};
}

/**
 * Parse manifest section
 */
function parseManifest(doc: Document): Record<string, EpubManifestItem> {
	const manifest: Record<string, EpubManifestItem> = {};
	const manifestElement = getElementByTagName(doc, 'manifest', EPUB_NAMESPACES.OPF);
	
	if (!manifestElement) {
		return manifest;
	}
	
	const itemElements = getElementsByTagName(manifestElement, 'item', EPUB_NAMESPACES.OPF);
	
	for (const item of itemElements) {
		const id = getAttribute(item, 'id');
		const href = getAttribute(item, 'href');
		const mediaType = getAttribute(item, 'media-type');
		
		if (id && href) {
			manifest[id] = {
				id,
				href,
				mediaType,
				fallback: getAttribute(item, 'fallback') || undefined,
				mediaOverlay: getAttribute(item, 'media-overlay') || undefined,
			};
		}
	}
	
	return manifest;
}

/**
 * Parse spine section
 */
function parseSpine(doc: Document): EpubSpineItem[] {
	const spine: EpubSpineItem[] = [];
	const spineElement = getElementByTagName(doc, 'spine', EPUB_NAMESPACES.OPF);
	
	if (!spineElement) {
		return spine;
	}
	
	const itemrefElements = getElementsByTagName(spineElement, 'itemref', EPUB_NAMESPACES.OPF);
	
	for (const itemref of itemrefElements) {
		const idref = getAttribute(itemref, 'idref');
		const linear = getAttribute(itemref, 'linear') !== 'no';
		
		if (idref) {
			spine.push({
				idref,
				linear,
			});
		}
	}
	
	return spine;
}
