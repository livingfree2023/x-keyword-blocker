const test = require('node:test');
const assert = require('node:assert/strict');

const {
    findBlockedKeyword,
    keywordCountKey,
    keyOf,
    normalizeKeywordCounts,
    normalizeKeywords,
    splitKeywordInput,
    parseImportText,
    planKeywordAdditions,
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
} = require('./x-keyword-blocker.js');

test('matching ignores case and normalizes full-width characters', () => {
    assert.equal(findBlockedKeyword('A new CRYPTO project', ['crypto']), 'crypto');
    assert.equal(findBlockedKeyword('ＡＩＲＤＲＯＰ 开始了', ['airdrop']), 'airdrop');
    assert.equal(findBlockedKeyword('普通内容', ['广告']), null);
});

test('blank keywords can never match every post', () => {
    assert.equal(findBlockedKeyword('ordinary post', ['', '   ']), null);
});

test('keyword normalization trims and deduplicates case-insensitively', () => {
    assert.deepEqual(
        normalizeKeywords([' Crypto ', 'crypto', '', '广告', ' 广告 ']),
        ['Crypto', '广告']
    );
    assert.equal(keyOf(' ＣＲＹＰＴＯ '), 'crypto');
});

test('keyword count helpers normalize keys and reject invalid counts', () => {
    assert.equal(keywordCountKey(' ＣＲＹＰＴＯ '), 'crypto');
    assert.deepEqual(
        { ...normalizeKeywordCounts({ crypto: 3, 广告: 0, bad: -1, missing: 1.5, empty: Number.MAX_SAFE_INTEGER + 1 }) },
        { crypto: 3, 广告: 0 }
    );
    assert.equal(Object.getPrototypeOf(normalizeKeywordCounts({ crypto: 1 })), null);
});

test('keyword input splits lines and ignores blank lines', () => {
    assert.deepEqual(
        splitKeywordInput('crypto\r\n广告\n\nAirDrop  \n\n'),
        ['crypto', '广告', 'AirDrop']
    );
    assert.deepEqual(splitKeywordInput('   '), []);
    assert.deepEqual(splitKeywordInput(''), []);
});

test('TXT import reports blank, duplicate, and invalid lines', () => {
    const tooLong = 'x'.repeat(101);
    const result = parseImportText(`crypto\r\n广告\nCRYPTO\n\n${tooLong}`);
    assert.deepEqual(result.keywords, ['crypto', '广告']);
    assert.equal(result.blankCount, 1);
    assert.equal(result.duplicateCount, 1);
    assert.equal(result.invalidCount, 1);
});

test('user ID extraction accepts profile links but not post links', () => {
    assert.equal(userIdFromHref('/livingfree2023'), 'livingfree2023');
    assert.equal(userIdFromHref('/livingfree2023/'), 'livingfree2023');
    assert.equal(userIdFromHref('/livingfree2023/status/123'), '');
    assert.equal(userIdFromHref('https://x.com/livingfree2023'), '');
});

test('author search text includes display name and user ID', () => {
    const authorText = buildAuthorSearchText('曼曼处男无偿\n@qdcbtwnfxmtzjx', 'qdcbtwnfxmtzjx');
    assert.equal(findBlockedKeyword(authorText, ['处男无偿']), '处男无偿');
    assert.equal(findBlockedKeyword(authorText, ['@qdcbtwnfxmtzjx']), '@qdcbtwnfxmtzjx');
});

test('promoted labels are recognized across supported locales', () => {
    assert.equal(isPromotedLabelText('广告'), true);
    assert.equal(isPromotedLabelText('Promoted'), true);
    assert.equal(isPromotedLabelText('Sponsored'), true);
    assert.equal(isPromotedLabelText('普通帖子'), false);
});

test('promoted post blocking is independent from keyword matching', () => {
    assert.equal(resolveBlockedMatch('普通内容', [], true, true, '广告'), '广告');
    assert.equal(resolveBlockedMatch('普通内容', [], true, false, '广告'), null);
    assert.equal(resolveBlockedMatch('包含 crypto', ['crypto'], true, false, '广告'), 'crypto');
    assert.equal(resolveBlockedMatch('包含 crypto', ['crypto'], false, true, '广告'), null);
});

test('remote import helpers parse headers and report specific failures', () => {
    const headers = 'Content-Type: text/plain\r\nContent-Length: 368\r\n';
    assert.equal(responseHeader(headers, 'content-length'), '368');
    assert.equal(responseHeader(headers, 'missing'), '');
    assert.equal(remoteImportErrorMessage({ code: 'timeout' }), '读取超时，请稍后重试。');
    assert.equal(remoteImportErrorMessage({ code: 'http', status: 404 }), '服务器返回 HTTP 404，无法读取文件。');
});

test('interface language follows the saved preference or browser language', () => {
    assert.equal(resolveLocale('auto', 'zh-TW'), 'zh-CN');
    assert.equal(resolveLocale('auto', 'en-US'), 'en');
    assert.equal(resolveLocale('en', 'zh-CN'), 'en');
    assert.equal(translate('en', 'added_keyword', { keyword: 'crypto' }), 'Added “crypto”');
    assert.equal(translate('zh-CN', 'clear', {}), '清空');
});

test('keyword input handles CR-only line endings', () => {
    assert.deepEqual(splitKeywordInput('crypto\r广告\rtwitter'), ['crypto', '广告', 'twitter']);
    const result = parseImportText('crypto\r广告\r');
    assert.deepEqual(result.keywords, ['crypto', '广告']);
    assert.equal(result.blankCount, 1);
});

test('TXT import counts over-limit lines separately from invalid ones', () => {
    const filler = Array.from({ length: 2000 }, (_, index) => `word${index}`);
    const result = parseImportText([...filler, 'extra1', 'extra2', 'x'.repeat(101)].join('\n'));
    assert.equal(result.keywords.length, 2000);
    assert.equal(result.overLimitCount, 2);
    assert.equal(result.invalidCount, 1);
    assert.equal(result.blankCount, 0);
    assert.equal(result.duplicateCount, 0);
});

