# X Keyword Blocker

一个轻量、无依赖的 Tampermonkey / Userscript 脚本，用关键词自动隐藏 X（Twitter）时间线中的帖子。

## 功能

- 不区分大小写的关键词匹配，并兼容全角/半角字符
- 只检查新增或变化的帖子，降低长时间滚动时的性能开销
- 一键暂停或恢复过滤
- 持久保存累计拦截数量，并按帖子 ID 避免重复计数
- 从本地 UTF-8 TXT 文件导入，或从支持跨域访问的 HTTPS 文本网址导入
- 将关键词导出为 TXT 文件
- 自动适配 X 的浅色、Dim 和深色外观
- 支持键盘和移动端布局

## 安装

1. 安装 Tampermonkey、Violentmonkey 或其他兼容的 Userscript 管理器。
2. 新建脚本，将 `x-keyword-blocker.js` 的内容完整粘贴进去并保存。
3. 打开或刷新 `x.com` / `twitter.com`。

## 使用

从 Userscript 管理器菜单选择“管理屏蔽关键词”，或按 `Alt + Shift + K`（Mac：`Option + Shift + K`）打开管理面板。

TXT 文件采用“一行一个关键词”的格式。导入时可以选择：

- **合并导入**：保留当前列表，只添加尚不存在的关键词。
- **替换现有**：用导入内容覆盖当前列表。

网址导入仅接受 HTTPS 地址，并依赖目标服务器允许浏览器跨域读取。GitHub Raw 等公开纯文本地址通常可用；普通网页或禁止跨域访问的地址会显示读取失败。

## 计数说明

“累计拦截”按 X 帖子的 status ID 去重并保存在当前浏览器。为避免长期使用导致存储无限增长，脚本只保留最近 20,000 个已计数 ID；极早的帖子再次出现时可能重新计数。点击面板中的“清零”不会删除关键词。

## 开发检查

项目不需要安装依赖：

```bash
npm run check
npm test
```

X 的页面结构可能随时调整。如果 X 修改了 `data-testid="tweet"` 或 `data-testid="tweetText"`，选择器可能需要同步更新。
