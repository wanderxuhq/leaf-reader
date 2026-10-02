/**
 * NCX Navigation Parser
 * Handles EPUB 2.x NCX table of contents parsing
 */

import {
	parseXml,
	getElementText,
	getAttribute,
	getElementByTagName,
	getDirectChildrenByTagName,
	EPUB_NAMESPACES,
} from './xml-parser';
import type { EpubTocItem } from '../types';

/**
 * Parse NCX navigation document
 */
export function parseNcx(xmlString: string): EpubTocItem[] {
	const doc = parseXml(xmlString);
	const navMap = getElementByTagName(doc, 'navMap', EPUB_NAMESPACES.NCX);
	
	if (!navMap) {
		return [];
	}
	
	// Get only direct children navPoint elements
	const navPoints = getDirectChildrenByTagName(navMap, 'navPoint', EPUB_NAMESPACES.NCX);
	return navPoints.map((point, index) => parseNavPoint(point, index, 0));
}

/**
 * Parse a single navPoint element recursively
 */
function parseNavPoint(element: Element, playOrder: number, level: number): EpubTocItem {
	const id = getAttribute(element, 'id');
	const order = parseInt(getAttribute(element, 'playOrder'), 10) || playOrder;
	
	// Get navLabel text
	const navLabel = getElementByTagName(element, 'navLabel', EPUB_NAMESPACES.NCX);
	const textElement = navLabel ? getElementByTagName(navLabel, 'text', EPUB_NAMESPACES.NCX) : null;
	const title = getElementText(textElement);
	
	// Get content href
	const content = getElementByTagName(element, 'content', EPUB_NAMESPACES.NCX);
	const href = getAttribute(content, 'src');
	
	// Parse only direct child navPoints (not nested ones at deeper levels)
	const childPoints = getDirectChildrenByTagName(element, 'navPoint', EPUB_NAMESPACES.NCX);
	const children = childPoints.map((child, index) => 
		parseNavPoint(child, order * 100 + index, level + 1)
	);
	
	return {
		id: id || `toc-${playOrder}`,
		title: title || 'Untitled',
		href: href || '',
		playOrder: order,
		children,
		level,
	};
}
