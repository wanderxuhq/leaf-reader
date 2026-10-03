import { captureReadingPosition } from '../src/epub-viewer/position';
import { BookNotesView, NOTES_VIEW_TYPE } from '../src/epub-viewer/notes-view';
import { openBookNotes, openNotesFile, registerNotesOpening } from '../src/epub-viewer/notes-opening';
import { FootnoteLoader } from '../src/epub-viewer/footnotes';
import { Platform } from './obsidian-mock';
import { createRoot } from 'solid-js';
import { useSelection } from '../src/epub-viewer/primitives/use-selection';
import { useSearchHighlight } from '../src/epub-viewer/primitives/use-search-highlight';

import { zipSync, strToU8 } from 'fflate';
import { EpubView } from '../src/epub-viewer/epub-view';
import { TFile, notices, parseYaml } from './obsidian-mock';
import { DEFAULT_SETTINGS } from '../src/epub-viewer/settings';
import { ViewMode } from '../src/epub-viewer/types';
import * as lbp from '../src/epub-viewer/lbp';
import * as notes from '../src/epub-viewer/note-format';
import { saveNote,loadNotes } from '../src/epub-viewer/note-repository';
import { performSearch } from '../src/epub-viewer/search-logic';
import { textRange } from '../src/epub-viewer/dom-utils';
import { EpubResourceProcessor } from '../src/epub-viewer/epub-resource-processor';
// Only the DOM conveniences normally installed by Obsidian are mocked.
Object.assign(HTMLElement.prototype, {
  empty() { this.replaceChildren(); }, addClass(name: string) { this.classList.add(name); },
  createEl(tag: string, opts: any={}) { const el=this.ownerDocument.createElement(tag); if(opts.type) el.setAttribute("type",opts.type); if(opts.placeholder) el.setAttribute("placeholder",opts.placeholder); if(opts.cls) el.className=opts.cls; if(opts.text) el.textContent=opts.text; for(const [k,v] of Object.entries(opts.attr??{})) el.setAttribute(k,String(v)); this.append(el); return el; },
  createDiv(opts: any={}) { return this.createEl('div',opts); },
});
const xml = (body:string) => '<html xmlns="http://www.w3.org/1999/xhtml"><head><link rel="stylesheet" href="../Styles/book.css"/></head><body>'+body+'</body></html>';
const contents: Record<string,string> = {
  'mimetype':'application/epub+zip',
  'META-INF/container.xml':'<container xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OPS/package.opf" media-type="application/oebps-package+xml"/></rootfiles></container>',
  'OPS/package.opf':'<package xmlns="http://www.idpf.org/2007/opf" version="3.0"><metadata xmlns:dc="http://purl.org/dc/elements/1.1/"><dc:title>Reader fixture</dc:title></metadata><manifest><item id="one" href="Text/one.xhtml" media-type="application/xhtml+xml"/><item id="two" href="Other/one.xhtml" media-type="application/xhtml+xml"/><item id="three" href="Text/three.xhtml" media-type="application/xhtml+xml"/><item id="nav" href="Nav/toc.xhtml" properties="nav" media-type="application/xhtml+xml"/></manifest><spine><itemref idref="one"/><itemref idref="two"/><itemref idref="three"/></spine></package>',
  'OPS/Nav/toc.xhtml':'<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops"><body><nav epub:type="toc"><ol><li><a href="../Text/one.xhtml">First chapter</a></li><li><a href="../Other/one.xhtml#target">Second chapter</a></li><li><a href="../Text/three.xhtml">Third chapter</a></li></ol></nav></body></html>',
  'OPS/Text/one.xhtml':xml('<h1>FIRST CHAPTER</h1><p id="quote">Alpha <em>nested</em> omega 中文测试。</p><p><a href="../Other/one.xhtml#target">Cross chapter</a></p>'+Array.from({length:24},(_,i)=>'<p>Long reading paragraph '+i+' '+ 'Long text for reading. '.repeat(15)+'</p>').join('')),
  'OPS/Other/one.xhtml':xml('<h1>SECOND CHAPTER</h1><p id="target">Remote needle <strong>across</strong> nodes.</p>'),
  'OPS/Text/three.xhtml':xml('<h1>THIRD CHAPTER</h1><p>Final needle.</p>'),
  'OPS/Styles/book.css':'body {color:rgb(20,30,40)} p {line-height:1.7} button { display:none }',
};
contents['OPS/Text/one.xhtml'] = contents['OPS/Text/one.xhtml']!.replace('<h1>', '<p><a id="foot-ref" epub:type="noteref" href="../Notes/end.xhtml#note-1">Footnote one</a> <a id="plain-ref" href="../Other/one.xhtml#target">Ordinary link</a></p><h1>');
contents['OPS/Notes/end.xhtml'] = xml('<aside epub:type="footnote" id="note-1" style="position:fixed;inset:0"><p>Footnote explanation <em>with emphasis</em>.</p><a epub:type="backlink" href="../Text/one.xhtml#foot-ref">Back</a><script>throw Error("unsafe footnote")</script></aside>');
contents['OPS/package.opf'] = contents['OPS/package.opf']!.replace('</manifest>', '<item id="endnotes" href="Notes/end.xhtml" media-type="application/xhtml+xml"/></manifest>');
const zip=zipSync(Object.fromEntries(Object.entries(contents).map(([p,s])=>[p,strToU8(s)])));
const files = new Map<string,TFile>(); const text = new Map<string,string>();
let archive: ArrayBuffer = zip.buffer as ArrayBuffer;
let book=new TFile('Books/test.epub'); files.set(book.path,book);
const storage = new Map<string,unknown>();
const listeners = new Map<string,Set<(...args:any[])=>void>>();
const events = { on: (name:string,fn:(...args:any[])=>void) => { if(!listeners.has(name)) listeners.set(name,new Set()); listeners.get(name)!.add(fn); return {name,fn}; }, offref: (ref:any) => listeners.get(ref.name)?.delete(ref.fn) };
const app:any = { vault: { ...events, getAbstractFileByPath:(path:string)=>files.get(path), getMarkdownFiles:()=>[...files.values()].filter(f=>f.extension==='md'),
  readBinary:async()=>archive, read:async(file:TFile)=>text.get(file.path)??'',
  create:async(path:string,content:string)=>{ const file=new TFile(path); files.set(path,file); text.set(path,content); return file; },
  process:async(file:TFile,fn:(s:string)=>string)=>{ text.set(file.path,fn(text.get(file.path)??'')); },
}, metadataCache:{...events,getFileCache:(file:TFile)=>({frontmatter:parseYaml(text.get(file.path)??'')})},
  loadLocalStorage:(key:string)=>storage.get(key),saveLocalStorage:(key:string,value:unknown)=>storage.set(key,value), };
