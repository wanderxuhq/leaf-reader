/** Normalize archive paths without Node.js filesystem APIs. */
export function normalizePath(path: string): string {
	let normalized = path.replace(/^file:\/\/+/, "");
	normalized = normalized.replace(/\\/g, "/");

	const parts = normalized.split("/");
	const result: string[] = [];

	for (const part of parts) {
		if (part === "" || part === ".") continue;
		if (part === "..") {
			if (result.length > 0 && result[result.length - 1] !== "..") {
				result.pop();
			} else {
				result.push("..");
			}
		} else {
			result.push(part);
		}
	}

	const hasLeadingSlash = path.startsWith("/");
	const normalizedPath = (hasLeadingSlash ? "/" : "") + result.join("/");
	return normalizedPath || "/";
}
