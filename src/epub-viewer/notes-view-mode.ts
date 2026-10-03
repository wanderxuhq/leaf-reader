import type { WorkspaceLeaf } from 'obsidian';

// A deliberate editor switch belongs to this tab and file, not the whole vault.
const editing = new WeakMap<WorkspaceLeaf, string>();
export const preferMarkdown = (leaf: WorkspaceLeaf, path: string): void => { editing.set(leaf, path); };
export const preferNotes = (leaf: WorkspaceLeaf): void => { editing.delete(leaf); };
export function staysInMarkdown(leaf: WorkspaceLeaf, path: string): boolean {
  if (editing.get(leaf) === path) return true;
  editing.delete(leaf);
  return false;
}