test('normalizeKeywords enforces the 2000-keyword limit and exact length bounds', () => {
    const many = Array.from({ length: 2050 }, (_, index) => `kw${index}`);
    assert.equal(normalizeKeywords(many).length, 2000);
    assert.deepEqual(normalizeKeywords(['x'.repeat(100)]), ['x'.repeat(100)]);
    assert.deepEqual(normalizeKeywords(['x'.repeat(101)]), []);
});

test('manual add planning deduplicates within the input and against the list', () => {
    assert.deepEqual(planKeywordAdditions(['crypto', 'crypto', 'CRYPTO', '广告'], ['crypto']), ['广告']);
    assert.deepEqual(planKeywordAdditions([], ['crypto']), []);
    assert.deepEqual(planKeywordAdditions(['  广告  '], []), ['广告']);
});

test('keyword count normalization is prototype-safe', () => {
    const result = normalizeKeywordCounts(JSON.parse('{"constructor":2,"crypto":3}'));
    assert.deepEqual({ ...result }, { constructor: 2, crypto: 3 });
    assert.equal(Object.getPrototypeOf(result), null);
});

test('import over-limit notice is localized', () => {
    assert.equal(
        translate('zh-CN', 'import_over_limit', { count: '2', max: '2,000' }),
        '另有 2 个关键词因达到 2,000 个的上限未导入。'
    );
    assert.equal(
        translate('en', 'import_over_limit', { count: '2', max: '2,000' }),
        '2 more keywords were skipped because the 2,000-keyword limit was reached.'
    );
});

test('todayDateKey formats dates as YYYY-MM-DD and handles fallback', () => {
    assert.equal(todayDateKey(new Date(2026, 8, 2)), '2026-09-02');
    assert.equal(todayDateKey(new Date(2026, 0, 5)), '2026-01-05');
    assert.equal(todayDateKey('2026-09-02'), '2026-09-02');
    assert.match(todayDateKey(), /^\d{4}-\d{2}-\d{2}$/);
    assert.match(todayDateKey(new Date('invalid')), /^\d{4}-\d{2}-\d{2}$/);
});

test('normalizeDailyCounts filters non-date keys, invalid counts, and is prototype-safe', () => {
    assert.deepEqual(
        { ...normalizeDailyCounts({ '2026-09-01': 5, '2026-09-02': 0, 'bad-key': 3, '2026-9-1': 2, negative: -1, float: 1.5 }) },
        { '2026-09-01': 5, '2026-09-02': 0 }
    );
    assert.deepEqual({ ...normalizeDailyCounts(null) }, {});
    assert.deepEqual({ ...normalizeDailyCounts([]) }, {});
    assert.deepEqual({ ...normalizeDailyCounts('string') }, {});
    assert.equal(Object.getPrototypeOf(normalizeDailyCounts({ '2026-09-01': 1 })), null);
    const protoObj = JSON.parse('{"__proto__":{"polluted":true},"2026-09-01":2,"constructor":10}');
    const result = normalizeDailyCounts(protoObj);
    assert.deepEqual({ ...result }, { '2026-09-01': 2 });
    assert.equal(result.polluted, undefined);
});

test('bumpDailyCount increments count for dateKey and defaults to today', () => {
    const initial = { '2026-09-01': 3 };
    const bumped = bumpDailyCount(initial, '2026-09-01');
    assert.deepEqual({ ...bumped }, { '2026-09-01': 4 });
    const newDay = bumpDailyCount(initial, '2026-09-02');
    assert.deepEqual({ ...newDay }, { '2026-09-01': 3, '2026-09-02': 1 });
    const today = todayDateKey();
    const bumpedToday = bumpDailyCount(initial);
    assert.equal(bumpedToday[today], 1);
    const bumpedDateObj = bumpDailyCount(initial, new Date(2026, 8, 2));
    assert.equal(bumpedDateObj['2026-09-02'], 1);
    const invalidKey = bumpDailyCount(initial, 'invalid-date');
    assert.deepEqual({ ...invalidKey }, { '2026-09-01': 3 });
});

test('pruneDailyCounts retains entries within keepDays window and prunes older entries', () => {
    const daily = {
        '2026-08-01': 10,
        '2026-08-20': 5,
        '2026-08-31': 2,
        '2026-09-01': 3,
        '2026-09-02': 4
    };
    const pruned30 = pruneDailyCounts(daily, 30, '2026-09-02');
    assert.deepEqual({ ...pruned30 }, {
        '2026-08-20': 5,
        '2026-08-31': 2,
        '2026-09-01': 3,
        '2026-09-02': 4
    });
    const pruned2 = pruneDailyCounts(daily, 2, '2026-09-02');
    assert.deepEqual({ ...pruned2 }, {
        '2026-08-31': 2,
        '2026-09-01': 3,
        '2026-09-02': 4
    });
    assert.deepEqual({ ...pruneDailyCounts({}, 30) }, {});
});

test('sumRecentDays calculates cumulative count within window and handles invalid inputs', () => {
    const daily = {
        '2026-08-26': 100,
        '2026-08-27': 1,
        '2026-09-01': 5,
        '2026-09-02': 7,
        '2026-09-03': 50
    };
    assert.equal(sumRecentDays(daily, 7, '2026-09-02'), 1 + 5 + 7);
    assert.equal(sumRecentDays(daily, 1, '2026-09-02'), 7);
    assert.equal(sumRecentDays(daily, 0, '2026-09-02'), 0);
    assert.equal(sumRecentDays(daily, -5, '2026-09-02'), 0);
    assert.equal(sumRecentDays({}, 7, '2026-09-02'), 0);
});