let preferences={...DEFAULT_SETTINGS, viewMode:ViewMode.PAGINATED, renderAheadCount:0};
let view:EpubView;
const noteLeaves: any[] = [], openedMarkdown: string[] = [];
const newNotesLeaf = () => {
  const leaf: any = { app, contentEl: document.body.createDiv({ cls: 'test-notes-pane' }) };
  leaf.contentEl.style.cssText='height:600px;width:350px';
  leaf.setEphemeralState = (state: any) => { leaf.ephemeral=state; };
  leaf.setViewState=async (state: any) => {
    if (state.type === 'markdown') {
      await leaf.view?.onClose?.(); leaf.view?.unload?.();
      leaf.contentEl.empty(); leaf.contentEl.classList.remove('epub-notes-view');
      leaf.contentEl.createEl('textarea').value=text.get(state.state.file)??'';
      leaf.view={ leaf, file:files.get(state.state.file), getState:()=>state.state, getViewType:()=>state.type };
      app.workspace.lastRevealed=leaf;
      emit('file-open',leaf.view.file);
      openedMarkdown.push(state.state.file); return;
    }
    if (!(leaf.view instanceof BookNotesView)) { leaf.view=new BookNotesView(leaf); await leaf.view.onOpen(); }
    await leaf.view.setState(state.state, {});
  };
  noteLeaves.push(leaf); return leaf;
};
app.workspace = {
  on: events.on, onLayoutReady: (callback: () => void) => callback(),
  getActiveViewOfType: () => app.workspace.lastRevealed?.view,
  getLeavesOfType: (type: string) => type === NOTES_VIEW_TYPE ? noteLeaves.filter(leaf=>leaf.view?.getViewType()===NOTES_VIEW_TYPE) : view ? [view.leaf] : [],
  getRightLeaf: newNotesLeaf, getLeaf: newNotesLeaf,
  revealLeaf: async (leaf: any) => { app.workspace.lastRevealed=leaf; },
  openLinkText: async (path: string) => { openedMarkdown.push(path); },
};
const emit = (name: string, ...args: any[]) => { for (const listener of listeners.get(name) ?? []) listener(...args); };
async function open(position?:string) { view=new EpubView({app} as any,{get:()=>preferences,save:async value=>{preferences=value;},openNotes:state=>openBookNotes(app,state)}); await view.onOpen(); await view.setState({file:book.path,lbp:position},{} as any); }
(window as any).readerTest={openNotesFile,registerNotesOpening,captureReadingPosition,openBookNotes,noteLeaves,openedMarkdown,emit,Platform,FootnoteLoader,createRoot,useSelection,useSearchHighlight,open, close:()=>view.onClose(), get view(){return view;},get store(){return (view as any).store;},app,book,text,storage,notices,lbp,notes,saveNote,loadNotes,performSearch,textRange,ViewMode,EpubResourceProcessor};

(window as any).readerTest.openReal = async (bytes: number[], name: string) => {
  await view.onClose(); archive = new Uint8Array(bytes).buffer; book = new TFile(name); files.set(name,book);
  (window as any).readerTest.book=book; await open();
};
await open();
