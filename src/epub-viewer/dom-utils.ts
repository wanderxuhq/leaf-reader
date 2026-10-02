/** Text coordinates shared by LBP, search and annotations. Never mutate the selection. */
export function getTextNodes(element: HTMLElement): Text[] {
  const nodes: Text[] = [];
  const walker = element.ownerDocument.createTreeWalker(element, 4);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (!node.parentElement?.closest('script, style, [data-reader-overlay]')) nodes.push(node as Text);
  }
  return nodes;
}
export function findNodeAtOffset(nodes: Text[], offset: number): { node: Text; offset: number } | null {
  if (!Number.isSafeInteger(offset) || offset < 0) return null;
  let remaining = offset;
  for (const node of nodes) {
    if (remaining <= node.length) return { node, offset: remaining };
    remaining -= node.length;
  }
  return null;
}
export function textRange(root: HTMLElement, start: number, end: number): Range | null {
  const nodes = getTextNodes(root);
  const a = findNodeAtOffset(nodes, start), b = findNodeAtOffset(nodes, end);
  if (!a || !b || end < start) return null;
  const range = root.ownerDocument.createRange();
  range.setStart(a.node, a.offset); range.setEnd(b.node, b.offset);
  return range;
}
export function calculateCharOffsetWithinElement(node: Node, offset: number, element: HTMLElement): number {
  if (!element.contains(node)) throw new Error('Position is outside chapter content');
  const range = element.ownerDocument.createRange();
  range.selectNodeContents(element);
  range.setEnd(node, offset);
  return range.toString().length;
}
export function resolveElementInfo(node: Node, offset: number, root: HTMLElement): { path: number[]; offset: number } {
  if (!root.contains(node)) throw new Error('Selection is outside chapter content');
  const element = node.nodeType === 1 ? node as HTMLElement : node.parentElement!;
  const target = element === root ? root : element.closest<HTMLElement>('[data-lidx]') ?? root;
  const path: number[] = [];
  let current: HTMLElement | null = target;
  while (current && current !== root) {
    const index = Number(current.dataset.lidx);
    if (!Number.isSafeInteger(index) || index < 0) throw new Error('Unaddressable element');
    path.unshift(index); current = current.parentElement;
  }
  if (current !== root) throw new Error('Invalid chapter root');
  return { path, offset: calculateCharOffsetWithinElement(node, offset, target) };
}