test('createBackupPayload produces standard backup JSON structure', () => {
    const payload = createBackupPayload({
        keywords: [' crypto ', 'crypto', 'airdrop'],
        enabled: false,
        language: 'en',
        blockPromoted: false,
        filterUserId: true,
        floatingNotice: false,
        total: 42,
        keywordCounts: { crypto: 10 },
        daily: { '2026-09-02': 5 }
    }, '1.6.0');
    assert.equal(payload.app, 'x-keyword-blocker');
    assert.equal(payload.version, '1.6.0');
    assert.match(payload.exportedAt, /^\d{4}-\d{2}-\d{2}T/);
    assert.deepEqual(payload.keywords, ['crypto', 'airdrop']);
    assert.deepEqual(payload.settings, {
        enabled: false,
        language: 'en',
        blockPromoted: false,
        filterUserId: true,
        floatingNotice: false,
        wholeWord: false,
        scope: 'all',
        displayMode: 'hide'
    });
    assert.equal(payload.stats.total, 42);
    assert.deepEqual({ ...payload.stats.keywordCounts }, { crypto: 10 });
    assert.deepEqual({ ...payload.stats.daily }, { '2026-09-02': 5 });
});

test('createBackupPayload applies sensible defaults when state is empty', () => {
    const payload = createBackupPayload(null);
    assert.equal(payload.app, 'x-keyword-blocker');
    assert.deepEqual(payload.keywords, []);
    assert.deepEqual(payload.settings, {
        enabled: true,
        language: 'auto',
        blockPromoted: true,
        filterUserId: false,
        floatingNotice: true,
        wholeWord: false,
        scope: 'all',
        displayMode: 'hide'
    });
    assert.equal(payload.stats.total, 0);
    assert.deepEqual({ ...payload.stats.keywordCounts }, {});
    assert.deepEqual({ ...payload.stats.daily }, {});
});

test('parseBackupPayload parses valid payload and validates schema', () => {
    const validRaw = {
        app: 'x-keyword-blocker',
        version: '1.6.0',
        keywords: ['crypto', '抽奖'],
        settings: { enabled: true, language: 'zh-CN', blockPromoted: true, filterUserId: false, floatingNotice: true },
        stats: { total: 10, keywordCounts: { crypto: 5 }, daily: { '2026-09-02': 3 } }
    };
    const resString = parseBackupPayload(JSON.stringify(validRaw));
    assert.equal(resString.valid, true);
    assert.deepEqual(resString.data.keywords, ['crypto', '抽奖']);
    assert.equal(resString.data.settings.language, 'zh-CN');
    assert.equal(resString.data.stats.total, 10);
    assert.equal(resString.data.stats.daily['2026-09-02'], 3);

    const resObj = parseBackupPayload(validRaw);
    assert.equal(resObj.valid, true);

    assert.deepEqual(parseBackupPayload('invalid json'), { valid: false, error: 'invalid_json' });
    assert.deepEqual(parseBackupPayload(null), { valid: false, error: 'invalid_app' });
    assert.deepEqual(parseBackupPayload({ app: 'other-app' }), { valid: false, error: 'invalid_app' });
    assert.deepEqual(parseBackupPayload([]), { valid: false, error: 'invalid_app' });
});

test('all TEXT translation keys are symmetrical between zh-CN and en', () => {
    const zhKeys = Object.keys(TEXT['zh-CN']).sort();
    const enKeys = Object.keys(TEXT.en).sort();
    assert.deepEqual(zhKeys, enKeys);
    assert.ok(zhKeys.includes('stats_today'));
    assert.ok(zhKeys.includes('stats_week'));
    assert.ok(zhKeys.includes('backup_export'));
    assert.ok(zhKeys.includes('backup_import'));
    assert.ok(zhKeys.includes('backup_confirm'));
    assert.ok(zhKeys.includes('backup_summary'));
    assert.ok(zhKeys.includes('backup_success'));
    assert.ok(zhKeys.includes('backup_invalid'));
    assert.ok(zhKeys.includes('expiry_set'));
    assert.ok(zhKeys.includes('expiry_permanent'));
    assert.ok(zhKeys.includes('expiry_24h'));
    assert.ok(zhKeys.includes('expiry_7d'));
    assert.ok(zhKeys.includes('expiry_30d'));
    assert.ok(zhKeys.includes('expiry_custom'));
    assert.ok(zhKeys.includes('expires_in'));
    assert.ok(zhKeys.includes('expired_notice'));
    assert.ok(zhKeys.includes('subs_title'));
    assert.ok(zhKeys.includes('subs_add'));
    assert.ok(zhKeys.includes('subs_sync_now'));
    assert.ok(zhKeys.includes('subs_sync_all'));
    assert.ok(zhKeys.includes('subs_syncing'));
    assert.ok(zhKeys.includes('subs_last_sync'));
    assert.ok(zhKeys.includes('subs_ok'));
    assert.ok(zhKeys.includes('subs_never'));
    assert.ok(zhKeys.includes('subs_due_hint'));
    assert.ok(zhKeys.includes('subs_empty'));
    assert.ok(zhKeys.includes('whole_word'));
    assert.ok(zhKeys.includes('whole_word_toggle_aria'));
    assert.ok(zhKeys.includes('scope'));
    assert.ok(zhKeys.includes('scope_all'));
    assert.ok(zhKeys.includes('scope_home'));
});

test('normalizeExpiryMap filters invalid entries and is prototype-safe', () => {
    const raw = {
        crypto: 1700000000000,
        '  AIRDROP  ': 1700000500000,
        badCount: -100,
        badFloat: 1700000000.5,
        badString: 'invalid',
        badZero: 0
    };
    const normalized = normalizeExpiryMap(raw);
    assert.deepEqual({ ...normalized }, {
        crypto: 1700000000000,
        airdrop: 1700000500000
    });
    assert.equal(Object.getPrototypeOf(normalized), null);
    assert.deepEqual({ ...normalizeExpiryMap(null) }, {});
    assert.deepEqual({ ...normalizeExpiryMap([]) }, {});
    assert.deepEqual({ ...normalizeExpiryMap('not an object') }, {});
});

