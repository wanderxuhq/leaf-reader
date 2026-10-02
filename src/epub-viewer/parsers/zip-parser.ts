/**
 * ZIP Archive Parser
 * Handles low-level ZIP operations using fflate
 */

import { unzipSync, strFromU8 } from 'fflate';

export class ZipArchive {
	private files: Record<string, Uint8Array>;

	private constructor(files: Record<string, Uint8Array>) {
		this.files = files;
	}

	static async fromBuffer(buffer: ArrayBuffer): Promise<ZipArchive> {
		const data = new Uint8Array(buffer);
		const files = unzipSync(data);
		return new ZipArchive(files);
	}

	hasFile(path: string): boolean {
		return path in this.files;
	}

	getFileList(): string[] {
		return Object.keys(this.files);
	}

	async readText(path: string): Promise<string> {
		const file = this.files[path];
		if (!file) {
			throw new Error(`File not found in archive: ${path}`);
		}
		return strFromU8(file);
	}

	async readBinary(path: string): Promise<ArrayBuffer> {
		const file = this.files[path];
		if (!file) {
			throw new Error(`File not found in archive: ${path}`);
		}
		return file.buffer.slice(file.byteOffset, file.byteOffset + file.byteLength);
	}

	async readAsDataUrl(path: string): Promise<string> {
		const file = this.files[path];
		if (!file) {
			throw new Error(`File not found in archive: ${path}`);
		}
		// Convert Uint8Array to base64
		let binary = '';
		const len = file.byteLength;
		for (let i = 0; i < len; i++) {
			const byte = file[i];
			if (byte !== undefined) {
				binary += String.fromCharCode(byte);
			}
		}
		const base64 = btoa(binary);
		return `data:${this.getMimeType(path)};base64,${base64}`;
	}

	getFileInfo(path: string): { name: string; size: number } | null {
		const file = this.files[path];
		if (!file) return null;
		return { name: path, size: file.byteLength };
	}

	getDirectoryContents(dirPath: string): string[] {
		const normalizedPath = dirPath.endsWith('/') ? dirPath : `${dirPath}/`;
		return Object.keys(this.files).filter(path => path.startsWith(normalizedPath));
	}

	private getMimeType(path: string): string {
		const ext = path.split('.').pop()?.toLowerCase() || '';
		const mimeTypes: Record<string, string> = {
			'html': 'text/html',
			'xhtml': 'application/xhtml+xml',
			'xml': 'application/xml',
			'jpg': 'image/jpeg',
			'jpeg': 'image/jpeg',
			'png': 'image/png',
			'gif': 'image/gif',
			'svg': 'image/svg+xml',
			'css': 'text/css',
			'js': 'application/javascript',
			'woff': 'font/woff',
			'woff2': 'font/woff2',
			'ttf': 'font/ttf',
			'eot': 'application/vnd.ms-fontobject',
		};
		return mimeTypes[ext] || 'application/octet-stream';
	}
}
