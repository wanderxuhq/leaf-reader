/**
 * XML Parser Module
 * Handles EPUB-specific XML parsing operations
 */

/**
 * Parse XML string to DOM Document
 */
export function parseXml(xmlString: string): Document {
	const parser = new DOMParser();
	return parser.parseFromString(xmlString, 'application/xml');
}

/**
 * Parse HTML/XHTML string to DOM Document
 */
export function parseHtml(htmlString: string): Document {
	const parser = new DOMParser();
	return parser.parseFromString(htmlString, 'text/html');
}

/**
 * Get text content from XML element
 */
export function getElementText(element: Element | null): string {
	if (!element) return '';
	return element.textContent?.trim() || '';
}

/**
 * Get attribute value from element
 */
export function getAttribute(element: Element | null, name: string): string {
	if (!element) return '';
	return element.getAttribute(name) || '';
}

/**
 * Get all child elements with specified tag name (all nested levels)
 */
export function getElementsByTagName(
	parent: Element | Document,
	tagName: string,
	namespace?: string
): Element[] {
	if (namespace) {
		return Array.from(parent.getElementsByTagNameNS(namespace, tagName));
	}
	return Array.from(parent.getElementsByTagName(tagName));
}

/**
 * Get first child element with specified tag name (all nested levels)
 */
export function getElementByTagName(
	parent: Element | Document,
	tagName: string,
	namespace?: string
): Element | null {
	if (namespace) {
		return parent.getElementsByTagNameNS(namespace, tagName)[0] || null;
	}
	return parent.getElementsByTagName(tagName)[0] || null;
}

/**
 * Get direct child elements with specified tag name (only immediate children)
 */
export function getDirectChildrenByTagName(
	parent: Element,
	tagName: string,
	namespace?: string
): Element[] {
	const children: Element[] = [];
	for (const child of Array.from(parent.children)) {
		if (namespace && child.namespaceURI === namespace && child.localName === tagName) {
			children.push(child);
		} else if (!namespace && child.tagName.toLowerCase() === tagName.toLowerCase()) {
			children.push(child);
		}
	}
	return children;
}

/**
 * Extract metadata from EPUB container.xml
 */
export interface ContainerData {
	rootfilePath: string;
	mediaType: string;
}

export function parseContainerXml(xmlString: string): ContainerData {
	const doc = parseXml(xmlString);
	
	const rootfileElement = getElementByTagName(
		doc,
		'rootfile',
		'urn:oasis:names:tc:opendocument:xmlns:container'
	);
	
	if (!rootfileElement) {
		throw new Error('Invalid EPUB container: missing rootfile element');
	}
	
	return {
		rootfilePath: getAttribute(rootfileElement, 'full-path'),
		mediaType: getAttribute(rootfileElement, 'media-type'),
	};
}

/**
 * XML namespace constants used in EPUB
 */
export const EPUB_NAMESPACES = {
	OPF: 'http://www.idpf.org/2007/opf',
	DC: 'http://purl.org/dc/elements/1.1/',
	NCX: 'http://www.daisy.org/z3986/2005/ncx/',
	XHTML: 'http://www.w3.org/1999/xhtml',
};
