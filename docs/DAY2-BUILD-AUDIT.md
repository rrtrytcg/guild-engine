# Guild Engine — Day 2 Build Audit
### March 29, 2026
### Ground-truth reconciliation: what the docs say vs. what's actually running

---

## Why this audit exists

The Day 2 Extended Deep Dive and the repo_map.md "Pending Implementation" list both
significantly understate the build state. The repo map lists `processBuildingTick`,
the Tuning Utility, and the Blueprint Library as pending. Screenshots and Claude Code
task summaries confirm all three are fully implemented and running.

This document is the corrected record. It supersedes the "Pending Implementation"
section in repo_map.md and the "What to build next" section in DAY2-DEEPDIVE.md.

---

## Audit Method

Cross-referenced four sources:
1. `repo_map.md` — file structure and self-reported status
2. `DAY2-DEEPDIVE.md` and `DAY2-EXTENDED-DEEPDIVE.md` — design session records
3. Claude Code task completion summary — runtime implementation details
4. Screenshots from live runtime and editor sessions

---

## RUNTIME ENGINE

### processBuildingTick
**Docs said:** ⏳ Pending  
**Actual:** ✅ IMPLEMENTED AND RUNNING

- File: `engine/systems/buildings.js`
- Wired into main loop: `engine/engine.js`
- Completion handler: `resolveWorkflowJobCompletion` in `buildings.js`
- UI wiring: `actions.queueWorkflowJob()` called from Forge screen click handler in `engine/index.html`
- Screenshot evidence: Forge screen showing active queue with live progress bar at 119.9/120.0s,
  "Queue job" button functional on Smelt Ore workflow

**What's implemented in the building tick:**
- Per-building queue processing each engine tick (250ms)
- Job progress counter incremented each tick
- On completion: `success_table` roll (failure → crit → success)
- `failure_behavior` applied (consume_inputs_no_output / partial_refund / reset_progress_refund_inputs)
- `crit_behavior` applied (double_output / quality_upgrade / rarity_upgrade / breakthrough / extend_duration)
- Artisan XP granted on completion
- Output routing: resource pool / item inventory / consumable stockpile / world_effect / hero_instance
- Next job pulled from queue automatically

**Runtime systems total — corrected count:**

| System | File | Status |
|---|---|---|
| Bootstrap | `bootstrap.js` | ✅ Running |
| Buildings | `buildings.js` | ✅ Running (was listed as pending) |
| Expeditions | `expeditions.js` | ✅ Running |
| Loot | `loot.js` | ✅ Running |
| Resources | `resources.js` | ✅ Running |

All 5 runtime systems implemented. Repo map's claim of "12 game systems" was counting
subsystems within these files (expedition resolver, boss phases, hero status effects,
XP/leveling, curse system, etc.) — those are all also running.

---

## EDITOR — TUNING UTILITY

### Formula Lab
**Docs said:** ⏳ Pending  
**Actual:** ✅ IMPLEMENTED

- File: `editor/src/components/TuningModal.jsx`
- Formula string input with live evaluation
- 6 variable sliders: Worker skill, Building level, Batch size, Item rarity tier,
  Streak count, Momentum
- "Show all variables" toggle
- Live result display (screenshot confirms: formula `base_duration_ticks * (1 - (worker_skill / 200))`
  with worker_skill=50 → result 60, calculated correctly)
- Copy formula to clipboard button

### XP Curves
**Docs said:** ⏳ Pending  
**Actual:** ✅ IMPLEMENTED

- Four curve shapes: Linear, Polynomial, Exponential, S-Curve
- Parameters: Coefficient, Exponent, Intercept (Polynomial mode shown)
- Per-level table with Designer Curve vs Reference comparison
- Reference curve: `100 * level^1.6` (current expedition spec)
- "Copy as JSON" button
- Screenshot confirms: Polynomial mode, table matching WIKI.md XP values exactly
  (Level 1: 100, Level 2: 303, Level 5: 1313, Level 10: 3981)

### Economy Sim
**Docs said:** ⏳ Pending  
**Actual:** ✅ IMPLEMENTED (partial — warns when no resource nodes present)

- Read-only 10-minute passive simulation
- Resource forecast table: Resource / After 1 Min / After 5 Min / After 10 Min
- "Recalculate" button
- Warnings section: shows "No visible resource nodes found" when canvas has no resource nodes
- Note: the simulation runs correctly — the warning in the screenshot is expected behavior
  when testing on a canvas without resource nodes, not a bug

