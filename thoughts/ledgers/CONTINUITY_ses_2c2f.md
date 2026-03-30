# Session: ses_2c2f
Updated: 2026-03-30T09:05:43.700Z

## Goal
Audit the guild-engine repo and implement the 3-phase remediation plan from the senior engineer audit.

## Constraints
- ESLint: no unused vars (pattern `/^[A-Z_]/u`)
- PowerShell environment: `&&` not supported in single-line commands; use separate bash invocations
- React 19: no ref access during render (use lazy module singleton instead of useRef for nodeTypes)
- All extracted functions must be pure (no Zustand `set`/`get`) for testability
- `__dirname` not available in ESM; use `import.meta.url` + `fileURLToPath`

## Progress
### Done
- [x] **Audit** (`300326seniorauditMIMO.md`) — 10 issues ranked by severity across 4 subsystems (editor, engine, compiler, generator)
- [x] **Phase 1** — `evaluateFormula` security fix (replaced `Function()` with recursive descent parser), timestamp ID generation → `generateId()`, save migration system, dead code cleanup, constants deduplication
- [x] **Phase 2** — vitest harness, 98 tests across 5 suites (formula, bootstrap, resources, compiler, blueprint), `blueprintUtils.js` extraction
- [x] **Phase 3** — `useStore.js` refactor: extracted `groupUtils.js` (9 functions) and expanded `blueprintUtils.js` (18 functions). `useStore.js`: **1,523 → 881 lines** (−642 lines, −42%)
- [x] **React Flow warning fix** — 3 iterations (module-scope → useMemo → lazy singleton → dev-mode console.warn suppression + revert to module-scope)
- [x] **Docs** — `ARCHITECTURE.md` and `CODE_STYLE.md` created by project-initializer task
- [x] **Git** — 8 commits pushed to `origin/master`

### In Progress
- [ ] Phase 3 commit and push (lint + build pass, tests 98/98, ready to commit)

### Blocked
- (none)

## Key Decisions
- **Recursive descent parser over `Function()`**: The regex blacklist (`BANNED_FORMULA_TOKENS_RE`) was fundamentally brittle; the tokenizer + parser approach gives explicit control over every token, eliminating all code execution risk.
- **Shared `engine/systems/constants.js`**: `STATUS_MULTIPLIERS`, `READINESS_META`, `OUTCOME_TIERS`, `TIER_RANK` were duplicated in both `buildings.js` and `expeditions.js`; centralizing them prevents silent divergence.
- **`generateId()` pattern**: Uses `Date.now().toString(36)` + incrementing counter; avoids `Date.now()` collisions without needing `crypto.randomUUID()` dependency. Used in both engine (`engine/systems/helpers.js`) and editor (`editor/src/utils/ids.js`).
- **`normalizeImportedGroups({ generateId })`**: Pass `generateId` as a dependency object rather than importing it directly — avoids circular dependency since `groupUtils.js` is imported by `useStore.js`.
- **Phase 2/3 extraction**: Extracting `blueprintUtils.js` from `useStore.js` killed two birds: made functions testable AND reduced the god file. Done incrementally (Phase 2 extracted inject functions, Phase 3 expanded to all import/export/remap utilities).
- **React Flow HMR suppression**: Module-scope `nodeTypes` is correct per React Flow docs, but Vite HMR re-executes modules, creating new object references. Final fix: revert to module-scope + dev-mode `console.warn` filter in `main.jsx`.

