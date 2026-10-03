import { getLanguage } from 'obsidian';

// Each key has English, Simplified Chinese, and Traditional Chinese copy.
export const messages = {
  "openEpub": ["Open epub file", "打开 EPUB 文件", "開啟 EPUB 檔案"],
  "selectEpub": ["Select epub file", "选择 EPUB 文件", "選擇 EPUB 檔案"],
  "noEpub": ["No epub files found in vault", "仓库中没有 EPUB 文件", "儲存庫中沒有 EPUB 檔案"],
  "invalidLink": ["Invalid book link", "无效的原文链接", "無效的原文連結"],
  "bookNotFound": ["Book not found: {path}", "找不到书籍：{path}", "找不到書籍：{path}"],
  "openLinkFailed": ["Unable to open the book link", "无法打开原文链接", "無法開啟原文連結"],
  "bookOpenFailed": ["Unable to open this book. Please try again.", "无法打开书籍，请重试。", "無法開啟書籍，請重試。"],
  "openingBook": ["Opening book…", "正在打开书籍…", "正在開啟書籍…"],
  "noChapters": ["This book has no readable chapters", "书籍没有可阅读的章节", "書籍沒有可閱讀的章節"],
  "retry": ["Retry", "重试", "重試"],
  "chapterLoading": ["Loading chapter…", "加载章节…", "載入章節…"],
  "chapterLoadFailed": ["Unable to load this chapter", "无法读取此章节", "無法讀取此章節"],
  "chapterSearchFailed": ["Unable to search chapter: {chapter}", "无法搜索章节：{chapter}", "無法搜尋章節：{chapter}"],
  "readerClosed": ["Reader closed", "阅读器已关闭", "閱讀器已關閉"],
  "chapterNotFound": ["Chapter not found", "找不到章节", "找不到章節"],
  "chapter": ["Chapter {number}", "第 {number} 章", "第 {number} 章"],
  "section": ["Section {number}", "第 {number} 节", "第 {number} 節"],
  "readingError": ["Reading error", "阅读出错", "閱讀出錯"],
  "renderFailed": ["Unable to display the reader. Please try again.", "无法显示阅读器，请重试。", "無法顯示閱讀器，請重試。"],
  "reopenBook": ["Reader encountered an error. Please try reopening the file.", "阅读器发生错误，请重新打开文件。", "閱讀器發生錯誤，請重新開啟檔案。"],
  "tocToggle": ["Toggle table of contents", "展开或收起目录", "展開或收合目錄"],
  "toc": ["Contents", "目录", "目錄"],
  "bookContents": ["Book contents", "书籍目录", "書籍目錄"],
  "filterToc": ["Filter contents", "筛选目录", "篩選目錄"],
  "findChapter": ["Find a chapter…", "查找章节…", "尋找章節…"],
  "noChaptersMatch": ["No matching chapters", "没有匹配的章节", "沒有符合的章節"],
  "currentChapter": ["Current chapter", "当前章节", "目前章節"],
  "chapterCount": ["Chapter {current} of {total}", "第 {current} 章，共 {total} 章", "第 {current} 章，共 {total} 章"],
  "chapterCountTitle": ["Current chapter / total chapters", "当前章节 / 总章节数", "目前章節 / 總章節數"],
  "collapse": ["Collapse {title}", "收起 {title}", "收合 {title}"],
  "expand": ["Expand {title}", "展开 {title}", "展開 {title}"],
  "closePanel": ["Close {title}", "关闭{title}", "關閉{title}"],
  "previousPage": ["Previous page", "上一页", "上一頁"],
  "nextPage": ["Next page", "下一页", "下一頁"],
  "history": ["Reading history", "阅读历史", "閱讀歷史"],
  "back": ["Back", "后退", "後退"],
  "forward": ["Forward", "前进", "前進"],
  "footnote": ["Footnote", "脚注", "註腳"],
  "search": ["Search", "搜索", "搜尋"],
  "closeSearch": ["Close search", "关闭搜索", "關閉搜尋"],
  "searchPlaceholder": ["Search in book…", "搜索书中文字…", "搜尋書中文字…"],
  "searching": ["Searching…", "正在搜索…", "正在搜尋…"],
  "searchFailed": ["Unable to search this book. Please try again.", "无法搜索书籍，请重试。", "無法搜尋書籍，請重試。"],
  "previousMatch": ["Previous match", "上一个结果", "上一個結果"],
  "nextMatch": ["Next match", "下一个结果", "下一個結果"],
  "settings": ["Settings", "设置", "設定"],
  "readingSettings": ["Reading settings", "阅读设置", "閱讀設定"],
  "reading": ["Reading", "阅读", "閱讀"],
  "readingMode": ["Reading mode", "阅读模式", "閱讀模式"],
  "defaultReadingMode": ["Default reading mode", "默认阅读模式", "預設閱讀模式"],
  "readingModeDescription": ["Read one chapter at a time or scroll continuously", "按章阅读或连续滚动阅读", "逐章閱讀或連續捲動閱讀"],
  "singleChapter": ["Single chapter", "按章阅读", "逐章閱讀"],
  "continuousScroll": ["Continuous scroll", "连续滚动", "連續捲動"],
  "done": ["Done", "完成", "完成"],
  "settingsSaveFailed": ["Unable to save reading settings", "阅读设置保存失败", "閱讀設定儲存失敗"],
  "notes": ["Reading notes", "读书笔记", "閱讀筆記"],
  "openAsNotes": ["Open as reading notes", "以读书笔记视图打开", "以閱讀筆記檢視開啟"],
  "notNotesFile": ["This is not a reading notes file", "这不是读书笔记文件", "這不是閱讀筆記檔案"],
  "useMarkdown": ["This is not a reading notes file. Open it in the Markdown editor.", "这不是读书笔记文件，请使用 Markdown 编辑器打开。", "這不是閱讀筆記檔案，請使用 Markdown 編輯器開啟。"],
  "noNotesYet": ["No notes yet. Select text to add a highlight or note.", "还没有笔记，选中文字即可添加划线或笔记", "還沒有筆記，選取文字即可新增標記或筆記"],
  "notesEmpty": ["Highlights and notes will appear here after you add them.", "选中文字，添加划线或笔记后会显示在这里。", "選取文字，新增標記或筆記後會顯示在這裡。"],
  "noNotesMatch": ["No matching notes", "没有匹配的笔记", "沒有符合的筆記"],
  "searchNotes": ["Search reading notes", "搜索读书笔记", "搜尋閱讀筆記"],
  "notesPlaceholder": ["Search quotes and notes…", "搜索引文和笔记…", "搜尋引文與筆記…"],
  "openNotesFailed": ["Unable to open reading notes", "无法打开读书笔记", "無法開啟閱讀筆記"],
  "readNotesFailed": ["Unable to read notes", "无法读取笔记。", "無法讀取筆記。"],
  "editMarkdown": ["Switch to Markdown editor", "切换到 Markdown 编辑器", "切換至 Markdown 編輯器"],
  "openMarkdownFailed": ["Unable to open Markdown", "无法打开 Markdown", "無法開啟 Markdown"],
  "backToText": ["Return to text", "返回原文", "返回原文"],
  "backToQuote": ["Return to text: {quote}", "返回原文：{quote}", "返回原文：{quote}"],
  "openTextFailed": ["Unable to open the original text", "无法打开原文", "無法開啟原文"],
  "highlight": ["Highlight", "划线", "標記"],
  "addNote": ["Note", "笔记", "筆記"],
  "addReadingNote": ["Add reading note", "添加读书笔记", "新增閱讀筆記"],
  "notePlaceholder": ["Write your thoughts", "写下你的想法", "寫下你的想法"],
  "save": ["Save", "保存", "儲存"],
  "savedTo": ["Saved to {path}", "已保存到 {path}", "已儲存至 {path}"],
  "saveNoteFailed": ["Unable to save the note. Please try again.", "笔记保存失败，请重试", "筆記儲存失敗，請重試"],
  "saveHighlightFailed": ["Unable to save the highlight", "划线保存失败", "標記儲存失敗"]
} as const satisfies Record<string, readonly [string, string, string]>;
export type MessageKey = keyof typeof messages;
export type Language = 'en' | 'zh-CN' | 'zh-TW';
export function resolveLanguage(language: string): Language {
  const code = language.toLowerCase().replace(/_/g, '-');
  if (/^zh(?:-|$)/.test(code)) return /(?:^|-)(tw|hk|mo|hant)(?:-|$)/.test(code) ? 'zh-TW' : 'zh-CN';
  return 'en';
}
export function translate(language: string, key: MessageKey, params: Record<string, string | number> = {}): string {
  const locale = resolveLanguage(language);
  const message = messages[key][locale === 'zh-CN' ? 1 : locale === 'zh-TW' ? 2 : 0];
  return message.replace(/\{(\w+)\}/g, (placeholder, name: string) => String(params[name] ?? placeholder));
}
export function t(key: MessageKey, params?: Record<string, string | number>): string {
  return translate(getLanguage(), key, params);
}
