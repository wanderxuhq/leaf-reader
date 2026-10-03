
export const notices: string[] = [];
export class Notice { constructor(message: string) { notices.push(message); } }
export class TFile { extension: string; basename: string; name: string; stat = { mtime: 0 }; constructor(public path: string) { this.name=path.split('/').pop()!; this.extension=this.name.split('.').pop()!; this.basename=this.name.slice(0,-this.extension.length-1); } }
export const setIcon = (el: HTMLElement, name: string) => {
  el.dataset.icon = name;
  const paths: Record<string,string> = {'undo-2':'M3 10h11a7 7 0 0 1 0 14M3 10l6-6M3 10l6 6',history:'M3 11a9 9 0 1 1 2 7M3 4v7h7M12 7v5l3 2','notebook-pen':'M5 3h12v18H5zM2 7h6M2 12h6M2 17h6M11 15l8-8 2 2-8 8-3 1z',x:'M6 6l12 12M18 6L6 18',list:'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01','chevron-left':'M15 18l-6-6 6-6','chevron-right':'M9 18l6-6-6-6','chevron-up':'M6 15l6-6 6 6','chevron-down':'M6 9l6 6 6-6',search:'M21 21l-5-5M18 10a8 8 0 1 0-16 0 8 8 0 0 0 16 0',settings:'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M5 19l2-2M17 7l2-2'};
  const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('fill','none');svg.setAttribute('stroke','currentColor');svg.setAttribute('stroke-width','1.8');
  const path=document.createElementNS(svg.namespaceURI,'path');path.setAttribute('d',paths[name]??paths.list!);svg.append(path);el.replaceChildren(svg);
};
export const parseYaml = (text: string) => { const match = /epub-target:\s*(.+)/.exec(text); return { 'epub-target': match ? JSON.parse(match[1]!) : null }; };
export class Modal { contentEl = document.createElement('div'); constructor(public app: unknown) {} open() { document.body.append(this.contentEl); (this as any).onOpen(); } close() { (this as any).onClose?.(); this.contentEl.remove(); } }
export class FileView {
  contentEl: HTMLElement; app: any; file: TFile | null = null; private refs: any[]=[];
  constructor(public leaf: any) { this.app=leaf.app; this.contentEl=leaf.contentEl??document.getElementById('app')!; leaf.view=this; if (!leaf.setViewState) leaf.setViewState=async (state: any) => this.setState(state.state); }
  getState() { return { file: this.file?.path }; }
  async setState(state: any) { const next=this.app.vault.getAbstractFileByPath(state.file); if (next && this.file !== next) { if(this.file) await (this as any).onUnloadFile(this.file); this.file=next; await (this as any).onLoadFile(next); } }
  registerEvent(ref: any) { this.refs.push(ref); }
  unload() { for (const ref of this.refs) this.app.vault.offref(ref); this.refs=[]; }
  registerDomEvent(el: HTMLElement, name: string, fn: EventListener) { el.addEventListener(name,fn); }
}

export const Platform = { isMobile: false };
export class Component { load() {} unload() {} }
export const MarkdownRenderer = { render: async (_app: any, text: string, el: HTMLElement) => { el.textContent=text; } };
export class ItemView {
  app: any; contentEl: HTMLElement; private refs: any[]=[];
  constructor(public leaf: any) { this.app=leaf.app; this.contentEl=leaf.contentEl; leaf.view=this; }
  getState(): Record<string, unknown> { return {}; }
  async setState(_state: unknown, _result?: unknown) {}
  registerEvent(ref: any) { this.refs.push(ref); }
  unload() { for (const ref of this.refs) this.app.vault.offref(ref); this.refs=[]; }
}

export const getLanguage = () => new URLSearchParams(window.location.search).get('lang') ?? 'en';
