/**
 * Navigation Document Parser
 * Handles EPUB 3.x navigation document parsing (nav.xhtml)
 */

import {
	parseXml,
	getElementText,
	getAttribute,
	getElementsByTagName,
	getElementByTagName,
	getDirectChildrenByTagName,
	EPUB_NAMESPACES,
} from './xml-parser';
import type { EpubTocItem } from '../types';

export function parseNavDocument(xmlString: string): EpubTocItem[] {
	const doc = parseXml(xmlString);
	
	const navElements = getElementsByTagName(doc, 'nav', EPUB_NAMESPACES.XHTML);
	let tocNav: Element | null = null;
	
	for (const nav of navElements) {
		const epubType = getAttribute(nav, 'epub:type');
		if (epubType === 'toc' || epubType === 'toc chapter') {
			tocNav = nav;
			break;
		}
	}
	
	if (!tocNav) {
		tocNav = navElements[0] || null;
	}
	
	if (!tocNav) {
		return [];
	}
	
	const olElement = getElementByTagName(tocNav, 'ol', EPUB_NAMESPACES.XHTML);
	if (!olElement) {
		return [];
	}
	
	// Get only direct children li elements
	const liElements = getDirectChildrenByTagName(olElement, 'li', EPUB_NAMESPACES.XHTML);
	return liElements.map((li, index) => parseNavLi(li, index, 0));
}

function parseNavLi(element: Element, playOrder: number, level: number): EpubTocItem {
	const aElement = getElementByTagName(element, 'a', EPUB_NAMESPACES.XHTML);
	const title = getElementText(aElement);
	const href = getAttribute(aElement, 'href');
	const id = getAttribute(element, 'id') || `toc-${playOrder}`;
	
	// Get only direct child ol (not nested ones)
	const olElements = getDirectChildrenByTagName(element, 'ol', EPUB_NAMESPACES.XHTML);
	const children: EpubTocItem[] = [];
	
	// Only process the first direct ol (EPUB structure should have one ol per li)
	const ol = olElements[0];
	if (ol) {
		const liChildren = getDirectChildrenByTagName(ol, 'li', EPUB_NAMESPACES.XHTML);
		liChildren.forEach((childLi, index) => {
			children.push(parseNavLi(childLi, playOrder * 100 + index, level + 1));
		});
	}
	
	return {
		id,
		title: title || 'Untitled',
		href: href || '',
		playOrder,
		children,
		level,
	};
}
