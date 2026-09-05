const fs = require('node:fs');
const path = require('node:path');

const scriptPath = path.join(__dirname, 'x-keyword-blocker.js');
const metaPath = path.join(__dirname, 'x-keyword-blocker.meta.js');

const content = fs.readFileSync(scriptPath, 'utf8');
const match = content.match(/\/\/ ==UserScript==[\s\S]*?\/\/ ==\/UserScript==/);

if (!match) {
    console.error('Could not find ==UserScript== header block in x-keyword-blocker.js');
    process.exit(1);
}

fs.writeFileSync(metaPath, match[0] + '\n', 'utf8');
console.log('Generated x-keyword-blocker.meta.js successfully.');
