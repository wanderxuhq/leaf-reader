import { localization } from './localization.mjs';
import { readingTools } from './reading-tools.mjs';
import { mobilePanels } from './mobile-panels.mjs';
import { reviewRegressions } from './review-regressions.mjs';

import { build } from 'esbuild';
import { solidPlugin } from 'esbuild-plugin-solid';
import { chromium } from '@playwright/test';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
const bundle=await build({entryPoints:['tests/reader-harness.ts'],bundle:true,write:false,format:'esm',platform:'browser',plugins:[solidPlugin()],alias:{obsidian:path.resolve('tests/obsidian-mock.ts')}});
const realBooks=process.argv.slice(2);
const server=http.createServer((req,res)=>{ if(req.url.startsWith('/book/')) { const index=Number(req.url.slice(6)); if(!realBooks[index]){res.statusCode=404;res.end();return;} res.end(fs.readFileSync(realBooks[index]));return; } if(req.url==='/test.js'){res.setHeader('Content-Type','text/javascript');res.end(bundle.outputFiles[0].text);}else if(req.url==='/style.css'){res.setHeader('Content-Type','text/css');res.end(fs.readFileSync('styles.css'));}else res.end('<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="stylesheet" href="/style.css"><style>html,body{height:100%;margin:0}#app{height:650px;width:900px}body{--background-primary:white;--text-normal:#222;--text-accent:blue}</style></head><body><div id="app"></div><script type="module" src="/test.js"></script></body></html>');});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({channel:'msedge',headless:true});
const page=await browser.newPage({viewport:{width:1000,height:760}});
const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error') console.error('BROWSER:',message.text());});
try {
 await page.goto('http://127.0.0.1:'+server.address().port);
 await page.locator('.epub-chapter-body').waitFor({timeout:15000});
 assert.match(await page.locator('.epub-chapter-body').innerText(),/FIRST CHAPTER/);
 console.log('PASS: real ZIP/OPF parsing -> FileView -> first chapter rendered');

 const initialScroll=await page.locator('.epub-reading-viewport').evaluate(el=>el.scrollTop);
 await page.getByRole('button',{name:'Next page',exact:true}).click();
 await page.waitForTimeout(160);
 assert.equal(await page.locator('.epub-chapter-body').getAttribute('data-spine'),'0');
 assert.ok(await page.locator('.epub-reading-viewport').evaluate(el=>el.scrollTop)>initialScroll+100);
 await page.getByRole('button',{name:'Previous page',exact:true}).click();
 await page.waitForTimeout(160);
 assert.ok(await page.locator('.epub-reading-viewport').evaluate(el=>el.scrollTop)<initialScroll+50);
 assert.equal(await page.evaluate(()=>{readerTest.store.navigateToChapter(1);return readerTest.store.state.navigation.lbp;}),undefined);
 await page.locator('.epub-chapter-body[data-spine="1"]').waitFor();
 assert.match(await page.locator('.epub-chapter-body').innerText(),/SECOND CHAPTER/);

 await page.waitForTimeout(200);
 await page.getByRole('button',{name:'Previous page',exact:true}).click();
 await page.waitForTimeout(200);
 await page.locator('.epub-chapter-body[data-spine="0"]').waitFor({timeout:5000});
 await page.waitForTimeout(180);
 assert.ok(await page.locator('.epub-reading-viewport').evaluate(el=>el.scrollTop)>1000);
 await page.getByRole('button',{name:'Next page',exact:true}).click();
 await page.locator('.epub-chapter-body[data-spine="1"]').waitFor();
 console.log('PASS: viewport page turns, chapter boundaries, and clearing obsolete LBP targets');
 await page.evaluate(()=>readerTest.store.navigateToHref('Text/one.xhtml'));
 await page.locator('.epub-chapter-body[data-spine="0"]').waitFor();
 const point=await page.evaluate(()=>{
   const root=document.querySelector('.epub-chapter-body'),range=document.createRange();const a=root.querySelector('#quote').firstChild,b=root.querySelector('em').firstChild; range.setStart(a,2);range.setEnd(b,4);
   const p=readerTest.lbp.rangeFromSelection(readerTest.book.path,range,document.querySelector('.epub-reading-viewport'));
   const restored=readerTest.lbp.LBPResolver.rangeInChapter(root,0,p); if(restored.toString()!==range.toString())throw Error('LBP round trip mismatch');
   return readerTest.lbp.serializeLBP(p);
 });
 console.log('PASS: nested inline selection -> LBP -> identical text range');
 const search=await page.evaluate(async()=>{ const t=readerTest;const hits=await t.performSearch(t.store.state.publication,'needle across'); t.store.setSearchQuery('needle across');t.store.setSearchResults(hits);t.store.setCurrentSearchIndex(0);t.store.navigate({chapter:hits[0].chapterIndex,search:hits[0]});return hits; });
 assert.equal(search.length,1);assert.equal(search[0].chapterIndex,1);
 await page.locator('.epub-search-highlight').first().waitFor();
 console.log('PASS: search unmounted chapter and highlight across inline nodes');
 await page.evaluate(async position=>{const t=readerTest;await t.close();await t.open(position);},point);
 await page.locator('.epub-chapter-body[data-spine="0"]').waitFor();
 const noteResult=await page.evaluate(async position=>{
  const t=readerTest; const entry={timestamp:new Date().toISOString(),content:'A note',lbp:position,selectedText:'pha nest'};
  await Promise.all([t.saveNote(t.app,t.book.path,entry),t.saveNote(t.app,t.book.path,{...entry,content:''})]);
  const entries=await t.loadNotes(t.app,t.book.path);return {count:entries.length,ids:entries.map(n=>n.id),path:[...t.text.keys()][0]};
 },point);
 assert.equal(noteResult.count,2);assert.equal(new Set(noteResult.ids).size,2);assert.equal(noteResult.path,'Books/test.notes.md');
 console.log('PASS: concurrent note/highlight writes preserve both entries beside the book');
 await page.evaluate(async()=>{await readerTest.close();await readerTest.open();});
 await page.locator('.epub-note-highlight').first().waitFor();
 assert.equal(await page.evaluate(()=>getSelection().toString()),'');
 console.log('PASS: reopening restores note highlights without taking over the selection');


 // Continuous reading shares the same LBP coordinate system as single-chapter mode.
 await page.evaluate(()=>readerTest.store.setSettings({...readerTest.store.state.settings,viewMode:readerTest.ViewMode.SCROLL}));
 await page.evaluate(()=>readerTest.store.navigateToChapter(1));
 await page.locator('.epub-chapter-body[data-spine="1"]').waitFor();
 await page.waitForFunction(()=>readerTest.store.state.currentLBP.start.spineIndex===1);
 const cross=await page.evaluate(()=>{
   const t=readerTest,c=document.querySelector('.epub-reading-viewport'),a=c.querySelector('[data-spine="0"]'),b=c.querySelector('[data-spine="1"]');
   const range=document.createRange();range.setStart(a.querySelector('em').firstChild,1);range.setEnd(b.querySelector('strong').firstChild,3);
   const value=t.lbp.rangeFromSelection(t.book.path,range,c);
   const first=t.lbp.LBPResolver.rangeInChapter(a,0,value),second=t.lbp.LBPResolver.rangeInChapter(b,1,value);
   if(!first.toString().startsWith('ested') || !second.toString().endsWith('acr'))throw Error('Cross-chapter range clipping failed');
   return t.lbp.serializeLBP(value);
 });
 console.log('PASS: cross-chapter LBP ranges resolve independently in both chapters');
 await page.evaluate(()=>{
   const root=document.querySelector('.epub-chapter-body[data-spine="0"]'),paragraph=root.querySelectorAll('p')[12];
   const c=document.querySelector('.epub-reading-viewport');c.scrollTop+=paragraph.getBoundingClientRect().top-c.getBoundingClientRect().top;
 });
 await page.waitForTimeout(250);
 const before=await page.evaluate(()=>readerTest.lbp.serializeLBP(readerTest.store.state.currentLBP));
 await page.evaluate(()=>readerTest.store.setSettings({...readerTest.store.state.settings,fontSize:26}));
 await page.waitForTimeout(350);
 const after=await page.evaluate(()=>readerTest.store.state.currentLBP.start.elementPath.join('/'));
 assert.equal(after,await page.evaluate(position=>readerTest.lbp.parseLBP(position).start.elementPath.join('/'),before));
 await page.evaluate(async()=>{await readerTest.close();await readerTest.open();});
 await page.locator('.epub-chapter-body[data-spine="0"]').waitFor();
 await page.waitForTimeout(350);
 assert.equal(await page.evaluate(()=>readerTest.store.state.currentLBP.start.elementPath.join('/')),after);
 assert.ok(await page.locator('.epub-reading-viewport').evaluate(el=>el.scrollTop)>500);
 console.log('PASS: font reflow and reopening restore the same LBP paragraph');
 // A literal metacharacter query must not be interpreted as a regular expression.
 assert.equal(await page.evaluate(async()=> (await readerTest.performSearch(readerTest.store.state.publication,'[')).length),0);
 assert.equal(await page.getByRole('button',{name:'Next page',exact:true}).isVisible(),true);
 console.log('PASS: literal search and chapter CSS isolation');
 await reviewRegressions(browser, 'http://127.0.0.1:'+server.address().port);
 await readingTools(browser, 'http://127.0.0.1:'+server.address().port);
 await localization(browser, 'http://127.0.0.1:'+server.address().port);
 await mobilePanels(browser, 'http://127.0.0.1:'+server.address().port);
 for(let index=0;index<realBooks.length;index++) {
   await page.evaluate(async ({index,name})=>{const bytes=new Uint8Array(await (await fetch('/book/'+index)).arrayBuffer());await readerTest.openReal(Array.from(bytes),name);},{index,name:path.basename(realBooks[index])});
   await page.locator('.epub-chapter-body').first().waitFor({timeout:20000});
   const count=await page.evaluate(()=>readerTest.store.state.totalChapters); assert.ok(count>0);
   await page.evaluate(()=>readerTest.store.navigateToChapter(Math.min(2,readerTest.store.state.totalChapters-1)));
   await page.locator('.epub-chapter-body[data-spine="'+Math.min(2,count-1)+'"]').waitFor({timeout:20000});
   assert.equal(await page.locator('.epub-error-boundary').count(),0);
   console.log('PASS: actual EPUB '+path.basename(realBooks[index])+' ('+count+' chapters), first and third chapters rendered');
 }
 assert.deepEqual(errors,[]);
 fs.mkdirSync('tests/output',{recursive:true});await page.screenshot({path:'tests/output/reader.png'});
 console.log('All browser regressions passed.');
} catch(error) { console.error('BODY:',(await page.locator('body').innerText()).slice(0,600));console.error('PAGE ERRORS:',errors);throw error; }
finally {await browser.close();await new Promise(resolve=>server.close(resolve));}
