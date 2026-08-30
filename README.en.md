# X Keyword Blocker

[中文](README.md)

A lightweight, dependency-free Tampermonkey / Violentmonkey userscript that hides posts on X (Twitter) by keyword or promoted-post label. It supports both `x.com` and `twitter.com`.

## Features

- Case-insensitive keyword matching with Unicode normalization
- Optional matching against display names and `@usernames`
- Independent blocking of Ad, Promoted, and Sponsored posts
- Persistent lifetime block counter with an optional `+N` notification
- Import from local TXT files or HTTPS URLs and export to TXT
- Pause filtering, clear all keywords, and use responsive light/dark UI
- Chinese and English UI, with automatic browser-language detection

## Installation

1. Install Tampermonkey, Violentmonkey, or another compatible userscript manager.
2. Create a new userscript and paste the complete contents of [`x-keyword-blocker.js`](x-keyword-blocker.js).
3. Save it, then open or refresh `x.com` / `twitter.com`.

Existing keywords, statistics, and settings are preserved when the script is upgraded.

## Usage

Open “管理屏蔽关键词” (“Manage blocked keywords”) from your userscript manager menu. You can also use:

- Windows / Linux: `Alt + Shift + K`
- macOS: `Option + Shift + K`

Use the userscript menu if the browser or input method intercepts the shortcut.

Use the Language setting in the panel to select Auto, 中文, or English. The panel reopens immediately after a change.

| Setting | Default | Description |
| --- | --- | --- |
| Filtering | On | Master switch for all filtering |
| Floating notification | On | Shows the lifetime total and `+N` for two seconds |
| Match author name and ID | Off | Also checks display names and `@usernames` |
| Block promoted posts | On | Independently hides posts marked as promoted |

Promoted-post blocking does not depend on the keyword list and continues working after all keywords are cleared.

## Import and export

TXT files use one keyword per line:

```text
ad
crypto
airdrop
```

Choose one of the following during import:

- **Merge:** keep existing keywords and add new ones.
- **Replace:** overwrite the current list with the imported list.

Limits: 2,000 keywords, 100 characters per keyword, and 512 KB per file. URL imports must point to a public HTTPS plain-text file. GitHub Raw and Cloudflare Pages URLs are supported.

URL imports use the userscript manager's cross-origin request permission. The script only requests URLs you explicitly enter and does not send login cookies.

## Notes

- The lifetime counter is stored in the current browser. Blocking the same post again after a refresh increases it again.
- Keywords, statistics, and settings remain in the userscript manager's local storage.
- Changes to X's page structure may require selector updates.

## Development

```bash
npm run check
npm test
```

## License

[MIT](LICENSE)
