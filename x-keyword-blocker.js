// ==UserScript==
// @name         Twitter / X 关键词屏蔽工具
// @namespace    https://github.com/
// @version      0.1
// @description  自动隐藏推特 (X.com) 包含指定关键词的推文，支持可视化管理菜单添加与删除关键词
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

    const STORAGE_KEY = 'twitter_blocked_keywords';
    const DEFAULT_KEYWORDS = ['广告', '推广', 'crypto', 'airdrop', '抽奖'];

    // 获取存储的关键词
    const getKeywords = () => {
        return GM_getValue(STORAGE_KEY, DEFAULT_KEYWORDS);
    };

    // 保存关键词
    const saveKeywords = (keywords) => {
        GM_setValue(STORAGE_KEY, keywords);
    };

    // 判断推文文本是否包含屏蔽词
    const containsBlockedKeyword = (text, keywords) => {
        if (!text || keywords.length === 0) return false;
        const normalizedText = text.toLowerCase();
        return keywords.some((keyword) =>
            normalizedText.includes(keyword.trim().toLowerCase())
        );
    };

    // 过滤推文节点
    const filterTweets = () => {
        const keywords = getKeywords();
        const articles = document.querySelectorAll('article[data-testid="tweet"]');

        articles.forEach((article) => {
            const tweetTextNode = article.querySelector('div[data-testid="tweetText"]');
            const tweetText = tweetTextNode ? tweetTextNode.innerText : '';

            const container = article.closest('div[data-testid="cellInnerDiv"]') || article;

            if (containsBlockedKeyword(tweetText, keywords)) {
                container.style.display = 'none';
            } else if (container.dataset.manuallyHidden !== 'true') {
                container.style.display = '';
            }
        });
    };

    // 重新扫描页面推文
    const reapplyFilter = () => {
        const articles = document.querySelectorAll('article[data-testid="tweet"]');
        articles.forEach((article) => {
            delete article.dataset.filteredChecked;
        });
        filterTweets();
    };

    // 监听动态推文加载
    const observer = new MutationObserver((mutations) => {
        let shouldCheck = false;
        for (const mutation of mutations) {
            if (mutation.addedNodes.length > 0) {
                shouldCheck = true;
                break;
            }
        }
        if (shouldCheck) {
            filterTweets();
        }
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });

    // 注入面板样式
    const injectStyles = () => {
        if (document.getElementById('tx-blocker-styles')) return;
        const style = document.createElement('style');
        style.id = 'tx-blocker-styles';
        style.textContent = `
            #tx-modal-overlay {
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background-color: rgba(0, 0, 0, 0.6);
                z-index: 999998;
                display: flex;
                align-items: center;
                justify-content: center;
            }
            #tx-modal-box {
                background: #ffffff;
                color: #0f1419;
                border-radius: 16px;
                padding: 24px;
                width: 420px;
                max-width: 90vw;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                z-index: 999999;
            }
            @media (prefers-color-scheme: dark) {
                #tx-modal-box {
                    background: #15202b;
                    color: #f7f9f9;
                    box-shadow: 0 10px 30px rgba(255,255,255,0.05);
                }
            }
            #tx-modal-title {
                font-size: 18px;
                font-weight: bold;
                margin-bottom: 16px;
                display: flex;
                justify-content: space-between;
                align-items: center;
            }
            #tx-modal-close {
                cursor: pointer;
                font-size: 20px;
                border: none;
                background: transparent;
                color: inherit;
            }
            #tx-input-container {
                display: flex;
                gap: 8px;
                margin-bottom: 16px;
            }
            #tx-keyword-input {
                flex: 1;
                padding: 8px 12px;
                border-radius: 9999px;
                border: 1px solid #cfd9de;
                outline: none;
                background: transparent;
                color: inherit;
            }
            #tx-keyword-input:focus {
                border-color: #1d9bf0;
            }
            #tx-add-btn {
                background-color: #1d9bf0;
                color: #ffffff;
                border: none;
                padding: 8px 16px;
                border-radius: 9999px;
                font-weight: bold;
                cursor: pointer;
            }
            #tx-add-btn:hover {
                background-color: #1a8cd8;
            }
            #tx-list-container {
                max-height: 240px;
                overflow-y: auto;
                display: flex;
                flex-direction: column;
                gap: 8px;
            }
            .tx-keyword-item {
                display: flex;
                justify-content: space-between;
                align-items: center;
                padding: 8px 12px;
                border-radius: 8px;
                background-color: rgba(128, 128, 128, 0.1);
            }
            .tx-keyword-text {
                word-break: break-all;
                font-size: 14px;
            }
            .tx-delete-btn {
                background: transparent;
                border: none;
                color: #f4212e;
                cursor: pointer;
                font-weight: bold;
                font-size: 14px;
                margin-left: 8px;
            }
        `;
        document.head.appendChild(style);
    };

    // 渲染关键词列表
    const renderList = (listContainer) => {
        listContainer.innerHTML = '';
        const keywords = getKeywords();

        if (keywords.length === 0) {
            const emptyTip = document.createElement('div');
            emptyTip.style.textAlign = 'center';
            emptyTip.style.padding = '12px';
            emptyTip.style.opacity = '0.6';
            emptyTip.innerText = '暂无屏蔽词';
            listContainer.appendChild(emptyTip);
            return;
        }

        keywords.forEach((keyword, index) => {
            const item = document.createElement('div');
            item.className = 'tx-keyword-item';

            const textSpan = document.createElement('span');
            textSpan.className = 'tx-keyword-text';
            textSpan.innerText = keyword;

            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'tx-delete-btn';
            deleteBtn.innerText = '删除';
            deleteBtn.onclick = () => {
                const currentKeywords = getKeywords();
                currentKeywords.splice(index, 1);
                saveKeywords(currentKeywords);
                renderList(listContainer);
                reapplyFilter();
            };

            item.appendChild(textSpan);
            item.appendChild(deleteBtn);
            listContainer.appendChild(item);
        });
    };

    // 显示配置面板
    const showConfigModal = () => {
        injectStyles();

        if (document.getElementById('tx-modal-overlay')) return;

        const overlay = document.createElement('div');
        overlay.id = 'tx-modal-overlay';

        const modalBox = document.createElement('div');
        modalBox.id = 'tx-modal-box';

        const titleBox = document.createElement('div');
        titleBox.id = 'tx-modal-title';
        titleBox.innerHTML = '<span>屏蔽关键词管理</span>';

        const closeBtn = document.createElement('button');
        closeBtn.id = 'tx-modal-close';
        closeBtn.innerHTML = '&times;';
        closeBtn.onclick = () => overlay.remove();
        titleBox.appendChild(closeBtn);

        const inputContainer = document.createElement('div');
        inputContainer.id = 'tx-input-container';

        const input = document.createElement('input');
        input.id = 'tx-keyword-input';
        input.type = 'text';
        input.placeholder = '输入新关键词...';

        const addBtn = document.createElement('button');
        addBtn.id = 'tx-add-btn';
        addBtn.innerText = '添加';

        const listContainer = document.createElement('div');
        listContainer.id = 'tx-list-container';

        const handleAdd = () => {
            const val = input.value.trim();
            if (!val) return;
            const currentKeywords = getKeywords();
            if (!currentKeywords.includes(val)) {
                currentKeywords.push(val);
                saveKeywords(currentKeywords);
                renderList(listContainer);
                reapplyFilter();
            }
            input.value = '';
        };

        addBtn.onclick = handleAdd;
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                handleAdd();
            }
        };

        inputContainer.appendChild(input);
        inputContainer.appendChild(addBtn);

        modalBox.appendChild(titleBox);
        modalBox.appendChild(inputContainer);
        modalBox.appendChild(listContainer);
        overlay.appendChild(modalBox);

        overlay.onclick = (e) => {
            if (e.target === overlay) {
                overlay.remove();
            }
        };

        document.body.appendChild(overlay);
        renderList(listContainer);
    };

    // 注册油猴扩展菜单命令
    GM_registerMenuCommand('管理屏蔽关键词', showConfigModal);

    // 初始执行一次
    filterTweets();
})();