test('calculateExpiry calculates correct epoch ms for predefined and custom durations', () => {
    const now = 1700000000000;
    assert.equal(calculateExpiry('permanent', null, now), null);
    assert.equal(calculateExpiry('24h', null, now), now + 24 * 3600 * 1000);
    assert.equal(calculateExpiry('7d', null, now), now + 7 * 86400 * 1000);
    assert.equal(calculateExpiry('30d', null, now), now + 30 * 86400 * 1000);
    assert.equal(calculateExpiry('custom', '3', now), now + 3 * 86400 * 1000);
    assert.equal(calculateExpiry('custom', '  10  ', now), now + 10 * 86400 * 1000);
    assert.equal(calculateExpiry('custom', '0', now), null);
    assert.equal(calculateExpiry('custom', '-5', now), null);
    assert.equal(calculateExpiry('custom', 'abc', now), null);
    const futureDate = '2099-12-31';
    const parsedTime = calculateExpiry('custom', futureDate, now);
    assert.ok(typeof parsedTime === 'number' && parsedTime > now);
});

test('formatRemainingTime formats remaining hours, days, and expired tags in zh and en', () => {
    const now = 1700000000000;
    assert.equal(formatRemainingTime(now + 3 * 86400000, now, 'zh-CN'), '剩 3天');
    assert.equal(formatRemainingTime(now + 3 * 86400000, now, 'en'), '3d left');
    assert.equal(formatRemainingTime(now + 12 * 3600000, now, 'zh-CN'), '剩 12小时');
    assert.equal(formatRemainingTime(now + 12 * 3600000, now, 'en'), '12h left');
    assert.equal(formatRemainingTime(now + 30 * 60000, now, 'zh-CN'), '剩 1小时');
    assert.equal(formatRemainingTime(now + 30 * 60000, now, 'en'), '1h left');
    assert.equal(formatRemainingTime(now, now, 'zh-CN'), '已过期');
    assert.equal(formatRemainingTime(now - 1000, now, 'en'), 'Expired');
    assert.equal(formatRemainingTime(null, now, 'zh-CN'), '');
});

test('pruneExpired boundary tests: exact expiration, unexpired, and orphan cleanup', () => {
    const now = 1700000000000;
    const keywords = ['exact', 'unexpired', 'permanent', 'past'];
    const expiryMap = {
        exact: now,
        unexpired: now + 1,
        past: now - 500,
        orphan: now + 5000
    };

    const result = pruneExpired(keywords, expiryMap, now);
    assert.deepEqual(result.keywords, ['unexpired', 'permanent']);
    assert.deepEqual(result.expired, ['exact', 'past']);
    assert.deepEqual({ ...result.expiryMap }, { unexpired: now + 1 });
    assert.equal(Object.getPrototypeOf(result.expiryMap), null);

    const emptyResult = pruneExpired([], {}, now);
    assert.deepEqual(emptyResult.keywords, []);
    assert.deepEqual(emptyResult.expired, []);
    assert.deepEqual({ ...emptyResult.expiryMap }, {});
});

test('createBackupPayload and parseBackupPayload handle keyword expiry table', () => {
    const payload = createBackupPayload({
        keywords: ['crypto', 'airdrop'],
        expiry: { crypto: 1700000000000 }
    });
    assert.deepEqual({ ...payload.expiry }, { crypto: 1700000000000 });

    const parsed = parseBackupPayload(JSON.stringify(payload));
    assert.equal(parsed.valid, true);
    assert.deepEqual({ ...parsed.data.expiry }, { crypto: 1700000000000 });

    const legacyPayload = {
        app: 'x-keyword-blocker',
        version: '1.5.0',
        keywords: ['crypto'],
        settings: { enabled: true }
    };
    const parsedLegacy = parseBackupPayload(JSON.stringify(legacyPayload));
    assert.equal(parsedLegacy.valid, true);
    assert.deepEqual({ ...parsedLegacy.data.expiry }, {});
});

test('isSubscriptionDue boundary tests: exact due, unexpired, never synced, and invalid inputs', () => {
    const now = 1700000000000;
    const oneHour = 3600 * 1000;

    // Exactly due (now - lastSyncAt === intervalHours * 3600 * 1000)
    assert.equal(isSubscriptionDue({ intervalHours: 24, lastSyncAt: now - 24 * oneHour }, now), true);
    // Not due yet (1ms before interval)
    assert.equal(isSubscriptionDue({ intervalHours: 24, lastSyncAt: now - 24 * oneHour + 1 }, now), false);
    // Overdue
    assert.equal(isSubscriptionDue({ intervalHours: 24, lastSyncAt: now - 25 * oneHour }, now), true);

    // Never synced (lastSyncAt: null, undefined, 0, or negative)
    assert.equal(isSubscriptionDue({ intervalHours: 12, lastSyncAt: null }, now), true);
    assert.equal(isSubscriptionDue({ intervalHours: 12, lastSyncAt: undefined }, now), true);
    assert.equal(isSubscriptionDue({ intervalHours: 12, lastSyncAt: 0 }, now), true);
    assert.equal(isSubscriptionDue({ intervalHours: 12, lastSyncAt: -100 }, now), true);

    // Negative diff (clock skewed, now < lastSyncAt)
    assert.equal(isSubscriptionDue({ intervalHours: 24, lastSyncAt: now + 5000 }, now), false);

    // Invalid subscription objects or non-objects
    assert.equal(isSubscriptionDue(null, now), false);
    assert.equal(isSubscriptionDue(undefined, now), false);
    assert.equal(isSubscriptionDue('not an object', now), false);
    assert.equal(isSubscriptionDue(12345, now), false);

    // Invalid / zero / negative intervalHours
    assert.equal(isSubscriptionDue({ intervalHours: 0, lastSyncAt: null }, now), false);
    assert.equal(isSubscriptionDue({ intervalHours: -5, lastSyncAt: null }, now), false);
    assert.equal(isSubscriptionDue({ intervalHours: 'invalid', lastSyncAt: null }, now), false);
    assert.equal(isSubscriptionDue({ intervalHours: NaN, lastSyncAt: null }, now), false);
});

