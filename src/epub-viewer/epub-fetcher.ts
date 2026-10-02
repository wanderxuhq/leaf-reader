import { decodePath } from './epub-path';
/**
 * EPUB Fetcher
 * Implements custom Fetcher interface to read resources from ZipArchive
 */

import type { ZipArchive } from "./parsers/zip-parser";
import { normalizePath } from "./utils";
import type { Fetcher, Resource, Link } from "./types";

/**
 * ZIP-based Fetcher implementation for Readium Publication
 * Uses the existing ZipArchive (fflate-based)
 */
export class EpubFetcher implements Fetcher {
	private zip: ZipArchive | null = null;
	private basePath: string = "";

	constructor(zip: ZipArchive, basePath: string = "") {
		this.zip = zip;
		this.basePath = basePath;
	}

	/**
	 * Get a resource by link
	 */
	get(link: Link): Resource {
		return new EpubResource(this.zip, link.href, this.basePath);
	}

	/**
	 * Check if the fetcher supports partial requests
	 */
	get supportsPartial(): boolean {
		return false;
	}
}

/**
 * Resource implementation for ZIP files
 */
class EpubResource implements Resource {
	private zip: ZipArchive | null;
	private href: string;
	private basePath: string;

	constructor(zip: ZipArchive | null, href: string, basePath: string) {
		this.zip = zip;
		this.href = href;
		this.basePath = basePath;
	}

	/**
	 * Read the resource as string
	 */
	async readAsString(): Promise<string | null> {
		if (!this.zip) {
			return null;
		}

		const normalizedHref = this.normalizePath(this.href);

		if (!this.zip.hasFile(normalizedHref)) {
			return null;
		}

		try {
			return await this.zip.readText(normalizedHref);
		} catch {
			return null;
		}
	}

	/**
	 * Read the resource as blob URL
	 */
	async readAsBlobUrl(): Promise<string | null> {
		if (!this.zip) {
			return null;
		}

		const normalizedHref = this.normalizePath(this.href);

		if (!this.zip.hasFile(normalizedHref)) {
			return null;
		}

		try {
			const buffer = await this.zip.readBinary(normalizedHref);
			const blob = new Blob([buffer]);
			return URL.createObjectURL(blob);
		} catch {
			return null;
		}
	}

	/**
	 * Close the resource
	 */
	async close(): Promise<void> {
		// No cleanup needed
	}

	/**
	 * Normalize path for lookup
	 */
	private normalizePath(href: string): string {
		// Remove fragment
		let path = href.split("#")[0] || "";

		// Apply base path if relative and basePath is set
		if (this.basePath && !path.includes("://") && !path.startsWith("/")) {
			const baseDir = this.basePath.substring(0, this.basePath.lastIndexOf("/") + 1);
			if (baseDir) {
				path = baseDir + path;
			}
		}

		// Normalize the path (handle ../ and ./)
		return decodePath(normalizePath(path));
	}
}

/**
 * Create a Fetcher from ZipArchive
 */
export function createEpubFetcher(zip: ZipArchive, basePath: string = ""): EpubFetcher {
	return new EpubFetcher(zip, basePath);
}