**Known gap:** The Economy Sim currently runs against visible canvas nodes. It does not
yet simulate building workflow income (only passive resource base_income). This is a
scoped limitation, not a failure state.

### Upgrade Trees panel
**Docs said:** Designed, not built (in WIKI.md tuning section)  
**Actual:** ⚠️ STATUS UNCLEAR — not confirmed by screenshots or task summary

This is the one Tuning Utility panel not confirmed as implemented. Needs verification.

---

## EDITOR — BLUEPRINT LIBRARY

### Blueprint Library UI
**Docs said:** ⏳ Pending  
**Actual:** ✅ IMPLEMENTED

- File: `editor/src/components/BlueprintLibraryModal.jsx`
- Five tabs: Basic, Medium, Complex, Epic, Yours
- Card format: complexity badge, node count, edge count, title, description, node type tags
- "Drop onto canvas" button functional
- Screenshot confirms: Basic tab shows Smelt (5 nodes, 3 edges), Brew (5 nodes, 3 edges),
  Research (4 nodes, 2 edges) — all with correct node type tag chips

### Blueprint Files
**Docs said:** Architecture specced  
**Actual:** ✅ IMPLEMENTED — full three-tier library

```
editor/src/blueprints/
├── mine-standard.blueprint.json
├── basic/
│   ├── brew.blueprint.json          ← Apothecary starter (streak bonus)
│   ├── research.blueprint.json      ← Library starter (momentum)
│   └── smelt.blueprint.json         ← Forge starter
├── medium/
│   ├── apothecary-chain.blueprint.json
│   ├── forge-chain.blueprint.json
│   └── library-chain.blueprint.json
└── complex/
    ├── apothecary-system.blueprint.json   ← 14 nodes, 15 edges
    ├── forge-system.blueprint.json        ← 16 nodes, 17 edges
    └── library-system.blueprint.json      ← 11 nodes, 10 edges
```

Screenshot confirms Complex tab: Forge System (16n/17e), Apothecary System (14n/15e),
Library System (11n/10e) — matching exactly the three Day 2 building blueprints.

### "Yours" Tab — ACTFORGE output integration
**Docs said:** Not specced  
**Actual:** ✅ IMPLEMENTED AND WORKING

Screenshot confirms the Yours tab shows user-generated blueprints:
- "The Arcane Murder" (Medium, 12 nodes, 10 edges) — event + item tags
- "The Tides of Rot" (Medium, 10 nodes, 11 edges) — event tag only

These are ACTFORGE-generated act blueprints that have been imported and saved as user
blueprints. The pipeline from ACTFORGE → Blueprint Library → Yours tab is working
end-to-end. This was not in any spec document — it emerged from implementation.

---

## EDITOR — FORGE SCREEN

### Forge screen / Building management UI
**Docs said:** ⏳ Pending ("Building management UI per building type")  
**Actual:** ✅ IMPLEMENTED

Screenshot confirms full Forge screen in runtime:
- Building header: name, level (3/3), workflow count (1/3), active queue count
- Artisan slot section: "No artisan assigned" + "Assign artisan" button
- Workflows list: each workflow shows name, duration in ticks, inputs (with icon + qty),
  outputs (with icon + qty), status badge (Ready), "Queue job" button
- Active Queue section: job name, sub-label (workflow name), tick progress (119.9/120.0s),
  percentage (100%), full-width progress bar
- Event log section (visible at bottom, partially cut off)

Three workflows visible and correctly populated from schema:
- Forge Armor: 120 ticks, 3 Iron Ingot → Iron Plating x1
- Forge Weapon: 110 ticks, 3 Iron Ingot → Iron Sword x1
- Smelt Ore: 80 ticks, 3 Iron Ore → Iron Ingot x1 (Queue job button active)

---

## GENERATOR PIPELINE

### ACTFORGE.md
**Status:** ✅ IMPLEMENTED AND VALIDATED (v1.0 + v1.1 stub item generation)

### EXTRACTPASS0.md + TRANSLATEPASS.md
**Status:** ✅ IMPLEMENTED

### GENERATORPASS1/2/3.md
**Status:** ✅ IMPLEMENTED (CHANGELOG confirms Day 2 additions to PASS2 and PASS3)

### CANVASDOCTOR.md
**Status:** ✅ IMPLEMENTED

