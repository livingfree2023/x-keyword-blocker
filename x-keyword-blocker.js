// ==UserScript==
// @name         Twitter / X 关键词屏蔽工具
// @name:en      X Keyword Blocker
// @namespace    https://github.com/livingfree2023/x-keyword-blocker
// @version      1.5.0
// @description  屏蔽指定关键词与推广帖子，支持统计、暂停、TXT 与网址导入导出
// @description:en Block posts by keyword and promoted-post labels, with stats and TXT/URL import/export
// @author       livingfree
// @license      MIT
// @match        https://twitter.com/*
// @match        https://x.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
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
        stats: 'twitter_blocker_stats_v1'
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
            floating_aria: '累计拦截 {total} 条，本次新增 {delta} 条', floating_label: '累计拦截',
            empty_title: '还没有屏蔽词', empty_description: '添加后会立即重新检查当前时间线。',
            delete: '删除', delete_keyword_aria: '删除关键词 {keyword}', deleted_keyword: '已删除“{keyword}”',
            enter_keyword: '请输入一个关键词。', keyword_too_long: '关键词不能超过 {max} 个字符。',
            keyword_limit: '最多保存 {max} 个关键词。', keyword_exists: '“{keyword}”已经在列表中。',
            added_keyword: '已添加“{keyword}”', no_export: '当前没有可导出的关键词。',
            exported: '已导出 {count} 个关键词。', imported: '导入完成，当前共有 {count} 个关键词。',
            no_valid_import: '没有找到可导入的有效关键词。', import_preview: '检查导入内容 · {source}',
            import_summary: '识别到 {count} 个，其中 {newCount} 个尚未存在；忽略 {blankCount} 个空行、{duplicateCount} 个重复项、{invalidCount} 个无效项。',
            import_warning: '替换会删除当前列表；合并只添加缺少的项目。', merge: '合并导入', replace: '替换现有', cancel: '取消',
            local_file_too_large: '文件过大，请选择不超过 512 KB 的文本文件。', file_read_success: '文件读取成功，请确认导入方式。',
            file_read_failed: '无法读取这个文件。', invalid_url: '请输入有效的 HTTPS 文本文件网址。', loading: '读取中…',
            url_read_success: '网址读取成功，请确认导入方式。', read: '读取', reset_confirm: '将累计拦截数清零？关键词和过滤设置不会受影响。',
            reset_success: '累计拦截数已清零。', clear_none: '当前没有可清空的屏蔽词。',
            clear_confirm: '确认删除全部 {count} 个屏蔽词？此操作无法撤销。', clear_success: '已删除全部 {count} 个屏蔽词。',
            title: '关键词屏蔽', description: '管理时间线过滤规则与导入导出。', close: '关闭',
            filter_status: '过滤状态', filter_toggle_aria: '启用帖子过滤', total_blocked: '累计拦截', reset: '清零', posts_unit: ' 条',
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
            language: '语言', language_aria: '选择界面语言', language_auto: '自动（跟随浏览器）', menu: '管理屏蔽关键词'
        },
        en: {
            active: 'Active', paused: 'Paused', on: 'On', off: 'Off',
            remote_timeout: 'The request timed out. Please try again.',
            remote_too_large: 'The remote file is too large. Use a text file no larger than 512 KB.',
            remote_insecure_redirect: 'The URL redirected to a non-HTTPS address, so it was not loaded.',
            remote_http: 'The server returned HTTP {status}; the file could not be loaded.',
            remote_network: 'The request failed. Check the URL, network connection, or userscript cross-origin permission.',
            floating_aria: '{total} posts blocked in total; {delta} newly blocked', floating_label: 'Total blocked',
            empty_title: 'No blocked keywords yet', empty_description: 'Add one to recheck the current timeline immediately.',
            delete: 'Delete', delete_keyword_aria: 'Delete keyword {keyword}', deleted_keyword: 'Deleted “{keyword}”',
            enter_keyword: 'Enter a keyword.', keyword_too_long: 'A keyword cannot exceed {max} characters.',
            keyword_limit: 'You can save up to {max} keywords.', keyword_exists: '“{keyword}” is already in the list.',
            added_keyword: 'Added “{keyword}”', no_export: 'There are no keywords to export.',
            exported: 'Exported {count} keywords.', imported: 'Import complete. There are now {count} keywords.',
            no_valid_import: 'No valid keywords were found to import.', import_preview: 'Review import · {source}',
            import_summary: '{count} found; {newCount} are new. Ignored {blankCount} blank, {duplicateCount} duplicate, and {invalidCount} invalid entries.',
            import_warning: 'Replace removes the current list; merge only adds missing entries.', merge: 'Merge import', replace: 'Replace current', cancel: 'Cancel',
            local_file_too_large: 'The file is too large. Choose a text file no larger than 512 KB.', file_read_success: 'File read. Choose how to import it.',
            file_read_failed: 'Unable to read this file.', invalid_url: 'Enter a valid HTTPS text-file URL.', loading: 'Loading…',
            url_read_success: 'URL read. Choose how to import it.', read: 'Load', reset_confirm: 'Reset the lifetime block count? Keywords and settings will not change.',
            reset_success: 'Lifetime block count reset.', clear_none: 'There are no blocked keywords to clear.',
            clear_confirm: 'Delete all {count} blocked keywords? This cannot be undone.', clear_success: 'Deleted all {count} blocked keywords.',
            title: 'Keyword Blocker', description: 'Manage timeline filters and imports.', close: 'Close',
            filter_status: 'Filtering', filter_toggle_aria: 'Toggle post filtering', total_blocked: 'Total blocked', reset: 'Reset', posts_unit: ' posts',
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
            language: 'Language', language_aria: 'Choose interface language', language_auto: 'Auto (browser language)', menu: 'Manage blocked keywords'
        }
    };
    const PROMOTED_LABELS = new Set([
        'ad', 'promoted', 'sponsored',
        '广告', '廣告', '推广', '推廣', '赞助', '贊助',
        'プロモーション', '프로모션', 'реклама', 'anzeige',
        'sponsorisé', 'promocionado', 'patrocinado'
    ]);

    const clean = (value) => typeof value === 'string' ? value.trim() : '';
    const keyOf = (value) => clean(value).normalize('NFKC').toLocaleLowerCase();
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
    const findBlockedKeyword = (text, keywords) => {
        const haystack = String(text || '').normalize('NFKC').toLocaleLowerCase();
        if (!haystack || !Array.isArray(keywords)) return null;
        return keywords.find((keyword) => {
            const needle = keyOf(keyword);
            return needle && haystack.includes(needle);
        }) || null;
    };
    const parseImportText = (text) => {
        const keywords = [];
        const seen = new Set();
        let blankCount = 0;
        let duplicateCount = 0;
        let invalidCount = 0;
        for (const line of String(text).split(/\r?\n/)) {
            const keyword = clean(line);
            const key = keyOf(keyword);
            if (!keyword) blankCount += 1;
            else if (keyword.length > MAX_LENGTH || keywords.length >= MAX_KEYWORDS) invalidCount += 1;
            else if (seen.has(key)) duplicateCount += 1;
            else {
                seen.add(key);
                keywords.push(keyword);
            }
        }
        return { keywords, blankCount, duplicateCount, invalidCount };
    };
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
    const isPromotedLabelText = (value) => PROMOTED_LABELS.has(keyOf(value));
    const resolveBlockedMatch = (text, keywords, enabled, blockPromoted, promotedLabel) => {
        if (!enabled) return null;
        if (blockPromoted && promotedLabel) return promotedLabel;
        return findBlockedKeyword(text, keywords);
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
        const template = TEXT[locale]?.[key] ?? TEXT.en[key] ?? key;
        return template.replace(/\{(\w+)\}/g, (_, name) => String(values[name] ?? `{${name}}`));
    };
    const remoteImportErrorMessage = (error, locale = 'zh-CN') => {
        if (error?.code === 'timeout') return translate(locale, 'remote_timeout');
        if (error?.code === 'too_large') return translate(locale, 'remote_too_large');
        if (error?.code === 'insecure_redirect') return translate(locale, 'remote_insecure_redirect');
        if (error?.code === 'http') return translate(locale, 'remote_http', { status: error.status || 'error' });
        return translate(locale, 'remote_network');
    };

    // Pure helpers are testable without a browser or userscript manager.
    if (typeof process !== 'undefined' && process.versions?.node
        && typeof module !== 'undefined' && module.exports) {
        module.exports = {
            findBlockedKeyword,
            keyOf,
            normalizeKeywords,
            parseImportText,
            userIdFromHref,
            buildAuthorSearchText,
            isPromotedLabelText,
            resolveBlockedMatch,
            responseHeader,
            remoteImportErrorMessage,
            resolveLocale,
            translate
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
        sessionPostIds: new Set(),
        sessionArticles: new WeakSet(),
        revision: 0,
        statsTimer: null,
        floatingDelta: 0,
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
    const saveStats = () => {
        if (state.statsTimer !== null) clearTimeout(state.statsTimer);
        state.statsTimer = null;
        write(KEYS.stats, { total: state.total });
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
    const updateStats = () => {
        if (ui) ui.total.textContent = formatNumber(state.total);
    };
    const countPost = (article) => {
        const id = postId(article);
        if (id) {
            if (state.sessionPostIds.has(id)) return;
            state.sessionPostIds.add(id);
        } else {
            if (state.sessionArticles.has(article)) return;
            state.sessionArticles.add(article);
        }
        state.total += 1;
        updateStats();
        scheduleStatsSave();
        scheduleFloatingNotice(1);
    };
    const containerOf = (article) => article.closest('div[data-testid="cellInnerDiv"]') || article;
    const tweetText = (article) => Array.from(article.querySelectorAll('div[data-testid="tweetText"]'))
        .map((node) => node.innerText || node.textContent || '').join('\n');
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
            userName?.innerText || userName?.textContent || '',
            authorId
        );
    };
    const tweetPromotedLabel = (article) => {
        for (const span of article.querySelectorAll('span')) {
            if (span.closest('[data-testid="tweetText"], [data-testid="User-Name"]')) continue;
            const label = clean(span.textContent || '');
            if (isPromotedLabelText(label)) return label;
        }
        return '';
    };
    const restore = (article) => {
        const container = containerOf(article);
        if (container.dataset.txbHidden !== 'true') return;
        delete container.dataset.txbHidden;
        delete container.dataset.txbKeyword;
        container.style.removeProperty('display');
    };
    const cache = new WeakMap();
    const scan = (article) => {
        if (!article?.isConnected) return;
        const text = tweetText(article);
        const authorId = tweetAuthorId(article);
        const authorText = tweetAuthorSearchText(article, authorId);
        const promotedLabel = tweetPromotedLabel(article);
        const signature = `${state.enabled}|${state.blockPromoted}|${state.revision}|${postId(article) || ''}|${authorText}|${promotedLabel}|${text}`;
        if (cache.get(article) === signature) return;
        cache.set(article, signature);
        const searchableText = [
            text,
            state.filterUserId ? authorText : ''
        ].filter(Boolean).join('\n');
        const match = resolveBlockedMatch(
            searchableText,
            state.keywords,
            state.enabled,
            state.blockPromoted,
            promotedLabel
        );
        if (!match) return restore(article);
        const container = containerOf(article);
        container.dataset.txbHidden = 'true';
        container.dataset.txbKeyword = match;
        container.style.setProperty('display', 'none', 'important');
        countPost(article);
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
        pending.add(article);
        if (frame === null) frame = requestAnimationFrame(flush);
    };
    const collect = (node) => {
        if (!(node instanceof Element)) return;
        if (node.matches('article[data-testid="tweet"]')) queue(node);
        queue(node.closest('article[data-testid="tweet"]'));
        node.querySelectorAll('article[data-testid="tweet"]').forEach(queue);
    };
    const reapply = () => {
        state.revision += 1;
        document.querySelectorAll('article[data-testid="tweet"]').forEach(queue);
    };
    new MutationObserver((mutations) => mutations.forEach((mutation) => {
        collect(mutation.target);
        mutation.addedNodes.forEach(collect);
    })).observe(document.body, { childList: true, subtree: true });

    const injectStyles = () => {
        if (document.getElementById('txb-styles')) return;
        const style = document.createElement('style');
        style.id = 'txb-styles';
        style.textContent = `
#txb-overlay,#txb-overlay *{box-sizing:border-box}#txb-overlay{--bg:#fff;--surface:#f7f9f9;--hover:#eff3f4;--text:#0f1419;--muted:#536471;--border:#cfd9de;--blue:#1d9bf0;--danger:#f4212e;--green:#00ba7c;--focus:rgba(29,155,240,.24);position:fixed;inset:0;z-index:2147483646;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(15,20,25,.55);backdrop-filter:blur(3px);font-family:TwitterChirp,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;animation:txbFade .14s ease-out}#txb-overlay[data-theme=dark]{--bg:#15202b;--surface:#1e2d3a;--hover:#263746;--text:#f7f9f9;--muted:#8b98a5;--border:#38444d;--focus:rgba(29,155,240,.32)}#txb-dialog{width:min(480px,100%);max-height:min(760px,calc(100dvh - 48px));display:flex;flex-direction:column;overflow:hidden;color:var(--text);background:var(--bg);border:1px solid var(--border);border-radius:22px;box-shadow:0 20px 60px rgba(0,0,0,.3);animation:txbIn .18s ease-out}.txb-header{display:flex;align-items:flex-start;justify-content:space-between;gap:16px;padding:20px 20px 14px}.txb-eyebrow{margin:0 0 3px;color:var(--blue);font-size:12px;font-weight:700;letter-spacing:.08em;text-transform:uppercase}#txb-title{margin:0;font-size:22px;line-height:1.25;font-weight:800}.txb-subtitle{margin:5px 0 0;color:var(--muted);font-size:13px}.txb-icon{width:36px;height:36px;border:0;border-radius:50%;color:var(--text);background:transparent;font-size:24px;cursor:pointer}.txb-icon:hover{background:var(--hover)}.txb-content{overflow-y:auto;padding:0 20px 20px;scrollbar-width:thin}.txb-status{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:16px}.txb-card{min-height:78px;display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 14px;border:1px solid var(--border);border-radius:14px;background:var(--surface)}.txb-label{display:block;color:var(--muted);font-size:12px;font-weight:600}.txb-value{display:block;margin-top:3px;font-size:19px;font-weight:800}#txb-reset{padding:4px 0;border:0;color:var(--muted);background:transparent;font-size:11px;text-decoration:underline;cursor:pointer}.txb-switch{position:relative;width:44px;height:26px;flex:none;padding:0;border:0;border-radius:99px;background:var(--border);cursor:pointer}.txb-switch:after{content:"";position:absolute;top:3px;left:3px;width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px #0004;transition:transform .16s}.txb-switch[aria-checked=true]{background:var(--green)}.txb-switch[aria-checked=true]:after{transform:translateX(18px)}.txb-form{display:flex;gap:8px;margin-bottom:9px}.txb-input{min-width:0;height:42px;flex:1;padding:0 14px;border:1px solid var(--border);border-radius:12px;outline:none;color:var(--text);background:var(--bg);font:inherit;font-size:14px}.txb-input:focus{border-color:var(--blue);box-shadow:0 0 0 3px var(--focus)}.txb-primary,.txb-secondary,.txb-danger{min-height:36px;padding:0 14px;border:1px solid transparent;border-radius:99px;font:inherit;font-size:13px;font-weight:700;cursor:pointer}.txb-primary{color:#fff;background:var(--blue)}.txb-secondary{color:var(--text);background:transparent;border-color:var(--border)}.txb-secondary:hover{background:var(--hover)}.txb-danger{color:#fff;background:var(--danger)}button:disabled{opacity:.55;cursor:not-allowed}#txb-message{min-height:18px;margin:0 2px 9px;color:var(--muted);font-size:12px}#txb-message[data-kind=success]{color:var(--green)}#txb-message[data-kind=error]{color:var(--danger)}.txb-tools{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:12px}.txb-tools button{min-height:33px;font-size:12px}#txb-url-form{display:flex;gap:8px;padding:10px;margin:-4px 0 12px;border-radius:12px;background:var(--surface)}#txb-url-form[hidden],#txb-preview[hidden]{display:none}#txb-url-form .txb-input{height:38px}.txb-preview{padding:13px;margin-bottom:14px;border:1px solid var(--blue);border-radius:14px;background:var(--focus)}.txb-preview h3{margin:0 0 4px;font-size:14px}.txb-preview p{margin:3px 0;color:var(--muted);font-size:12px;line-height:1.45}.txb-preview-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}.txb-heading{display:flex;align-items:center;justify-content:space-between;margin:0 2px 8px}.txb-heading h2{margin:0;font-size:14px}.txb-count{padding:2px 8px;border-radius:99px;color:var(--muted);background:var(--surface);font-size:12px}.txb-list{display:flex;flex-direction:column;gap:6px}.txb-item{min-height:42px;display:flex;align-items:center;justify-content:space-between;gap:12px;padding:7px 8px 7px 12px;border:1px solid var(--border);border-radius:12px}.txb-item:hover{background:var(--surface)}.txb-word{min-width:0;overflow-wrap:anywhere;font-size:14px}.txb-remove{min-height:30px;padding:0 9px;border:0;border-radius:99px;color:var(--danger);background:transparent;font-size:12px;font-weight:700;cursor:pointer}.txb-remove:hover{background:rgba(244,33,46,.1)}.txb-empty{padding:26px 14px;border:1px dashed var(--border);border-radius:14px;text-align:center}.txb-empty strong{display:block;font-size:14px}.txb-empty span{color:var(--muted);font-size:12px}.txb-footer{padding:12px 20px;border-top:1px solid var(--border);color:var(--muted);font-size:11px;text-align:center}.txb-sr{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}#txb-overlay button:focus-visible{outline:3px solid var(--focus);outline-offset:2px}@keyframes txbFade{from{opacity:0}}@keyframes txbIn{from{opacity:0;transform:translateY(8px) scale(.985)}}@media(max-width:520px){#txb-overlay{align-items:flex-end;padding:0}#txb-dialog{width:100%;max-height:92dvh;border-radius:22px 22px 0 0}.txb-status{grid-template-columns:1fr}.txb-card{min-height:66px}}@media(prefers-reduced-motion:reduce){#txb-overlay,#txb-dialog{animation:none}.txb-switch:after{transition:none}}
        `;
        // Keep even generic control states inside the userscript panel.
        style.textContent = style.textContent.replace(
            'button:disabled{',
            '#txb-overlay button:disabled{'
        );
        style.textContent += `
#txb-floating-counter{--txb-float-bg:rgba(255,255,255,.96);--txb-float-text:#0f1419;--txb-float-muted:#536471;position:fixed;left:50%;bottom:32px;z-index:2147483645;display:flex;align-items:center;gap:10px;padding:10px 14px;border:1px solid rgba(15,20,25,.12);border-radius:999px;color:var(--txb-float-text);background:var(--txb-float-bg);box-shadow:0 8px 28px rgba(0,0,0,.22);pointer-events:none;font-family:TwitterChirp,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;animation:txbFloatNotice 1s cubic-bezier(.2,.8,.2,1) both;backdrop-filter:blur(10px)}#txb-floating-counter[data-theme=dark]{--txb-float-bg:rgba(21,32,43,.96);--txb-float-text:#f7f9f9;--txb-float-muted:#8b98a5;border-color:rgba(255,255,255,.14)}.txb-floating-label{color:var(--txb-float-muted);font-size:12px;font-weight:650}.txb-floating-total{font-size:16px;font-weight:800}.txb-floating-delta{padding:3px 8px;border-radius:999px;color:#007a51;background:rgba(0,186,124,.14);font-size:13px;font-weight:850}@keyframes txbFloatNotice{0%{opacity:0;transform:translate(-50%,12px) scale(.96)}14%,78%{opacity:1;transform:translate(-50%,0) scale(1)}100%{opacity:0;transform:translate(-50%,-7px) scale(.98)}}.txb-card-wide{grid-column:1/-1;min-height:60px}.txb-compact-settings{grid-column:1/-1;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.txb-compact-settings .txb-card{min-width:0;min-height:66px;padding:10px}.txb-compact-settings .txb-value{font-size:15px}.txb-heading-actions{display:flex;align-items:center;gap:6px}.txb-clear-keywords{padding:2px 7px;border:0;border-radius:99px;color:var(--danger);background:transparent;font:inherit;font-size:11px;font-weight:700;cursor:pointer}.txb-clear-keywords:hover{background:rgba(244,33,46,.1)}@media(max-width:520px){#txb-floating-counter{bottom:82px;max-width:calc(100vw - 24px)}.txb-compact-settings{gap:8px}.txb-compact-settings .txb-card{padding:9px}}@media(prefers-reduced-motion:reduce){#txb-floating-counter{animation:none}}
        `;
        style.textContent += `.txb-select{min-width:142px;height:34px;padding:0 28px 0 10px;border:1px solid var(--border);border-radius:10px;outline:0;color:var(--text);background:var(--bg);font:inherit;font-size:13px;cursor:pointer}.txb-select:focus{border-color:var(--blue);box-shadow:0 0 0 3px var(--focus)}`;
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
        document.getElementById('txb-floating-counter')?.remove();
    };
    const showFloatingNotice = () => {
        state.floatingBatchTimer = null;
        if (!state.floatingNotice || state.floatingDelta === 0) return;

        injectStyles();
        const previous = document.getElementById('txb-floating-counter');
        const delta = state.floatingDelta + Number(previous?.dataset.delta || 0);
        state.floatingDelta = 0;
        previous?.remove();
        if (state.floatingHideTimer !== null) clearTimeout(state.floatingHideTimer);

        const counter = document.createElement('div');
        counter.id = 'txb-floating-counter';
        counter.dataset.theme = darkPage() ? 'dark' : 'light';
        counter.dataset.delta = String(delta);
        counter.setAttribute('role', 'status');
        counter.setAttribute('aria-live', 'polite');
        counter.setAttribute('aria-label', t('floating_aria', { total: formatNumber(state.total), delta: formatNumber(delta) }));

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
        document.body.appendChild(counter);

        state.floatingHideTimer = window.setTimeout(() => {
            counter.remove();
            state.floatingHideTimer = null;
        }, 1000);
    };
    const scheduleFloatingNotice = (delta) => {
        if (!state.floatingNotice) return;
        state.floatingDelta += delta;
        if (state.floatingBatchTimer !== null) clearTimeout(state.floatingBatchTimer);
        state.floatingBatchTimer = window.setTimeout(showFloatingNotice, 120);
    };
    const notify = (message, kind = 'info') => {
        if (!ui) return;
        ui.message.textContent = message;
        ui.message.dataset.kind = kind;
    };
    const updateEnabled = () => {
        ui.toggle.setAttribute('aria-checked', String(state.enabled));
        ui.enabled.textContent = state.enabled ? t('active') : t('paused');
    };
    const updateFloatingNoticeSetting = () => {
        ui.noticeToggle.setAttribute('aria-checked', String(state.floatingNotice));
        ui.noticeStatus.textContent = state.floatingNotice ? t('on') : t('off');
    };
    const updateUserIdFilterSetting = () => {
        ui.userIdToggle.setAttribute('aria-checked', String(state.filterUserId));
        ui.userIdStatus.textContent = state.filterUserId ? t('on') : t('off');
    };
    const updatePromotedSetting = () => {
        ui.promotedToggle.setAttribute('aria-checked', String(state.blockPromoted));
        ui.promotedStatus.textContent = state.blockPromoted ? t('on') : t('off');
    };
    const renderList = () => {
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
        for (const keyword of state.keywords) {
            const row = document.createElement('div');
            row.className = 'txb-item';
            const word = document.createElement('span');
            word.className = 'txb-word';
            word.textContent = keyword;
            const remove = document.createElement('button');
            remove.type = 'button';
            remove.className = 'txb-remove';
            remove.textContent = t('delete');
            remove.setAttribute('aria-label', t('delete_keyword_aria', { keyword }));
            remove.onclick = () => {
                state.keywords = state.keywords.filter((item) => keyOf(item) !== keyOf(keyword));
                saveKeywords();
                renderList();
                reapply();
                notify(t('deleted_keyword', { keyword }), 'success');
            };
            row.append(word, remove);
            ui.list.appendChild(row);
        }
    };
    const addKeyword = (value) => {
        const keyword = clean(value);
        if (!keyword) return notify(t('enter_keyword'), 'error'), false;
        if (keyword.length > MAX_LENGTH) return notify(t('keyword_too_long', { max: MAX_LENGTH }), 'error'), false;
        if (state.keywords.length >= MAX_KEYWORDS) return notify(t('keyword_limit', { max: formatNumber(MAX_KEYWORDS) }), 'error'), false;
        if (state.keywords.some((item) => keyOf(item) === keyOf(keyword))) {
            return notify(t('keyword_exists', { keyword }), 'error'), false;
        }
        state.keywords.push(keyword);
        saveKeywords();
        renderList();
        reapply();
        notify(t('added_keyword', { keyword }), 'success');
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
    const hidePreview = () => {
        ui.preview.hidden = true;
        ui.preview.replaceChildren();
    };
    const applyImport = (keywords, replace) => {
        state.keywords = normalizeKeywords(replace ? keywords : [...state.keywords, ...keywords]);
        saveKeywords();
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
        ui.preview.append(title, summary, warning, actions);
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
        try {
            request = GM_xmlhttpRequest({
                method: 'GET',
                url: url.href,
                headers: { Accept: 'text/plain, text/*;q=0.9, */*;q=0.1' },
                anonymous: true,
                timeout: 10000,
                onprogress: (progress) => {
                    if (Number(progress.loaded) <= MAX_FILE_BYTES || settled) return;
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
                    if (finalUrl.protocol !== 'https:') return fail(remoteError('insecure_redirect'));
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
            if (url.protocol !== 'https:') throw new Error('HTTPS required');
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
    const resetCounter = () => {
        if (!confirm(t('reset_confirm'))) return;
        state.total = 0;
        saveStats(); updateStats(); notify(t('reset_success'), 'success');
    };
    const clearAllKeywords = () => {
        const count = state.keywords.length;
        if (!count) return notify(t('clear_none'), 'error');
        if (!confirm(t('clear_confirm', { count: formatNumber(count) }))) return;
        state.keywords = [];
        saveKeywords();
        renderList();
        reapply();
        notify(t('clear_success', { count: formatNumber(count) }), 'success');
    };
    const closeModal = () => {
        document.getElementById('txb-overlay')?.remove();
        document.body.style.overflow = previousOverflow;
        ui = null;
        if (previousFocus instanceof HTMLElement && previousFocus.isConnected) previousFocus.focus();
    };
    const dialogKeys = (event) => {
        if (event.key === 'Escape') return event.preventDefault(), closeModal();
        if (event.key !== 'Tab') return;
        const items = [...ui.dialog.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled])')]
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
        overlay.innerHTML = `<section id="txb-dialog" role="dialog" aria-modal="true" aria-labelledby="txb-title" aria-describedby="txb-description"><header class="txb-header"><div><p class="txb-eyebrow">X Keyword Blocker</p><h1 id="txb-title">${t('title')}</h1><p id="txb-description" class="txb-subtitle">${t('description')}</p></div><button id="txb-close" class="txb-icon" type="button" aria-label="${t('close')}">×</button></header><div class="txb-content"><div class="txb-status"><div class="txb-card"><div><span class="txb-label">${t('filter_status')}</span><strong id="txb-enabled" class="txb-value"></strong></div><button id="txb-toggle" class="txb-switch" type="button" role="switch" aria-label="${t('filter_toggle_aria')}"></button></div><div class="txb-card"><div><span class="txb-label">${t('total_blocked')}</span><strong class="txb-value"><span id="txb-total">0</span>${t('posts_unit')}</strong></div><button id="txb-reset" type="button">${t('reset')}</button></div></div><form id="txb-add" class="txb-form"><label class="txb-sr" for="txb-input">${t('new_keyword')}</label><input id="txb-input" class="txb-input" maxlength="${MAX_LENGTH}" autocomplete="off" placeholder="${t('keyword_placeholder')}"><button class="txb-primary" type="submit">${t('add')}</button></form><p id="txb-message" role="status" aria-live="polite">${t('input_hint')}</p><div class="txb-tools"><button id="txb-file" class="txb-secondary" type="button">${t('import_file')}</button><button id="txb-url" class="txb-secondary" type="button" aria-expanded="false">${t('import_url')}</button><button id="txb-export" class="txb-secondary" type="button">${t('export_txt')}</button><input id="txb-file-input" class="txb-sr" type="file" accept=".txt,text/plain"></div><form id="txb-url-form" hidden><label class="txb-sr" for="txb-url-input">${t('url_label')}</label><input id="txb-url-input" class="txb-input" type="url" placeholder="https://example.com/keywords.txt"><button id="txb-url-submit" class="txb-primary">${t('read')}</button></form><section id="txb-preview" class="txb-preview" aria-label="${t('preview_aria')}" hidden></section><div class="txb-heading"><h2>${t('blocked_words')}</h2><span id="txb-count" class="txb-count">0</span></div><div id="txb-list" class="txb-list"></div></div><footer class="txb-footer">${t('shortcut_footer')}</footer></section>`;
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
        compactSettings.append(userIdCard, promotedCard);
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
        ui = { overlay, dialog: $('#txb-dialog'), input: $('#txb-input'), message: $('#txb-message'), list: $('#txb-list'), count: $('#txb-count'), clearKeywords: $('#txb-clear-keywords'), toggle: $('#txb-toggle'), enabled: $('#txb-enabled'), total: $('#txb-total'), noticeToggle: $('#txb-notice-toggle'), noticeStatus: $('#txb-notice-status'), userIdToggle: $('#txb-user-id-toggle'), userIdStatus: $('#txb-user-id-status'), promotedToggle: $('#txb-promoted-toggle'), promotedStatus: $('#txb-promoted-status'), languageSelect: $('#txb-language'), fileInput: $('#txb-file-input'), urlButton: $('#txb-url'), urlForm: $('#txb-url-form'), urlInput: $('#txb-url-input'), urlSubmit: $('#txb-url-submit'), preview: $('#txb-preview') };
        $('#txb-close').onclick = closeModal;
        overlay.onclick = (event) => { if (event.target === overlay) closeModal(); };
        overlay.onkeydown = dialogKeys;
        $('#txb-add').onsubmit = (event) => { event.preventDefault(); if (addKeyword(ui.input.value)) ui.input.value = ''; };
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
        ui.languageSelect.onchange = () => {
            state.language = ui.languageSelect.value;
            write(KEYS.language, state.language);
            closeModal();
            showModal();
        };
        $('#txb-reset').onclick = resetCounter;
        ui.clearKeywords.onclick = clearAllKeywords;
        $('#txb-export').onclick = exportTxt;
        $('#txb-file').onclick = () => ui.fileInput.click();
        ui.fileInput.onchange = () => { importFile(ui.fileInput.files?.[0]); ui.fileInput.value = ''; };
        ui.urlButton.onclick = () => { ui.urlForm.hidden = !ui.urlForm.hidden; ui.urlButton.setAttribute('aria-expanded', String(!ui.urlForm.hidden)); if (!ui.urlForm.hidden) ui.urlInput.focus(); };
        ui.urlForm.onsubmit = (event) => { event.preventDefault(); importUrl(ui.urlInput.value.trim()); };
        updateEnabled(); updateFloatingNoticeSetting(); updateUserIdFilterSetting(); updatePromotedSetting(); updateStats(); renderList();
        requestAnimationFrame(() => ui?.input.focus());
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
    document.querySelectorAll('article[data-testid="tweet"]').forEach(queue);
})();
