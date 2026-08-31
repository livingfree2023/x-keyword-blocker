# AGENTS

## Before committing or pushing

1. **Bump the version.**
   - `package.json` → `"version": "x.y.z"`
   - `x-keyword-blocker.js` → userscript header `// @version x.y.z`
   - Bump patch version (e.g. `1.5.3` → `1.5.4`) for normal changes; bump minor (or major) for breaking/feature releases.
   - Both files must stay in sync.
2. **Verify changes.**
   - `npm run check`
   - `npm test`
   - All tests must pass before committing.
3. Include the version bump in the same commit as the change it releases.