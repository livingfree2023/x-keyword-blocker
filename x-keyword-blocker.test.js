const test = require('node:test');
const assert = require('node:assert/strict');

const {
    findBlockedKeyword,
    keyOf,
    normalizeKeywords,
    parseImportText
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
