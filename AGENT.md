# AGENTS

## Project

- Single-file Tampermonkey / Violentmonkey userscript that blocks posts on X (Twitter) by keyword and promoted-post label.
- `x-keyword-blocker.js` — the userscript. Browsers-only UI code, plus exported pure helpers used by the tests.
- `x-keyword-blocker.test.js` — Node unit tests for the pure helpers.
- `package.json` — metadata and scripts. No runtime dependencies.

Useful commands:

- `npm run check` — syntax-check the userscript.
- `npm test` — run the unit tests.

## Before committing or pushing

1. **Review the changes.**
   - Run `git status` and `git diff`; confirm only intended files are staged.
   - Stage files explicitly. Never commit secrets, `.DS_Store`, build output, or unrelated files.
2. **Bump the version** (unless the task does not release a change):
   - Keep both in sync: `package.json` → `"version"` and `x-keyword-blocker.js` → `// @version`.
   - Use a patch bump (`x.y.z` → `x.y.z+1`) for fixes and small additions by default.
3. **Verify before committing:** `npm run check` and `npm test` must both pass.
4. **Commit only when asked,** with a short, imperative message matching repo history (e.g. `Add keyword hit stats`).
5. Include the version bump in the same commit as the change it releases.