test('normalizeSubscriptions validates HTTPS URLs, cleans names, clamps intervals, and is prototype-safe', () => {
    const raw = [
        {
            id: 'sub_1',
            url: 'https://example.com/keywords.txt',
            name: 'My Custom List',
            intervalHours: 12,
            lastSyncAt: 1700000000000,
            lastResult: { ok: true, added: 5, at: 1700000000000 }
        },
        {
            url: 'https://fallback-name.org/sub.txt'
        },
        {
            url: 'http://insecure.com/list.txt' // rejected: not https
        },
        {
            url: 'invalid-url' // rejected: not a url
        },
        {
            id: 'sub_dup',
            url: 'https://example.com/keywords.txt' // rejected: duplicate url
        },
        null,
        'string',
        {
            url: 'https://clamp-low.com/list.txt',
            intervalHours: -10
        },
        {
            url: 'https://clamp-high.com/list.txt',
            intervalHours: 9999
        },
        {
            url: 'https://error-res.com/list.txt',
            lastResult: { ok: false, code: 'timeout', at: 1700000000000 }
        }
    ];

    const result = normalizeSubscriptions(raw);
    assert.equal(result.length, 5);

    // Item 0: valid full object
    assert.equal(result[0].id, 'sub_1');
    assert.equal(result[0].url, 'https://example.com/keywords.txt');
    assert.equal(result[0].name, 'My Custom List');
    assert.equal(result[0].intervalHours, 12);
    assert.equal(result[0].lastSyncAt, 1700000000000);
    assert.deepEqual(result[0].lastResult, { ok: true, added: 5, at: 1700000000000 });

    // Item 1: default name and interval
    assert.ok(result[1].id.startsWith('sub_'));
    assert.equal(result[1].name, 'fallback-name.org');
    assert.equal(result[1].intervalHours, 24);
    assert.equal(result[1].lastSyncAt, null);
    assert.equal(result[1].lastResult, null);

    // Item 2: clamped low to 24 (invalid number)
    assert.equal(result[2].intervalHours, 24);

    // Item 3: clamped high to 720
    assert.equal(result[3].intervalHours, 720);

    // Item 4: error result preserved
    assert.deepEqual(result[4].lastResult, { ok: false, code: 'timeout', at: 1700000000000 });

    // Prototype safety
    const polluted = Object.create({ url: 'https://polluted.com/sub.txt' });
    assert.deepEqual(normalizeSubscriptions(polluted), []);
    assert.deepEqual(normalizeSubscriptions(null), []);
    assert.deepEqual(normalizeSubscriptions(undefined), []);
});

test('planSubscriptionMerge calculates additions, deduplicates, and reports over-limit truncation', () => {
    // Normal merge within capacity
    const plan1 = planSubscriptionMerge(['alpha', 'beta'], ['gamma'], 2000);
    assert.deepEqual(plan1.toAdd, ['alpha', 'beta']);
    assert.equal(plan1.overLimit, 0);
    assert.equal(plan1.totalNew, 2);

    // Deduplication within additions and against existing keywords (case-insensitive & NFKC)
    const plan2 = planSubscriptionMerge(['alpha', 'ALPHA', 'gamma', 'ＧＡＭＭＡ', 'delta'], ['gamma', 'zeta'], 2000);
    assert.deepEqual(plan2.toAdd, ['alpha', 'delta']);
    assert.equal(plan2.overLimit, 0);
    assert.equal(plan2.totalNew, 2);

    // Truncation when near MAX_KEYWORDS
    const existing = new Array(1998).fill(0).map((_, i) => 'kw' + i);
    const plan3 = planSubscriptionMerge(['new1', 'new2', 'new3', 'new4', 'new5'], existing, 2000);
    assert.deepEqual(plan3.toAdd, ['new1', 'new2']);
    assert.equal(plan3.overLimit, 3);
    assert.equal(plan3.totalNew, 5);

    // When already at max capacity
    const full = new Array(2000).fill(0).map((_, i) => 'full' + i);
    const plan4 = planSubscriptionMerge(['more1', 'more2'], full, 2000);
    assert.deepEqual(plan4.toAdd, []);
    assert.equal(plan4.overLimit, 2);
    assert.equal(plan4.totalNew, 2);
});

test('formatSyncTime handles relative time intervals and never-synced fallback in zh and en', () => {
    const now = 1700000000000;

    assert.equal(formatSyncTime(null, now, 'zh-CN'), '从未同步');
    assert.equal(formatSyncTime(0, now, 'en'), 'Never');
    assert.equal(formatSyncTime(-100, now, 'zh-CN'), '从未同步');
    assert.equal(formatSyncTime('invalid', now, 'en'), 'Never');

    assert.equal(formatSyncTime(now - 30 * 1000, now, 'zh-CN'), '刚刚');
    assert.equal(formatSyncTime(now - 30 * 1000, now, 'en'), 'just now');

    assert.equal(formatSyncTime(now - 10 * 60 * 1000, now, 'zh-CN'), '10分钟前');
    assert.equal(formatSyncTime(now - 10 * 60 * 1000, now, 'en'), '10m ago');

    assert.equal(formatSyncTime(now - 4 * 3600 * 1000, now, 'zh-CN'), '4小时前');
    assert.equal(formatSyncTime(now - 4 * 3600 * 1000, now, 'en'), '4h ago');

    assert.equal(formatSyncTime(now - 3 * 24 * 3600 * 1000, now, 'zh-CN'), '3天前');
    assert.equal(formatSyncTime(now - 3 * 24 * 3600 * 1000, now, 'en'), '3d ago');
});

test('createBackupPayload and parseBackupPayload handle subscriptions array', () => {
    const payload = createBackupPayload({
        keywords: ['crypto'],
        subscriptions: [
            {
                id: 'sub_test',
                url: 'https://example.com/subs.txt',
                name: 'Test Sub',
                intervalHours: 12,
                lastSyncAt: 1700000000000,
                lastResult: { ok: true, added: 3, at: 1700000000000 }
            }
        ]
    });
    assert.equal(payload.subscriptions.length, 1);
    assert.equal(payload.subscriptions[0].url, 'https://example.com/subs.txt');
    assert.equal(payload.subscriptions[0].name, 'Test Sub');

    const parsed = parseBackupPayload(JSON.stringify(payload));
    assert.equal(parsed.valid, true);
    assert.equal(parsed.data.subscriptions.length, 1);
    assert.equal(parsed.data.subscriptions[0].url, 'https://example.com/subs.txt');
    assert.equal(parsed.data.subscriptions[0].name, 'Test Sub');
    assert.equal(parsed.data.subscriptions[0].intervalHours, 12);
    assert.deepEqual(parsed.data.subscriptions[0].lastResult, { ok: true, added: 3, at: 1700000000000 });

    // Legacy backup payload without subscriptions
    const legacyPayload = {
        app: 'x-keyword-blocker',
        version: '1.5.0',
        keywords: ['crypto'],
        settings: { enabled: true }
    };
    const parsedLegacy = parseBackupPayload(JSON.stringify(legacyPayload));
    assert.equal(parsedLegacy.valid, true);
    assert.deepEqual(parsedLegacy.data.subscriptions, []);
});

