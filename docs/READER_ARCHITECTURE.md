# EPUB 阅读器架构

## 核心流程

FileView 文件生命周期 → EPUB 解析 → ReaderStore → ChapterLoader → 响应式章节组件。

- epub-view.ts 负责 Obsidian 文件加载/卸载、取消过期加载、显示错误与重试、持久化 LBP。
- epub-store.ts 是唯一导航状态入口。每次导航清除上一目标的 LBP、片段、搜索结果，避免对象合并残留。
- chapter-loader.ts 限制两个并发章节处理任务，复用缓存，并在关闭时释放 Blob URL。
- components/chapter-content.tsx 按可见性和预加载范围处理正文，已加载章节保留内容，单章模式通过响应式 Show 切换。
- primitives/use-navigation.ts 在目标章节 DOM 就绪后执行一次定位。普通翻页由视口直接处理。
- position.ts 将可见文字转换成 LBP；设置和窗口变化通过相同坐标恢复。

## 定位与笔记

lbp.ts + dom-utils.ts 提供协议解析、序列化、DOM 端点转 LBP，以及 LBP 范围还原。字符偏移统一按正文 Text 节点计算。资源清理后注入 data-lidx，覆盖层不参与路径。

note-format.ts 定义 Markdown 块；note-repository.ts 负责书籍路径关联和串行创建/原子追加；use-notes.ts 监听元数据和文件变化并刷新。选择工具栏在选区变化时保存文字快照，按钮不会丢失选中文字。

search-logic.ts 与正文渲染共享 HTML 清理规则，保留原文空白及实体解码后的字符偏移。搜索结果导航先加载章节，再定位并绘制跨 Text 节点的高亮。

## 阅读工具

- notes-view.ts 是基于 Markdown 文件的 FileView，不注册或覆盖 md 扩展名。notes-opening.ts 监听当前文件打开和激活事件，确认实际 frontmatter 后自动切换笔记视图；异步读取过期时不切换。Markdown 按钮将同一个 leaf 切回编辑器，并记住该标签页对此文件的编辑选择，避免自动跳回。命令和文件菜单仍可显式切换。视图仅读取当前文件，以实际 frontmatter 的 epub-target 和每条笔记的 LBP 校验所属书籍，事件刷新与异步任务随文件卸载和视图关闭清理。
- epub-store.ts 区分内部定位 navigate 和主动跳转 jump。跳转前立即捕获并复制 LBP，返回/前进各保留至多 80 个位置；滚动、翻页和布局恢复不会新增历史。
- footnotes.ts 只识别 noteref、footnote/endnote 和对应 ARIA 角色，支持阅读顺序之外的尾注文件。浮窗使用独立清理过的内容，不修改正文 DOM 或 LBP 索引；资源随阅读页关闭释放。

## 验证

npm test 使用合成 EPUB 在真实浏览器中贯通核心流程。测试替身替代 Obsidian API，因此不构成 Obsidian 宿主实测。附加真实 EPUB 路径只读验证书籍解析和章节显示。

本次重构不兼容旧定位和笔记格式；旧文件保留，不做自动迁移。当前架构以本文件和 README 为准。

## LBP 坐标

BookID::SpineIndex@ElementPath#CharOffset：仓库内完整书籍路径、spine 索引、正文元素索引路径、UTF-16 字符偏移。范围用起止坐标表示。空元素路径指向章节正文根节点。

## Localization

`src/i18n.ts` uses Obsidian's `getLanguage()` API (available since 1.8.7) and a typed English, Simplified Chinese, and Traditional Chinese catalog. Unsupported languages fall back to English. Add UI copy to the catalog, including accessible labels and notices; keep book content, Markdown properties, command IDs, and stored locations independent of translations. No translation service or runtime dependency is used.
