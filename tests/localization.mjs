import assert from 'node:assert/strict';

export async function localization(browser, url) {
  for (const [language, labels] of [
    ['en', ['Toggle table of contents', 'Contents', 'Filter contents', 'No matching chapters', 'Settings', 'Reading settings', 'Single chapter', 'Reading notes', 'Search reading notes']],
    ['zh', ['展开或收起目录', '目录', '筛选目录', '没有匹配的章节', '设置', '阅读设置', '按章阅读', '读书笔记', '搜索读书笔记']],
    ['zh-TW', ['展開或收合目錄', '目錄', '篩選目錄', '沒有符合的章節', '設定', '閱讀設定', '逐章閱讀', '閱讀筆記', '搜尋閱讀筆記']],
    ['fr', ['Toggle table of contents', 'Contents', 'Filter contents', 'No matching chapters', 'Settings', 'Reading settings', 'Single chapter', 'Reading notes', 'Search reading notes']],
  ]) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors = []; page.on('pageerror', error => errors.push(error.message));
    try {
      await page.goto(url + '?lang=' + language);
      await page.addStyleTag({ content: '#app{width:100%;height:100dvh}' });
      await page.locator('.epub-chapter-body').waitFor();
      const catalog = await page.evaluate(() => {
        const { messages, resolveLanguage, translate } = readerTest.i18n;
        return { messages, aliases: ['zh', 'zh-CN', 'zh-SG', 'zh_TW', 'zh-Hant', 'zh-HK', 'en', 'fr'].map(resolveLanguage),
          interpolated: translate('zh', 'bookNotFound', { path: '<book>{path}.epub' }) };
      });
      assert.deepEqual(catalog.aliases, ['zh-CN', 'zh-CN', 'zh-CN', 'zh-TW', 'zh-TW', 'zh-TW', 'en', 'en']);
      assert.equal(catalog.interpolated, '找不到书籍：<book>{path}.epub');
      for (const values of Object.values(catalog.messages)) {
        const placeholders = value => [...value.matchAll(/\{(\w+)\}/g)].map(match => match[1]).sort();
        assert.equal(values.length, 3);
        for (const value of values) { assert.ok(value.trim()); assert.deepEqual(placeholders(value), placeholders(values[0])); }
      }
      await page.getByRole('button', { name: labels[0], exact: true }).click();
      await page.getByRole('dialog', { name: labels[1], exact: true }).waitFor();
      assert.equal(await page.locator('[aria-current="location"]').innerText(), 'First chapter');
      await page.getByRole('searchbox', { name: labels[2] }).fill('missing chapter');
      assert.equal(await page.getByRole('status').innerText(), labels[3]);
      await page.keyboard.press('Escape');
      await page.getByRole('button', { name: labels[4], exact: true }).click();
      const settings = page.getByRole('dialog', { name: labels[5], exact: true });
      await settings.waitFor();
      assert.equal(await settings.getByRole('button', { name: labels[6], exact: true }).isVisible(), true);
      assert.equal(await settings.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true);
      await page.screenshot({ path: 'tests/output/i18n-' + language + '.png' });
      await page.keyboard.press('Escape');
      const stored = await page.evaluate(async () => {
        const t = readerTest;
        await t.saveNote(t.app, t.book.path, { timestamp: '', selectedText: 'Original quote 原文', content: 'My thought 想法', lbp: t.lbp.serializeLBP(t.lbp.chapterPoint(t.book.path, 0)) });
        return t.text.get('Books/test.notes.md');
      });
      assert.match(stored, /epub-target:/); assert.match(stored, /Original quote 原文/); assert.match(stored, /My thought 想法/);
      await page.getByRole('button', { name: labels[7], exact: true }).click();
      const notes = page.locator('.epub-notes-view'); await notes.waitFor();
      await notes.getByText('My thought 想法', { exact: true }).waitFor();
      await notes.getByRole('searchbox', { name: labels[8] }).fill('missing');
      assert.equal(await notes.locator('.epub-notes-entry').count(), 0);
      assert.deepEqual(errors, []);
      console.log('PASS: ' + language + ' localization, mobile settings, notes and unchanged user content');
    } finally { await page.close(); }
  }
}