test('matchesKeyword handles ASCII whole-word, substring, CJK, and mixed keywords', () => {
    // When wholeWord is false (substring matching)
    assert.equal(matchesKeyword('category theory', 'cat', false), true);
    assert.equal(matchesKeyword('bobcat in the wild', 'cat', false), true);
    assert.equal(matchesKeyword('普通广告内容', '广告', false), true);
    assert.equal(matchesKeyword('hello world', 'cat', false), false);

    // When wholeWord is true: ASCII words require word boundaries
    assert.equal(matchesKeyword('a cat in the hat', 'cat', true), true);
    assert.equal(matchesKeyword('cat is cute', 'cat', true), true);
    assert.equal(matchesKeyword('look at the cat', 'cat', true), true);
    assert.equal(matchesKeyword('hello cat!', 'cat', true), true);
    assert.equal(matchesKeyword('(cat) is here', 'cat', true), true);
    assert.equal(matchesKeyword('category theory', 'cat', true), false);
    assert.equal(matchesKeyword('bobcat in the wild', 'cat', true), false);
    assert.equal(matchesKeyword('scatting', 'cat', true), false);
    assert.equal(matchesKeyword('cat_dog', 'cat', true), false);
    assert.equal(matchesKeyword('cat123', 'cat', true), false);
    assert.equal(matchesKeyword('123cat', 'cat', true), false);

    // Multiple occurrences where earlier occurrence fails boundary but later passes
    assert.equal(matchesKeyword('category of cat', 'cat', true), true);

    // Non-ASCII (CJK) keywords always use substring matching even when wholeWord is true
    assert.equal(matchesKeyword('这是一条普通广告推文', '广告', true), true);
    assert.equal(matchesKeyword('无相关内容', '广告', true), false);

    // Mixed ASCII + CJK (contains non-ASCII) also falls back to substring matching
    assert.equal(matchesKeyword('最新web3空投活动', 'web3空投', true), true);

    // Normalization (case-insensitive & full-width NFKC)
    assert.equal(matchesKeyword('A new CRYPTO token', 'crypto', true), true);
    assert.equal(matchesKeyword('ＣＲＹＰＴＯ is here', 'crypto', true), true);

    // Invalid / empty inputs
    assert.equal(matchesKeyword('', 'cat', true), false);
    assert.equal(matchesKeyword('cat', '', true), false);
    assert.equal(matchesKeyword(null, 'cat', true), false);
    assert.equal(matchesKeyword('cat', null, true), false);
});

test('isHomePath correctly identifies home routes and rejects non-home routes', () => {
    // Home routes
    assert.equal(isHomePath(''), true);
    assert.equal(isHomePath('/'), true);
    assert.equal(isHomePath('/home'), true);
    assert.equal(isHomePath('/home/'), true);
    assert.equal(isHomePath('/home/for_you'), true);
    assert.equal(isHomePath('/home/following'), true);
    assert.equal(isHomePath('  /home  '), true);

    // Non-home routes
    assert.equal(isHomePath('/explore'), false);
    assert.equal(isHomePath('/notifications'), false);
    assert.equal(isHomePath('/messages'), false);
    assert.equal(isHomePath('/i/bookmarks'), false);
    assert.equal(isHomePath('/user_name'), false);
    assert.equal(isHomePath('/user_name/status/123456789'), false);
    assert.equal(isHomePath('/search'), false);
    assert.equal(isHomePath('/homestead'), false);

    // Invalid inputs
    assert.equal(isHomePath(null), false);
    assert.equal(isHomePath(undefined), false);
    assert.equal(isHomePath(123), false);
    assert.equal(isHomePath({}), false);
});

test('findBlockedKeyword and resolveBlockedMatch support whole-word matching', () => {
    const keywords = ['cat', 'airdrop'];

    // Substring mode (default)
    assert.equal(findBlockedKeyword('category', keywords, false), 'cat');
    assert.equal(resolveBlockedMatch('category', keywords, true, false, '', false), 'cat');

    // Whole word mode
    assert.equal(findBlockedKeyword('category', keywords, true), null);
    assert.equal(findBlockedKeyword('a cat in the hat', keywords, true), 'cat');
    assert.equal(resolveBlockedMatch('category', keywords, true, false, '', true), null);
    assert.equal(resolveBlockedMatch('a cat in the hat', keywords, true, false, '', true), 'cat');
});

test('createBackupPayload and parseBackupPayload handle wholeWord and scope settings', () => {
    const payload = createBackupPayload({
        settings: {
            enabled: true,
            language: 'zh-CN',
            blockPromoted: true,
            filterUserId: false,
            floatingNotice: true,
            wholeWord: true,
            scope: 'home',
            displayMode: 'collapse'
        }
    });
    assert.equal(payload.settings.wholeWord, true);
    assert.equal(payload.settings.scope, 'home');
    assert.equal(payload.settings.displayMode, 'collapse');

    const parsed = parseBackupPayload(JSON.stringify(payload));
    assert.equal(parsed.valid, true);
    assert.equal(parsed.data.settings.wholeWord, true);
    assert.equal(parsed.data.settings.scope, 'home');
    assert.equal(parsed.data.settings.displayMode, 'collapse');

    // Legacy backup defaults
    const legacy = parseBackupPayload(JSON.stringify({ app: 'x-keyword-blocker', version: '1.5.0' }));
    assert.equal(legacy.valid, true);
    assert.equal(legacy.data.settings.wholeWord, false);
    assert.equal(legacy.data.settings.scope, 'all');
    assert.equal(legacy.data.settings.displayMode, 'hide');
});

