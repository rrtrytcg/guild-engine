# Session: ses_2c30
Updated: 2026-03-30T09:07:00.000Z

## Goal
Implement Batch 1 of the Screen Builder: add editor infrastructure for the `screens` view mode (store slice, toolbar toggle, view routing, shell component).

## Constraints
- ESLint: no unused vars (pattern `/^[A-Z_]/u`)
- PowerShell environment: `&&` not supported in single-line commands; use separate bash invocations
- React 19: no ref access during render (use lazy module singleton instead of useRef for nodeTypes)
- All extracted functions must be pure (no Zustand `set`/`get`) for testability
- `__dirname` not available in ESM; use `import.meta.url` + `fileURLToPath`

## Progress
### Done
- [x] **Phase 3 commit/push** (from previous session ses_2c2f) — `useStore.js` refactor complete, master up to date with origin
- [x] **Screen Builder design** (`2026-03-30-screen-builder-design.md`) — final
- [x] **Screen Builder plan** (`2026-03-30-screen-builder-plan.md`) — ready-for-batches, 9 batches

### In Progress
- [ ] **Batch 1: Editor Infrastructure for Screen View Mode** — store slice, viewMode state, toolbar toggle, App routing, ScreenBuilder shell

### Blocked
- (none)

## Key Decisions
- **Recursive descent parser over `Function()`** (carried from ses_2c2f): The regex blacklist was fundamentally brittle; the tokenizer + parser approach gives explicit control over every token, eliminating all code execution risk.
- **Shared `engine/systems/constants.js`** (carried): `STATUS_MULTIPLIERS`, `READINESS_META`, `OUTCOME_TIERS`, `TIER_RANK` centralized to prevent silent divergence.
- **`generateId()` pattern** (carried): Uses `Date.now().toString(36)` + incrementing counter; avoids `Date.now()` collisions without `crypto.randomUUID()`. Used in both engine and editor.
- **Separate `.screen.json` files**: Screen storage as individual files (not embedded in project.json), discovered by naming convention.
- **Native HTML5 drag-and-drop API**: No library dependency for widget reordering/reparenting.
- **Third view mode (`screens`)**: Added alongside existing `nodes` and `groups` in toolbar toggle.

## Next Steps
1. **Complete Batch 1** — finish `screenBuilderSlice.js`, `viewMode` state in `useStore.js`, `Screens` button in Toolbar, App routing to `ScreenBuilder`, `ScreenBuilder.jsx` shell + CSS
2. **Batch 2** — Widget Tree panel with context menu for add/duplicate/delete/wrap
3. **Batch 3** — Drag-and-drop reordering
4. **Batch 4** — Screen file loading & saving via IPC
5. **Batch 5** — Preview panel with `renderScreenToHTML`
6. **Batch 6** — Properties panel with `screenBuilderRegistry`
7. **Batch 7** — Toolbar & navigation integration
8. **Batch 8** — Validation & error handling
9. **Batch 9** — Build verification & final testing

## File Operations
### Read
- `C:\Games\IRMM\guild-engine\thoughts\ledgers\CONTINUITY_ses_2c2f.md`
- `C:\Games\IRMM\guild-engine\thoughts\shared\plans\2026-03-30-screen-builder-plan.md`
- `C:\Games\IRMM\guild-engine\thoughts\shared\designs\2026-03-30-screen-builder-design.md`

### Modified
- `C:\Games\IRMM\guild-engine\editor\src\App.jsx`
- `C:\Games\IRMM\guild-engine\editor\src\components\Toolbar.jsx`
- `C:\Games\IRMM\guild-engine\editor\src\store\useStore.js`

### Untracked (new files for Batch 1)
- `C:\Games\IRMM\guild-engine\editor\src\components\ScreenBuilder.jsx`
- `C:\Games\IRMM\guild-engine\editor\src\components\screenBuilder\`
- `C:\Games\IRMM\guild-engine\editor\src\hooks\useScreenFiles.js`
- `C:\Games\IRMM\guild-engine\editor\src\hooks\useScreenPreview.js`
- `C:\Games\IRMM\guild-engine\editor\src\hooks\useWidgetTree.js`
- `C:\Games\IRMM\guild-engine\editor\src\store\slices\`
- `C:\Games\IRMM\guild-engine\editor\src\utils\dragDropUtils.js`
- `C:\Games\IRMM\guild-engine\editor\src\utils\previewData.js`
- `C:\Games\IRMM\guild-engine\editor\src\utils\screenFiles.js`
- `C:\Games\IRMM\guild-engine\editor\src\utils\screenSchema.js`

### Tests Created
- `C:\Games\IRMM\guild-engine\editor\tests\drag-drop-utils.test.js`
- `C:\Games\IRMM\guild-engine\editor\tests\preview-data.test.js`
- `C:\Games\IRMM\guild-engine\editor\tests\screen-builder-shell.test.jsx`
- `C:\Games\IRMM\guild-engine\editor\tests\screen-builder-slice.test.js`
- `C:\Games\IRMM\guild-engine\editor\tests\screen-files.test.js`
- `C:\Games\IRMM\guild-engine\editor\tests\screen-schema.test.js`

## Critical Context
- **`schema_version` path**: The compiled project uses `project.meta.schema_version`, NOT `project.schema_version` — verified in `compiler.js:349`
- **`buff_stockpile` vs `buffStockpile`**: Bootstrap returns `buff_stockpile` (snake_case), NOT camelCase
- **`eventLog` initialization**: Bootstrap creates a `Date.now()` timestamp + system messages
- **`multipliers.craft_speed`** is the correct field (not `xp_rate`)
- **`useStore.js` line counts**: 1,523 → 881 after Phase 2+3 extractions
- **Screen Builder state shape**: `screenBuilder` slice with `screens[]`, `activeScreenId`, `selectedWidgetId`, `previewDataSource`, `mockData`, `isDirty`
- **View mode values**: `'nodes' | 'groups' | 'screens'` — third mode being added

## Working Set
- Branch: `master`
- Key files: `editor/src/store/useStore.js`, `editor/src/components/Toolbar.jsx`, `editor/src/App.jsx`, `editor/src/components/ScreenBuilder.jsx`, `thoughts/shared/plans/2026-03-30-screen-builder-plan.md`