### WORLDFORGE.md
**Status:** ✅ WRITTEN THIS SESSION (v1.0, not yet run)

### HEROFORGE / BUILDFORGE / ITEMFORGE / UPGRADEFORGE / ASSEMBLER
**Status:** ❌ NOT YET WRITTEN — Day 3+ queue

---

## CORRECTED STATUS TABLE

What was listed as pending in repo_map.md, corrected:

| Item | repo_map.md said | Actual status |
|---|---|---|
| `processBuildingTick` | ⏳ Pending | ✅ Implemented, running, wired |
| Tuning Utility — Formula Lab | ⏳ Pending | ✅ Implemented |
| Tuning Utility — XP Curves | ⏳ Pending | ✅ Implemented |
| Tuning Utility — Economy Sim | ⏳ Pending | ✅ Implemented (passive income only) |
| Tuning Utility — Upgrade Trees | ⏳ Pending | ⚠️ Unconfirmed |
| Blueprint Library UI | ⏳ Pending | ✅ Implemented |
| Blueprint files (Basic/Medium/Complex) | ⏳ Pending | ✅ Implemented, 9 files |
| Hero equipment UI | ⏳ Pending | ⚠️ Unconfirmed |
| Buff stockpile UI | ⏳ Pending | ⚠️ Unconfirmed |
| Pre-expedition buff application screen | ⏳ Pending | ⚠️ Unconfirmed |
| Building management UI (Forge screen) | ⏳ Pending | ✅ Implemented |
| Enchanter building (item_modifier) | ⏳ Pending | ❌ Not built (scoped future) |
| Stables building (hero_modifier) | ⏳ Pending | ❌ Not built (scoped future) |
| Community blueprint registry | ⏳ Pending | ❌ Not built (scoped future) |
| ACTFORGE "Yours" tab integration | Not specced | ✅ Implemented |

---

## GENUINELY OPEN ITEMS

These are confirmed gaps — either never built or unverifiable from available evidence:

### Needs verification (screenshots or Claude Code confirmation would resolve)
- Upgrade Trees panel in Tuning Utility
- Hero equipment UI (4-slot equip screen)
- Buff stockpile UI and pre-expedition application screen

### Confirmed not yet built (scoped for future)
- Enchanter building (`item_modifier` output type)
- Stables building (`hero_modifier` output type)
- Community blueprint registry (backend infrastructure)
- HEROFORGE, BUILDFORGE, ITEMFORGE, UPGRADEFORGE, ASSEMBLER prompt files
- Economy Sim building workflow income simulation (currently passive income only)
- SYSTEMFORGE / Module Loader (Day 4+)

### Schema-only (specced, not runtime-implemented)
- `world_effect` output type — schema defines it, runtime handling unclear
- `hero_instance` output type from building workflows — schema defines it, needs
  verification that recruit pool population from building output is wired
- Consumable buff stockpile population from Apothecary output — needs verification

---

## THE REAL DAY 3 STARTING POINT

Based on this audit, the actual starting position for Day 3 is significantly stronger
than the docs suggested:

**Fully operational:**
- Editor with 18 node types, 20 inspectors, full canvas tools
- Compiler with 12 rules
- Runtime with all 5 systems running including building workflows
- Tuning Utility with 3 confirmed panels (Formula Lab, XP Curves, Economy Sim)
- Blueprint Library with 9 preset blueprints across 3 tiers + Yours tab
- Forge screen with live queue, progress bar, artisan assignment UI
- Generator pipeline with 6 prompt files (PASS1/2/3, EXTRACTPASS0, TRANSLATEPASS,
  ACTFORGE, CANVASDOCTOR)
- WORLDFORGE.md written this session

**Priority verification (needs a quick smoke test):**
1. Does Apothecary output populate the buff stockpile? (consumable system end-to-end)
2. Does a building workflow with `hero_instance` output populate the recruit pool?
3. Are hero equipment slots interactive in the hero management UI?
4. Does the Upgrade Trees panel exist in TuningModal.jsx?

**Day 3 build targets (confirmed gaps only):**
1. HEROFORGE.md — second Forge Suite member
2. Verify/complete the three "needs verification" items above
3. `world_effect` output type runtime handler if not yet wired

Everything else is either running or correctly scoped to Day 4+.

---

*Audit complete — March 29, 2026*
*Sources: repo_map.md, Claude Code task summary, live screenshots (6), DAY2 docs*