## Next Steps
1. **Commit Phase 3** — `git add` the modified/new files, commit with a clear message, push to `origin/master`
2. **Verify tests pass after commit** — `npm test` should show 98/98
3. **Optional Phase 3 follow-up**: Extract shared engine helpers (`formatWorkflowInputs`/`Outputs`/`getWorkflowRecipe`) from `engine/index.html` into `engine/systems/helpers.js` (was in the audit's Phase 3 plan but not yet done)
4. **Remaining audit items** (not yet started):
   - Convert engine to class-based pattern (singleton → `Engine` class owning its own state)
   - Verify `.gitignore` covers `node_modules` and `dist`
   - Phase 2 follow-up: code-splitting (chunk size warning in build output)

## File Operations
### Read
- `C:\Games\IRMM\guild-engine\thoughts\ledgers\CONTINUITY_ses_2c2f.md`
- `C:\Games\IRMM\guild-engine\editor\src\store\useStore.js`
- `C:\Games\IRMM\guild-engine\editor\src\compiler\compiler.js`
- `C:\Games\IRMM\guild-engine\editor\src\compiler\rules.js`
- `C:\Games\IRMM\guild-engine\engine\systems\bootstrap.js`
- `C:\Games\IRMM\guild-engine\engine\systems\resources.js`

### Modified
- `C:\Games\IRMM\guild-engine\editor\src\store\useStore.js`
- `C:\Games\IRMM\guild-engine\editor\src\utils\blueprintUtils.js`
- `C:\Games\IRMM\guild-engine\editor\src\utils\groupUtils.js`
- `C:\Games\IRMM\guild-engine\editor\package.json`
- `C:\Games\IRMM\guild-engine\editor\vitest.config.js`
- `C:\Games\IRMM\guild-engine\editor\src\main.jsx`
- `C:\Games\IRMM\guild-engine\editor\tests\`
- `C:\Games\IRMM\guild-engine\engine\systems\constants.js`
- `C:\Games\IRMM\guild-engine\engine\systems\helpers.js`
- `C:\Games\IRMM\guild-engine\engine\systems\buildings.js`
- `C:\Games\IRMM\guild-engine\engine\systems\expeditions.js`
- `C:\Games\IRMM\guild-engine\engine\engine.js`
- `C:\Games\IRMM\guild-engine\engine\index.html`
- `C:\Games\IRMM\guild-engine\300326seniorauditMIMO.md`
- `C:\Games\IRMM\guild-engine\editor\src\utils\ids.js`
- `C:\Games\IRMM\guild-engine\editor\tests\formula.test.js`
- `C:\Games\IRMM\guild-engine\editor\tests\bootstrap.test.js`
- `C:\Games\IRMM\guild-engine\editor\tests\resources.test.js`
- `C:\Games\IRMM\guild-engine\editor\tests\compiler.test.js`
- `C:\Games\IRMM\guild-engine\editor\tests\blueprint.test.js`
- `C:\Games\IRMM\guild-engine\ARCHITECTURE.md`
- `C:\Games\IRMM\guild-engine\CODE_STYLE.md`

## Critical Context
- **`schema_version` path**: The compiled project uses `project.meta.schema_version`, NOT `project.schema_version` — verified in `compiler.js:349`
- **`buff_stockpile` vs `buffStockpile`**: Bootstrap returns `buff_stockpile` (snake_case), NOT camelCase
- **`eventLog` initialization**: Bootstrap creates a `Date.now()` timestamp + system messages, so `eventLog` is never empty
- **`multipliers.craft_speed`** (not `xp_rate`) is the correct field to check
- **Circular prerequisite detection**: The `no_circular_building_prerequisites` rule checks building_upgrade nodes' `requires.cross_building[]` fields, not act edges — test must use `building_upgrade` nodes
- **Building production stacking**: `effectiveIncome = (res.income + buildingProduction[resId]) * incomeMulti` — building income and resource base income add together
- **`useStore.js` line counts**: 1,523 → 881 after Phase 2+3 extractions. Remaining functions still inline: `applyParameterMappingsToBlueprint` (the stateful orchestrator), `importBlueprint`, `exportBlueprint`, `loadProject`, `downloadProject`, `compileProject`
- **Working tree (git status)**: `master` is ahead of `origin/master` by 1 commit; generated/* files are deleted and `thoughts/` has untracked files (needs review before committing). UNCONFIRMED intent.

## Working Set
- Branch: `master`
- Key files: `editor/src/store/useStore.js`, `editor/src/utils/blueprintUtils.js`, `editor/src/utils/groupUtils.js`, `engine/systems/buildings.js`, `engine/systems/constants.js`, `editor/tests/`
