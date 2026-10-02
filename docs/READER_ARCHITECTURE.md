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

## 验证

npm test 使用合成 EPUB 在真实浏览器中贯通核心流程。测试替身替代 Obsidian API，因此不构成 Obsidian 宿主实测。附加真实 EPUB 路径只读验证书籍解析和章节显示。

本次重构不兼容旧定位和笔记格式；旧文件保留，不做自动迁移。当前架构以本文件和 README 为准。

## LBP 坐标

BookID::SpineIndex@ElementPath#CharOffset：仓库内完整书籍路径、spine 索引、正文元素索引路径、UTF-16 字符偏移。范围用起止坐标表示。空元素路径指向章节正文根节点。