test('isPrivateHost identifies loopback, private IPv4/IPv6, internal domains, and public hosts', () => {
    // Localhost & internal TLDs
    assert.equal(isPrivateHost('localhost'), true);
    assert.equal(isPrivateHost('api.localhost'), true);
    assert.equal(isPrivateHost('test.local'), true);
    assert.equal(isPrivateHost('service.internal'), true);
    assert.equal(isPrivateHost('router.lan'), true);
    assert.equal(isPrivateHost('host.localdomain'), true);
    assert.equal(isPrivateHost('my.home.arpa'), true);

    // Private IPv4
    assert.equal(isPrivateHost('127.0.0.1'), true);
    assert.equal(isPrivateHost('127.255.255.254'), true);
    assert.equal(isPrivateHost('0.0.0.0'), true);
    assert.equal(isPrivateHost('10.0.0.1'), true);
    assert.equal(isPrivateHost('10.200.5.1'), true);
    assert.equal(isPrivateHost('172.16.0.1'), true);
    assert.equal(isPrivateHost('172.31.255.255'), true);
    assert.equal(isPrivateHost('192.168.1.1'), true);
    assert.equal(isPrivateHost('192.168.0.254'), true);
    assert.equal(isPrivateHost('169.254.169.254'), true); // AWS/Cloud metadata

    // Public IPv4 & boundary
    assert.equal(isPrivateHost('172.15.255.255'), false);
    assert.equal(isPrivateHost('172.32.0.1'), false);
    assert.equal(isPrivateHost('8.8.8.8'), false);
    assert.equal(isPrivateHost('1.1.1.1'), false);
    assert.equal(isPrivateHost('104.244.42.1'), false);

    // IPv6
    assert.equal(isPrivateHost('::1'), true);
    assert.equal(isPrivateHost('[::1]'), true);
    assert.equal(isPrivateHost('::'), true);
    assert.equal(isPrivateHost('fc00::1'), true);
    assert.equal(isPrivateHost('fd12:3456::1'), true);
    assert.equal(isPrivateHost('fe80::1'), true);
    assert.equal(isPrivateHost('::ffff:127.0.0.1'), true);
    assert.equal(isPrivateHost('::ffff:8.8.8.8'), false);
    assert.equal(isPrivateHost('2606:4700:4700::1111'), false);

    // Public domains
    assert.equal(isPrivateHost('x.com'), false);
    assert.equal(isPrivateHost('raw.githubusercontent.com'), false);
    assert.equal(isPrivateHost('example.com'), false);

    // Edge & invalid
    assert.equal(isPrivateHost(''), false);
    assert.equal(isPrivateHost(null), false);
    assert.equal(isPrivateHost(undefined), false);
});

test('matchesKeywordNormalized performs fast normalized matching with word boundary support', () => {
    // Substring
    assert.equal(matchesKeywordNormalized('hello world', 'world', false), true);
    assert.equal(matchesKeywordNormalized('hello world', 'cat', false), false);

    // Whole word ASCII
    assert.equal(matchesKeywordNormalized('category', 'cat', true), false);
    assert.equal(matchesKeywordNormalized('a cat here', 'cat', true), true);
    assert.equal(matchesKeywordNormalized('cat_dog', 'cat', true), false); // underscore is word char
    assert.equal(matchesKeywordNormalized('cat-dog', 'cat', true), true); // hyphen is non-word char

    // Non-ASCII fallback to substring
    assert.equal(matchesKeywordNormalized('币圈广告', '币圈', true), true);

    // Empty
    assert.equal(matchesKeywordNormalized('', 'cat', false), false);
    assert.equal(matchesKeywordNormalized('cat', '', false), false);
});

test('virtualPostId generates stable, deterministic IDs for promoted posts', () => {
    const id1 = virtualPostId('advertiser1', 'Special offer today only! Buy now.');
    const id2 = virtualPostId('advertiser1', 'Special offer today only! Buy now.');
    const id3 = virtualPostId('advertiser2', 'Special offer today only! Buy now.');
    const id4 = virtualPostId('advertiser1', 'Different text content here.');

    assert.ok(typeof id1 === 'string' && id1.startsWith('virtual_advertiser1_'));
    assert.equal(id1, id2, 'Same author and text produce identical virtual ID');
    assert.notEqual(id1, id3, 'Different author produces different virtual ID');
    assert.notEqual(id1, id4, 'Different text produces different virtual ID');

    assert.equal(virtualPostId('', ''), null);
    assert.equal(virtualPostId(null, null), null);
});

test('extractAuthorText strips time elements and status links while preserving name', () => {
    // Mock DOM node
    const createMockNode = () => {
        const removed = [];
        const timeNode = { textContent: '2h', remove: () => removed.push('time') };
        const linkNode = { textContent: 'Oct 12', remove: () => removed.push('status') };
        return {
            textContent: 'Alice @alice · 2h',
            cloneNode: () => ({
                textContent: 'Alice @alice · ',
                querySelectorAll: (selector) => {
                    if (selector.includes('time')) return [timeNode, linkNode];
                    return [];
                }
            })
        };
    };

    const mockNode = createMockNode();
    const result = extractAuthorText(mockNode);
    assert.equal(result, 'Alice @alice ·');

    // Fallback without cloneNode
    assert.equal(extractAuthorText({ textContent: 'Plain User' }), 'Plain User');
    assert.equal(extractAuthorText(null), '');
});

