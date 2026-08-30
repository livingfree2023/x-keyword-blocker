const test = require('node:test');
const assert = require('node:assert/strict');

const {
    findBlockedKeyword,
    keyOf,
    normalizeKeywords,
    parseImportText,
    userIdFromHref,
    buildAuthorSearchText
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
