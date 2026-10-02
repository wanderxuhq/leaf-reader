/** All publication hrefs are relative to the OPF; ZIP paths include the OPF directory. */
export function decodePath(value: string): string { try { return decodeURIComponent(value); } catch { return value; } }
export function resolveHref(href: string, source = ''): string {
  const hash = href.indexOf('#');
  const fragment = hash < 0 ? '' : href.slice(hash);
  const path = hash < 0 ? href : href.slice(0, hash);
  const base = source.split('#')[0]!.split('/').slice(0, -1).join('/');
  const segments = (path ? (path.startsWith('/') ? path.slice(1) : (base ? base + '/' : '') + path) : source.split('#')[0]!).split('/');
  const result: string[] = [];
  for (const part of segments) { if (part === '..') result.pop(); else if (part && part !== '.') result.push(part); }
  return result.join('/') + fragment;
}
export function sameResource(a: string, b: string): boolean {
  return decodePath(resolveHref(a).split('#')[0]!) === decodePath(resolveHref(b).split('#')[0]!);
}
