# X Keyword Blocker

[中文](README.md)

A lightweight, dependency-free Tampermonkey / Violentmonkey userscript that hides posts on X (Twitter) by keyword or promoted-post label. It supports both `x.com` and `twitter.com`.

## Features

- Case-insensitive keyword matching with Unicode normalization, plus optional **whole-word matching** (exact ASCII word-boundary matching to prevent false positives on compounds; CJK remains substring matching)
- **Regular expression matching**: supports `/pattern/flags` syntax (e.g. `/(wechat|tg)[\s:：]*\w+/i`) with real-time syntax validation and purple "RegEx" badges
- Flexible **filter scope**: choose between "All pages" or "Home timeline only" (allows posts on user profiles, search, or permalink pages without false hits)
- Optional matching against author display names and `@usernames`
- Independent blocking of "Ad / Promoted / Sponsored" posts across multiple languages without relying on keywords
- **Multi-dimensional statistics**: persistent lifetime block counter, **today's blocks**, and **past 7 days** count, plus an optional floating `+N` badge showing the matched keywords
- **Quick block**: a floating icon in the corner of each post lets you block the author (`@username`) or the selected text without opening the panel
- **Keyword expiration (temporary blocking)**: configure 24-hour, 7-day, 30-day, or custom expiration dates for individual keywords, showing remaining time badges and auto-cleaning with notifications upon startup/opening
- **Remote wordlist subscriptions & auto-sync**: subscribe to public HTTPS plain-text wordlists with configurable update intervals (12h, 24h, 3d, 7d), automatically syncing on startup/open (additive merge, 10-minute session throttling)
- **Full migration package & rules import/export**:
  - Export and import local TXT rule files (one keyword per line) and HTTPS URL imports
  - Export and restore **full JSON migration packages** (backing up keywords, expiration rules, settings, stats, and subscriptions)
- Responsive light/dark mode support and mobile layout adaptability
- Bilingual interface (English and Chinese) with automatic browser-language detection

## Installation

1. Install Tampermonkey, Violentmonkey, or another compatible userscript manager.
2. Click the [one-click install link](https://raw.githubusercontent.com/livingfree2023/x-keyword-blocker/main/x-keyword-blocker.js) (or [jsDelivr mirror](https://cdn.jsdelivr.net/gh/livingfree2023/x-keyword-blocker@main/x-keyword-blocker.js)) to install directly, or create a new userscript and paste the complete contents of [`x-keyword-blocker.js`](x-keyword-blocker.js).
3. Save it, then open or refresh `x.com` / `twitter.com`.

Scripts installed from the URL will automatically receive future updates via `@updateURL`. Existing keywords, statistics, and settings are preserved when the script is upgraded.

## Usage

Open “管理屏蔽关键词” (“Manage blocked keywords”) from your userscript manager menu. You can also use:

- Windows / Linux: `Alt + Shift + K`
- macOS: `Option + Shift + K`

Use the userscript menu if the browser or input method intercepts the shortcut.

Use the Language setting in the panel to select Auto, 中文, or English. The panel reopens immediately after a change.

### Matching Rules & Regular Expressions

- **Plain keywords**: Case-insensitive by default with Unicode normalization (NFKC).
- **Whole-word matching (optional)**: When enabled, ASCII keywords match only whole words (e.g. `cat` will not match `caterpillar`), while CJK languages retain natural substring matching.
- **Regular expression rules**: Enter expressions wrapped in slashes with optional flags, such as `/pattern/flags` (e.g. `/(vx|wechat|tg|t\.me)[\s:：]*\w+/i` or `/[0-9]{6}/`):
  - Automatically parses pattern and flags (supports `i`, `m`, `s`, `u`, `v`);
  - Tagged with a distinct purple "RegEx" badge in the keyword list;
  - Real-time syntax validation blocks invalid regex input with helpful error messages;
  - Deeply inspects post text, including emoji `alt` attributes.

### Settings

| Setting | Default | Description |
| --- | --- | --- |
| Filtering | On | Master switch for all filtering |
| Floating notification | On | Shows the lifetime total and `+N` notification for two seconds |
| Match author name and ID | Off | Also checks author display names and `@usernames` |
| Block promoted posts | On | Independently hides posts marked as promoted or sponsored |
| Whole word | Off | Enforces word boundaries for ASCII / English keywords (prevents `act` from matching `reactor`); CJK characters retain natural substring matching |
| Filter scope | All pages | Choose between "All pages" and "Home timeline only" (limits filtering to `/` and `/home` routes) |
| Blocked posts | Remove | Choose "Remove" or "Collapse bar" (collapsed posts show the matched keyword and can be expanded with a click) |

### Keyword Expiration (Temporary Blocking)

Click the clock icon next to any keyword in the list to set its expiration:
- **Permanent**: Default indefinite blocking.
- **24 hours / 7 days / 30 days**: Quick short-term presets.
- **Custom date**: Enter a duration in days (e.g. `3`) or a target end date (`YYYY-MM-DD`).
- The keyword item displays a badge showing remaining time (e.g. `3d left`). Expired keywords are automatically cleaned up on script startup or panel open, with a summary notification.

### Wordlist Subscriptions & Auto-Sync

In the "Subscriptions" section, you can add public remote HTTPS wordlist URLs:
- Choose an update interval (every 12 hours, 24 hours, 3 days, or 7 days).
- When due, the script automatically fetches and merges newly added keywords upon page load or panel open (additive merge policy).
- Protected by 10-minute session throttling and network re-entrancy locks; you can also click "Sync now" at any time.

## Import, Export & Migration Backups

### 1. TXT Wordlist Import & Export

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

### 2. Full Migration Backup (JSON)

- **Export backup**: Click "Export backup" to download `x-keyword-blocker-backup-YYYY-MM-DD.json`, containing all keywords, expiration rules, settings, stats, and subscriptions.
- **Import backup**: Click "Import backup" to select a backup file. A preview dialog will display keyword count changes and configuration diffs before confirming restoration.

## Notes

- Lifetime and daily statistics are stored in your current browser. Blocking the same post again after a refresh increases the count again.
- Keywords, statistics, subscriptions, and settings remain strictly in local storage and are never uploaded to any remote server.
- Changes to X's page structure may require selector updates.

## Development

```bash
npm run check   # Syntax check
npm test        # Run unit tests
npm run meta    # Synchronize metadata header
```

## License

[MIT](LICENSE)
