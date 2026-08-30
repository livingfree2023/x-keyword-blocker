# X Keyword Blocker

[English](README.en.md)

一个轻量、无依赖的 Tampermonkey / Violentmonkey 用户脚本，用关键词和广告标记自动隐藏 X（Twitter）时间线中的帖子。支持 `x.com` 与 `twitter.com`。

## 功能

- 不区分大小写的关键词匹配，支持 Unicode 规范化
- 可选匹配作者显示名称和 `@username`
- 独立屏蔽“广告 / Promoted / Sponsored”等推广帖子
- 持久保存累计拦截次数，并可显示 `+N` 浮动提示
- 从本地 TXT 或 HTTPS URL 导入，支持导出 TXT
- 支持暂停过滤、一键清空关键词、深浅色和移动端布局

## 安装

1. 安装 Tampermonkey、Violentmonkey 或其他兼容的用户脚本管理器。
2. 新建用户脚本，粘贴 [`x-keyword-blocker.js`](x-keyword-blocker.js) 的完整内容并保存。
3. 打开或刷新 `x.com` / `twitter.com`。

已有关键词、统计和开关设置会在升级后保留。

## 使用

从用户脚本管理器菜单选择“管理屏蔽关键词”。快捷键为：

- Windows / Linux：`Alt + Shift + K`
- macOS：`Option + Shift + K`

如果快捷键被浏览器或输入法占用，请使用用户脚本菜单。

| 设置 | 默认值 | 说明 |
| --- | --- | --- |
| 过滤状态 | 开启 | 控制全部过滤功能 |
| 浮动拦截提示 | 开启 | 拦截后显示累计数和 `+N`，1 秒后消失 |
| 匹配作者名称与 ID | 关闭 | 同时检查显示名称和 `@username` |
| 屏蔽广告 | 开启 | 独立隐藏带推广标记的帖子 |

“屏蔽广告”不依赖关键词列表；清空关键词后仍可继续屏蔽推广帖子。

## 导入与导出

TXT 文件每行一个关键词：

```text
广告
crypto
airdrop
```

导入时可选择：

- **合并导入**：保留现有关键词并添加新词。
- **替换现有**：用导入内容覆盖当前列表。

限制：最多 2,000 个关键词；每个关键词最多 100 个字符；文件最大 512 KB；URL 必须为公开的 HTTPS 纯文本地址。支持 GitHub Raw、Cloudflare Pages 等地址。

URL 导入使用用户脚本管理器的跨域请求权限。脚本只请求你主动填写的地址，不携带登录 Cookie。

## 说明

- 累计拦截数保存在当前浏览器中；刷新后再次拦截同一帖子会继续累计。
- 关键词、统计和设置仅保存在用户脚本管理器的本地存储中。
- X 页面结构发生变化时，脚本选择器可能需要更新。

## 开发

```bash
npm run check
npm test
```

## 许可证

[MIT](LICENSE)