test('isSubscriptionDue enforces a 30-minute cooldown on failed syncs', () => {
    const now = 1700000000000;
    const sub = {
        intervalHours: 24,
        lastSyncAt: now - 25 * 3600 * 1000, // Due based on lastSyncAt
        lastResult: null
    };

    // Normally due
    assert.equal(isSubscriptionDue(sub, now), true);

    // Failed 10 minutes ago (< 30m) -> should NOT be due (cooldown active)
    sub.lastResult = { ok: false, code: 'network', at: now - 10 * 60 * 1000 };
    assert.equal(isSubscriptionDue(sub, now), false);

    // Failed 35 minutes ago (> 30m) -> should be due again
    sub.lastResult = { ok: false, code: 'network', at: now - 35 * 60 * 1000 };
    assert.equal(isSubscriptionDue(sub, now), true);

    // Last sync succeeded -> standard interval check applies
    sub.lastResult = { ok: true, added: 5, at: now - 10 * 60 * 1000 };
    assert.equal(isSubscriptionDue(sub, now), true);
});

test('translate handles prototype properties safely without throwing', () => {
    // Accessing toString / valueOf / constructor should fallback cleanly to key
    assert.equal(translate('zh-CN', 'toString'), 'toString');
    assert.equal(translate('en', 'valueOf'), 'valueOf');
    assert.equal(translate('en', 'constructor'), 'constructor');

    // Normal translation works
    assert.ok(translate('zh-CN', 'title').length > 0);

    // Interpolation with prototype property names in values
    const text = translate('zh-CN', 'subs_sync_success', { name: 'Test', added: 3 });
    assert.ok(text.includes('Test') && text.includes('3'));
});

test('parseRegexPattern and isRegexKeyword parse valid patterns and reject invalid ones', () => {
    // Valid patterns
    const r1 = parseRegexPattern('/crypto/i');
    assert.ok(r1 instanceof RegExp);
    assert.equal(r1.source, 'crypto');
    assert.equal(r1.flags, 'i');
    assert.equal(isRegexKeyword('/crypto/i'), true);

    // Strips global/sticky flags to prevent stateful test() issues
    const r2 = parseRegexPattern('/telegram/gims');
    assert.ok(r2 instanceof RegExp);
    assert.equal(r2.flags.includes('g'), false);
    assert.equal(r2.flags.includes('i'), true);
    assert.equal(r2.flags.includes('m'), true);
    assert.equal(r2.flags.includes('s'), true);

    // Advanced regex
    const r3 = parseRegexPattern('/(vx|微信|tg|t\\.me)[\\s:：]*\\w+/i');
    assert.ok(r3 instanceof RegExp);
    assert.ok(r3.test('联系tg: mychannel'));

    // Non-regex strings
    assert.equal(parseRegexPattern('crypto'), null);
    assert.equal(parseRegexPattern('/'), null);
    assert.equal(parseRegexPattern('//'), null);
    assert.equal(parseRegexPattern('not/a/regex'), null);
    assert.equal(isRegexKeyword('just a keyword'), false);

    // Invalid regex syntax
    assert.equal(parseRegexPattern('/(unclosed/'), null);
    assert.equal(parseRegexPattern('/valid/invalidflags123'), null);
});

test('validateRegexInput distinguishes valid regex, invalid regex syntax, and plain keywords', () => {
    // Valid regex
    const valid = validateRegexInput('/[0-9]{6}/i');
    assert.equal(valid.isRegex, true);
    assert.equal(valid.valid, true);

    // Broken regex
    const broken = validateRegexInput('/([a-z/i');
    assert.equal(broken.isRegex, true);
    assert.equal(broken.valid, false);
    assert.ok(typeof broken.error === 'string' && broken.error.length > 0);

    // Invalid flags
    const badFlags = validateRegexInput('/abc/xyz');
    assert.equal(badFlags.isRegex, true);
    assert.equal(badFlags.valid, false);

    // Plain text
    const plain = validateRegexInput('plain keyword');
    assert.equal(plain.isRegex, false);
    assert.equal(plain.valid, true);
});

test('findBlockedKeyword matches replies using regex rules alongside plain keywords', () => {
    const rules = [
        'airdrop',
        '/(telegram|t\\.me)[\\s:：]*\\S+/i',
        '/(vx|微信)[\\s:：]*\\w+/i',
        '/VIP[0-9]+/'
    ];

    // Hits plain keyword
    assert.equal(findBlockedKeyword('Join our airdrop today!', rules), 'airdrop');

    // Hits telegram regex
    assert.equal(findBlockedKeyword('Check comment for details: t.me/free_crypto', rules), '/(telegram|t\\.me)[\\s:：]*\\S+/i');
    assert.equal(findBlockedKeyword('Telegram: vip_group', rules), '/(telegram|t\\.me)[\\s:：]*\\S+/i');

    // Hits wechat regex
    assert.equal(findBlockedKeyword('私聊 微信：abc12345 领取资料', rules), '/(vx|微信)[\\s:：]*\\w+/i');

    // Case sensitive regex (no 'i' flag)
    assert.equal(findBlockedKeyword('Join vip123 now', rules), null);
    assert.equal(findBlockedKeyword('Join VIP123 now', rules), '/VIP[0-9]+/');

    // Safe when no match
    assert.equal(findBlockedKeyword('This is a completely normal tweet.', rules), null);
});

test('extractElementTextWithAlt includes img alt text for emojis and handles nested DOM', () => {
    // Mock DOM node with text and emoji img tags
    const mockRoot = {
        nodeType: 1,
        tagName: 'DIV',
        firstChild: {
            nodeType: 3,
            nodeValue: '看置顶 ',
            nextSibling: {
                nodeType: 1,
                tagName: 'IMG',
                getAttribute: (attr) => attr === 'alt' ? '👗' : null,
                nextSibling: {
                    nodeType: 3,
                    nodeValue: ' 加飞机 ',
                    nextSibling: {
                        nodeType: 1,
                        tagName: 'IMG',
                        getAttribute: (attr) => attr === 'alt' ? '✈️' : null,
                        nextSibling: null
                    }
                }
            }
        }
    };

    const extracted = extractElementTextWithAlt(mockRoot);
    assert.equal(extracted, '看置顶 👗 加飞机 ✈️');

    // Emoji-based regex matching works on extracted text
    const emojiRegex = parseRegexPattern('/(👗|👙|✈️)/');
    assert.ok(emojiRegex.test(extracted));
});
