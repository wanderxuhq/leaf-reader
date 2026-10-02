/** Parse CSS structurally; book selectors must never target Obsidian's UI. */
export function scopeChapterStyles(styles: string[], scope: string): string {
  const sheet = new CSSStyleSheet();
  try { sheet.replaceSync(styles.join('\n')); } catch { return ''; }
  const scopeRules = (rules: CSSRuleList): string => Array.from(rules).map(rule => {
    if (rule instanceof CSSStyleRule) {
      const style = rule;
      const selector = style.selectorText.replace(/(^|[\s>+~,(])(html|body|:root)(?=[\s>+~.#:[,)\]]|$)/g, '$1.epub-book-body').replace(/(?:\.epub-book-body\s+)+\.epub-book-body/g, '.epub-book-body');
      return scope + ' :is(' + selector + ') {' + style.style.cssText + '}';
    }
    if (rule instanceof CSSMediaRule || rule instanceof CSSSupportsRule) {
      const group = rule as CSSGroupingRule;
      return rule.cssText.slice(0, rule.cssText.indexOf('{') + 1) + scopeRules(group.cssRules) + '}';
    }
    if (rule instanceof CSSFontFaceRule) return rule.cssText; // Embedded fonts, URLs already made local.
    return '';
  }).join('\n');
  return scopeRules(sheet.cssRules);
}
