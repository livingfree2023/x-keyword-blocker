// ==UserScript==
// @name         Twitter / X 关键词屏蔽工具
// @namespace    https://github.com/
// @version      1.0.0
// @description  高效屏蔽包含指定关键词的帖子，支持统计、暂停、TXT 与网址导入导出
// @author       livingfree
// @match        https://twitter.com/*
// @match        https://x.com/*
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @run-at       document-idle
// ==/UserScript==

(function () {
    'use strict';

    const KEYS = {
        keywords: 'twitter_blocked_keywords',
        enabled: 'twitter_blocker_enabled',
        stats: 'twitter_blocker_stats_v1'
    };
    const DEFAULTS = ['广告', '推广', 'crypto', 'airdrop', '抽奖'];
    const MAX_KEYWORDS = 2000;
    const MAX_LENGTH = 100;
    const MAX_FILE_BYTES = 512 * 1024;
    const MAX_RECENT_IDS = 20000;

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

    // Pure helpers are testable without a browser or userscript manager.
    if (typeof process !== 'undefined' && process.versions?.node
        && typeof module !== 'undefined' && module.exports) {
        module.exports = { findBlockedKeyword, keyOf, normalizeKeywords, parseImportText };
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
    const recentIds = Array.isArray(stats?.recentIds)
        ? [...new Set(stats.recentIds.map(String).filter((id) => /^\d+$/.test(id)))].slice(-MAX_RECENT_IDS)
        : [];
    const state = {
        keywords: normalizeKeywords(Array.isArray(storedKeywords) ? storedKeywords : DEFAULTS),
        enabled: read(KEYS.enabled, true) !== false,
        total: Number.isSafeInteger(stats?.total) && stats.total >= 0 ? stats.total : 0,
        recentIds,
        recentSet: new Set(recentIds),
        revision: 0,
        statsTimer: null
    };
    if (JSON.stringify(storedKeywords) !== JSON.stringify(state.keywords)) {
        write(KEYS.keywords, state.keywords);
    }

    let ui = null;
    let previousFocus = null;
    let previousOverflow = '';
    const saveKeywords = () => write(KEYS.keywords, [...state.keywords]);
    const saveStats = () => {
        if (state.statsTimer !== null) clearTimeout(state.statsTimer);
        state.statsTimer = null;
        write(KEYS.stats, { total: state.total, recentIds: state.recentIds });
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
        if (ui) ui.total.textContent = state.total.toLocaleString();
    };
    const countPost = (article) => {
        const id = postId(article);
        if (!id || state.recentSet.has(id)) return;
        state.recentSet.add(id);
        state.recentIds.push(id);
        state.total += 1;
        while (state.recentIds.length > MAX_RECENT_IDS) {
            state.recentSet.delete(state.recentIds.shift());
        }
        updateStats();
        scheduleStatsSave();
    };
    const containerOf = (article) => article.closest('div[data-testid="cellInnerDiv"]') || article;
    const tweetText = (article) => Array.from(article.querySelectorAll('div[data-testid="tweetText"]'))
        .map((node) => node.innerText || node.textContent || '').join('\n');
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
        const signature = `${state.enabled}|${state.revision}|${postId(article) || ''}|${text}`;
        if (cache.get(article) === signature) return;
        cache.set(article, signature);
        const match = state.enabled ? findBlockedKeyword(text, state.keywords) : null;
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
    const notify = (message, kind = 'info') => {
        if (!ui) return;
        ui.message.textContent = message;
        ui.message.dataset.kind = kind;
    };
    const updateEnabled = () => {
        ui.toggle.setAttribute('aria-checked', String(state.enabled));
        ui.enabled.textContent = state.enabled ? '运行中' : '已暂停';
    };
    const renderList = () => {
        ui.list.replaceChildren();
        ui.count.textContent = state.keywords.length.toLocaleString();
        if (!state.keywords.length) {
            const empty = document.createElement('div');
            empty.className = 'txb-empty';
            empty.innerHTML = '<strong>还没有屏蔽词</strong><span>添加后会立即重新检查当前时间线。</span>';
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
            remove.textContent = '删除';
            remove.setAttribute('aria-label', `删除关键词 ${keyword}`);
            remove.onclick = () => {
                state.keywords = state.keywords.filter((item) => keyOf(item) !== keyOf(keyword));
                saveKeywords();
                renderList();
                reapply();
                notify(`已删除“${keyword}”`, 'success');
            };
            row.append(word, remove);
            ui.list.appendChild(row);
        }
    };
    const addKeyword = (value) => {
        const keyword = clean(value);
        if (!keyword) return notify('请输入一个关键词。', 'error'), false;
        if (keyword.length > MAX_LENGTH) return notify(`关键词不能超过 ${MAX_LENGTH} 个字符。`, 'error'), false;
        if (state.keywords.length >= MAX_KEYWORDS) return notify(`最多保存 ${MAX_KEYWORDS} 个关键词。`, 'error'), false;
        if (state.keywords.some((item) => keyOf(item) === keyOf(keyword))) {
            return notify(`“${keyword}”已经在列表中。`, 'error'), false;
        }
        state.keywords.push(keyword);
        saveKeywords();
        renderList();
        reapply();
        notify(`已添加“${keyword}”`, 'success');
        return true;
    };
    const exportTxt = () => {
        if (!state.keywords.length) return notify('当前没有可导出的关键词。', 'error');
        const url = URL.createObjectURL(new Blob([`${state.keywords.join('\n')}\n`], { type: 'text/plain;charset=utf-8' }));
        const link = document.createElement('a');
        link.href = url;
        link.download = `x-blocked-keywords-${new Date().toISOString().slice(0, 10)}.txt`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 0);
        notify(`已导出 ${state.keywords.length} 个关键词。`, 'success');
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
        notify(`导入完成，当前共有 ${state.keywords.length} 个关键词。`, 'success');
    };
    const previewImport = (text, source) => {
        if (!ui) return;
        const result = parseImportText(text);
        if (!result.keywords.length) return hidePreview(), notify('没有找到可导入的有效关键词。', 'error');
        const existing = new Set(state.keywords.map(keyOf));
        const newCount = result.keywords.filter((word) => !existing.has(keyOf(word))).length;
        ui.preview.replaceChildren();
        ui.preview.hidden = false;
        const title = document.createElement('h3');
        title.textContent = `检查导入内容 · ${source}`;
        const summary = document.createElement('p');
        summary.textContent = `识别到 ${result.keywords.length} 个，其中 ${newCount} 个尚未存在；忽略 ${result.blankCount} 个空行、${result.duplicateCount} 个重复项、${result.invalidCount} 个无效项。`;
        const warning = document.createElement('p');
        warning.textContent = '替换会删除当前列表；合并只添加缺少的项目。';
        const actions = document.createElement('div');
        actions.className = 'txb-preview-actions';
        [['合并导入', 'txb-primary', false], ['替换现有', 'txb-danger', true]].forEach(([label, className, replace]) => {
            const button = document.createElement('button');
            button.type = 'button'; button.className = className; button.textContent = label;
            button.onclick = () => applyImport(result.keywords, replace);
            actions.appendChild(button);
        });
        const cancel = document.createElement('button');
        cancel.type = 'button'; cancel.className = 'txb-secondary'; cancel.textContent = '取消'; cancel.onclick = hidePreview;
        actions.appendChild(cancel);
        ui.preview.append(title, summary, warning, actions);
        actions.firstElementChild.focus();
    };
    const importFile = async (file) => {
        if (!file) return;
        if (file.size > MAX_FILE_BYTES) return notify('文件过大，请选择不超过 512 KB 的文本文件。', 'error');
        try {
            previewImport(await file.text(), file.name);
            notify('文件读取成功，请确认导入方式。');
        } catch (error) {
            console.warn('[X Keyword Blocker] 文件导入失败', error);
            notify('无法读取这个文件。', 'error');
        }
    };
    const importUrl = async (value) => {
        let url;
        try {
            url = new URL(value);
            if (url.protocol !== 'https:') throw new Error('HTTPS required');
        } catch { return notify('请输入有效的 HTTPS 文本文件网址。', 'error'); }
        const submitButton = ui.urlSubmit;
        submitButton.disabled = true;
        submitButton.textContent = '读取中…';
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        try {
            const response = await fetch(url.href, { mode: 'cors', credentials: 'omit', signal: controller.signal });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const declaredSize = Number(response.headers.get('content-length'));
            if (Number.isFinite(declaredSize) && declaredSize > MAX_FILE_BYTES) throw new Error('too large');
            const text = await response.text();
            if (new Blob([text]).size > MAX_FILE_BYTES) throw new Error('too large');
            previewImport(text, url.hostname);
            notify('网址读取成功，请确认导入方式。');
        } catch (error) {
            console.warn('[X Keyword Blocker] 网址导入失败', error);
            notify(error.name === 'AbortError' ? '读取超时，请稍后重试。' : '无法读取。请使用允许跨域访问的 HTTPS 纯文本链接。', 'error');
        } finally {
            clearTimeout(timer);
            if (submitButton.isConnected) {
                submitButton.disabled = false;
                submitButton.textContent = '读取';
            }
        }
    };
    const resetCounter = () => {
        if (!confirm('将累计拦截数清零？关键词和过滤设置不会受影响。')) return;
        const ids = Array.from(document.querySelectorAll(
            'article[data-txb-hidden="true"], [data-txb-hidden="true"] article[data-testid="tweet"]'
        ))
            .map(postId).filter(Boolean).slice(-MAX_RECENT_IDS);
        state.total = 0;
        state.recentIds = [...new Set(ids)];
        state.recentSet = new Set(state.recentIds);
        saveStats(); updateStats(); notify('累计拦截数已清零。', 'success');
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
        const items = [...ui.dialog.querySelectorAll('button:not([disabled]),input:not([disabled])')]
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
        overlay.innerHTML = `<section id="txb-dialog" role="dialog" aria-modal="true" aria-labelledby="txb-title" aria-describedby="txb-description"><header class="txb-header"><div><p class="txb-eyebrow">X Keyword Blocker</p><h1 id="txb-title">关键词屏蔽</h1><p id="txb-description" class="txb-subtitle">管理时间线过滤规则与导入导出。</p></div><button id="txb-close" class="txb-icon" type="button" aria-label="关闭">×</button></header><div class="txb-content"><div class="txb-status"><div class="txb-card"><div><span class="txb-label">过滤状态</span><strong id="txb-enabled" class="txb-value"></strong></div><button id="txb-toggle" class="txb-switch" type="button" role="switch" aria-label="启用关键词过滤"></button></div><div class="txb-card"><div><span class="txb-label">累计拦截</span><strong class="txb-value"><span id="txb-total">0</span> 条</strong></div><button id="txb-reset" type="button">清零</button></div></div><form id="txb-add" class="txb-form"><label class="txb-sr" for="txb-input">新关键词</label><input id="txb-input" class="txb-input" maxlength="${MAX_LENGTH}" autocomplete="off" placeholder="输入要屏蔽的关键词…"><button class="txb-primary" type="submit">添加</button></form><p id="txb-message" role="status" aria-live="polite">每行一个关键词，匹配时不区分大小写。</p><div class="txb-tools"><button id="txb-file" class="txb-secondary" type="button">从文件导入</button><button id="txb-url" class="txb-secondary" type="button" aria-expanded="false">从网址导入</button><button id="txb-export" class="txb-secondary" type="button">导出 TXT</button><input id="txb-file-input" class="txb-sr" type="file" accept=".txt,text/plain"></div><form id="txb-url-form" hidden><label class="txb-sr" for="txb-url-input">HTTPS 文本网址</label><input id="txb-url-input" class="txb-input" type="url" placeholder="https://example.com/keywords.txt"><button id="txb-url-submit" class="txb-primary">读取</button></form><section id="txb-preview" class="txb-preview" aria-label="导入预览" hidden></section><div class="txb-heading"><h2>屏蔽词</h2><span id="txb-count" class="txb-count">0</span></div><div id="txb-list" class="txb-list"></div></div><footer class="txb-footer">快捷键 Alt + Shift + K · 设置仅保存在当前浏览器</footer></section>`;
        document.body.appendChild(overlay);
        document.body.style.overflow = 'hidden';
        const $ = (selector) => overlay.querySelector(selector);
        ui = { overlay, dialog: $('#txb-dialog'), input: $('#txb-input'), message: $('#txb-message'), list: $('#txb-list'), count: $('#txb-count'), toggle: $('#txb-toggle'), enabled: $('#txb-enabled'), total: $('#txb-total'), fileInput: $('#txb-file-input'), urlButton: $('#txb-url'), urlForm: $('#txb-url-form'), urlInput: $('#txb-url-input'), urlSubmit: $('#txb-url-submit'), preview: $('#txb-preview') };
        $('#txb-close').onclick = closeModal;
        overlay.onclick = (event) => { if (event.target === overlay) closeModal(); };
        overlay.onkeydown = dialogKeys;
        $('#txb-add').onsubmit = (event) => { event.preventDefault(); if (addKeyword(ui.input.value)) ui.input.value = ''; };
        ui.toggle.onclick = () => { state.enabled = !state.enabled; write(KEYS.enabled, state.enabled); updateEnabled(); reapply(); notify(state.enabled ? '关键词过滤已启用。' : '过滤已暂停，帖子已恢复显示。', 'success'); };
        $('#txb-reset').onclick = resetCounter;
        $('#txb-export').onclick = exportTxt;
        $('#txb-file').onclick = () => ui.fileInput.click();
        ui.fileInput.onchange = () => { importFile(ui.fileInput.files?.[0]); ui.fileInput.value = ''; };
        ui.urlButton.onclick = () => { ui.urlForm.hidden = !ui.urlForm.hidden; ui.urlButton.setAttribute('aria-expanded', String(!ui.urlForm.hidden)); if (!ui.urlForm.hidden) ui.urlInput.focus(); };
        ui.urlForm.onsubmit = (event) => { event.preventDefault(); importUrl(ui.urlInput.value.trim()); };
        updateEnabled(); updateStats(); renderList();
        requestAnimationFrame(() => ui?.input.focus());
    };

    GM_registerMenuCommand('管理屏蔽关键词', showModal);
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
