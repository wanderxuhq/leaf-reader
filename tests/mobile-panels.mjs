import assert from 'node:assert/strict';
import fs from 'node:fs';

export async function mobilePanels(browser, url) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const boundsCheck = async selector => {
    const result = await page.locator(selector).evaluate(el => {
      const rect = el.getBoundingClientRect(), root = document.querySelector('.epub-view-container').getBoundingClientRect();
      return { inside: rect.left >= root.left - 1 && rect.right <= root.right + 1 && rect.top >= root.top - 1 && rect.bottom <= root.bottom + 1, noOverflow: el.scrollWidth <= el.clientWidth + 1 };
    });
    assert.deepEqual(result, { inside: true, noOverflow: true }, selector);
  };
  try {
    await page.goto(url);
    await page.addStyleTag({ content: '#app{width:100%;height:100dvh}body{font-family:system-ui,sans-serif;--background-secondary:#f3f2ef;--background-modifier-border:#dedcd7;--background-modifier-hover:#eeebf8;--text-muted:#706c78;--text-accent:#7154b8;--interactive-accent:#7154b8;--text-on-accent:white}button,input,select{font:inherit}select{background:var(--background-secondary);color:var(--text-normal);border:1px solid var(--background-modifier-border);padding:8px}button{border:1px solid var(--background-modifier-border);background:var(--background-secondary);color:var(--text-normal)}' });
    await page.locator('.epub-chapter-body').waitFor();
    // A long, nested TOC exercises scrolling, wrapping, disclosure and filtering.
    await page.evaluate(() => {
      const toc = readerTest.store.state.publication.toc.items;
      toc[0].children = { items: Array.from({length:24}, (_,i) => ({ href:'Text/one.xhtml#part'+i, title:'第一章 · 第 '+(i+1)+' 节：在一段很长的章节标题中保留完整的信息' })) };
    });
    await page.getByRole('button', {name:'Toggle table of contents',exact:true}).tap();
    await page.getByRole('dialog', {name:'目录',exact:true}).waitFor();
    await boundsCheck('.epub-reader-panel-toc');
    assert.equal(await page.locator('.epub-reader-surface').evaluate(el=>el.inert),true);
    assert.equal(await page.locator('[aria-current="location"]').innerText(),'First chapter');
    await page.getByRole('button',{name:'收起 First chapter',exact:true}).tap();
    assert.equal(await page.getByRole('button',{name:/第一章 · 第 1 节/}).count(),0);
    await page.getByRole('searchbox',{name:'筛选目录'}).fill('第 24 节');
    assert.equal(await page.locator('.epub-toc-link').count(),2); // matching child and its parent
    await page.getByRole('searchbox',{name:'筛选目录'}).fill('missing chapter');
    assert.equal(await page.getByRole('status').innerText(),'没有匹配的章节');
    await page.getByRole('searchbox',{name:'筛选目录'}).fill('Second');
    await page.getByRole('button',{name:'Second chapter',exact:true}).tap();
    await page.locator('.epub-chapter-body[data-spine="1"]').waitFor();
    assert.equal(await page.getByRole('dialog').count(),0);
    await page.getByRole('button', {name:'Toggle table of contents',exact:true}).tap();
    assert.equal(await page.locator('[aria-current="location"]').innerText(),'Second chapter');
    await page.locator('[aria-current="location"]').waitFor({state:'visible'});
    await page.waitForTimeout(80);
    const activeVisible = await page.locator('[aria-current="location"]').evaluate(el=>{const a=el.getBoundingClientRect(),b=el.closest('.epub-panel-scroll').getBoundingClientRect();return {top:a.top,bottom:a.bottom,viewportTop:b.top,viewportBottom:b.bottom};});
    assert.ok(activeVisible.top >= activeVisible.viewportTop - 1 && activeVisible.bottom <= activeVisible.viewportBottom + 1, JSON.stringify(activeVisible));
    fs.mkdirSync('tests/output',{recursive:true});
    await page.screenshot({path:'tests/output/mobile-toc.png'});
    await page.keyboard.press('Escape');
    assert.equal(await page.getByRole('button',{name:'Toggle table of contents',exact:true}).evaluate(el=>el===document.activeElement),true);
    assert.equal(await page.locator('.epub-reader-surface').evaluate(el=>el.inert),false);
    console.log('PASS: mobile TOC filtering, hierarchy, active chapter reveal, navigation and focus restoration');

    await page.getByRole('button',{name:'Settings',exact:true}).tap();
    await boundsCheck('.epub-reader-panel-settings');
    assert.equal(await page.getByRole('slider').count(),0);
    assert.equal(await page.getByRole('combobox').count(),0);
    assert.equal(await page.getByText('更多设置',{exact:true}).count(),0);
    await page.screenshot({path:'tests/output/mobile-settings.png'});
    assert.equal(await page.getByRole('button',{name:'关闭阅读设置',exact:true}).evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.getByRole('button',{name:'完成',exact:true}).evaluate(el=>el===document.activeElement),true);
    await page.keyboard.press('Tab');
    assert.equal(await page.getByRole('button',{name:'关闭阅读设置',exact:true}).evaluate(el=>el===document.activeElement),true);
    const before = await page.evaluate(()=>readerTest.store.state.currentLBP.start);
    await page.getByRole('button',{name:'连续滚动',exact:false}).tap();
    await page.waitForTimeout(180);
    assert.deepEqual(await page.evaluate(()=>readerTest.store.state.currentLBP.start),before);
    await page.getByRole('button',{name:'完成',exact:true}).tap();
    await page.evaluate(async()=>{await readerTest.close();await readerTest.open();});
    await page.locator('.epub-chapter-body[data-spine="1"]').waitFor();
    assert.equal(await page.evaluate(()=>readerTest.store.state.settings.viewMode),'scroll');
    console.log('PASS: reading mode, keyboard focus trap, persistence and unchanged LBP');

    for (const size of [{width:320,height:568},{width:844,height:390},{width:1024,height:768}]) {
      await page.setViewportSize(size);
      // A narrow Obsidian pane must adapt even inside a wide desktop window.
      await page.locator('#app').evaluate((el,width)=>{el.style.width=width;},size.width===1024?'390px':'100%');
      await boundsCheck('.epub-header');
      const targets=await page.locator('.epub-header-btn').evaluateAll(els=>els.every(el=>el.getBoundingClientRect().width>=44&&el.getBoundingClientRect().height>=44));
      assert.equal(targets,true);
      await page.getByRole('button',{name:'Settings',exact:true}).tap();
      await boundsCheck('.epub-reader-panel-settings');
      await page.getByRole('button',{name:'按章阅读',exact:true}).tap();
      await page.getByRole('button',{name:'完成',exact:true}).tap();
      await page.getByRole('button',{name:'Search',exact:true}).tap();
      await boundsCheck('.epub-header');
      const input=page.locator('.epub-toolbar-search-input');
      assert.ok((await input.boundingBox()).width>=150);
      await input.fill('needle');await input.press('Enter');
      await page.waitForFunction(()=>!readerTest.store.state.searchBusy&&readerTest.store.state.searchResults.length>0);
      await page.getByRole('button',{name:'Close search',exact:true}).tap();
    }
    console.log('PASS: 320px portrait, short landscape, narrow desktop pane and usable mobile search');
    await page.locator('#app').evaluate(el=>{el.style.width='100%';});
    await page.getByRole('button',{name:'Settings',exact:true}).tap();
    await boundsCheck('.epub-reader-panel-settings');
    await page.screenshot({path:'tests/output/desktop-settings.png'});
    assert.equal(await page.locator('.epub-reader-surface').evaluate(el=>el.inert),false);
    assert.equal(await page.locator('.epub-panel-backdrop').isVisible(),false);
    await page.locator('.epub-reading-viewport').tap({position:{x:20,y:30}});
    assert.equal(await page.getByRole('dialog').count(),0);
    await page.evaluate(()=>{readerTest.store.state.publication.toc.items[0].children={items:[{href:'Text/one.xhtml#quote',title:'1.1 嵌套文字与引用'},{href:'Text/one.xhtml#part',title:'1.2 阅读、笔记和原文位置',children:{items:[{href:'Text/one.xhtml#detail',title:'1.2.1 保留目录层级'}]}}]};});
    await page.getByRole('button',{name:'Toggle table of contents',exact:true}).click();
    await boundsCheck('.epub-reader-panel-toc');
    assert.equal(await page.locator('.epub-reader-surface').evaluate(el=>el.inert),false);
    const desktopLayout = await page.evaluate(()=>({toc:document.querySelector('.epub-reader-panel-toc').getBoundingClientRect().right, reading:document.querySelector('.epub-reading-viewport').getBoundingClientRect().left}));
    assert.ok(desktopLayout.reading>=desktopLayout.toc);
    await page.getByRole('button',{name:'First chapter',exact:true}).click();
    await page.locator('.epub-chapter-body[data-spine="0"]').waitFor();
    assert.equal(await page.getByRole('dialog',{name:'目录',exact:true}).count(),1);
    await page.screenshot({path:'tests/output/desktop-toc.png'});
    await page.getByRole('button',{name:'Toggle table of contents',exact:true}).click();
    assert.equal(await page.getByRole('dialog').count(),0);
    console.log('PASS: desktop docked TOC preserves reading space and stays open; settings remain non-modal');
    await page.addStyleTag({content:'body{--background-primary:#202126;--background-secondary:#292b31;--background-modifier-border:#40424b;--background-modifier-hover:#383146;--text-normal:#ededf0;--text-muted:#b4b0bd;--text-accent:#bb9af7;--interactive-accent:#7550ac}'});
    await page.setViewportSize({width:390,height:844});
    await page.getByRole('button',{name:'Settings',exact:true}).tap();
    await page.screenshot({path:'tests/output/mobile-settings-dark.png'});
    assert.deepEqual(errors,[]);
  } finally {await page.close();}
}
