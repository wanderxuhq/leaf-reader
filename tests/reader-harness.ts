import { createRoot } from 'solid-js';
import { useSelection } from '../src/epub-viewer/primitives/use-selection';
import { useSearchHighlight } from '../src/epub-viewer/primitives/use-search-highlight';

import { zipSync, strToU8 } from 'fflate';
import { EpubView } from '../src/epub-viewer/epub-view';
import { TFile, notices } from './obsidian-mock';
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
  createEl(tag: string, opts: any={}) { const el=this.ownerDocument.createElement(tag); if(opts.cls) el.className=opts.cls; if(opts.text) el.textContent=opts.text; for(const [k,v] of Object.entries(opts.attr??{})) el.setAttribute(k,String(v)); this.append(el); return el; },
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
}, metadataCache:{...events,getFileCache:(file:TFile)=>({frontmatter:{'epub-target':file.extension==='md'?book.path:undefined}})},
  loadLocalStorage:(key:string)=>storage.get(key),saveLocalStorage:(key:string,value:unknown)=>storage.set(key,value), };
let preferences={...DEFAULT_SETTINGS, viewMode:ViewMode.PAGINATED, renderAheadCount:0};
let view:EpubView;
async function open(position?:string) { view=new EpubView({app} as any,{get:()=>preferences,save:async value=>{preferences=value;}}); await view.onOpen(); await view.setState({file:book.path,lbp:position},{} as any); }
(window as any).readerTest={createRoot,useSelection,useSearchHighlight,open, close:()=>view.onClose(), get view(){return view;},get store(){return (view as any).store;},app,book,text,storage,notices,lbp,notes,saveNote,loadNotes,performSearch,textRange,ViewMode,EpubResourceProcessor};

(window as any).readerTest.openReal = async (bytes: number[], name: string) => {
  await view.onClose(); archive = new Uint8Array(bytes).buffer; book = new TFile(name); files.set(name,book);
  (window as any).readerTest.book=book; await open();
};
await open();
