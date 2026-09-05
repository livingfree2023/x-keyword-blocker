// ==UserScript==
// @name         Twitter / X 关键词屏蔽工具
// @name:en      X Keyword Blocker
// @namespace    https://github.com/livingfree2023/x-keyword-blocker
// @version      1.7.0
// @description  屏蔽指定关键词与推广帖子，支持统计、暂停、TXT 与网址导入导出
// @description:en Block posts by keyword and promoted-post labels, with stats and TXT/URL import/export
// @author       livingfree
// @license      MIT
// @icon         https://avatars.githubusercontent.com/u/125038641?v=4
// @homepageURL  https://github.com/livingfree2023/x-keyword-blocker
// @supportURL   https://github.com/livingfree2023/x-keyword-blocker/issues
// @updateURL    https://raw.githubusercontent.com/livingfree2023/x-keyword-blocker/main/x-keyword-blocker.meta.js
// @downloadURL  https://raw.githubusercontent.com/livingfree2023/x-keyword-blocker/main/x-keyword-blocker.js
// @match        https://twitter.com/*
// @match        https://x.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_addValueChangeListener
// @connect      *
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const KEYS = {
        keywords: 'twitter_blocked_keywords',
        enabled: 'twitter_blocker_enabled',
        language: 'twitter_blocker_language',
        blockPromoted: 'twitter_blocker_block_promoted',
        filterUserId: 'twitter_blocker_filter_user_id',
        floatingNotice: 'twitter_blocker_floating_notice',
        stats: 'twitter_blocker_stats_v1',
        expiry: 'twitter_blocker_keyword_expiry_v1',
        subscriptions: 'twitter_blocker_subscriptions_v1',
        wholeWord: 'twitter_blocker_whole_word_v1',
        scope: 'twitter_blocker_scope_v1',
        displayMode: 'twitter_blocker_display_mode_v1'
    };
    const DEFAULTS = ['广告', '推广', 'crypto', 'airdrop', '抽奖'];
    const MAX_KEYWORDS = 2000;
    const MAX_LENGTH = 100;
    const MAX_FILE_BYTES = 512 * 1024;
    const TEXT = {
        'zh-CN': {
            active: '运行中', paused: '已暂停', on: '已开启', off: '已关闭',
            remote_timeout: '读取超时，请稍后重试。',
            remote_too_large: '远程文件过大，请使用不超过 512 KB 的文本文件。',
            remote_insecure_redirect: '网址重定向到了非 HTTPS 地址，已停止读取。',
            remote_http: '服务器返回 HTTP {status}，无法读取文件。',
            remote_network: '网络请求失败，请检查网址、网络连接或用户脚本的跨域权限。',
            floating_aria: '累计拦截 {total} 条，本次新增 {delta} 条，关键词 {keywords}', floating_aria_plain: '累计拦截 {total} 条，本次新增 {delta} 条', floating_label: '累计拦截',
            empty_title: '还没有屏蔽词', empty_description: '添加后会立即重新检查当前时间线。',
            delete: '删除', delete_keyword_aria: '删除关键词 {keyword}', deleted_keyword: '已删除“{keyword}”',
            enter_keyword: '请输入一个关键词。', keyword_too_long: '关键词不能超过 {max} 个字符。',
            keyword_limit: '最多保存 {max} 个关键词。', keyword_exists: '“{keyword}”已经在列表中。',
            added_keyword: '已添加“{keyword}”', added_keywords: '已添加 {count} 个关键词', no_export: '当前没有可导出的关键词。',
            exported: '已导出 {count} 个关键词。', imported: '导入完成，当前共有 {count} 个关键词。',
            no_valid_import: '没有找到可导入的有效关键词。', import_preview: '检查导入内容 · {source}',
            import_summary: '识别到 {count} 个，其中 {newCount} 个尚未存在；忽略 {blankCount} 个空行、{duplicateCount} 个重复项、{invalidCount} 个无效项。',
            import_over_limit: '另有 {count} 个关键词因达到 {max} 个的上限未导入。',
            import_warning: '替换会删除当前列表；合并只添加缺少的项目。', merge: '合并导入', replace: '替换现有', cancel: '取消',
            local_file_too_large: '文件过大，请选择不超过 512 KB 的文本文件。', file_read_success: '文件读取成功，请确认导入方式。',
            file_read_failed: '无法读取这个文件。', invalid_url: '请输入有效的 HTTPS 文本文件网址。', loading: '读取中…',
            url_read_success: '网址读取成功，请确认导入方式。', read: '读取', reset_confirm: '将累计拦截数清零？关键词和过滤设置不会受影响。',
            reset_success: '累计拦截数已清零。', clear_none: '当前没有可清空的屏蔽词。',
            clear_confirm: '确认删除全部 {count} 个屏蔽词？此操作无法撤销。', clear_success: '已删除全部 {count} 个屏蔽词。',
            title: '关键词屏蔽', description: '管理时间线过滤规则与导入导出。', close: '关闭',
            filter_status: '过滤状态', filter_toggle_aria: '启用帖子过滤', total_blocked: '累计拦截', reset: '清零', posts_unit: ' 条', keyword_block_count: '过滤{count}次',
            new_keyword: '新关键词', keyword_placeholder: '输入要屏蔽的关键词…', add: '添加',
            input_hint: '每行一个关键词，匹配时不区分大小写。', import_file: '从文件导入', import_url: '从网址导入', export_txt: '导出 TXT',
            url_label: 'HTTPS 文本网址', preview_aria: '导入预览', blocked_words: '屏蔽词',
            shortcut_footer: '快捷键 Alt + Shift + K · 设置仅保存在当前浏览器',
            floating_notice: '浮动拦截提示', floating_toggle_aria: '显示浮动拦截提示',
            author_filter: '匹配作者名称与 ID', author_toggle_aria: '在作者显示名称和用户 ID 中匹配关键词',
            block_promoted: '屏蔽广告', promoted_toggle_aria: '屏蔽带推广标记的帖子', clear: '清空', clear_keywords_aria: '删除全部屏蔽词',
            filtering_enabled: '帖子过滤已启用。', filtering_paused: '过滤已暂停，帖子已恢复显示。',
            floating_enabled: '浮动拦截提示已开启。', floating_disabled: '浮动拦截提示已关闭。',
            author_enabled: '作者名称与 ID 过滤已开启。', author_disabled: '作者名称与 ID 过滤已关闭。',
            promoted_enabled: '广告屏蔽已开启。', promoted_disabled: '广告屏蔽已关闭。',
            language: '语言', language_aria: '选择界面语言', language_auto: '自动（跟随浏览器）', menu: '管理屏蔽关键词',
            stats_today: '今日 {count} 条',
            stats_week: '近 7 日 {count} 条',
            regex_tag: '正则',
            invalid_regex: '正则表达式语法错误：{error}',
            backup_export: '导出迁移包', backup_import: '导入迁移包',
            backup_confirm: '确认从迁移包恢复？将覆盖现有关键词与设置（包含 {keywords} 个关键词与累计拦截 {total} 条）。',
            backup_summary: '迁移包包含 {keywords} 个关键词、累计拦截 {total} 条。',
            backup_success: '已恢复迁移包配置。', backup_invalid: '迁移包无效或已损坏。',
            expiry_set: '设置有效期',
            expiry_permanent: '永久有效',
            expiry_24h: '24 小时',
            expiry_7d: '7 天',
            expiry_30d: '30 天',
            expiry_custom: '自定义日期',
            expiry_custom_prompt: '输入有效天数（例如 3）或截止日期（YYYY-MM-DD）：',
            expiry_updated: '已更新“{keyword}”有效期。',
            expiry_cleared: '已清除“{keyword}”有效期限制。',
            expires_in: '剩 {time}',
            expired_notice: '{count} 个临时屏蔽词已到期。',
            expired_tag: '已过期',
            invalid_expiry: '输入的有效期无效。',
            subs_title: '词库订阅',
            subs_add: '+ 订阅',
            subs_sync_now: '立即同步',
            subs_sync_all: '全部同步',
            subs_syncing: '同步中…',
            subs_last_sync: '上次同步：{time}',
            subs_ok: '成功 (+{count})',
            subs_never: '从未同步',
            subs_due_hint: '待同步',
            subs_empty: '暂无订阅词库，点击上方“+ 订阅”添加远程规则源。',
            subs_interval: '更新间隔',
            subs_interval_12h: '每 12 小时',
            subs_interval_24h: '每 24 小时',
            subs_interval_3d: '每 3 天',
            subs_interval_7d: '每 7 天',
            subs_name_placeholder: '订阅名称（选填）',
            subs_delete_confirm: '确认删除订阅“{name}”？',
            subs_deleted: '已删除订阅“{name}”。',
            subs_added: '已添加订阅“{name}”。',
            subs_sync_success: '“{name}”同步完成，新增 {added} 个关键词。',
            subs_sync_over_limit: '“{name}”同步完成，新增 {added} 个关键词；另有 {overLimit} 个因达上限未添加。',
            subs_sync_failed: '“{name}”同步失败：{reason}',
            subs_exists: '该网址已在订阅列表中。',
            whole_word: '整词匹配',
            whole_word_toggle_aria: '启用 ASCII 关键词整词匹配',
            whole_word_enabled: '整词匹配已开启。',
            whole_word_disabled: '整词匹配已关闭。',
            scope: '过滤作用域',
            scope_all: '全站页面',
            scope_home: '仅首页时间线',
            scope_toggle_aria: '切换过滤作用域（全站页面 / 仅首页时间线）',
            scope_all_enabled: '过滤作用域已设置为全站页面。',
            scope_home_enabled: '过滤作用域已设置为仅首页时间线。',
            floating_more: '等 {count} 个词',
            display_mode: '被拦帖子展示',
            display_mode_hide: '直接移除',
            display_mode_collapse: '折叠占位条',
            display_mode_toggle_aria: '切换被拦帖子展示方式（直接移除 / 折叠占位条）',
            display_mode_hide_enabled: '被拦帖子将直接从时间线移除。',
            display_mode_collapse_enabled: '被拦帖子将折叠为占位条，点击可展开。',
            collapsed_label: '已折叠 · 命中“{keyword}”，点击展开',
            collapsed_label_plain: '已折叠，点击展开',
            quick_block_aria: '快捷屏蔽',
            quick_block_author: '屏蔽作者 {keyword}',
            quick_block_selection: '屏蔽选中文字',
            quick_no_selection: '请先在帖子中选中要屏蔽的文字。',
            quick_no_author: '未识别到作者信息。',
            quick_author_added: '已添加作者屏蔽词 {keyword}。',
            quick_author_added_filter: '已添加 {keyword}，并自动开启“匹配作者名称与 ID”。'
        },
        en: {
            active: 'Active', paused: 'Paused', on: 'On', off: 'Off',
            remote_timeout: 'The request timed out. Please try again.',
            remote_too_large: 'The remote file is too large. Use a text file no larger than 512 KB.',
            remote_insecure_redirect: 'The URL redirected to a non-HTTPS address, so it was not loaded.',
            remote_http: 'The server returned HTTP {status}; the file could not be loaded.',
            remote_network: 'The request failed. Check the URL, network connection, or userscript cross-origin permission.',
            floating_aria: '{total} posts blocked in total; {delta} newly blocked; keywords {keywords}', floating_aria_plain: '{total} posts blocked in total; {delta} newly blocked', floating_label: 'Total blocked',
            empty_title: 'No blocked keywords yet', empty_description: 'Add one to recheck the current timeline immediately.',
            delete: 'Delete', delete_keyword_aria: 'Delete keyword {keyword}', deleted_keyword: 'Deleted “{keyword}”',
            enter_keyword: 'Enter a keyword.', keyword_too_long: 'A keyword cannot exceed {max} characters.',
            keyword_limit: 'You can save up to {max} keywords.', keyword_exists: '“{keyword}” is already in the list.',
            added_keyword: 'Added “{keyword}”', added_keywords: 'Added {count} keywords', no_export: 'There are no keywords to export.',
            exported: 'Exported {count} keywords.', imported: 'Import complete. There are now {count} keywords.',
            no_valid_import: 'No valid keywords were found to import.', import_preview: 'Review import · {source}',
            import_summary: '{count} found; {newCount} are new. Ignored {blankCount} blank, {duplicateCount} duplicate, and {invalidCount} invalid entries.',
            import_over_limit: '{count} more keywords were skipped because the {max}-keyword limit was reached.',
            import_warning: 'Replace removes the current list; merge only adds missing entries.', merge: 'Merge import', replace: 'Replace current', cancel: 'Cancel',
            local_file_too_large: 'The file is too large. Choose a text file no larger than 512 KB.', file_read_success: 'File read. Choose how to import it.',
            file_read_failed: 'Unable to read this file.', invalid_url: 'Enter a valid HTTPS text-file URL.', loading: 'Loading…',
            url_read_success: 'URL read. Choose how to import it.', read: 'Load', reset_confirm: 'Reset the lifetime block count? Keywords and settings will not change.',
            reset_success: 'Lifetime block count reset.', clear_none: 'There are no blocked keywords to clear.',
            clear_confirm: 'Delete all {count} blocked keywords? This cannot be undone.', clear_success: 'Deleted all {count} blocked keywords.',
            title: 'Keyword Blocker', description: 'Manage timeline filters and imports.', close: 'Close',
            filter_status: 'Filtering', filter_toggle_aria: 'Toggle post filtering', total_blocked: 'Total blocked', reset: 'Reset', posts_unit: ' posts', keyword_block_count: 'blocked {count} times',
            new_keyword: 'New keyword', keyword_placeholder: 'Enter a keyword to block…', add: 'Add',
            input_hint: 'One keyword per line. Matching is case-insensitive.', import_file: 'Import file', import_url: 'Import URL', export_txt: 'Export TXT',
            url_label: 'HTTPS text-file URL', preview_aria: 'Import preview', blocked_words: 'Blocked keywords',
            shortcut_footer: 'Shortcut: Alt + Shift + K · Settings stay in this browser',
            floating_notice: 'Floating notification', floating_toggle_aria: 'Toggle floating block notification',
            author_filter: 'Match author name and ID', author_toggle_aria: 'Match keywords in author display names and user IDs',
            block_promoted: 'Block promoted posts', promoted_toggle_aria: 'Block posts marked as promoted', clear: 'Clear', clear_keywords_aria: 'Delete all blocked keywords',
            filtering_enabled: 'Post filtering enabled.', filtering_paused: 'Filtering paused. Posts have been restored.',
            floating_enabled: 'Floating notification enabled.', floating_disabled: 'Floating notification disabled.',
            author_enabled: 'Author name and ID matching enabled.', author_disabled: 'Author name and ID matching disabled.',
            promoted_enabled: 'Promoted-post blocking enabled.', promoted_disabled: 'Promoted-post blocking disabled.',
            language: 'Language', language_aria: 'Choose interface language', language_auto: 'Auto (browser language)', menu: 'Manage blocked keywords',
            stats_today: '{count} today',
            stats_week: '{count} past 7 days',
            regex_tag: 'RegEx',
            invalid_regex: 'Invalid regex pattern: {error}',
            backup_export: 'Export backup', backup_import: 'Import backup',
            backup_confirm: 'Restore from backup? This will overwrite current keywords and settings ({keywords} keywords, {total} total blocked).',
            backup_summary: 'Backup contains {keywords} keywords, {total} total blocked.',
            backup_success: 'Backup restored successfully.', backup_invalid: 'Invalid or corrupted backup file.',
            expiry_set: 'Set expiration',
            expiry_permanent: 'Permanent',
            expiry_24h: '24 hours',
            expiry_7d: '7 days',
            expiry_30d: '30 days',
            expiry_custom: 'Custom date',
            expiry_custom_prompt: 'Enter number of days (e.g. 3) or end date (YYYY-MM-DD):',
            expiry_updated: 'Updated expiration for “{keyword}”.',
            expiry_cleared: 'Cleared expiration for “{keyword}”.',
            expires_in: '{time} left',
            expired_notice: '{count} temporary keyword(s) expired.',
            expired_tag: 'Expired',
            invalid_expiry: 'Invalid expiration entered.',
            subs_title: 'Subscriptions',
            subs_add: '+ Add',
            subs_sync_now: 'Sync now',
            subs_sync_all: 'Sync all',
            subs_syncing: 'Syncing…',
            subs_last_sync: 'Last sync: {time}',
            subs_ok: 'Success (+{count})',
            subs_never: 'Never',
            subs_due_hint: 'Due',
            subs_empty: 'No wordlist subscriptions yet. Click "+ Add" above to add one.',
            subs_interval: 'Update interval',
            subs_interval_12h: 'Every 12 hours',
            subs_interval_24h: 'Every 24 hours',
            subs_interval_3d: 'Every 3 days',
            subs_interval_7d: 'Every 7 days',
            subs_name_placeholder: 'Subscription name (optional)',
            subs_delete_confirm: 'Delete subscription “{name}”?',
            subs_deleted: 'Deleted subscription “{name}”.',
            subs_added: 'Added subscription “{name}”.',
            subs_sync_success: '“{name}” synced. Added {added} keywords.',
            subs_sync_over_limit: '“{name}” synced. Added {added} keywords; {overLimit} skipped due to limit.',
            subs_sync_failed: '“{name}” sync failed: {reason}',
            subs_exists: 'This URL is already subscribed.',
            whole_word: 'Whole word',
            whole_word_toggle_aria: 'Toggle ASCII whole-word matching',
            whole_word_enabled: 'Whole-word matching enabled.',
            whole_word_disabled: 'Whole-word matching disabled.',
            scope: 'Filter scope',
            scope_all: 'All pages',
            scope_home: 'Home timeline only',
            scope_toggle_aria: 'Toggle filter scope (All pages / Home timeline only)',
            scope_all_enabled: 'Filter scope set to all pages.',
            scope_home_enabled: 'Filter scope set to home timeline only.',
            floating_more: '+{count} more',
            display_mode: 'Blocked posts',
            display_mode_hide: 'Remove',
            display_mode_collapse: 'Collapse bar',
            display_mode_toggle_aria: 'Toggle how blocked posts are displayed (Remove / Collapse bar)',
            display_mode_hide_enabled: 'Blocked posts will be removed from the timeline.',
            display_mode_collapse_enabled: 'Blocked posts will collapse into a placeholder bar you can expand.',
            collapsed_label: 'Collapsed · matched “{keyword}” — click to expand',
            collapsed_label_plain: 'Collapsed — click to expand',
            quick_block_aria: 'Quick block',
            quick_block_author: 'Block author {keyword}',
            quick_block_selection: 'Block selected text',
            quick_no_selection: 'Select some text in the post first.',
            quick_no_author: 'Author not found.',
            quick_author_added: 'Added author keyword {keyword}.',
            quick_author_added_filter: 'Added {keyword} and enabled "Match author name and ID".'
        }
    };
    const PROMOTED_LABELS = new Set([
        'ad', 'promoted', 'sponsored',
        '广告', '廣告', '推广', '推廣', '赞助', '贊助',
        'プロモーション', '프로모션', 'реклама', 'anzeige',
        'sponsorisé', 'promocionado', 'patrocinado',
        'sponsorizzato', 'sponsorlu', 'gesponsord', 'sponsorowane',
        'diiklankan', 'ممول', 'ממומן'
    ]);

    const clean = (value) => typeof value === 'string' ? value.trim() : '';
    const parseRegexPattern = (str) => {
        if (typeof str !== 'string') return null;
        const trimmed = str.trim();
        if (!trimmed.startsWith('/') || trimmed.length < 3) return null;
        const lastSlash = trimmed.lastIndexOf('/');
        if (lastSlash <= 0) return null;
        const pattern = trimmed.slice(1, lastSlash);
        if (!pattern) return null;
        const flags = trimmed.slice(lastSlash + 1);
        if (!/^[dgimsuvy]*$/.test(flags)) return null;
        const safeFlags = flags.replace(/[gy]/g, '');
        try {
            return new RegExp(pattern, safeFlags);
        } catch {
            return null;
        }
    };
    const isRegexKeyword = (value) => parseRegexPattern(clean(value)) !== null;
    const validateRegexInput = (str) => {
        if (typeof str !== 'string') return { isRegex: false, valid: true };
        const trimmed = str.trim();
        if (!trimmed.startsWith('/') || trimmed.length < 2) return { isRegex: false, valid: true };
        const lastSlash = trimmed.lastIndexOf('/');
        if (lastSlash <= 0) return { isRegex: false, valid: true };
        const pattern = trimmed.slice(1, lastSlash);
        const flags = trimmed.slice(lastSlash + 1);
        if (!/^[dgimsuvy]*$/.test(flags)) {
            return { isRegex: true, valid: false, error: 'Invalid flags' };
        }
        const safeFlags = flags.replace(/[gy]/g, '');
        try {
            new RegExp(pattern, safeFlags);
            return { isRegex: true, valid: true };
        } catch (e) {
            return { isRegex: true, valid: false, error: e.message };
        }
    };
    const keyOf = (value) => {
        const cleaned = clean(value);
        const regex = parseRegexPattern(cleaned);
        if (regex) {
            return `regex:/${regex.source}/${regex.flags}`;
        }
        return cleaned.normalize('NFKC').toLowerCase();
    };
    const normalizeKeywords = (values) => {
        if (!Array.isArray(values)) return [];
        const output = [];
        const seen = new Set();
        for (const value of values) {
            const keyword = clean(value);
            const key = keyOf(keyword);
            if (!key || keyword.length > MAX_LENGTH || seen.has(key)) continue;
            seen.add(key);
            output.push(keyword);
            if (output.length === MAX_KEYWORDS) break;
        }
        return output;
    };
    const isWordChar = (char) => {
        if (!char) return false;
        const code = char.charCodeAt(0);
        return (
            (code >= 48 && code <= 57) ||
            (code >= 65 && code <= 90) ||
            (code >= 97 && code <= 122) ||
            code === 95
        );
    };
    const matchesKeywordNormalized = (normalizedHaystack, normalizedNeedle, wholeWord = false) => {
        const h = normalizedHaystack;
        const n = normalizedNeedle;
        if (!h || !n) return false;
        if (!wholeWord) return h.includes(n);

        for (let i = 0; i < n.length; i++) {
            if (n.charCodeAt(i) > 127) {
                return h.includes(n);
            }
        }

        let pos = h.indexOf(n);
        while (pos !== -1) {
            const leftOk = pos === 0 || !isWordChar(h[pos - 1]);
            const rightOk = (pos + n.length === h.length) || !isWordChar(h[pos + n.length]);
            if (leftOk && rightOk) return true;
            pos = h.indexOf(n, pos + 1);
        }
        return false;
    };
    const matchesKeyword = (haystack, needle, wholeWord = false) => {
        if (typeof haystack !== 'string' || typeof needle !== 'string') return false;
        const h = haystack.normalize('NFKC').toLowerCase();
        const n = needle.normalize('NFKC').toLowerCase();
        return matchesKeywordNormalized(h, n, wholeWord);
    };
    const isHomePath = (pathname) => {
        if (typeof pathname !== 'string') return false;
        const cleanPath = pathname.trim();
        return cleanPath === '' || cleanPath === '/' || cleanPath === '/home' || cleanPath.startsWith('/home/');
    };
    const findBlockedKeyword = (text, keywords, wholeWord = false) => {
        const rawText = String(text || '');
        if (!rawText || !Array.isArray(keywords)) return null;
        let normalizedHaystack = null;
        return keywords.find((keyword) => {
            const cleaned = clean(keyword);
            const regex = parseRegexPattern(cleaned);
            if (regex) {
                try {
                    return regex.test(rawText);
                } catch {
                    return false;
                }
            }
            if (normalizedHaystack === null) {
                normalizedHaystack = rawText.normalize('NFKC').toLowerCase();
            }
            const needle = keyOf(keyword);
            return needle && matchesKeywordNormalized(normalizedHaystack, needle, wholeWord);
        }) || null;
    };
    const parseImportText = (text) => {
        const keywords = [];
        const seen = new Set();
        let blankCount = 0;
        let duplicateCount = 0;
        let invalidCount = 0;
        let overLimitCount = 0;
        for (const line of String(text).split(/\r\n|\r|\n/)) {
            const keyword = clean(line);
            const key = keyOf(keyword);
            if (!keyword) blankCount += 1;
            else if (keyword.length > MAX_LENGTH) invalidCount += 1;
            else if (keywords.length >= MAX_KEYWORDS) overLimitCount += 1;
            else if (seen.has(key)) duplicateCount += 1;
            else {
                seen.add(key);
                keywords.push(keyword);
            }
        }
        return { keywords, blankCount, duplicateCount, invalidCount, overLimitCount };
    };
    const splitKeywordInput = (value) => String(value).split(/\r\n|\r|\n/).map(clean).filter(Boolean);
    const planKeywordAdditions = (lines, existingKeywords) => {
        const existing = new Set((Array.isArray(existingKeywords) ? existingKeywords : []).map(keyOf));
        const additions = [];
        for (const line of (Array.isArray(lines) ? lines : [])) {
            const keyword = clean(line);
            const key = keyOf(keyword);
            if (!key || existing.has(key)) continue;
            existing.add(key);
            additions.push(keyword);
        }
        return additions;
    };
    const normalizeKeywordCounts = (value) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return Object.create(null);
        const output = Object.create(null);
        for (const [key, count] of Object.entries(value)) {
            const normalizedKey = keywordCountKey(key);
            if (!normalizedKey || !Number.isSafeInteger(count) || count < 0) continue;
            output[normalizedKey] = (output[normalizedKey] || 0) + count;
        }
        return output;
    };
    const keywordCountKey = (keyword) => keyOf(keyword);
    const userIdFromHref = (href) => {
        if (typeof href !== 'string') return '';
        const match = href.match(/^\/([^/?#]+)\/?$/);
        if (!match) return '';
        try { return decodeURIComponent(match[1]); }
        catch { return match[1]; }
    };
    const buildAuthorSearchText = (userNameText, userId) => [
        clean(userNameText),
        userId ? `@${userId}` : '',
        userId
    ].filter(Boolean).join('\n');
    const extractAuthorText = (userName) => {
        if (!userName) return '';
        if (typeof userName.cloneNode !== 'function') return clean(userName.textContent || '');
        const clone = userName.cloneNode(true);
        if (typeof clone.querySelectorAll === 'function') {
            clone.querySelectorAll('time, a[href*="/status/"]').forEach((node) => {
                if (typeof node.remove === 'function') node.remove();
            });
        }
        return clean(clone.textContent || '');
    };
    const extractElementTextWithAlt = (root) => {
        if (!root) return '';
        let result = '';
        const walk = (node) => {
            if (node.nodeType === 3) {
                result += node.nodeValue;
            } else if (node.nodeType === 1) {
                if (node.tagName === 'IMG') {
                    const alt = node.getAttribute('alt');
                    if (alt) result += alt;
                } else {
                    for (let child = node.firstChild; child; child = child.nextSibling) {
                        walk(child);
                    }
                }
            }
        };
        walk(root);
        return result;
    };
    const hashString = (str) => {
        let hash = 5381;
        for (let i = 0; i < str.length; i++) {
            hash = ((hash << 5) + hash) + str.charCodeAt(i);
            hash = hash & hash;
        }
        return (hash >>> 0).toString(36);
    };
    const virtualPostId = (authorId, text) => {
        const h = clean(authorId).toLowerCase();
        const t = clean(text);
        if (!h && !t) return null;
        return `virtual_${h}_${hashString(t.slice(0, 140))}`;
    };
    const isPrivateHost = (host) => {
        if (typeof host !== 'string') return false;
        let h = host.trim().toLowerCase();
        if (!h) return false;
        if (h.startsWith('[') && h.endsWith(']')) h = h.slice(1, -1);
        if (!h.includes('::') && (h.match(/:/g) || []).length === 1) {
            h = h.split(':')[0];
        }
        if (h === 'localhost' || h.endsWith('.localhost')) return true;
        if (h === 'local' || h.endsWith('.local') ||
            h === 'internal' || h.endsWith('.internal') ||
            h.endsWith('.lan') || h.endsWith('.localdomain') || h.endsWith('.home.arpa')) {
            return true;
        }
        const ipv4 = h.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
        if (ipv4) {
            const [_, a, b, c, d] = ipv4.map(Number);
            if (a > 255 || b > 255 || c > 255 || d > 255) return false;
            if (a === 0 || a === 127 || a === 10) return true;
            if (a === 192 && b === 168) return true;
            if (a === 172 && b >= 16 && b <= 31) return true;
            if (a === 169 && b === 254) return true;
            return false;
        }
        if (h.includes(':')) {
            if (h === '::' || h === '::1') return true;
            if (h.startsWith('::ffff:')) {
                return isPrivateHost(h.slice(7));
            }
            const parts = h.split(':');
            if (parts.every((p) => p === '' || /^0+$/.test(p))) return true;
            const nonZero = parts.filter((p) => p !== '' && !/^0+$/.test(p));
            if (nonZero.length === 1 && parseInt(nonZero[0], 16) === 1 && (h.endsWith(':1') || h.endsWith('::1'))) {
                return true;
            }
            const firstHextet = parseInt(parts[0], 16);
            if (!Number.isNaN(firstHextet)) {
                if (firstHextet >= 0xfc00 && firstHextet <= 0xfdff) return true;
                if (firstHextet >= 0xfe80 && firstHextet <= 0xfebf) return true;
            }
        }
        return false;
    };
    const isPromotedLabelText = (value) => PROMOTED_LABELS.has(keyOf(value));
    const resolveBlockedMatch = (text, keywords, enabled, blockPromoted, promotedLabel, wholeWord = false) => {
        if (!enabled) return null;
        if (blockPromoted && promotedLabel) return promotedLabel;
        return findBlockedKeyword(text, keywords, wholeWord);
    };
    const responseHeader = (headers, name) => {
        const target = String(name || '').toLocaleLowerCase();
        for (const line of String(headers || '').split(/\r?\n/)) {
            const separator = line.indexOf(':');
            if (separator < 0 || line.slice(0, separator).trim().toLocaleLowerCase() !== target) continue;
            return line.slice(separator + 1).trim();
        }
        return '';
    };
    const resolveLocale = (language = 'auto', browserLanguage = '') => {
        if (language === 'zh-CN' || language === 'en') return language;
        return String(browserLanguage).toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
    };
    const translate = (locale, key, values = {}) => {
        const dict = TEXT[locale];
        let template = (dict && Object.prototype.hasOwnProperty.call(dict, key)) ? dict[key] : null;
        if (typeof template !== 'string') {
            template = (TEXT.en && Object.prototype.hasOwnProperty.call(TEXT.en, key)) ? TEXT.en[key] : null;
        }
        if (typeof template !== 'string') {
            template = String(key);
        }
        return template.replace(/\{(\w+)\}/g, (_, name) => {
            if (values && typeof values === 'object' && Object.prototype.hasOwnProperty.call(values, name)) {
                return String(values[name]);
            }
            return `{${name}}`;
        });
    };
    const remoteImportErrorMessage = (error, locale = 'zh-CN') => {
        if (error?.code === 'timeout') return translate(locale, 'remote_timeout');
        if (error?.code === 'too_large') return translate(locale, 'remote_too_large');
        if (error?.code === 'insecure_redirect' || error?.code === 'insecure_host') return translate(locale, 'remote_insecure_redirect');
        if (error?.code === 'http') return translate(locale, 'remote_http', { status: error.status || 'error' });
        return translate(locale, 'remote_network');
    };
    const parseLocalDate = (value) => {
        if (value instanceof Date && !Number.isNaN(value.getTime())) {
            return new Date(value.getFullYear(), value.getMonth(), value.getDate());
        }
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            const [y, m, d] = value.split('-').map(Number);
            return new Date(y, m - 1, d);
        }
        const now = new Date();
        return new Date(now.getFullYear(), now.getMonth(), now.getDate());
    };
    const todayDateKey = (date = new Date()) => {
        const d = date instanceof Date && !Number.isNaN(date.getTime())
            ? date
            : (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) ? parseLocalDate(date) : new Date());
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };
    const normalizeDailyCounts = (value) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return Object.create(null);
        const output = Object.create(null);
        for (const [key, count] of Object.entries(value)) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Number.isSafeInteger(count) || count < 0) continue;
            output[key] = count;
        }
        return output;
    };
    const bumpDailyCount = (daily, dateKey) => {
        const output = normalizeDailyCounts(daily);
        const key = typeof dateKey === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateKey)
            ? dateKey
            : (dateKey instanceof Date && !Number.isNaN(dateKey.getTime())
                ? todayDateKey(dateKey)
                : (dateKey === undefined ? todayDateKey() : ''));
        if (key) {
            output[key] = (output[key] || 0) + 1;
        }
        return output;
    };
    const pruneDailyCounts = (daily, keepDays = 30, today = new Date()) => {
        const output = normalizeDailyCounts(daily);
        const baseDate = parseLocalDate(today);
        const days = Number.isSafeInteger(keepDays) && keepDays >= 0 ? keepDays : 30;
        const cutoff = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - days);
        const cutoffKey = todayDateKey(cutoff);
        for (const key of Object.keys(output)) {
            if (key < cutoffKey) delete output[key];
        }
        return output;
    };
    const sumRecentDays = (daily, days = 7, today = new Date()) => {
        const normalized = normalizeDailyCounts(daily);
        const numDays = Number.isSafeInteger(days) && days > 0 ? days : 0;
        if (numDays === 0) return 0;
        const baseDate = parseLocalDate(today);
        const cutoff = new Date(baseDate.getFullYear(), baseDate.getMonth(), baseDate.getDate() - numDays + 1);
        const cutoffKey = todayDateKey(cutoff);
        const endKey = todayDateKey(baseDate);
        let total = 0;
        for (const [key, count] of Object.entries(normalized)) {
            if (key >= cutoffKey && key <= endKey) total += count;
        }
        return total;
    };
    const normalizeExpiryMap = (value) => {
        if (!value || typeof value !== 'object' || Array.isArray(value)) return Object.create(null);
        const output = Object.create(null);
        for (const [key, expiresAt] of Object.entries(value)) {
            const k = keyOf(key);
            if (!k || !Number.isSafeInteger(expiresAt) || expiresAt <= 0) continue;
            output[k] = expiresAt;
        }
        return output;
    };
    const pruneExpired = (keywords, expiryMap, now = Date.now()) => {
        const list = Array.isArray(keywords) ? [...keywords] : [];
        const normalizedExpiry = normalizeExpiryMap(expiryMap);
        const remainingKeywords = [];
        const expired = [];
        const remainingExpiry = Object.create(null);

        for (const keyword of list) {
            const key = keyOf(keyword);
            if (!key) continue;
            const expiresAt = normalizedExpiry[key];
            if (expiresAt !== undefined && expiresAt <= now) {
                expired.push(keyword);
            } else {
                remainingKeywords.push(keyword);
                if (expiresAt !== undefined) {
                    remainingExpiry[key] = expiresAt;
                }
            }
        }

        return {
            keywords: remainingKeywords,
            expiryMap: remainingExpiry,
            expired
        };
    };
    const calculateExpiry = (type, customInput, now = Date.now()) => {
        if (type === 'permanent') return null;
        if (type === '24h') return now + 24 * 60 * 60 * 1000;
        if (type === '7d') return now + 7 * 24 * 60 * 60 * 1000;
        if (type === '30d') return now + 30 * 24 * 60 * 60 * 1000;
        if (type === 'custom') {
            const trimmed = typeof customInput === 'string' ? customInput.trim() : String(customInput || '').trim();
            if (/^\d+$/.test(trimmed)) {
                const days = parseInt(trimmed, 10);
                if (days > 0 && days <= 3650) {
                    return now + days * 24 * 60 * 60 * 1000;
                }
            }
            if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
                const [y, m, d] = trimmed.split('-').map(Number);
                const target = new Date(y, m - 1, d, 23, 59, 59, 999);
                if (!Number.isNaN(target.getTime()) && target.getTime() > now) {
                    return target.getTime();
                }
            }
        }
        return null;
    };
    const formatRemainingTime = (expiresAt, now = Date.now(), locale = 'zh-CN') => {
        if (!Number.isSafeInteger(expiresAt)) return '';
        const diff = expiresAt - now;
        if (diff <= 0) return translate(locale, 'expired_tag');
        const hours = Math.ceil(diff / (1000 * 60 * 60));
        if (hours < 24) {
            const timeStr = locale === 'zh-CN' ? `${Math.max(1, hours)}小时` : `${Math.max(1, hours)}h`;
            return translate(locale, 'expires_in', { time: timeStr });
        }
        const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
        const timeStr = locale === 'zh-CN' ? `${days}天` : `${days}d`;
        return translate(locale, 'expires_in', { time: timeStr });
    };
    const SUBSCRIPTION_RETRY_COOLDOWN_MS = 30 * 60 * 1000;
    const isSubscriptionDue = (subscription, now = Date.now(), retryCooldownMs = SUBSCRIPTION_RETRY_COOLDOWN_MS) => {
        if (!subscription || typeof subscription !== 'object') return false;
        const intervalHours = Number(subscription.intervalHours);
        if (!Number.isFinite(intervalHours) || intervalHours <= 0) return false;
        const currentTime = Number(now);
        if (subscription.lastResult && subscription.lastResult.ok === false) {
            const failedAt = Number(subscription.lastResult.at);
            if (Number.isFinite(failedAt) && failedAt > 0 && (currentTime - failedAt) < retryCooldownMs && (currentTime - failedAt) >= 0) {
                return false;
            }
        }
        const lastSyncAt = Number(subscription.lastSyncAt);
        if (!Number.isFinite(lastSyncAt) || lastSyncAt <= 0) return true;
        const intervalMs = intervalHours * 3600 * 1000;
        return (currentTime - lastSyncAt) >= intervalMs;
    };
    const normalizeSubscriptions = (items) => {
        if (!Array.isArray(items)) return [];
        const result = [];
        const seenUrls = new Set();
        const seenIds = new Set();
        for (const item of items) {
            if (!item || typeof item !== 'object') continue;
            const urlStr = typeof item.url === 'string' ? item.url.trim() : '';
            let parsedUrl;
            try {
                parsedUrl = new URL(urlStr);
                if (parsedUrl.protocol !== 'https:' || isPrivateHost(parsedUrl.hostname)) continue;
            } catch {
                continue;
            }
            const normalizedUrl = parsedUrl.href;
            if (seenUrls.has(normalizedUrl)) continue;

            let id = typeof item.id === 'string' && item.id.trim() ? item.id.trim() : '';
            if (!id || seenIds.has(id)) {
                id = 'sub_' + Math.random().toString(36).slice(2, 10);
            }
            seenIds.add(id);
            seenUrls.add(normalizedUrl);

            let name = typeof item.name === 'string' ? item.name.trim() : '';
            if (!name) {
                name = parsedUrl.hostname;
            }
            if (name.length > 50) name = name.slice(0, 50);

            let intervalHours = Number(item.intervalHours);
            if (!Number.isFinite(intervalHours) || intervalHours <= 0) {
                intervalHours = 24;
            } else {
                intervalHours = Math.round(intervalHours);
                if (intervalHours < 1) intervalHours = 1;
                if (intervalHours > 720) intervalHours = 720;
            }

            const lastSyncAt = Number.isSafeInteger(item.lastSyncAt) && item.lastSyncAt > 0 ? item.lastSyncAt : null;
            let lastResult = null;
            if (item.lastResult && typeof item.lastResult === 'object') {
                const at = Number.isSafeInteger(item.lastResult.at) && item.lastResult.at > 0 ? item.lastResult.at : Date.now();
                if (item.lastResult.ok === true) {
                    const added = Number.isSafeInteger(item.lastResult.added) && item.lastResult.added >= 0 ? item.lastResult.added : 0;
                    lastResult = { ok: true, added, at };
                } else if (item.lastResult.ok === false) {
                    const code = typeof item.lastResult.code === 'string' ? item.lastResult.code : 'network';
                    lastResult = { ok: false, code, at };
                }
            }

            result.push({
                id,
                url: normalizedUrl,
                name,
                intervalHours,
                lastSyncAt,
                lastResult
            });
        }
        return result;
    };
    const planSubscriptionMerge = (lines, existingKeywords, maxKeywords = MAX_KEYWORDS) => {
        const additions = planKeywordAdditions(lines, existingKeywords);
        const currentCount = Array.isArray(existingKeywords) ? existingKeywords.length : 0;
        const available = Math.max(0, maxKeywords - currentCount);
        const toAdd = additions.slice(0, available);
        const overLimit = additions.length - toAdd.length;
        return { toAdd, overLimit, totalNew: additions.length };
    };
    const formatSyncTime = (timestamp, now = Date.now(), locale = 'zh-CN') => {
        const ts = Number(timestamp);
        if (!Number.isFinite(ts) || ts <= 0) {
            return translate(locale, 'subs_never');
        }
        const currentTime = Number.isFinite(Number(now)) ? Number(now) : Date.now();
        const diff = Math.max(0, currentTime - ts);
        if (diff < 60 * 1000) {
            return locale === 'zh-CN' ? '刚刚' : 'just now';
        }
        if (diff < 3600 * 1000) {
            const mins = Math.floor(diff / 60000);
            return locale === 'zh-CN' ? `${mins}分钟前` : `${mins}m ago`;
        }
        if (diff < 24 * 3600 * 1000) {
            const hours = Math.floor(diff / 3600000);
            return locale === 'zh-CN' ? `${hours}小时前` : `${hours}h ago`;
        }
        const days = Math.floor(diff / (24 * 3600 * 1000));
        return locale === 'zh-CN' ? `${days}天前` : `${days}d ago`;
    };
    const createBackupPayload = (data, version = '1.7.0') => ({
        app: 'x-keyword-blocker',
        version: typeof version === 'string' && version ? version : '1.7.0',
        exportedAt: new Date().toISOString(),
        keywords: normalizeKeywords(data?.keywords),
        settings: {
            enabled: data?.settings?.enabled ?? (data?.enabled !== false),
            language: ['auto', 'zh-CN', 'en'].includes(data?.settings?.language ?? data?.language) ? (data?.settings?.language ?? data?.language) : 'auto',
            blockPromoted: data?.settings?.blockPromoted ?? (data?.blockPromoted !== false),
            filterUserId: data?.settings?.filterUserId ?? (data?.filterUserId === true),
            floatingNotice: data?.settings?.floatingNotice ?? (data?.floatingNotice !== false),
            wholeWord: data?.settings?.wholeWord ?? (data?.wholeWord === true),
            scope: (data?.settings?.scope ?? data?.scope) === 'home' ? 'home' : 'all',
            displayMode: (data?.settings?.displayMode ?? data?.displayMode) === 'collapse' ? 'collapse' : 'hide'
        },
        stats: {
            total: Number.isSafeInteger(data?.stats?.total ?? data?.total) && (data?.stats?.total ?? data?.total) >= 0 ? (data?.stats?.total ?? data?.total) : 0,
            keywordCounts: normalizeKeywordCounts(data?.stats?.keywordCounts ?? data?.keywordCounts),
            daily: normalizeDailyCounts(data?.stats?.daily ?? data?.daily)
        },
        expiry: normalizeExpiryMap(data?.expiry),
        subscriptions: normalizeSubscriptions(data?.subscriptions)
    });
    const parseBackupPayload = (raw) => {
        let parsed;
        try {
            parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
        } catch {
            return { valid: false, error: 'invalid_json' };
        }
        if (!parsed || typeof parsed !== 'object' || parsed.app !== 'x-keyword-blocker') {
            return { valid: false, error: 'invalid_app' };
        }
        const keywords = normalizeKeywords(parsed.keywords);
        const settings = {
            enabled: parsed.settings?.enabled !== false,
            language: ['auto', 'zh-CN', 'en'].includes(parsed.settings?.language) ? parsed.settings.language : 'auto',
            blockPromoted: parsed.settings?.blockPromoted !== false,
            filterUserId: parsed.settings?.filterUserId === true,
            floatingNotice: parsed.settings?.floatingNotice !== false,
            wholeWord: parsed.settings?.wholeWord === true,
            scope: parsed.settings?.scope === 'home' ? 'home' : 'all',
            displayMode: parsed.settings?.displayMode === 'collapse' ? 'collapse' : 'hide'
        };
        const stats = {
            total: Number.isSafeInteger(parsed.stats?.total) && parsed.stats.total >= 0 ? parsed.stats.total : 0,
            keywordCounts: normalizeKeywordCounts(parsed.stats?.keywordCounts),
            daily: normalizeDailyCounts(parsed.stats?.daily)
        };
        const expiry = normalizeExpiryMap(parsed.expiry);
        const subscriptions = normalizeSubscriptions(parsed.subscriptions);
        return { valid: true, data: { keywords, settings, stats, expiry, subscriptions, version: typeof parsed.version === 'string' ? parsed.version : '' } };
    };

    // Pure helpers are testable without a browser or userscript manager.
    if (typeof process !== 'undefined' && process.versions?.node
        && typeof module !== 'undefined' && module.exports) {
        module.exports = {
            findBlockedKeyword,
            keyOf,
            normalizeKeywords,
            splitKeywordInput,
            parseImportText,
            planKeywordAdditions,
            normalizeKeywordCounts,
            keywordCountKey,
            userIdFromHref,
            buildAuthorSearchText,
            isPromotedLabelText,
            resolveBlockedMatch,
            responseHeader,
            remoteImportErrorMessage,
            resolveLocale,
            translate,
            todayDateKey,
            normalizeDailyCounts,
            bumpDailyCount,
            pruneDailyCounts,
            sumRecentDays,
            createBackupPayload,
            parseBackupPayload,
            normalizeExpiryMap,
            pruneExpired,
            calculateExpiry,
            formatRemainingTime,
            isSubscriptionDue,
            normalizeSubscriptions,
            planSubscriptionMerge,
            formatSyncTime,
            matchesKeyword,
            matchesKeywordNormalized,
            parseRegexPattern,
            isRegexKeyword,
            validateRegexInput,
            isHomePath,
            virtualPostId,
            extractAuthorText,
            extractElementTextWithAlt,
            isPrivateHost,
            TEXT
        };
        return;
    }

    const read = (key, fallback) => {
        try { return GM_getValue(key, fallback); }
        catch (error) {
            console.warn('[X Keyword Blocker] 无法读取设置', error);
            return fallback;
        }
    };
    const write = (key, value) => {
        try { GM_setValue(key, value); }
        catch (error) { console.warn('[X Keyword Blocker] 无法保存设置', error); }
    };
    const storedKeywords = read(KEYS.keywords, DEFAULTS);
    const stats = read(KEYS.stats, {});
    const state = {
        keywords: normalizeKeywords(Array.isArray(storedKeywords) ? storedKeywords : DEFAULTS),
        enabled: read(KEYS.enabled, true) !== false,
        language: read(KEYS.language, 'auto'),
        blockPromoted: read(KEYS.blockPromoted, true) !== false,
        filterUserId: read(KEYS.filterUserId, false) === true,
        floatingNotice: read(KEYS.floatingNotice, true) !== false,
        total: Number.isSafeInteger(stats?.total) && stats.total >= 0 ? stats.total : 0,
        keywordCounts: normalizeKeywordCounts(stats?.keywordCounts),
        daily: normalizeDailyCounts(stats?.daily),
        expiry: normalizeExpiryMap(read(KEYS.expiry, {})),
        subscriptions: normalizeSubscriptions(read(KEYS.subscriptions, [])),
        wholeWord: read(KEYS.wholeWord, false) === true,
        scope: read(KEYS.scope, 'all') === 'home' ? 'home' : 'all',
        displayMode: read(KEYS.displayMode, 'hide') === 'collapse' ? 'collapse' : 'hide',
        sessionPostIds: new Set(),
        sessionArticles: new WeakSet(),
        revision: 0,
        statsTimer: null,
        floatingDelta: 0,
        floatingKeywords: new Set(),
        floatingBatchTimer: null,
        floatingHideTimer: null
    };
    if (JSON.stringify(storedKeywords) !== JSON.stringify(state.keywords)) {
        write(KEYS.keywords, state.keywords);
    }

    let ui = null;
    let previousFocus = null;
    let previousOverflow = '';
    const locale = () => resolveLocale(state.language, navigator.language);
    const t = (key, values) => translate(locale(), key, values);
    const formatNumber = (value) => new Intl.NumberFormat(locale()).format(value);
    const saveKeywords = () => write(KEYS.keywords, [...state.keywords]);
    const saveExpiry = () => write(KEYS.expiry, state.expiry);
    const saveSubscriptions = () => write(KEYS.subscriptions, state.subscriptions);
    const saveWholeWord = () => write(KEYS.wholeWord, state.wholeWord);
    const saveScope = () => write(KEYS.scope, state.scope);
    const saveDisplayMode = () => write(KEYS.displayMode, state.displayMode);
    const checkAndPruneExpired = (notifyInModal = false) => {
        const result = pruneExpired(state.keywords, state.expiry, Date.now());
        if (result.expired.length > 0) {
            state.keywords = result.keywords;
            state.expiry = result.expiryMap;
            saveKeywords();
            saveExpiry();
            reapply();
            if (notifyInModal) {
                notify(t('expired_notice', { count: formatNumber(result.expired.length) }), 'info');
            }
        } else if (Object.keys(state.expiry).length !== Object.keys(result.expiryMap).length) {
            state.expiry = result.expiryMap;
            saveExpiry();
        }
        return result.expired;
    };
    checkAndPruneExpired(false);
    const saveStats = () => {
        if (state.statsTimer !== null) clearTimeout(state.statsTimer);
        state.statsTimer = null;
        state.daily = pruneDailyCounts(state.daily, 30);
        write(KEYS.stats, { total: state.total, keywordCounts: state.keywordCounts, daily: state.daily });
    };
    const scheduleStatsSave = () => {
        if (state.statsTimer === null) state.statsTimer = window.setTimeout(saveStats, 500);
    };
    const postId = (article) => {
        const timeLink = article.querySelector('time')?.closest('a[href*="/status/"]');
        const links = timeLink ? [timeLink] : article.querySelectorAll('a[href*="/status/"]');
        for (const link of links) {
            const match = link.getAttribute('href')?.match(/\/status\/(\d+)/);
            if (match) return match[1];
        }
        return null;
    };
    const updateKeywordStats = () => {
        if (!ui) return;
        ui.list.querySelectorAll('.txb-count-text[data-count-key]').forEach((item) => {
            item.textContent = t('keyword_block_count', { count: formatNumber(state.keywordCounts[item.dataset.countKey] || 0) });
        });
    };
    const updateStats = () => {
        if (ui) {
            ui.total.textContent = formatNumber(state.total);
            if (ui.today) {
                const todayCount = state.daily[todayDateKey()] || 0;
                ui.today.textContent = t('stats_today', { count: formatNumber(todayCount) });
            }
        }
        updateKeywordStats();
    };
    const countPost = (article, keyword, reason = keyword) => {
        const id = postId(article) || virtualPostId(tweetAuthorId(article), tweetText(article));
        if (id) {
            if (state.sessionPostIds.has(id)) return;
            state.sessionPostIds.add(id);
        } else {
            if (state.sessionArticles.has(article)) return;
            state.sessionArticles.add(article);
        }
        state.total += 1;
        const countKey = keywordCountKey(keyword);
        if (countKey) state.keywordCounts[countKey] = (state.keywordCounts[countKey] || 0) + 1;
        state.daily = bumpDailyCount(state.daily, todayDateKey());
        updateStats();
        scheduleStatsSave();
        scheduleFloatingNotice(1, reason);
    };
    const containerOf = (article) => article.closest('div[data-testid="cellInnerDiv"]') || article;
    const tweetText = (article) => {
        const textNodes = article.querySelectorAll('div[data-testid="tweetText"]');
        const parts = [];
        textNodes.forEach((node) => {
            const text = clean(extractElementTextWithAlt(node));
            if (text) parts.push(text);
        });
        const cards = article.querySelectorAll('[data-testid="card.layoutLarge.detail"], [data-testid="card.wrapper"]');
        cards.forEach((card) => {
            const cardText = clean(card.textContent || '');
            if (cardText && !parts.includes(cardText)) parts.push(cardText);
        });
        return parts.join('\n');
    };
    const tweetAuthorId = (article) => {
        const links = article.querySelectorAll('[data-testid="User-Name"] a[href]');
        for (const link of links) {
            const userId = userIdFromHref(link.getAttribute('href'));
            if (userId) return userId;
        }
        return '';
    };
    const tweetAuthorSearchText = (article, authorId) => {
        const userName = article.querySelector('[data-testid="User-Name"]');
        return buildAuthorSearchText(
            extractAuthorText(userName),
            authorId
        );
    };
    const tweetPromotedLabel = (article) => {
        if (!state.blockPromoted) return '';
        for (const span of article.querySelectorAll('span')) {
            if (span.closest('[data-testid="tweetText"], [data-testid="User-Name"]')) continue;
            const label = clean(span.textContent || '');
            if (isPromotedLabelText(label)) return label;
        }
        return '';
    };
    const hiddenCellArticles = new WeakMap();
    // 用户在折叠模式下手动展开的帖子，本次会话内不再自动折叠。
    const userExpandedArticles = new WeakSet();
    const COLLAPSE_BAR_SELECTOR = ':scope > .txb-collapsed-bar';
    const clearHiddenCell = (cell) => {
        delete cell.dataset.txbHidden;
        delete cell.dataset.txbReason;
        cell.style.removeProperty('display');
        cell.querySelector('article[data-testid="tweet"]')?.style.removeProperty('display');
        cell.querySelectorAll(COLLAPSE_BAR_SELECTOR).forEach((bar) => bar.remove());
        hiddenCellArticles.delete(cell);
    };
    const restore = (article) => {
        const container = containerOf(article);
        if (container.dataset.txbHidden !== 'true') return;
        clearHiddenCell(container);
    };
    const unhideRecycledCell = (cell) => {
        if (!cell || cell.dataset?.txbHidden !== 'true') return;
        const currentArticle = cell.querySelector('article[data-testid="tweet"]');
        const blockedArticle = hiddenCellArticles.get(cell);
        if (!currentArticle || (blockedArticle && blockedArticle !== currentArticle)) {
            clearHiddenCell(cell);
        }
    };
    const renderCollapseBar = (container, article, reason) => {
        let bar = container.querySelector(COLLAPSE_BAR_SELECTOR);
        if (!bar) {
            bar = document.createElement('button');
            bar.type = 'button';
            bar.className = 'txb-collapsed-bar';
            bar.addEventListener('click', () => {
                userExpandedArticles.add(article);
                restore(article);
            });
            container.appendChild(bar);
        }
        bar.dataset.theme = darkPage() ? 'dark' : 'light';
        bar.textContent = reason ? t('collapsed_label', { keyword: reason }) : t('collapsed_label_plain');
    };
    // 规则编译记忆缓存：仅当 keywords 数组引用变化时重建，
    // 将关键词分为正则对象与归一化文本，避免每帖每帧重复编译 RegExp 与 keyOf。
    let ruleCacheSource = null;
    let compiledRules = [];
    const compileKeywordRules = (keywords) => {
        return (Array.isArray(keywords) ? keywords : []).map((keyword) => {
            const cleaned = clean(keyword);
            const regex = parseRegexPattern(cleaned);
            if (regex) {
                return { type: 'regex', regex, keyword };
            }
            const needle = keyOf(keyword);
            return needle ? { type: 'text', needle, keyword } : null;
        }).filter(Boolean);
    };
    const blockedKeywordMatch = (searchableText, promotedLabel) => {
        if (!state.enabled) return null;
        if (state.blockPromoted && promotedLabel) return promotedLabel;
        if (ruleCacheSource !== state.keywords) {
            ruleCacheSource = state.keywords;
            compiledRules = compileKeywordRules(state.keywords);
        }
        const rawText = String(searchableText || '');
        if (!rawText) return null;
        let normalizedHaystack = null;

        for (const rule of compiledRules) {
            if (rule.type === 'regex') {
                try {
                    if (rule.regex.test(rawText)) return rule.keyword;
                } catch {
                    continue;
                }
            } else if (rule.type === 'text') {
                if (normalizedHaystack === null) {
                    normalizedHaystack = rawText.normalize('NFKC').toLowerCase();
                }
                if (matchesKeywordNormalized(normalizedHaystack, rule.needle, state.wholeWord)) {
                    return rule.keyword;
                }
            }
        }
        return null;
    };
    const scanResultCache = new WeakMap();
    const domExtractionCache = new WeakMap();
    const scan = (article) => {
        if (!article?.isConnected) return;
        if (state.scope === 'home' && !isHomePath(window.location?.pathname || '')) {
            return restore(article);
        }
        const currentStateKey = `${state.enabled}|${state.blockPromoted}|${state.filterUserId}|${state.wholeWord}|${state.scope}|${state.revision}`;
        if (scanResultCache.get(article) === currentStateKey) {
            // X 重渲染单元格可能清掉脚本注入的折叠条，缓存命中时补齐。
            const cachedContainer = containerOf(article);
            if (cachedContainer.dataset.txbHidden === 'true'
                && state.displayMode === 'collapse'
                && !userExpandedArticles.has(article)
                && !cachedContainer.querySelector(COLLAPSE_BAR_SELECTOR)) {
                renderCollapseBar(cachedContainer, article, cachedContainer.dataset.txbReason || '');
            }
            return;
        }

        let extracted = domExtractionCache.get(article);
        if (!extracted) {
            const text = tweetText(article);
            const authorId = tweetAuthorId(article);
            const authorText = tweetAuthorSearchText(article, authorId);
            const promotedLabel = tweetPromotedLabel(article);
            extracted = { text, authorId, authorText, promotedLabel };
            domExtractionCache.set(article, extracted);
        }

        scanResultCache.set(article, currentStateKey);

        const searchableText = [
            extracted.text,
            state.filterUserId ? extracted.authorText : ''
        ].filter(Boolean).join('\n');
        const match = blockedKeywordMatch(searchableText, extracted.promotedLabel);
        if (!match) return restore(article);
        if (userExpandedArticles.has(article)) return restore(article);
        const container = containerOf(article);
        container.dataset.txbHidden = 'true';
        container.dataset.txbReason = match;
        hiddenCellArticles.set(container, article);
        if (state.displayMode === 'collapse') {
            container.style.removeProperty('display');
            article.style.setProperty('display', 'none', 'important');
            renderCollapseBar(container, article, match);
        } else {
            article.style.removeProperty('display');
            container.querySelectorAll(COLLAPSE_BAR_SELECTOR).forEach((bar) => bar.remove());
            container.style.setProperty('display', 'none', 'important');
        }
        countPost(article, match === extracted.promotedLabel ? '' : match, match);
    };
    const pending = new Set();
    let frame = null;
    const flush = () => {
        frame = null;
        const batch = [...pending];
        pending.clear();
        batch.forEach(scan);
    };
    const queue = (article) => {
        if (!article) return;
        ensureQuickButton(article);
        pending.add(article);
        if (frame === null) frame = requestAnimationFrame(flush);
    };
    const ownRoots = '#txb-overlay, #txb-floating-counter, #txb-toast';
    const collect = (node) => {
        if (!(node instanceof Element)) return;
        if (node.closest(ownRoots)) return;
        const cell = node.closest('div[data-testid="cellInnerDiv"]');
        if (cell) unhideRecycledCell(cell);
        if (node.dataset?.txbHidden === 'true') unhideRecycledCell(node);
        node.querySelectorAll('div[data-testid="cellInnerDiv"][data-txb-hidden="true"]').forEach(unhideRecycledCell);

        if (node.matches('article[data-testid="tweet"]')) queue(node);
        queue(node.closest('article[data-testid="tweet"]'));
        node.querySelectorAll('article[data-testid="tweet"]').forEach(queue);
    };
    const reapply = () => {
        state.revision += 1;
        document.querySelectorAll('article[data-testid="tweet"]').forEach(queue);
    };

    // ---- 快捷屏蔽（帖子角落悬浮图标）----
    let toastTimer = null;
    const showQuickToast = (message, kind = 'success') => {
        injectStyles();
        document.getElementById('txb-toast')?.remove();
        if (toastTimer !== null) clearTimeout(toastTimer);
        const toast = document.createElement('div');
        toast.id = 'txb-toast';
        toast.dataset.kind = kind;
        toast.setAttribute('role', 'status');
        toast.textContent = message;
        document.body.appendChild(toast);
        toastTimer = window.setTimeout(() => {
            toast.remove();
            toastTimer = null;
        }, 2400);
    };
    let openQuickBlock = null;
    const closeQuickMenu = () => {
        if (!openQuickBlock) return;
        openQuickBlock.querySelector('.txb-quick-menu')?.remove();
        delete openQuickBlock.dataset.open;
        openQuickBlock = null;
    };
    const quickBlockAuthor = (article) => {
        const authorId = tweetAuthorId(article);
        if (!authorId) return showQuickToast(t('quick_no_author'), 'error');
        const keyword = `@${authorId}`;
        if (!addKeywords(keyword)) {
            return showQuickToast(t('keyword_exists', { keyword }), 'error');
        }
        if (!state.filterUserId) {
            state.filterUserId = true;
            write(KEYS.filterUserId, true);
            updateUserIdFilterSetting();
            reapply();
            return showQuickToast(t('quick_author_added_filter', { keyword }));
        }
        showQuickToast(t('quick_author_added', { keyword }));
    };
    const quickBlockSelection = (selectionText) => {
        const keyword = clean(selectionText);
        if (!keyword) return showQuickToast(t('quick_no_selection'), 'error');
        if (addKeywords(keyword)) {
            showQuickToast(t('added_keyword', { keyword }));
        } else {
            showQuickToast(t('keyword_exists', { keyword }), 'error');
        }
    };
    const toggleQuickMenu = (wrap, article) => {
        if (openQuickBlock === wrap) return closeQuickMenu();
        closeQuickMenu();
        const authorId = tweetAuthorId(article);
        // 点击菜单按钮可能清空页面选区，在打开菜单时先捕获。
        const selectionText = clean(window.getSelection()?.toString() || '').slice(0, MAX_LENGTH);
        const menu = document.createElement('div');
        menu.className = 'txb-quick-menu';
        menu.setAttribute('role', 'menu');
        const authorItem = document.createElement('button');
        authorItem.type = 'button';
        authorItem.textContent = authorId ? t('quick_block_author', { keyword: `@${authorId}` }) : t('quick_no_author');
        authorItem.disabled = !authorId;
        authorItem.addEventListener('click', (event) => {
            event.stopPropagation();
            closeQuickMenu();
            quickBlockAuthor(article);
        });
        const selectionItem = document.createElement('button');
        selectionItem.type = 'button';
        selectionItem.textContent = selectionText
            ? t('quick_block_selection')
            : `${t('quick_block_selection')}（${t('quick_no_selection')}）`;
        selectionItem.disabled = !selectionText;
        selectionItem.title = selectionText;
        selectionItem.addEventListener('click', (event) => {
            event.stopPropagation();
            closeQuickMenu();
            quickBlockSelection(selectionText);
        });
        menu.append(authorItem, selectionItem);
        wrap.appendChild(menu);
        wrap.dataset.open = 'true';
        openQuickBlock = wrap;
    };
    const ensureQuickButton = (article) => {
        if (!article.isConnected) return;
        if (article.querySelector(':scope > .txb-quick-block')) return;
        injectStyles();
        const wrap = document.createElement('div');
        wrap.className = 'txb-quick-block';
        wrap.dataset.theme = darkPage() ? 'dark' : 'light';
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'txb-quick-btn';
        button.textContent = '⊘';
        button.title = t('quick_block_aria');
        button.setAttribute('aria-label', t('quick_block_aria'));
        button.setAttribute('aria-haspopup', 'menu');
        button.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            toggleQuickMenu(wrap, article);
        });
        wrap.appendChild(button);
        article.appendChild(wrap);
    };
    document.addEventListener('click', (event) => {
        if (openQuickBlock && !event.target.closest('.txb-quick-block')) closeQuickMenu();
    }, true);
    window.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') closeQuickMenu();
    });
    // ---- 快捷屏蔽结束 ----

    new MutationObserver((mutations) => mutations.forEach((mutation) => {
        const target = mutation.target;
        // body 自身与脚本自建节点（面板/浮条）的变化不触发全文档重扫。
        if (target instanceof Element && target !== document.body && !target.closest(ownRoots)) collect(target);
        mutation.addedNodes.forEach((node) => {
            if (node instanceof Element && !node.closest(ownRoots)) collect(node);
        });
    })).observe(document.body, { childList: true, subtree: true });

    const injectStyles = () => {
        if (document.getElementById('txb-styles')) return;
        const style = document.createElement('style');
        style.id = 'txb-styles';
        style.textContent = `
#txb-overlay,#txb-overlay *{box-sizing:border-box}#txb-overlay{--bg:#fff;--surface:#f7f9f9;--hover:#eff3f4;--text:#0f1419;--muted:#536471;--border:#cfd9de;--blue:#1d9bf0;--danger:#f4212e;--green:#00ba7c;--focus:rgba(29,155,240,.24);position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(15,20,25,.55);backdrop-filter:blur(3px);font-family:TwitterChirp,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;animation:txbFade .14s ease-out}#txb-overlay[data-theme=dark]{--bg:#15202b;--surface:#1e2d3a;--hover:#263746;--text:#f7f9f9;--muted:#8b98a5;--border:#38444d;--focus:rgba(29,155,240,.32)}#txb-dialog{width:min(480px,100%);max-height:min(760px,calc(100vh - 48px));max-height:min(760px,calc(100dvh - 48px));display:flex;flex-direction:column;overflow:hidden;color:var(--text);background:var(--bg);border:1px solid var(--border);border-radius:22px;box-shadow:0 20px 60px rgba(0,0,0,.3);animation:txbIn .18s ease-out}.txb-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 20px 14px}.txb-eyebrow{margin:0 0 3px;color:var(--blue);font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}#txb-title{margin:0;font-size:22px;line-height:1.25;font-weight:800}.txb-subtitle{margin:5px 0 0;color:var(--muted);font-size:13px}.txb-icon{width:36px;height:36px;border:0;border-radius:50%;color:var(--text);background:transparent;font-size:24px;cursor:pointer}.txb-icon:hover{background:var(--hover)}.txb-content{overflow-y:auto;padding:0 20px 20px;scrollbar-width:thin}.txb-status{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}.txb-card{min-height:78px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 14px;border:1px solid var(--border);border-radius:14px;background:var(--surface)}.txb-label{display:block;color:var(--muted);font-size:12px;font-weight:600}.txb-sublabel{display:block;margin-top:2px;color:var(--muted);font-size:12px;font-weight:600}.txb-value{display:block;margin-top:3px;font-size:19px;font-weight:800}#txb-reset{padding:4px 0;border:0;color:var(--muted);background:transparent;font-size:11px;text-decoration:underline;cursor:pointer}.txb-switch{position:relative;width:44px;height:26px;flex:none;padding:0;border:0;border-radius:99px;background:var(--border);cursor:pointer}.txb-switch:after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px #0004;transition:transform .16s}.txb-switch[aria-checked=true]{background:var(--green)}.txb-switch[aria-checked=true]:after{transform:translateX(18px)}.txb-form{display:flex;gap:8px;margin-bottom:9px}.txb-input{min-width:0;height:42px;flex:1;padding:0 14px;border:1px solid var(--border);border-radius:12px;outline:none;color:var(--text);background:var(--bg);font:inherit;font-size:14px}.txb-input:focus{border-color:var(--blue);box-shadow:0 0 0 3px var(--focus)}.txb-primary,.txb-secondary,.txb-danger{min-height:36px;padding:0 14px;border:1px solid transparent;border-radius:99px;font:inherit;font-size:13px;font-weight:700;cursor:pointer}.txb-primary{color:#fff;background:var(--blue)}.txb-secondary{color:var(--text);background:transparent;border-color:var(--border)}.txb-secondary:hover{background:var(--hover)}.txb-danger{color:#fff;background:var(--danger)}#txb-overlay button:disabled{opacity:.55;cursor:not-allowed}#txb-message{min-height:18px;margin:0 2px 9px;color:var(--muted);font-size:12px}#txb-message[data-kind=success]{color:var(--green)}#txb-message[data-kind=error]{color:var(--danger)}.txb-tools{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px}.txb-tools button{min-height:33px;font-size:12px}#txb-url-form{display:flex;gap:8px;padding:10px;margin:-4px 0 12px;border-radius:12px;background:var(--surface)}#txb-url-form[hidden],#txb-preview[hidden]{display:none}#txb-url-form .txb-input{height:38px}.txb-preview{padding:13px;margin-bottom:14px;border:1px solid var(--blue);border-radius:14px;background:var(--focus)}.txb-preview h3{margin:0 0 4px;font-size:14px}.txb-preview p{margin:3px 0;color:var(--muted);font-size:12px;line-height:1.45}.txb-preview-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.txb-heading{display:flex;align-items:center;justify-content:space-between;margin:0 2px 8px}.txb-heading h2{margin:0;font-size:14px}.txb-count{padding:2px 8px;border-radius:99px;color:var(--muted);background:var(--surface);font-size:12px}.txb-list{display:flex;flex-direction:column;gap:6px}.txb-item{min-height:42px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 8px 7px 12px;border:1px solid var(--border);border-radius:12px}.txb-item:hover{background:var(--surface)}.txb-word{min-width:0;overflow-wrap:anywhere;font-size:14px}.txb-remove{min-height:30px;padding:0 9px;border:0;border-radius:99px;color:var(--danger);background:transparent;font-size:12px;font-weight:700;cursor:pointer}.txb-remove:hover{background:rgba(244,33,46,.1)}.txb-empty{padding:26px 14px;border:1px dashed var(--border);border-radius:14px;text-align:center}.txb-empty strong{display:block;font-size:14px}.txb-empty span{color:var(--muted);font-size:12px}.txb-footer{padding:12px 20px;border-top:1px solid var(--border);color:var(--muted);font-size:11px;text-align:center}.txb-sr{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}#txb-overlay button:focus-visible{outline:3px solid var(--focus);outline-offset:2px}@keyframes txbFade{from{opacity:0}}@keyframes txbIn{from{opacity:0;transform:translateY(8px) scale(.985)}}@media(max-width:520px){#txb-overlay{align-items:flex-end;padding:0}#txb-dialog{width:100%;max-height:92vh;max-height:92dvh;border-radius:22px 22px 0 0}.txb-status{grid-template-columns:1fr}.txb-card{min-height:66px}}@media(prefers-reduced-motion:reduce){#txb-overlay,#txb-dialog{animation:none}.txb-switch:after{transition:none}}
        `;
        style.textContent += `
#txb-floating-counter{--txb-float-bg:rgba(255,255,255,.96);--txb-float-text:#0f1419;--txb-float-muted:#536471;position:fixed;left:50%;bottom:32px;z-index:2147483645;display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid rgba(15,20,25,.12);border-radius:999px;color:var(--txb-float-text);background:var(--txb-float-bg);box-shadow:0 8px 28px rgba(0,0,0,.22);pointer-events:none;font-family:TwitterChirp,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;animation:txbFloatNotice 2s cubic-bezier(.2,.8,.2,1) both;backdrop-filter:blur(10px)}#txb-floating-counter[data-theme=dark]{--txb-float-bg:rgba(21,32,43,.96);--txb-float-text:#f7f9f9;--txb-float-muted:#8b98a5;border-color:rgba(255,255,255,.14)}.txb-floating-label{color:var(--txb-float-muted);font-size:12px;font-weight:650}.txb-floating-total{font-size:16px;font-weight:800}.txb-floating-delta{padding:3px 8px;border-radius:999px;color:#007a51;background:rgba(0,186,124,.14);font-size:13px;font-weight:850}@keyframes txbFloatNotice{0%{opacity:0;transform:translate(-50%,12px) scale(.96)}14%,78%{opacity:1;transform:translate(-50%,0) scale(1)}100%{opacity:0;transform:translate(-50%,-7px) scale(.98)}}.txb-card-wide{grid-column:1/-1;min-height:60px}.txb-compact-settings{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.txb-compact-settings .txb-card{min-width:0;min-height:66px;padding:10px}.txb-compact-settings .txb-value{font-size:15px}.txb-heading-actions{display:flex;align-items:center;gap:6px}.txb-clear-keywords{padding:2px 7px;border:0;border-radius:99px;color:var(--danger);background:transparent;font:inherit;font-size:11px;font-weight:700;cursor:pointer}.txb-clear-keywords:hover{background:rgba(244,33,46,.1)}@media(max-width:520px){#txb-floating-counter{bottom:82px;max-width:calc(100vw - 24px)}.txb-compact-settings{gap:8px}.txb-compact-settings .txb-card{padding:9px}}@media(prefers-reduced-motion:reduce){#txb-floating-counter{animation:none}}
        `;
        style.textContent += `.txb-regex-badge{display:inline-block;padding:1px 5px;margin-right:6px;border-radius:4px;font-size:10px;font-weight:700;color:#fff;background:#7856ff;vertical-align:middle}.txb-select{min-width:142px;height:34px;padding:0 28px 0 10px;border:1px solid var(--border);border-radius:10px;outline:0;color:var(--text);background:var(--bg);font:inherit;font-size:13px;cursor:pointer}.txb-select:focus{border-color:var(--blue);box-shadow:0 0 0 3px var(--focus)}.txb-keyword-meta{margin-left:auto;color:var(--muted);font-size:12px;white-space:nowrap}.txb-floating-keywords{max-width:220px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--txb-float-muted);font-size:13px;font-weight:650}#txb-input{min-height:76px;max-height:170px;height:auto;padding:9px 14px 10px;line-height:1.45;resize:vertical}.txb-item-actions{display:flex;align-items:center;gap:6px}.txb-expiry-btn{position:relative;display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border:1px solid var(--border);border-radius:50%;background:transparent;color:var(--muted);font-size:13px;cursor:pointer;line-height:1}.txb-expiry-btn:hover{background:var(--hover);color:var(--text)}.txb-expiry-select{position:absolute;inset:0;opacity:0;cursor:pointer;width:100%;height:100%}.txb-expiry-badge{display:inline-block;padding:1px 6px;margin-right:6px;border-radius:99px;background:rgba(29,155,240,.14);color:var(--blue);font-size:11px;font-weight:700}.txb-count-text{display:inline}.txb-subs-section{margin-bottom:16px;padding:12px;border:1px solid var(--border);border-radius:14px;background:var(--surface)}.txb-subs-header{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.txb-subs-title-group{display:flex;align-items:center;gap:6px}.txb-subs-title{margin:0;font-size:14px;font-weight:700}.txb-subs-header-actions{display:flex;align-items:center;gap:6px}.txb-subs-header-actions button{min-height:28px;padding:0 10px;font-size:12px}.txb-subs-form{display:flex;flex-direction:column;gap:8px;padding:10px;margin-bottom:8px;border:1px solid var(--border);border-radius:12px;background:var(--bg)}.txb-subs-form[hidden]{display:none}.txb-subs-form-row{display:flex;gap:8px;align-items:center}.txb-subs-form-row .txb-select{height:38px;min-width:110px}.txb-subs-form-row button{min-height:38px}.txb-subs-list{display:flex;flex-direction:column;gap:6px}.txb-subs-empty{padding:12px;color:var(--muted);font-size:12px;text-align:center}.txb-sub-item{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border:1px solid var(--border);border-radius:10px;background:var(--bg)}.txb-sub-main{min-width:0;flex:1}.txb-sub-title-row{display:flex;align-items:center;gap:6px;flex-wrap:wrap}.txb-sub-name{font-size:13px;font-weight:700;color:var(--text);overflow-wrap:anywhere}.txb-sub-badge{padding:1px 5px;border-radius:99px;background:var(--hover);color:var(--muted);font-size:11px;font-weight:600}.txb-sub-due-badge{padding:1px 6px;border-radius:99px;background:rgba(29,155,240,.15);color:var(--blue);font-size:11px;font-weight:700}.txb-sub-url{font-size:11px;color:var(--muted);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:240px;margin:2px 0}.txb-sub-meta{display:flex;align-items:center;gap:6px;flex-wrap:wrap;font-size:11px;color:var(--muted)}.txb-sub-tag{padding:1px 5px;border-radius:4px;font-size:10px;font-weight:700}.txb-sub-tag-ok{background:rgba(0,186,124,.15);color:#007a51}.txb-sub-tag-err{background:rgba(244,33,46,.12);color:var(--danger)}.txb-sub-tag-syncing{background:rgba(29,155,240,.15);color:var(--blue)}.txb-sub-sync-btn{min-height:28px;padding:0 9px;font-size:11px}.txb-sub-del-btn{min-height:28px;font-size:11px}`;
        style.textContent += `
.txb-collapsed-bar{display:flex;align-items:center;width:calc(100% - 16px);margin:4px 8px;padding:10px 14px;border:1px dashed #cfd9de;border-radius:12px;background:rgba(29,155,240,.06);color:#536471;font-family:TwitterChirp,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;cursor:pointer;text-align:left}.txb-collapsed-bar[data-theme=dark]{border-color:#38444d;background:rgba(29,155,240,.12);color:#8b98a5}.txb-collapsed-bar:hover{color:#1d9bf0;border-color:#1d9bf0}article[data-testid=tweet]{position:relative}.txb-quick-block{--qbg:#fff;--qtext:#0f1419;--qmuted:#536471;--qborder:#cfd9de;position:absolute;top:6px;right:8px;z-index:5;opacity:0;transition:opacity .15s;font-family:TwitterChirp,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.txb-quick-block[data-theme=dark]{--qbg:#15202b;--qtext:#f7f9f9;--qmuted:#8b98a5;--qborder:#38444d}article[data-testid=tweet]:hover .txb-quick-block,.txb-quick-block[data-open=true]{opacity:1}@media(pointer:coarse){.txb-quick-block{opacity:1}}.txb-quick-btn{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border:1px solid var(--qborder);border-radius:50%;background:var(--qbg);color:var(--qmuted);font-size:15px;line-height:1;cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,.15)}.txb-quick-btn:hover{color:#f4212e;border-color:#f4212e}.txb-quick-menu{position:absolute;top:34px;right:0;min-width:190px;padding:6px;border:1px solid var(--qborder);border-radius:12px;background:var(--qbg);box-shadow:0 8px 24px rgba(0,0,0,.2)}.txb-quick-menu button{display:block;width:100%;max-width:260px;padding:8px 10px;border:0;border-radius:8px;background:transparent;color:var(--qtext);font:inherit;font-size:13px;text-align:left;cursor:pointer;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.txb-quick-menu button:hover:not(:disabled){background:rgba(29,155,240,.12)}.txb-quick-menu button:disabled{color:var(--qmuted);opacity:.65;cursor:default}#txb-toast{position:fixed;left:16px;bottom:24px;z-index:2147483645;max-width:min(360px,calc(100vw - 32px));padding:10px 14px;border-radius:10px;background:rgba(15,20,25,.92);color:#fff;font-family:TwitterChirp,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;line-height:1.4;box-shadow:0 8px 24px rgba(0,0,0,.25);animation:txbToastIn .16s ease-out}#txb-toast[data-kind=error]{background:rgba(150,30,38,.95)}@keyframes txbToastIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
        `;
        document.head.appendChild(style);
    };
    const darkPage = () => {
        for (const element of [document.body, document.querySelector('main'), document.documentElement]) {
            if (!element) continue;
            const color = getComputedStyle(element).backgroundColor;
            const rgb = color.match(/rgba?\((\d+)[, ]+(\d+)[, ]+(\d+)/);
            if (!rgb || color.endsWith(', 0)')) continue;
            return 0.2126 * rgb[1] + 0.7152 * rgb[2] + 0.0722 * rgb[3] < 128;
        }
        return matchMedia('(prefers-color-scheme:dark)').matches;
    };
    const removeFloatingNotice = () => {
        if (state.floatingBatchTimer !== null) clearTimeout(state.floatingBatchTimer);
        if (state.floatingHideTimer !== null) clearTimeout(state.floatingHideTimer);
        state.floatingBatchTimer = null;
        state.floatingHideTimer = null;
        state.floatingDelta = 0;
        state.floatingKeywords.clear();
        document.getElementById('txb-floating-counter')?.remove();
    };
    const showFloatingNotice = () => {
        state.floatingBatchTimer = null;
        if (!state.floatingNotice || state.floatingDelta === 0) return;

        injectStyles();
        const previous = document.getElementById('txb-floating-counter');
        const delta = state.floatingDelta + Number(previous?.dataset.delta || 0);
        const keywords = new Set([...String(previous?.dataset.keywords || '').split('\n'), ...state.floatingKeywords].filter(Boolean));
        const keywordList = [...keywords];
        let keywordText = keywordList.slice(0, 3).join(' ');
        if (keywordList.length > 3) {
            keywordText += ` ${t('floating_more', { count: formatNumber(keywordList.length - 3) })}`;
        }
        state.floatingDelta = 0;
        state.floatingKeywords.clear();
        previous?.remove();
        if (state.floatingHideTimer !== null) clearTimeout(state.floatingHideTimer);

        const counter = document.createElement('div');
        counter.id = 'txb-floating-counter';
        counter.dataset.theme = darkPage() ? 'dark' : 'light';
        counter.dataset.delta = String(delta);
        counter.dataset.keywords = [...keywords].join('\n');
        counter.setAttribute('role', 'status');
        counter.setAttribute('aria-live', 'polite');
        counter.setAttribute('aria-label', t(keywordText ? 'floating_aria' : 'floating_aria_plain', { total: formatNumber(state.total), delta: formatNumber(delta), keywords: keywordText }));

        const label = document.createElement('span');
        label.className = 'txb-floating-label';
        label.textContent = t('floating_label');
        const total = document.createElement('strong');
        total.className = 'txb-floating-total';
        total.textContent = formatNumber(state.total);
        const change = document.createElement('strong');
        change.className = 'txb-floating-delta';
        change.textContent = `+${formatNumber(delta)}`;
        counter.append(label, total, change);
        if (keywordText) {
            const keywordList = document.createElement('span');
            keywordList.className = 'txb-floating-keywords';
            keywordList.textContent = `(${keywordText})`;
            counter.appendChild(keywordList);
        }
        document.body.appendChild(counter);

        state.floatingHideTimer = window.setTimeout(() => {
            counter.remove();
            state.floatingHideTimer = null;
        }, 2000);
    };
    const scheduleFloatingNotice = (delta, keyword) => {
        if (!state.floatingNotice) return;
        state.floatingDelta += delta;
        if (keyword) state.floatingKeywords.add(keyword);
        if (state.floatingBatchTimer !== null) clearTimeout(state.floatingBatchTimer);
        state.floatingBatchTimer = window.setTimeout(showFloatingNotice, 120);
    };
    const notify = (message, kind = 'info') => {
        if (!ui) return;
        ui.message.textContent = message;
        ui.message.dataset.kind = kind;
    };
    const updateEnabled = () => {
        if (!ui || !ui.toggle || !ui.enabled) return;
        ui.toggle.setAttribute('aria-checked', String(state.enabled));
        ui.enabled.textContent = state.enabled ? t('active') : t('paused');
    };
    const updateFloatingNoticeSetting = () => {
        if (!ui || !ui.noticeToggle || !ui.noticeStatus) return;
        ui.noticeToggle.setAttribute('aria-checked', String(state.floatingNotice));
        ui.noticeStatus.textContent = state.floatingNotice ? t('on') : t('off');
    };
    const updateUserIdFilterSetting = () => {
        if (!ui || !ui.userIdToggle || !ui.userIdStatus) return;
        ui.userIdToggle.setAttribute('aria-checked', String(state.filterUserId));
        ui.userIdStatus.textContent = state.filterUserId ? t('on') : t('off');
    };
    const updatePromotedSetting = () => {
        if (!ui || !ui.promotedToggle || !ui.promotedStatus) return;
        ui.promotedToggle.setAttribute('aria-checked', String(state.blockPromoted));
        ui.promotedStatus.textContent = state.blockPromoted ? t('on') : t('off');
    };
    const updateWholeWordSetting = () => {
        if (!ui || !ui.wholeWordToggle || !ui.wholeWordStatus) return;
        ui.wholeWordToggle.setAttribute('aria-checked', String(state.wholeWord));
        ui.wholeWordStatus.textContent = state.wholeWord ? t('on') : t('off');
    };
    const updateScopeSetting = () => {
        if (!ui || !ui.scopeToggle || !ui.scopeStatus) return;
        ui.scopeToggle.setAttribute('aria-checked', String(state.scope === 'home'));
        ui.scopeStatus.textContent = state.scope === 'home' ? t('scope_home') : t('scope_all');
    };
    const updateDisplayModeSetting = () => {
        if (!ui || !ui.displayModeToggle || !ui.displayModeStatus) return;
        ui.displayModeToggle.setAttribute('aria-checked', String(state.displayMode === 'collapse'));
        ui.displayModeStatus.textContent = state.displayMode === 'collapse' ? t('display_mode_collapse') : t('display_mode_hide');
    };
    const renderList = () => {
        if (!ui || !ui.list) return;
        ui.list.replaceChildren();
        ui.count.textContent = formatNumber(state.keywords.length);
        ui.clearKeywords.disabled = state.keywords.length === 0;
        if (!state.keywords.length) {
            const empty = document.createElement('div');
            empty.className = 'txb-empty';
            empty.innerHTML = `<strong>${t('empty_title')}</strong><span>${t('empty_description')}</span>`;
            ui.list.appendChild(empty);
            return;
        }
        const sortedKeywords = state.keywords
            .map((keyword, index) => ({ keyword, index, count: state.keywordCounts[keywordCountKey(keyword)] || 0 }))
            .sort((left, right) => right.count - left.count || left.index - right.index);
        for (const { keyword } of sortedKeywords) {
            const key = keyOf(keyword);
            const expiresAt = state.expiry[key];
            const row = document.createElement('div');
            row.className = 'txb-item';
            const word = document.createElement('span');
            word.className = 'txb-word';
            if (isRegexKeyword(keyword)) {
                const regexBadge = document.createElement('span');
                regexBadge.className = 'txb-regex-badge';
                regexBadge.textContent = t('regex_tag');
                word.appendChild(regexBadge);
            }
            word.appendChild(document.createTextNode(keyword));

            const meta = document.createElement('span');
            meta.className = 'txb-keyword-meta';
            if (expiresAt && expiresAt > Date.now()) {
                const badge = document.createElement('span');
                badge.className = 'txb-expiry-badge';
                badge.textContent = formatRemainingTime(expiresAt, Date.now(), locale());
                meta.appendChild(badge);
            }
            const countText = document.createElement('span');
            countText.className = 'txb-count-text';
            countText.dataset.countKey = keywordCountKey(keyword);
            countText.textContent = t('keyword_block_count', { count: formatNumber(state.keywordCounts[countText.dataset.countKey] || 0) });
            meta.appendChild(countText);

            const actions = document.createElement('div');
            actions.className = 'txb-item-actions';

            const expiryBtn = document.createElement('label');
            expiryBtn.className = 'txb-expiry-btn';
            expiryBtn.title = t('expiry_set');
            expiryBtn.setAttribute('aria-label', t('expiry_set'));

            const clockIcon = document.createElement('span');
            clockIcon.textContent = '⏱';
            clockIcon.setAttribute('aria-hidden', 'true');

            const select = document.createElement('select');
            select.className = 'txb-expiry-select';
            select.setAttribute('aria-label', t('expiry_set'));

            const optDefault = document.createElement('option');
            optDefault.value = '';
            optDefault.disabled = true;
            optDefault.selected = true;
            optDefault.textContent = t('expiry_set');

            const optPerm = document.createElement('option');
            optPerm.value = 'permanent';
            optPerm.textContent = t('expiry_permanent');

            const opt24h = document.createElement('option');
            opt24h.value = '24h';
            opt24h.textContent = t('expiry_24h');

            const opt7d = document.createElement('option');
            opt7d.value = '7d';
            opt7d.textContent = t('expiry_7d');

            const opt30d = document.createElement('option');
            opt30d.value = '30d';
            opt30d.textContent = t('expiry_30d');

            const optCustom = document.createElement('option');
            optCustom.value = 'custom';
            optCustom.textContent = t('expiry_custom');

            select.append(optDefault, optPerm, opt24h, opt7d, opt30d, optCustom);
            select.onchange = () => {
                const choice = select.value;
                if (!choice) return;
                if (choice === 'permanent') {
                    delete state.expiry[key];
                    saveExpiry();
                    renderList();
                    notify(t('expiry_cleared', { keyword }), 'success');
                } else if (choice === '24h' || choice === '7d' || choice === '30d') {
                    const nextExpiresAt = calculateExpiry(choice, null, Date.now());
                    state.expiry[key] = nextExpiresAt;
                    saveExpiry();
                    renderList();
                    notify(t('expiry_updated', { keyword }), 'success');
                } else if (choice === 'custom') {
                    const input = prompt(t('expiry_custom_prompt'), '7');
                    if (input !== null) {
                        const nextExpiresAt = calculateExpiry('custom', input, Date.now());
                        if (nextExpiresAt) {
                            state.expiry[key] = nextExpiresAt;
                            saveExpiry();
                            renderList();
                            notify(t('expiry_updated', { keyword }), 'success');
                        } else {
                            notify(t('invalid_expiry'), 'error');
                        }
                    } else {
                        renderList();
                    }
                }
            };
            expiryBtn.append(clockIcon, select);

            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'txb-remove';
            remove.textContent = t('delete');
            remove.setAttribute('aria-label', t('delete_keyword_aria', { keyword }));
            remove.onclick = () => {
                state.keywords = state.keywords.filter((item) => keyOf(item) !== key);
                delete state.expiry[key];
                saveKeywords();
                saveExpiry();
                renderList();
                reapply();
                notify(t('deleted_keyword', { keyword }), 'success');
            };
            actions.append(expiryBtn, remove);
            row.append(word, meta, actions);
            ui.list.appendChild(row);
        }
    };
    const addKeywords = (value) => {
        const keywords = splitKeywordInput(value);
        if (!keywords.length) return notify(t('enter_keyword'), 'error'), false;
        for (const keyword of keywords) {
            const check = validateRegexInput(keyword);
            if (check.isRegex && !check.valid) {
                return notify(t('invalid_regex', { error: check.error || '' }), 'error'), false;
            }
        }
        if (keywords.some((keyword) => keyword.length > MAX_LENGTH)) {
            return notify(t('keyword_too_long', { max: MAX_LENGTH }), 'error'), false;
        }
        const additions = planKeywordAdditions(keywords, state.keywords);
        if (state.keywords.length + additions.length > MAX_KEYWORDS) {
            return notify(t('keyword_limit', { max: formatNumber(MAX_KEYWORDS) }), 'error'), false;
        }
        if (!additions.length) return notify(t('keyword_exists', { keyword: keywords[0] }), 'error'), false;
        state.keywords = [...state.keywords, ...additions];
        for (const item of additions) {
            delete state.expiry[keyOf(item)];
        }
        saveKeywords();
        saveExpiry();
        renderList();
        reapply();
        notify(additions.length === 1 ? t('added_keyword', { keyword: additions[0] }) : t('added_keywords', { count: formatNumber(additions.length) }), 'success');
        return true;
    };
    const exportTxt = () => {
        if (!state.keywords.length) return notify(t('no_export'), 'error');
        const url = URL.createObjectURL(new Blob([`${state.keywords.join('\n')}\n`], { type: 'text/plain;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `x-blocked-keywords-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
        notify(t('exported', { count: formatNumber(state.keywords.length) }), 'success');
    };
    const exportBackup = () => {
        const payload = createBackupPayload(state);
        const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `x-keyword-blocker-backup-${todayDateKey()}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
        notify(t('exported', { count: formatNumber(payload.keywords.length) }), 'success');
    };
    const hidePreview = () => {
        ui.preview.hidden = true;
        ui.preview.replaceChildren();
    };
    const applyImport = (keywords, replace) => {
        state.keywords = normalizeKeywords(replace ? keywords : [...state.keywords, ...keywords]);
        if (replace) {
            state.expiry = Object.create(null);
        } else {
            for (const item of keywords) {
                delete state.expiry[keyOf(item)];
            }
        }
        saveKeywords();
        saveExpiry();
        renderList();
        hidePreview();
        reapply();
        notify(t('imported', { count: formatNumber(state.keywords.length) }), 'success');
    };
    const previewImport = (text, source) => {
        if (!ui) return;
        const result = parseImportText(text);
        if (!result.keywords.length) return hidePreview(), notify(t('no_valid_import'), 'error');
        const existing = new Set(state.keywords.map(keyOf));
        const newCount = result.keywords.filter((word) => !existing.has(keyOf(word))).length;
        ui.preview.replaceChildren();
        ui.preview.hidden = false;
        const title = document.createElement('h3');
        title.textContent = t('import_preview', { source });
        const summary = document.createElement('p');
        summary.textContent = t('import_summary', { count: formatNumber(result.keywords.length), newCount: formatNumber(newCount), blankCount: formatNumber(result.blankCount), duplicateCount: formatNumber(result.duplicateCount), invalidCount: formatNumber(result.invalidCount) });
        const sections = [title, summary];
        if (result.overLimitCount > 0) {
            const overLimitNote = document.createElement('p');
            overLimitNote.textContent = t('import_over_limit', { count: formatNumber(result.overLimitCount), max: formatNumber(MAX_KEYWORDS) });
            sections.push(overLimitNote);
        }
        const warning = document.createElement('p');
        warning.textContent = t('import_warning');
        const actions = document.createElement('div');
        actions.className = 'txb-preview-actions';
        [[t('merge'), 'txb-primary', false], [t('replace'), 'txb-danger', true]].forEach(([label, className, replace]) => {
            const button = document.createElement('button');
            button.type = 'button'; button.className = className; button.textContent = label;
            button.onclick = () => applyImport(result.keywords, replace);
            actions.appendChild(button);
        });
        const cancel = document.createElement('button');
        cancel.type = 'button'; cancel.className = 'txb-secondary'; cancel.textContent = t('cancel'); cancel.onclick = hidePreview;
        actions.appendChild(cancel);
        ui.preview.append(...sections, warning, actions);
        actions.firstElementChild.focus();
    };
    const importFile = async (file) => {
        if (!file) return;
        if (file.size > MAX_FILE_BYTES) return notify(t('local_file_too_large'), 'error');
        try {
            previewImport(await file.text(), file.name);
            notify(t('file_read_success'));
        } catch (error) {
            console.warn('[X Keyword Blocker] 文件导入失败', error);
            notify(t('file_read_failed'), 'error');
        }
    };
    const importBackupFile = async (file) => {
        if (!file) return;
        if (file.size > MAX_FILE_BYTES) return notify(t('local_file_too_large'), 'error');
        let text;
        try {
            text = await file.text();
        } catch (error) {
            console.warn('[X Keyword Blocker] 文件读取失败', error);
            return notify(t('file_read_failed'), 'error');
        }
        const result = parseBackupPayload(text);
        if (!result.valid) {
            return notify(t('backup_invalid'), 'error');
        }
        const { keywords, settings, stats: newStats, expiry: newExpiry, subscriptions: newSubscriptions } = result.data;
        if (!confirm(t('backup_confirm', {
            keywords: formatNumber(keywords.length),
            total: formatNumber(newStats.total)
        }))) return;

        state.keywords = keywords;
        state.enabled = settings.enabled;
        state.language = settings.language;
        state.blockPromoted = settings.blockPromoted;
        state.filterUserId = settings.filterUserId;
        state.floatingNotice = settings.floatingNotice;
        state.total = newStats.total;
        state.keywordCounts = newStats.keywordCounts;
        state.daily = newStats.daily;
        state.expiry = newExpiry || Object.create(null);
        state.subscriptions = Array.isArray(newSubscriptions) ? newSubscriptions : [];
        state.wholeWord = settings.wholeWord === true;
        state.scope = settings.scope === 'home' ? 'home' : 'all';
        state.displayMode = settings.displayMode === 'collapse' ? 'collapse' : 'hide';

        saveKeywords();
        saveExpiry();
        saveSubscriptions();
        saveWholeWord();
        saveScope();
        saveDisplayMode();
        write(KEYS.enabled, state.enabled);
        write(KEYS.language, state.language);
        write(KEYS.blockPromoted, state.blockPromoted);
        write(KEYS.filterUserId, state.filterUserId);
        write(KEYS.floatingNotice, state.floatingNotice);
        saveStats();

        if (!state.floatingNotice) removeFloatingNotice();
        reapply();
        closeModal();
        showModal();
        notify(t('backup_success'), 'success');
    };
    const remoteError = (code, details = {}) => Object.assign(new Error(code), { code, ...details });
    const requestRemoteText = (url) => new Promise((resolve, reject) => {
        let settled = false;
        let request = null;
        const succeed = (value) => {
            if (settled) return;
            settled = true;
            resolve(value);
        };
        const fail = (error) => {
            if (settled) return;
            settled = true;
            reject(error);
        };
        if (isPrivateHost(url.hostname)) {
            return fail(remoteError('insecure_host'));
        }
        try {
            request = GM_xmlhttpRequest({
                method: 'GET',
                url: url.href,
                headers: { Accept: 'text/plain, text/*;q=0.9, */*;q=0.1' },
                anonymous: true,
                timeout: 10000,
                onprogress: (progress) => {
                    if (typeof progress?.loaded !== 'number' || progress.loaded <= MAX_FILE_BYTES || settled) return;
                    fail(remoteError('too_large'));
                    request?.abort();
                },
                onload: (response) => {
                    if (response.status < 200 || response.status >= 300) {
                        return fail(remoteError('http', { status: response.status }));
                    }
                    let finalUrl;
                    try { finalUrl = new URL(response.finalUrl || url.href); }
                    catch { return fail(remoteError('network')); }
                    if (finalUrl.protocol !== 'https:' || isPrivateHost(finalUrl.hostname)) return fail(remoteError('insecure_redirect'));
                    const declaredSize = Number(responseHeader(response.responseHeaders, 'content-length'));
                    if (declaredSize > MAX_FILE_BYTES) return fail(remoteError('too_large'));
                    const text = typeof response.responseText === 'string' ? response.responseText : '';
                    if (new Blob([text]).size > MAX_FILE_BYTES) return fail(remoteError('too_large'));
                    succeed({ text, finalUrl });
                },
                ontimeout: () => fail(remoteError('timeout')),
                onerror: () => fail(remoteError('network')),
                onabort: () => fail(remoteError('network'))
            });
        } catch (error) {
            console.warn('[X Keyword Blocker] 无法启动跨域请求', error);
            fail(remoteError('network'));
        }
    });
    const importUrl = async (value) => {
        let url;
        try {
            url = new URL(value);
            if (url.protocol !== 'https:' || isPrivateHost(url.hostname)) throw new Error('HTTPS required and private host forbidden');
        } catch { return notify(t('invalid_url'), 'error'); }
        const submitButton = ui.urlSubmit;
        submitButton.disabled = true;
        submitButton.textContent = t('loading');
        try {
            const result = await requestRemoteText(url);
            previewImport(result.text, result.finalUrl.hostname);
            notify(t('url_read_success'));
        } catch (error) {
            console.warn('[X Keyword Blocker] 网址导入失败', error);
            notify(remoteImportErrorMessage(error, locale()), 'error');
        } finally {
            if (submitButton.isConnected) {
                submitButton.disabled = false;
                submitButton.textContent = t('read');
            }
        }
    };
    const syncingSubscriptions = new Set();
    let lastAutoSyncCheck = 0;
    const SYNC_CHECK_THROTTLE_MS = 10 * 60 * 1000;

    const renderSubscriptionsList = () => {
        if (!ui || !ui.subsList) return;
        ui.subsList.replaceChildren();
        if (ui.subsCount) {
            ui.subsCount.textContent = formatNumber(state.subscriptions.length);
        }
        if (ui.subsSyncAll) {
            ui.subsSyncAll.disabled = state.subscriptions.length === 0;
        }
        if (!state.subscriptions.length) {
            const empty = document.createElement('div');
            empty.className = 'txb-subs-empty';
            const span = document.createElement('span');
            span.textContent = t('subs_empty');
            empty.appendChild(span);
            ui.subsList.appendChild(empty);
            return;
        }
        const now = Date.now();
        const loc = locale();
        for (const sub of state.subscriptions) {
            const isSyncing = syncingSubscriptions.has(sub.id);
            const isDue = isSubscriptionDue(sub, now);

            const row = document.createElement('div');
            row.className = 'txb-sub-item';

            const main = document.createElement('div');
            main.className = 'txb-sub-main';

            const titleRow = document.createElement('div');
            titleRow.className = 'txb-sub-title-row';

            const nameEl = document.createElement('strong');
            nameEl.className = 'txb-sub-name';
            nameEl.textContent = sub.name;
            titleRow.appendChild(nameEl);

            const intervalBadge = document.createElement('span');
            intervalBadge.className = 'txb-sub-badge';
            intervalBadge.textContent = `${sub.intervalHours}h`;
            titleRow.appendChild(intervalBadge);

            if (isDue && !isSyncing) {
                const dueBadge = document.createElement('span');
                dueBadge.className = 'txb-sub-due-badge';
                dueBadge.textContent = t('subs_due_hint');
                titleRow.appendChild(dueBadge);
            }
            main.appendChild(titleRow);

            const urlEl = document.createElement('div');
            urlEl.className = 'txb-sub-url';
            urlEl.textContent = sub.url;
            urlEl.title = sub.url;
            main.appendChild(urlEl);

            const metaRow = document.createElement('div');
            metaRow.className = 'txb-sub-meta';

            const lastSyncText = document.createElement('span');
            lastSyncText.className = 'txb-sub-last-sync';
            lastSyncText.textContent = t('subs_last_sync', { time: formatSyncTime(sub.lastSyncAt, now, loc) });
            metaRow.appendChild(lastSyncText);

            if (isSyncing) {
                const syncingTag = document.createElement('span');
                syncingTag.className = 'txb-sub-tag txb-sub-tag-syncing';
                syncingTag.textContent = t('subs_syncing');
                metaRow.appendChild(syncingTag);
            } else if (sub.lastResult) {
                const resultTag = document.createElement('span');
                if (sub.lastResult.ok) {
                    resultTag.className = 'txb-sub-tag txb-sub-tag-ok';
                    resultTag.textContent = t('subs_ok', { count: formatNumber(sub.lastResult.added) });
                } else {
                    resultTag.className = 'txb-sub-tag txb-sub-tag-err';
                    resultTag.textContent = remoteImportErrorMessage({ code: sub.lastResult.code }, loc);
                }
                metaRow.appendChild(resultTag);
            }
            main.appendChild(metaRow);

            const actions = document.createElement('div');
            actions.className = 'txb-item-actions';

            const syncBtn = document.createElement('button');
            syncBtn.className = 'txb-secondary txb-sub-sync-btn';
            syncBtn.type = 'button';
            syncBtn.textContent = isSyncing ? t('subs_syncing') : t('subs_sync_now');
            syncBtn.disabled = isSyncing;
            syncBtn.onclick = () => syncSubscription(sub, { isManual: true });
            actions.appendChild(syncBtn);

            const delBtn = document.createElement('button');
            delBtn.className = 'txb-remove txb-sub-del-btn';
            delBtn.type = 'button';
            delBtn.textContent = t('delete');
            delBtn.setAttribute('aria-label', `${t('delete')} ${sub.name}`);
            delBtn.disabled = isSyncing;
            delBtn.onclick = () => {
                if (!confirm(t('subs_delete_confirm', { name: sub.name }))) return;
                state.subscriptions = state.subscriptions.filter((s) => s.id !== sub.id);
                saveSubscriptions();
                renderSubscriptionsList();
                notify(t('subs_deleted', { name: sub.name }), 'success');
            };
            actions.appendChild(delBtn);

            row.append(main, actions);
            ui.subsList.appendChild(row);
        }
    };

    const syncSubscription = async (subscription, { isManual = false } = {}) => {
        if (!subscription || syncingSubscriptions.has(subscription.id)) return;
        syncingSubscriptions.add(subscription.id);
        renderSubscriptionsList();

        let targetUrl;
        try {
            targetUrl = new URL(subscription.url);
            if (targetUrl.protocol !== 'https:' || isPrivateHost(targetUrl.hostname)) throw new Error('HTTPS required and private host forbidden');
        } catch {
            syncingSubscriptions.delete(subscription.id);
            renderSubscriptionsList();
            if (isManual) notify(t('invalid_url'), 'error');
            return;
        }

        try {
            const res = await requestRemoteText(targetUrl);
            const parsed = parseImportText(res.text);
            const mergePlan = planSubscriptionMerge(parsed.keywords, state.keywords, MAX_KEYWORDS);
            if (mergePlan.toAdd.length > 0) {
                state.keywords = [...state.keywords, ...mergePlan.toAdd];
                for (const kw of mergePlan.toAdd) {
                    delete state.expiry[keyOf(kw)];
                }
                saveKeywords();
                saveExpiry();
                reapply();
                renderList();
            }
            subscription.lastSyncAt = Date.now();
            subscription.lastResult = {
                ok: true,
                added: mergePlan.toAdd.length,
                at: subscription.lastSyncAt
            };
            saveSubscriptions();

            if (isManual || mergePlan.toAdd.length > 0) {
                if (mergePlan.overLimit > 0) {
                    notify(t('subs_sync_over_limit', {
                        name: subscription.name,
                        added: formatNumber(mergePlan.toAdd.length),
                        overLimit: formatNumber(mergePlan.overLimit)
                    }), 'info');
                } else {
                    notify(t('subs_sync_success', {
                        name: subscription.name,
                        added: formatNumber(mergePlan.toAdd.length)
                    }), 'success');
                }
            }
        } catch (error) {
            console.warn('[X Keyword Blocker] 订阅同步失败', subscription.name, error);
            subscription.lastResult = {
                ok: false,
                code: error?.code || 'network',
                at: Date.now()
            };
            saveSubscriptions();
            if (isManual) {
                notify(t('subs_sync_failed', {
                    name: subscription.name,
                    reason: remoteImportErrorMessage(error, locale())
                }), 'error');
            }
        } finally {
            syncingSubscriptions.delete(subscription.id);
            renderSubscriptionsList();
        }
    };

    const checkAndSyncDueSubscriptions = async ({ isManual = false } = {}) => {
        const now = Date.now();
        if (!isManual && (now - lastAutoSyncCheck < SYNC_CHECK_THROTTLE_MS)) {
            return;
        }
        if (!isManual) {
            lastAutoSyncCheck = now;
        }
        const dueList = state.subscriptions.filter((sub) => isSubscriptionDue(sub, now));
        for (const sub of dueList) {
            await syncSubscription(sub, { isManual });
        }
    };

    const addSubscription = (urlValue, nameValue, intervalValue) => {
        let parsedUrl;
        try {
            parsedUrl = new URL(urlValue);
            if (parsedUrl.protocol !== 'https:' || isPrivateHost(parsedUrl.hostname)) throw new Error('HTTPS required and private host forbidden');
        } catch {
            notify(t('invalid_url'), 'error');
            return false;
        }
        const normalizedUrl = parsedUrl.href;
        if (state.subscriptions.some((s) => s.url === normalizedUrl)) {
            notify(t('subs_exists'), 'error');
            return false;
        }
        let name = typeof nameValue === 'string' ? nameValue.trim() : '';
        if (!name) name = parsedUrl.hostname;
        if (name.length > 50) name = name.slice(0, 50);

        let intervalHours = Number(intervalValue) || 24;
        if (intervalHours < 1) intervalHours = 1;
        if (intervalHours > 720) intervalHours = 720;

        const newSub = {
            id: 'sub_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
            url: normalizedUrl,
            name,
            intervalHours,
            lastSyncAt: null,
            lastResult: null
        };
        state.subscriptions.push(newSub);
        saveSubscriptions();
        renderSubscriptionsList();
        notify(t('subs_added', { name: newSub.name }), 'success');
        syncSubscription(newSub, { isManual: true });
        return true;
    };
    const resetCounter = () => {
        if (!confirm(t('reset_confirm'))) return;
        state.total = 0;
        state.keywordCounts = Object.create(null);
        state.daily = Object.create(null);
        saveStats(); updateStats(); renderList(); notify(t('reset_success'), 'success');
    };
    const clearAllKeywords = () => {
        const count = state.keywords.length;
        if (!count) return notify(t('clear_none'), 'error');
        if (!confirm(t('clear_confirm', { count: formatNumber(count) }))) return;
        state.keywords = [];
        state.expiry = Object.create(null);
        saveKeywords();
        saveExpiry();
        renderList();
        reapply();
        notify(t('clear_success', { count: formatNumber(count) }), 'success');
    };
    const closeModal = () => {
        document.getElementById('txb-overlay')?.remove();
        document.body.style.overflow = previousOverflow;
        ui = null;
        if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
        previousFocus = null;
    };
    const dialogKeys = (event) => {
        if (event.key === 'Escape') return event.preventDefault(), closeModal();
        if (event.key !== 'Tab') return;
        const items = [...ui.dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),textarea:not([disabled]),select:not([disabled])')]
            .filter((item) => !item.closest('[hidden]'));
        const first = items[0], last = items.at(-1);
        if (event.shiftKey && document.activeElement === first) event.preventDefault(), last.focus();
        else if (!event.shiftKey && document.activeElement === last) event.preventDefault(), first.focus();
    };
    const showModal = () => {
        if (document.getElementById('txb-overlay')) return ui.input.focus();
        injectStyles();
        previousFocus = document.activeElement;
        previousOverflow = document.body.style.overflow;
        const overlay = document.createElement('div');
        overlay.id = 'txb-overlay';
        overlay.dataset.theme = darkPage() ? 'dark' : 'light';
        overlay.innerHTML = `<section id="txb-dialog" role="dialog" aria-modal="true" aria-labelledby="txb-title" aria-describedby="txb-description"><header class="txb-header"><div><p class="txb-eyebrow">X Keyword Blocker</p><h1 id="txb-title">${t('title')}</h1><p id="txb-description" class="txb-subtitle">${t('description')}</p></div><button id="txb-close" class="txb-icon" type="button" aria-label="${t('close')}">×</button></header><div class="txb-content"><div class="txb-status"><div class="txb-card"><div><span class="txb-label">${t('filter_status')}</span><strong id="txb-enabled" class="txb-value"></strong></div><button id="txb-toggle" class="txb-switch" type="button" role="switch" aria-label="${t('filter_toggle_aria')}"></button></div><div class="txb-card"><div><span class="txb-label">${t('total_blocked')}</span><strong class="txb-value"><span id="txb-total">0</span>${t('posts_unit')}</strong><span id="txb-today" class="txb-sublabel"></span></div><button id="txb-reset" type="button">${t('reset')}</button></div></div><form id="txb-add" class="txb-form"><label class="txb-sr" for="txb-input">${t('new_keyword')}</label><textarea id="txb-input" class="txb-input" rows="2" placeholder="${t('keyword_placeholder')}"></textarea><button class="txb-primary" type="submit">${t('add')}</button></form><p id="txb-message" role="status" aria-live="polite">${t('input_hint')}</p><div class="txb-tools"><button id="txb-file" class="txb-secondary" type="button">${t('import_file')}</button><button id="txb-url" class="txb-secondary" type="button" aria-expanded="false">${t('import_url')}</button><button id="txb-export" class="txb-secondary" type="button">${t('export_txt')}</button><button id="txb-backup-export" class="txb-secondary" type="button">${t('backup_export')}</button><button id="txb-backup-import" class="txb-secondary" type="button">${t('backup_import')}</button><input id="txb-file-input" class="txb-sr" type="file" accept=".txt,text/plain" tabindex="-1"><input id="txb-backup-file-input" class="txb-sr" type="file" accept=".json,application/json" tabindex="-1"></div><form id="txb-url-form" hidden novalidate><label class="txb-sr" for="txb-url-input">${t('url_label')}</label><input id="txb-url-input" class="txb-input" type="url" placeholder="https://example.com/keywords.txt"><button id="txb-url-submit" class="txb-primary">${t('read')}</button></form><section id="txb-preview" class="txb-preview" aria-label="${t('preview_aria')}" hidden></section><section id="txb-subs-section" class="txb-subs-section" aria-label="${t('subs_title')}"><div class="txb-subs-header"><div class="txb-subs-title-group"><h2 class="txb-subs-title">${t('subs_title')}</h2><span id="txb-subs-count" class="txb-count">0</span></div><div class="txb-subs-header-actions"><button id="txb-subs-sync-all" class="txb-secondary" type="button">${t('subs_sync_all')}</button><button id="txb-subs-toggle-add" class="txb-secondary" type="button" aria-expanded="false">${t('subs_add')}</button></div></div><form id="txb-subs-form" class="txb-subs-form" hidden novalidate><label class="txb-sr" for="txb-sub-name-input">${t('subs_name_placeholder')}</label><input id="txb-sub-name-input" class="txb-input" type="text" placeholder="${t('subs_name_placeholder')}" maxlength="50"><div class="txb-subs-form-row"><label class="txb-sr" for="txb-sub-url-input">${t('url_label')}</label><input id="txb-sub-url-input" class="txb-input" type="url" placeholder="https://example.com/keywords.txt" required><select id="txb-sub-interval" class="txb-select" aria-label="${t('subs_interval')}"><option value="12">${t('subs_interval_12h')}</option><option value="24" selected>${t('subs_interval_24h')}</option><option value="72">${t('subs_interval_3d')}</option><option value="168">${t('subs_interval_7d')}</option></select><button id="txb-sub-submit" class="txb-primary" type="submit">${t('add')}</button></div></form><div id="txb-subs-list" class="txb-subs-list"></div></section><div class="txb-heading"><h2>${t('blocked_words')}</h2><span id="txb-count" class="txb-count">0</span></div><div id="txb-list" class="txb-list"></div></div><footer class="txb-footer">${t('shortcut_footer')}</footer></section>`;
        const noticeCard = document.createElement('div');
        noticeCard.className = 'txb-card txb-card-wide';
        noticeCard.innerHTML = `<div><span class="txb-label">${t('floating_notice')}</span><strong id="txb-notice-status" class="txb-value"></strong></div><button id="txb-notice-toggle" class="txb-switch" type="button" role="switch" aria-label="${t('floating_toggle_aria')}"></button>`;
        overlay.querySelector('.txb-status').appendChild(noticeCard);
        const languageCard = document.createElement('div');
        languageCard.className = 'txb-card txb-card-wide';
        languageCard.innerHTML = `<label class="txb-label" for="txb-language">${t('language')}</label><select id="txb-language" class="txb-select" aria-label="${t('language_aria')}"><option value="auto">${t('language_auto')}</option><option value="zh-CN">中文</option><option value="en">English</option></select>`;
        languageCard.querySelector('#txb-language').value = ['auto', 'zh-CN', 'en'].includes(state.language) ? state.language : 'auto';
        overlay.querySelector('.txb-status').appendChild(languageCard);
        const compactSettings = document.createElement('div');
        compactSettings.className = 'txb-compact-settings';
        const userIdCard = document.createElement('div');
        userIdCard.className = 'txb-card';
        userIdCard.innerHTML = `<div><span class="txb-label">${t('author_filter')}</span><strong id="txb-user-id-status" class="txb-value"></strong></div><button id="txb-user-id-toggle" class="txb-switch" type="button" role="switch" aria-label="${t('author_toggle_aria')}"></button>`;
        const promotedCard = document.createElement('div');
        promotedCard.className = 'txb-card';
        promotedCard.innerHTML = `<div><span class="txb-label">${t('block_promoted')}</span><strong id="txb-promoted-status" class="txb-value"></strong></div><button id="txb-promoted-toggle" class="txb-switch" type="button" role="switch" aria-label="${t('promoted_toggle_aria')}"></button>`;
        const wholeWordCard = document.createElement('div');
        wholeWordCard.className = 'txb-card';
        wholeWordCard.innerHTML = `<div><span class="txb-label">${t('whole_word')}</span><strong id="txb-whole-word-status" class="txb-value"></strong></div><button id="txb-whole-word-toggle" class="txb-switch" type="button" role="switch" aria-label="${t('whole_word_toggle_aria')}"></button>`;
        const scopeCard = document.createElement('div');
        scopeCard.className = 'txb-card';
        scopeCard.innerHTML = `<div><span class="txb-label">${t('scope')}</span><strong id="txb-scope-status" class="txb-value"></strong></div><button id="txb-scope-toggle" class="txb-switch" type="button" role="switch" aria-label="${t('scope_toggle_aria')}"></button>`;
        const displayModeCard = document.createElement('div');
        displayModeCard.className = 'txb-card';
        displayModeCard.innerHTML = `<div><span class="txb-label">${t('display_mode')}</span><strong id="txb-display-mode-status" class="txb-value"></strong></div><button id="txb-display-mode-toggle" class="txb-switch" type="button" role="switch" aria-label="${t('display_mode_toggle_aria')}"></button>`;
        compactSettings.append(userIdCard, promotedCard, wholeWordCard, scopeCard, displayModeCard);
        overlay.querySelector('.txb-status').appendChild(compactSettings);
        const countBadge = overlay.querySelector('#txb-count');
        const headingActions = document.createElement('div');
        headingActions.className = 'txb-heading-actions';
        const clearKeywords = document.createElement('button');
        clearKeywords.id = 'txb-clear-keywords';
        clearKeywords.className = 'txb-clear-keywords';
        clearKeywords.type = 'button';
        clearKeywords.textContent = t('clear');
        clearKeywords.setAttribute('aria-label', t('clear_keywords_aria'));
        countBadge.replaceWith(headingActions);
        headingActions.append(countBadge, clearKeywords);
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
        const $ = (selector) => overlay.querySelector(selector);
        ui = { overlay, dialog: $('#txb-dialog'), input: $('#txb-input'), message: $('#txb-message'), list: $('#txb-list'), count: $('#txb-count'), clearKeywords: $('#txb-clear-keywords'), toggle: $('#txb-toggle'), enabled: $('#txb-enabled'), total: $('#txb-total'), today: $('#txb-today'), noticeToggle: $('#txb-notice-toggle'), noticeStatus: $('#txb-notice-status'), userIdToggle: $('#txb-user-id-toggle'), userIdStatus: $('#txb-user-id-status'), promotedToggle: $('#txb-promoted-toggle'), promotedStatus: $('#txb-promoted-status'), wholeWordToggle: $('#txb-whole-word-toggle'), wholeWordStatus: $('#txb-whole-word-status'), scopeToggle: $('#txb-scope-toggle'), scopeStatus: $('#txb-scope-status'), displayModeToggle: $('#txb-display-mode-toggle'), displayModeStatus: $('#txb-display-mode-status'), languageSelect: $('#txb-language'), fileInput: $('#txb-file-input'), backupFileInput: $('#txb-backup-file-input'), urlButton: $('#txb-url'), urlForm: $('#txb-url-form'), urlInput: $('#txb-url-input'), urlSubmit: $('#txb-url-submit'), preview: $('#txb-preview'), subsSection: $('#txb-subs-section'), subsCount: $('#txb-subs-count'), subsSyncAll: $('#txb-subs-sync-all'), subsToggleAdd: $('#txb-subs-toggle-add'), subsForm: $('#txb-subs-form'), subsNameInput: $('#txb-sub-name-input'), subsUrlInput: $('#txb-sub-url-input'), subsIntervalSelect: $('#txb-sub-interval'), subsList: $('#txb-subs-list') };
        $('#txb-close').onclick = closeModal;
        overlay.onclick = (event) => { if (event.target === overlay) closeModal(); };
        overlay.onkeydown = dialogKeys;
        $('#txb-add').onsubmit = (event) => { event.preventDefault(); if (addKeywords(ui.input.value)) ui.input.value = ''; };
        ui.input.addEventListener('keydown', (event) => {
            if (event.key !== 'Enter' || !(event.metaKey || event.ctrlKey)) return;
            event.preventDefault();
            ui.input.form?.requestSubmit();
        });
        ui.toggle.onclick = () => { state.enabled = !state.enabled; write(KEYS.enabled, state.enabled); updateEnabled(); reapply(); notify(state.enabled ? t('filtering_enabled') : t('filtering_paused'), 'success'); };
        ui.noticeToggle.onclick = () => {
            state.floatingNotice = !state.floatingNotice;
            write(KEYS.floatingNotice, state.floatingNotice);
            if (!state.floatingNotice) removeFloatingNotice();
            updateFloatingNoticeSetting();
            notify(state.floatingNotice ? t('floating_enabled') : t('floating_disabled'), 'success');
        };
        ui.userIdToggle.onclick = () => {
            state.filterUserId = !state.filterUserId;
            write(KEYS.filterUserId, state.filterUserId);
            updateUserIdFilterSetting();
            reapply();
            notify(state.filterUserId ? t('author_enabled') : t('author_disabled'), 'success');
        };
        ui.promotedToggle.onclick = () => {
            state.blockPromoted = !state.blockPromoted;
            write(KEYS.blockPromoted, state.blockPromoted);
            updatePromotedSetting();
            reapply();
            notify(state.blockPromoted ? t('promoted_enabled') : t('promoted_disabled'), 'success');
        };
        ui.wholeWordToggle.onclick = () => {
            state.wholeWord = !state.wholeWord;
            write(KEYS.wholeWord, state.wholeWord);
            updateWholeWordSetting();
            reapply();
            notify(state.wholeWord ? t('whole_word_enabled') : t('whole_word_disabled'), 'success');
        };
        ui.scopeToggle.onclick = () => {
            state.scope = state.scope === 'home' ? 'all' : 'home';
            write(KEYS.scope, state.scope);
            updateScopeSetting();
            reapply();
            notify(state.scope === 'home' ? t('scope_home_enabled') : t('scope_all_enabled'), 'success');
        };
        ui.displayModeToggle.onclick = () => {
            state.displayMode = state.displayMode === 'collapse' ? 'hide' : 'collapse';
            saveDisplayMode();
            updateDisplayModeSetting();
            reapply();
            notify(state.displayMode === 'collapse' ? t('display_mode_collapse_enabled') : t('display_mode_hide_enabled'), 'success');
        };
        ui.languageSelect.onchange = () => {
            state.language = ui.languageSelect.value;
            write(KEYS.language, state.language);
            closeModal();
            showModal();
        };
        $('#txb-reset').onclick = resetCounter;
        ui.clearKeywords.onclick = clearAllKeywords;
        $('#txb-export').onclick = exportTxt;
        $('#txb-backup-export').onclick = exportBackup;
        $('#txb-backup-import').onclick = () => ui.backupFileInput.click();
        ui.backupFileInput.onchange = () => { importBackupFile(ui.backupFileInput.files?.[0]); ui.backupFileInput.value = ''; };
        $('#txb-file').onclick = () => ui.fileInput.click();
        ui.fileInput.onchange = () => { importFile(ui.fileInput.files?.[0]); ui.fileInput.value = ''; };
        ui.urlButton.onclick = () => { ui.urlForm.hidden = !ui.urlForm.hidden; ui.urlButton.setAttribute('aria-expanded', String(!ui.urlForm.hidden)); if (!ui.urlForm.hidden) ui.urlInput.focus(); };
        ui.urlForm.onsubmit = (event) => { event.preventDefault(); importUrl(ui.urlInput.value.trim()); };
        ui.subsToggleAdd.onclick = () => {
            ui.subsForm.hidden = !ui.subsForm.hidden;
            ui.subsToggleAdd.setAttribute('aria-expanded', String(!ui.subsForm.hidden));
            if (!ui.subsForm.hidden) ui.subsUrlInput.focus();
        };
        ui.subsForm.onsubmit = (event) => {
            event.preventDefault();
            const ok = addSubscription(ui.subsUrlInput.value.trim(), ui.subsNameInput.value.trim(), ui.subsIntervalSelect.value);
            if (ok) {
                ui.subsUrlInput.value = '';
                ui.subsNameInput.value = '';
                ui.subsForm.hidden = true;
                ui.subsToggleAdd.setAttribute('aria-expanded', 'false');
            }
        };
        ui.subsSyncAll.onclick = async () => {
            if (!state.subscriptions.length) return;
            ui.subsSyncAll.disabled = true;
            try {
                for (const sub of [...state.subscriptions]) {
                    await syncSubscription(sub, { isManual: true });
                }
            } finally {
                if (ui && ui.subsSyncAll) ui.subsSyncAll.disabled = false;
            }
        };
        const expired = checkAndPruneExpired(false);
        updateEnabled(); updateFloatingNoticeSetting(); updateUserIdFilterSetting(); updatePromotedSetting(); updateWholeWordSetting(); updateScopeSetting(); updateDisplayModeSetting(); updateStats(); renderSubscriptionsList(); renderList();
        checkAndSyncDueSubscriptions({ isManual: false });
        if (expired.length > 0) {
            notify(t('expired_notice', { count: formatNumber(expired.length) }), 'info');
        }
        requestAnimationFrame(() => { if (ui && matchMedia('(pointer:fine)').matches) ui.input.focus(); });
    };

    GM_registerMenuCommand(t('menu'), showModal);
    window.addEventListener('keydown', (event) => {
        // macOS 的 Option+Shift+K 可能把 event.key 映射成特殊字符；event.code 始终代表物理 K 键。
        const isKKey = event.code === 'KeyK' || event.key.toLocaleLowerCase() === 'k';
        if (event.altKey && event.shiftKey && !event.metaKey && isKKey) {
            event.preventDefault();
            event.stopPropagation();
            showModal();
        }
    }, true);
    window.addEventListener('pagehide', saveStats);

    // SPA 路由监听：当路由切换且为 home 作用域时，触发 reapply 重估隐藏状态
    let lastPathname = window.location?.pathname || '';
    const checkNavigation = () => {
        const currentPath = window.location?.pathname || '';
        if (currentPath !== lastPathname) {
            lastPathname = currentPath;
            if (state.scope === 'home') {
                reapply();
            }
        }
    };
    window.addEventListener('popstate', checkNavigation);
    const wrapHistoryMethod = (type) => {
        const original = history[type];
        if (typeof original === 'function') {
            history[type] = function (...args) {
                const result = original.apply(this, args);
                checkNavigation();
                return result;
            };
        }
    };
    wrapHistoryMethod('pushState');
    wrapHistoryMethod('replaceState');

    // 多标签页数据同步监听
    if (typeof GM_addValueChangeListener === 'function') {
        GM_addValueChangeListener(KEYS.keywords, (_key, _oldVal, newVal, remote) => {
            if (!remote) return;
            state.keywords = normalizeKeywords(newVal);
            renderList();
            reapply();
        });
        GM_addValueChangeListener(KEYS.enabled, (_key, _oldVal, newVal, remote) => {
            if (!remote) return;
            state.enabled = newVal !== false;
            updateEnabled();
            reapply();
        });
        GM_addValueChangeListener(KEYS.blockPromoted, (_key, _oldVal, newVal, remote) => {
            if (!remote) return;
            state.blockPromoted = newVal !== false;
            updatePromotedSetting();
            reapply();
        });
        GM_addValueChangeListener(KEYS.filterUserId, (_key, _oldVal, newVal, remote) => {
            if (!remote) return;
            state.filterUserId = Boolean(newVal);
            updateUserIdFilterSetting();
            reapply();
        });
        GM_addValueChangeListener(KEYS.wholeWord, (_key, _oldVal, newVal, remote) => {
            if (!remote) return;
            state.wholeWord = Boolean(newVal);
            updateWholeWordSetting();
            reapply();
        });
        GM_addValueChangeListener(KEYS.scope, (_key, _oldVal, newVal, remote) => {
            if (!remote) return;
            state.scope = newVal === 'home' ? 'home' : 'all';
            updateScopeSetting();
            reapply();
        });
        GM_addValueChangeListener(KEYS.displayMode, (_key, _oldVal, newVal, remote) => {
            if (!remote) return;
            state.displayMode = newVal === 'collapse' ? 'collapse' : 'hide';
            updateDisplayModeSetting();
            reapply();
        });
        GM_addValueChangeListener(KEYS.floatingNotice, (_key, _oldVal, newVal, remote) => {
            if (!remote) return;
            state.floatingNotice = newVal !== false;
            updateFloatingNoticeSetting();
            if (!state.floatingNotice) removeFloatingNotice();
        });
    }

    document.querySelectorAll('article[data-testid="tweet"]').forEach(queue);
    checkAndSyncDueSubscriptions({ isManual: false });
})();
