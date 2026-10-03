import assert from 'node:assert/strict';

export async function reviewRegressions(browser, url) {
  const page = await browser.newPage({ viewport: { width: 1000, height: 760 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  // Keep test input local even if a sanitizer regression introduces a request.
  await page.route('**/*', route => route.request().url().startsWith(url) ? route.continue() : route.abort());
  try {
    await page.goto(url);
    await page.locator('.epub-chapter-body').waitFor();
    await page.waitForTimeout(180);
    const scheduling = await page.evaluate(() => {
      const frame = document.createElement('iframe'); document.body.append(frame);
      const owner = frame.contentWindow, doc = frame.contentDocument;
      const container = document.createElement('div'); doc.body.append(container);
      const counts = { frames: 0, timers: 0, cancelledFrames: 0, cancelledTimers: 0 };
      owner.requestAnimationFrame = () => { counts.frames++; return 71; };
      owner.cancelAnimationFrame = id => { if (id === 71) counts.cancelledFrames++; };
      owner.setTimeout = () => { counts.timers++; return 72; };
      owner.clearTimeout = id => { if (id === 72) counts.cancelledTimers++; };
      let dispose;
      readerTest.createRoot(cleanup => {
        dispose = cleanup;
        readerTest.useSearchHighlight(() => container, readerTest.store, () => 0);
        readerTest.useSelection(readerTest.app, readerTest.book, () => container, () => {});
      });
      container.dispatchEvent(new owner.Event('pointerup'));
      dispose();
      // Disposed effects must also remove the owning document's event listeners.
      container.dispatchEvent(new owner.Event('pointerup'));
      doc.dispatchEvent(new owner.Event('selectionchange'));
      frame.remove();
      return counts;
    });
    assert.deepEqual(scheduling, { frames: 1, timers: 1, cancelledFrames: 1, cancelledTimers: 1 });
    console.log('PASS: secondary-window animation/timers use their owner and clean up on disposal');
    const resources = await page.evaluate(async () => {
      const png = document.createElement('canvas').toDataURL('image/png');
      const zip = { hasFile: path => path === 'OPS/Images/sprite.svg',
        readBinary: async () => new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"><circle id="dot" r="4"/></svg>').buffer };
      const processor = new readerTest.EpubResourceProcessor(zip, 'OPS/');
      const result = await processor.processChapter('<style>.art{background-image:url("' + png + '")}</style><img id="embedded" src="' + png + '"><img id="external" src="https://example.invalid/image.png"><img id="bad" src="data:text/html,unsafe"><svg><defs><circle id="s" r="5"/></defs><use id="legacy" xlink:href="#s"/><use id="modern" href="#s"/><use id="archive" href="../Images/sprite.svg#dot"/></svg>', 'Text/one.xhtml');
      const doc = new DOMParser().parseFromString(result.html, 'text/html');
      const img = new Image(); img.src = doc.getElementById('embedded').getAttribute('src'); await img.decode();
      const report = { decoded: img.naturalWidth > 0, cssData: result.styles.join('').includes(png),
        legacy: doc.getElementById('legacy').getAttribute('xlink:href'), modern: doc.getElementById('modern').getAttribute('href'),
        archive: doc.getElementById('archive').getAttribute('href'), external: doc.getElementById('external').getAttribute('src'),
        bad: doc.getElementById('bad').getAttribute('src') };
      processor.cleanup(); return report;
    });
    assert.equal(resources.decoded, true);
    assert.equal(resources.cssData, true);
    assert.equal(resources.legacy, '#s'); assert.equal(resources.modern, '#s');
    assert.match(resources.archive, /^blob:.*#dot$/);
    assert.equal(resources.external, null); assert.equal(resources.bad, null);
    console.log('PASS: embedded PNG decoding, CSS data images, SVG fragments and blocked remote resources');

    const isolated = await page.evaluate(async () => {
      const processor = new readerTest.EpubResourceProcessor({ hasFile: () => false });
      const result = await processor.processChapter('<div id="fixed-book-layer" style="position:fixed;inset:0;z-index:999999;background:red">Book layer</div>', 'one.xhtml');
      const root = document.querySelector('.epub-chapter-body');
      const host = document.createElement('div'); host.innerHTML = result.html; root.append(host);
      const viewport = document.querySelector('.epub-reading-viewport');
      const bounds = viewport.getBoundingClientRect();
      const header = document.querySelector('.epub-header').getBoundingClientRect();
      const hit = document.elementFromPoint(header.left + 20, header.top + header.height / 2);
      const outside = [[bounds.left + 20, bounds.top - 2], [bounds.left + 20, bounds.bottom + 2], [bounds.left - 2, bounds.top + 20], [bounds.right + 2, bounds.top + 20]];
      const report = { headerCovered: host.contains(hit),
        escapes: outside.some(([x,y]) => host.contains(document.elementFromPoint(x,y))),
        visibleInside: host.contains(document.elementFromPoint(bounds.left + 20, bounds.top + 20)),
        contained: getComputedStyle(viewport).contain.includes('paint') };
      host.remove(); processor.cleanup(); return report;
    });
    assert.equal(isolated.contained, true); assert.equal(isolated.headerCovered, false);
    assert.equal(isolated.escapes, false); assert.equal(isolated.visibleInside, true);
    console.log('PASS: fixed-position book content cannot cover the host toolbar');

    // Select a character from the final visible line without scrolling it into the center.
    const selection = await page.evaluate(() => {
      const viewport = document.querySelector('.epub-reading-viewport'), root = document.querySelector('.epub-chapter-body');
      const bounds = viewport.getBoundingClientRect();
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT); let node, candidate;
      while ((node = walker.nextNode())) {
        for (let i = 0; i < node.length; i++) {
          const range = document.createRange(); range.setStart(node,i); range.setEnd(node,i+1);
          const rect = range.getBoundingClientRect();
          if (rect.height && rect.top >= bounds.top && rect.bottom <= bounds.bottom && node.textContent[i].trim()) candidate = range;
        }
      }
      if (!candidate) throw Error('No visible selection fixture');
      readerTest.dismissRange = candidate.cloneRange();
      getSelection().removeAllRanges(); getSelection().addRange(candidate);
      return { text: getSelection().toString(), bottom: candidate.getBoundingClientRect().bottom };
    });
    await page.getByRole('button', { name: '划线', exact: true }).waitFor();
    const placement = await page.evaluate(() => {
      const toolbar = document.querySelector('.global-note-button-container').getBoundingClientRect();
      const viewport = document.querySelector('.epub-reading-viewport').getBoundingClientRect();
      return { top: toolbar.top, bottom: toolbar.bottom, viewportTop: viewport.top, viewportBottom: viewport.bottom };
    });
    assert.ok(placement.top >= placement.viewportTop);
    assert.ok(placement.bottom <= placement.viewportBottom);
    assert.ok(placement.bottom < selection.bottom);
    await page.locator('.epub-reading-viewport').click({ position: { x: 3, y: 3 } });
    await page.waitForTimeout(180);
    assert.equal(await page.locator('.global-note-button-container').count(), 0);
    await page.evaluate(() => { getSelection().removeAllRanges(); getSelection().addRange(readerTest.dismissRange); });
    await page.getByRole('button', { name: '划线', exact: true }).click();
    await page.waitForFunction(() => readerTest.text.size > 0);
    assert.equal(await page.evaluate(async () => (await readerTest.loadNotes(readerTest.app, readerTest.book.path))[0].selectedText), selection.text);
    console.log('PASS: bottom-of-viewport selection toolbar stays visible and saves the selected text');
    await page.evaluate(() => getSelection().removeAllRanges());
    await page.locator('.epub-note-highlight').first().click();
    await page.locator('.epub-note-popup').waitFor();
    assert.equal(await page.locator('.epub-note-popup p').count(), 0);
    assert.equal(await page.locator('.epub-note-popup button').count(), 0);
    assert.equal(await page.locator('.epub-note-popup blockquote').evaluate(el => getComputedStyle(el).marginLeft), '0px');
    assert.equal(await page.getByText('已划线', { exact: true }).count(), 0);
    await page.locator('.epub-note-popup blockquote').dispatchEvent('pointerdown', { bubbles: true });
    assert.equal(await page.locator('.epub-note-popup').count(), 1);
    await page.locator('.epub-reading-viewport').click({ position: { x: 3, y: 3 } });
    await page.waitForTimeout(180);
    assert.equal(await page.locator('.epub-note-popup').count(), 0);
    assert.equal(await page.locator('.global-note-button-container').count(), 0);
    console.log('PASS: blank-area dismissal closes selection and highlight overlays without reopening them');

    // The following chapter remains readable after one spine entry fails.
    await page.evaluate(() => {
      const pub = readerTest.store.state.publication, original = pub.get.bind(pub);
      readerTest.restoreFetcher = () => { pub.get = original; };
      pub.get = link => link.id === 'two' ? { readAsString: async () => { throw Error('Unreadable chapter'); } } : original(link);
      readerTest.store.navigateToChapter(1);
    });
    await page.locator('[data-chapter-index="1"][data-load-state="error"]').waitFor();
    await page.getByRole('button', { name: 'Next page', exact: true }).click();
    await page.locator('.epub-chapter-body[data-spine="2"]').waitFor();
    await page.waitForTimeout(160);
    await page.evaluate(() => readerTest.store.navigateToChapter(1));
    await page.locator('[data-chapter-index="1"][data-load-state="error"]').waitFor();
    await page.getByRole('button', { name: 'Previous page', exact: true }).click();
    await page.locator('.epub-chapter-body[data-spine="0"]').waitFor();
    await page.waitForTimeout(160);
    await page.evaluate(() => readerTest.store.navigateToChapter(1));
    await page.locator('[data-chapter-index="1"][data-load-state="error"]').waitFor();
    await page.evaluate(() => readerTest.restoreFetcher());
    await page.getByRole('button', { name: '重试', exact: true }).click();
    await page.locator('.epub-chapter-body[data-spine="1"]').waitFor();
    await page.waitForTimeout(180);
    assert.equal(await page.evaluate(() => readerTest.store.state.currentLBP.start.spineIndex), 1);
    console.log('PASS: failed chapters can be skipped in either direction and successfully retried');
    assert.deepEqual(errors, []);
  } finally { await page.close(); }
}
