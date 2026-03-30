# Guild Engine — Senior Engineer Audit

**Auditor:** MIMO (opencode)
**Date:** March 30, 2026
**Schema Version:** 1.2.0

---

## What This Is

A **game authoring tool for incremental RPGs** with four major subsystems:
1. **Editor** — React 19 + Vite visual node graph editor (React Flow) for designing game systems
2. **Engine** — Vanilla JS runtime that executes the designed game at 4 ticks/sec
3. **Compiler** — 5-phase validator that checks a project against a 3,163-line JSON schema
4. **Generator** — Procedural content generation pipeline (3-pass)

It's a ~2-day-old project built at impressive speed. The codebase tells a story of rapid, well-organized prototyping.

---

## Architecture — The Good

**Schema-first design.** The JSON schema (`schema/project.schema.json`) is the single source of truth. Editor, compiler, and engine all reference it. This is smart — the schema *is* the game design contract.

**Clean separation of concerns.** The engine is pure vanilla JS with no framework coupling. The editor is React but doesn't share code with the engine. The compiler is a separate pipeline. This means you can ship the engine as a standalone runtime.

**Well-thought-out game systems.** The building workflow system (forge/apothecary/library) with success tables, failure behaviors, crit mechanics, momentum, streak bonuses, and formula evaluation is genuinely sophisticated. The output type taxonomy (5 types + 2 scoped) shows solid design thinking.

**Bootstrap state hydration** (`engine/systems/bootstrap.js`) is clean. It maps every node type to a runtime structure with sensible defaults.

**Blueprint system** with parameter injection is a strong feature for community sharing.

---

## Issues Found

### 1. No Tests — Anywhere
Zero test files. No test framework configured. For a system with formula evaluation, RNG resolution, and complex state transitions, this is the #1 risk. A single regression in `processBuildingTick` or the success table roll order could silently break every project.

### 2. Security: `evaluateFormula` is a Sandbox Escape Waiting to Happen
`buildings.js:37-38` — The formula evaluator uses regex blacklisting (`BANNED_FORMULA_TOKENS_RE`) instead of a proper sandbox. Regex blacklisting is fundamentally brittle. The `SAFE_FORMULA_CHARS_RE` allows `!` and `|` which means `eval()`-adjacent patterns could slip through. If user-authored formulas ever reach this path, this is an injection vector.

**Recommendation:** Use a proper expression parser (e.g., `expr-eval` or `mathjs`) or `new Function` with a frozen scope.

### 3. `useStore.js` is a 1,522-line God File
The Zustand store contains: graph state, ReactFlow handlers, node CRUD, blueprint import/export/remapping/parameter injection, group management, and semantic dependency resolution. This is the largest file in the editor and is doing 5+ distinct jobs.

**Recommendation:** Extract `blueprintUtils.js`, `parameterInjection.js`, `groupUtils.js`, and `nodeRemapping.js`.

### 4. Duplicate Logic Between Engine and Engine UI
The `engine/index.html` file is **2,000+ lines** of vanilla JS with duplicated logic from `engine.js`. Functions like `getWorkflowRecipe`, `getWorkflowQueueLimit`, `getWorkflowInputEntries`, `formatWorkflowInputs`, `formatWorkflowOutputs`, and `canQueueWorkflowJobUi` are re-implemented in the HTML renderer. These can drift from the engine source.

**Recommendation:** The engine UI should consume the snapshot + action API exclusively. Move formatting helpers to a shared module.

### 5. Duplicate Constants Across Files
`STATUS_MULTIPLIERS` is defined in both `buildings.js:6` and `expeditions.js:18` with the same values. `READINESS_META` is defined in both `expeditions.js:29` and `engine/index.html:346`. If someone changes one, the other won't update.

### 6. Dead Code in `renderHeroes`
`engine/index.html:954-998` — The `renderHeroes` function has a `return` on line 983, making lines 984-997 dead code. Looks like it was superseded by `renderHeroesV2` but the old version wasn't cleaned up.

### 7. ID Generation Uses Timestamps
`useStore.js:318` — `const id = \`${type}-${Date.now()}\`` and `engine.js:318` — `job-${Date.now()}-${Math.floor(Math.random() * 1000)}`. Rapid node creation or job queuing within the same millisecond will produce duplicate IDs. Use `crypto.randomUUID()` or a counter.

### 8. No Save Migration Strategy
The save system (`buildings.js` save/load) serializes raw state. There's no version field on saves and no migration path. If the schema changes (and it will), all existing saves become incompatible. Add a `_saveVersion` field and a migration function.

### 9. Engine is a Singleton Module
`engine.js:14-16` — `state`, `tickInterval`, and `renderCallback` are module-level singletons. You can only run one game at a time, and hot-reloading during dev will create orphaned intervals. Consider an Engine class that owns its own state.

### 10. `node_modules` and `dist` in the Tree?
The `repo_map.md` mentions `node_modules/` and `dist/` directories inside `editor/`. If these aren't gitignored, they'll bloat the repo. Check `.gitignore`.

---

## Pending Implementation (Per Docs)

- Tuning Utility tab (Formula Lab, XP Curves)
- Blueprint library UI (partially done via modals)
- Hero equipment UI (partially done in engine/index.html)
- Buff stockpile UI
- Pre-expedition preparation screen
- Enchanter/Stables buildings (`item_modifier`/`hero_modifier` output types)
- Community blueprint registry

---

## Verdict

This is a well-designed prototype with a clear architecture vision. The schema-first approach and formula-driven engine are strong foundations. The main risks are: **no tests**, **formula sandbox security**, **code duplication between engine and engine UI**, and the **massive store file**.

### Priority Fixes
1. Add a test harness for engine systems (especially formula evaluation and success table rolls)
2. Break up `useStore.js`
3. Deduplicate engine ↔ engine UI logic
4. Replace regex formula blacklisting with a proper expression evaluator
5. Add save versioning
