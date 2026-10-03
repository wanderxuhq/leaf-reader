import assert from 'node:assert/strict';

export async function readingTools(browser, url) {
  const page = await browser.newPage({ viewport: { width: 1100, height: 800 } });
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  try {
    await page.goto(url);
    await page.addStyleTag({ content: 'body{font-family:system-ui,sans-serif;--background-secondary:#f3f2ef;--background-modifier-border:#dedcd7;--background-modifier-hover:#eeebf8;--text-muted:#706c78;--text-accent:#7154b8;--interactive-accent:#7154b8}button,input{font:inherit}' });
    await page.locator('.epub-chapter-body').waitFor();
    await page.waitForTimeout(180);
    assert.equal(await page.getByRole('button', { name: '后退', exact: true }).isDisabled(), true);
    assert.equal(await page.getByRole('button', { name: '前进', exact: true }).isDisabled(), true);
    const original = await page.evaluate(() => {
      const t = readerTest, viewport = document.querySelector('.epub-reading-viewport');
      viewport.scrollTop = 450;
      const position = t.captureReadingPosition(viewport, t.book.path);
      t.store.navigateToHref('Other/one.xhtml#target');
      return position;
    });
    await page.locator('.epub-chapter-body[data-spine="1"]').waitFor(); await page.waitForTimeout(120);
    await page.getByRole('button', { name: '后退', exact: true }).click();
    await page.locator('.epub-chapter-body[data-spine="0"]').waitFor(); await page.waitForTimeout(120);
    assert.deepEqual(await page.evaluate(() => readerTest.store.state.navigation.lbp), original);
    await page.getByRole('button', { name: '前进', exact: true }).click();
    await page.locator('.epub-chapter-body[data-spine="1"]').waitFor();
    const count = await page.evaluate(() => readerTest.store.state.historyBack.length);
    await page.getByRole('button', { name: 'Next page', exact: true }).click();
    await page.locator('.epub-chapter-body[data-spine="2"]').waitFor();
    assert.equal(await page.evaluate(() => readerTest.store.state.historyBack.length), count);
    console.log('PASS: jump history captures undebounced LBP, returns/advances, and excludes page turns');

    await page.getByRole('button', { name: 'Search', exact: true }).click();
    const searchInput = page.locator('.epub-toolbar-search-input');
    await searchInput.fill('needle'); await searchInput.press('Enter');
    await page.waitForFunction(() => !readerTest.store.state.searchBusy && readerTest.store.state.searchResults.length === 2);
    await page.waitForTimeout(160);
    assert.equal(await page.locator('.epub-chapter-body').getAttribute('data-spine'), '2');
    assert.equal(await page.evaluate(() => readerTest.store.state.currentSearchIndex), -1);
    await page.getByRole('button', { name: 'Previous match', exact: true }).click();
    await page.waitForFunction(() => readerTest.store.state.currentSearchIndex === 1);
    assert.equal(await page.locator('.epub-chapter-body').getAttribute('data-spine'), '2');
    await page.getByRole('button', { name: 'Next match', exact: true }).click();
    await page.locator('.epub-chapter-body[data-spine="1"]').waitFor();
    await page.getByRole('button', { name: 'Close search', exact: true }).click();
    console.log('PASS: search keeps the current chapter until explicit result navigation');

    await page.evaluate(() => readerTest.store.navigateToChapter(0));
    await page.locator('#foot-ref').waitFor(); await page.locator('#foot-ref').scrollIntoViewIfNeeded();
    const beforeNote = await page.evaluate(() => ({ scroll: document.querySelector('.epub-reading-viewport').scrollTop, history: readerTest.store.state.historyBack.length }));
    await page.locator('#foot-ref').click();
    const dialog = page.getByRole('dialog', { name: '脚注', exact: true }); await dialog.waitFor();
    assert.match(await dialog.innerText(), /Footnote explanation/);
    assert.equal(await dialog.locator('script,[style*="fixed"]').count(), 0);
    assert.equal(await page.evaluate(() => readerTest.store.state.historyBack.length), beforeNote.history);
    await page.keyboard.press('Escape'); await dialog.waitFor({ state: 'detached' });
    assert.equal(await page.locator('.epub-reading-viewport').evaluate(el => el.scrollTop), beforeNote.scroll);
    await page.locator('#plain-ref').click();
    await page.locator('.epub-chapter-body[data-spine="1"]').waitFor();
    assert.equal(await dialog.count(), 0);
    console.log('PASS: non-spine footnotes open safely in place; ordinary internal links still navigate');

    await page.evaluate(async () => {
      const t = readerTest;
      await t.saveNote(t.app, t.book.path, { timestamp: '', selectedText: 'Book one quote', content: 'My first thought', lbp: t.lbp.serializeLBP(t.lbp.chapterPoint(t.book.path,0)) });
      await t.saveNote(t.app, 'Books/other.epub', { timestamp: '', selectedText: 'Other book quote', content: 'Other thought', lbp: t.lbp.serializeLBP(t.lbp.chapterPoint('Books/other.epub',0)) });
    });
    await page.getByRole('button', { name: '读书笔记', exact: true }).click();
    assert.equal(await page.evaluate(() => readerTest.noteLeaves[0].view.getState().file), 'Books/test.notes.md');
    const notes = page.locator('.epub-notes-view'); await notes.waitFor();
    await page.getByText('My first thought', { exact: true }).waitFor();
    assert.equal(await notes.getByText('Other book quote').count(), 0);
    assert.equal(await notes.locator('.epub-notes-entry button').count(), 1);
    await notes.getByRole('button', { name: '切换到 Markdown 编辑器', exact: true }).click();
    assert.equal(await page.evaluate(() => readerTest.openedMarkdown[0]), 'Books/test.notes.md');
    assert.equal(await notes.count(), 0);
    await page.evaluate(async () => { const t=readerTest; await t.openNotesFile(t.app,t.app.vault.getAbstractFileByPath('Books/test.notes.md'),t.noteLeaves[0]); });
    await notes.waitFor();
    await page.evaluate(() => { const t = readerTest; const path = 'Books/test.notes.md'; t.text.set(path,t.text.get(path).replace('My first thought','Edited in Markdown')); t.emit('modify',t.app.vault.getAbstractFileByPath(path)); });
    await page.getByText('Edited in Markdown', { exact: true }).waitFor();
    await notes.getByRole('searchbox').fill('missing');
    assert.equal(await notes.locator('.epub-notes-entry').count(), 0);
    await notes.getByRole('searchbox').fill('Book one');
    await notes.getByRole('button', { name: '返回原文：Book one quote', exact: true }).click();
    await page.locator('.epub-chapter-body[data-spine="0"]').waitFor();
    assert.equal(await page.evaluate(() => readerTest.app.workspace.lastRevealed === readerTest.view.leaf), true);
    await page.getByRole('button', { name: '读书笔记', exact: true }).click();
    assert.equal(await notes.count(), 1);
    await page.evaluate(async () => { readerTest.Platform.isMobile = true; await readerTest.openBookNotes(readerTest.app,{ book:'Books/other.epub',title:'Other book',chapters:['Opening'] }); });
    assert.equal(await notes.count(), 2);
    assert.match(await notes.nth(1).innerText(), /Other book quote/);
    assert.doesNotMatch(await notes.nth(1).innerText(), /Book one quote/);
    await notes.first().screenshot({ path: 'tests/output/reading-notes.png' });
    await page.evaluate(() => { const t=readerTest, path='Books/other.notes.md'; t.text.set(path,'---\nepub-target: \"Books/other.epub\"\n---\n'); t.emit('modify',t.app.vault.getAbstractFileByPath(path)); });
    await notes.nth(1).getByText('选中文字，添加划线或笔记后会显示在这里。', {exact:true}).waitFor();
    assert.equal(await notes.first().locator('.epub-notes-entry').count(), 1);
    const staleMetadata = await page.evaluate(async () => {
      const t = readerTest, path = 'Books/test.notes.md', original = t.text.get(path), getCache = t.app.metadataCache.getFileCache;
      t.app.metadataCache.getFileCache = () => ({ frontmatter: { 'epub-target': t.book.path } });
      try {
        t.text.set(path, original.replace('epub-target: "Books/test.epub"', 'epub-target: "Books/other.epub"'));
        return (await t.loadNotes(t.app, t.book.path)).length;
      } finally { t.text.set(path, original); t.app.metadataCache.getFileCache = getCache; }
    });
    assert.equal(staleMetadata, 0);
    const scope = await page.evaluate(async () => {
      const t=readerTest, commands=[];
      t.registerNotesOpening({ app:t.app, register:()=>{}, registerEvent:()=>{}, addCommand:command=>commands.push(command) });
      const ordinary=await t.app.vault.create('ordinary.md','# An ordinary note');
      const items=[];
      const menu={ addItem:callback=>{const item={setTitle:title=>{items.push(title);return item;},setIcon:()=>item,onClick:()=>item}; callback(item); } };
      t.emit('file-menu',menu,ordinary,'file-explorer'); const ordinaryItems=items.length;
      t.emit('file-menu',menu,t.app.vault.getAbstractFileByPath('Books/test.notes.md'),'file-explorer');
      const before=t.noteLeaves.length;
      await t.openNotesFile(t.app,ordinary);
      return { ordinaryItems, notesItems:items.length, unchanged:t.noteLeaves.length===before,
        acceptsMarkdown:t.noteLeaves[0].view.canAcceptExtension('md'), command:commands[0].id };
    });
    assert.deepEqual(scope,{ordinaryItems:0,notesItems:1,unchanged:true,acceptsMarkdown:false,command:'open-reading-notes'});
    console.log('PASS: Markdown-backed custom views, editor switching, file isolation, live refresh and reader reuse');

    await page.evaluate(async () => {
      const t=readerTest; t.autoLeaf=t.app.workspace.getLeaf(true);
      await t.autoLeaf.setViewState({type:'markdown',state:{file:'Books/test.notes.md'}});
    });
    await page.waitForFunction(() => readerTest.autoLeaf.view.getViewType()==='leaf-reader-notes');
    await page.evaluate(() => readerTest.autoLeaf.contentEl.querySelector('[aria-label="切换到 Markdown 编辑器"]').click());
    await page.waitForFunction(() => readerTest.autoLeaf.view.getViewType()==='markdown');
    await page.evaluate(() => { const t=readerTest; t.emit('active-leaf-change',t.autoLeaf);t.emit('changed',t.autoLeaf.view.file); });
    await page.waitForTimeout(180);
    assert.equal(await page.evaluate(() => readerTest.autoLeaf.view.getViewType()),'markdown');
    await page.evaluate(async () => { const t=readerTest; await t.autoLeaf.setViewState({type:'markdown',state:{file:'ordinary.md'}}); });
    await page.waitForTimeout(80);
    assert.equal(await page.evaluate(() => readerTest.autoLeaf.view.getViewType()),'markdown');
    await page.evaluate(async () => { const t=readerTest; await t.autoLeaf.setViewState({type:'markdown',state:{file:'Books/test.notes.md'}}); });
    await page.waitForFunction(() => readerTest.autoLeaf.view.getViewType()==='leaf-reader-notes');
    await page.evaluate(async () => {
      const t=readerTest, originalRead=t.app.vault.read;
      let finish;
      t.app.vault.read=file=>file.path==='Books/test.notes.md' ? new Promise(resolve=>{finish=()=>resolve(t.text.get(file.path));}) : originalRead(file);
      try {
        t.raceLeaf=t.app.workspace.getLeaf(true);
        await t.raceLeaf.setViewState({type:'markdown',state:{file:'Books/test.notes.md'}});
        await t.raceLeaf.setViewState({type:'markdown',state:{file:'ordinary.md'}});
        finish();
      } finally { t.app.vault.read=originalRead; }
    });
    await page.waitForTimeout(100);
    assert.deepEqual(await page.evaluate(() => ({type:readerTest.raceLeaf.view.getViewType(),file:readerTest.raceLeaf.view.file.path})),{type:'markdown',file:'ordinary.md'});
    console.log('PASS: notes Markdown opens automatically, editor choice persists, ordinary files and rapid file switches stay intact');

    await page.setViewportSize({ width: 390, height: 844 });
    await page.addStyleTag({ content: '#app{width:100%;height:100dvh}.test-notes-pane{display:none}' });
    await page.locator('#foot-ref').scrollIntoViewIfNeeded(); await page.locator('#foot-ref').click();
    await dialog.waitFor(); assert.equal(await dialog.getAttribute('aria-modal'), 'true');
    const bounds = await dialog.evaluate(el => { const a=el.getBoundingClientRect(),b=document.querySelector('.epub-view-container').getBoundingClientRect();return a.left>=b.left&&a.right<=b.right+1&&a.bottom<=b.bottom+1; });
    assert.equal(bounds, true);
    await page.screenshot({ path: 'tests/output/mobile-footnote.png' });
    await page.getByRole('button', { name: '关闭脚注', exact: true }).click();
    const navigation = await page.evaluate(() => readerTest.store.state.navigation.id);
    await page.getByRole('button', { name: '后退', exact: true }).click();
    await page.waitForTimeout(120);
    assert.ok(await page.evaluate(() => readerTest.store.state.navigation.id) > navigation);
    await page.getByRole('button', { name: '前进', exact: true }).click();
    await page.locator('.epub-chapter-body[data-spine="0"]').waitFor();
    await page.screenshot({ path: 'tests/output/mobile-history.png' });
    assert.deepEqual(errors, []);
    console.log('PASS: mobile footnote sheet and one-tap back/forward navigation work');
  } finally { await page.close(); }
}
