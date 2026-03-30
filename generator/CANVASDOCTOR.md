# CANVASDOCTOR — Canvas Validation and Auto-Fix Tool
# Run this in Claude Code after Pass 2 or after manual canvas editing,
# before compiling and exporting to playtest.
#
# Input:  guild-engine/generator/generated-project.json (or any .json in generator/)
# Output: guild-engine/generator/canvas-doctor-report.md
#         (optionally patches generated-project.json if designer confirms)

---

## Your task

Read the project JSON file in `guild-engine/generator/` (usually `generated-project.json`).
Read the schema, compiler rules, relation rules, changelog, and wiki to understand
what valid data looks like.

Run a comprehensive diagnostic pass that finds canvas problems, generates a fix report,
and offers to apply automatic fixes where safe.

Do NOT modify the project JSON without explicit designer confirmation.

---

## STEP 1 — READ THE PROJECT

Find and read the main project file:
1. Check `guild-engine/generator/generated-project.json`
2. If not found, find any `*.json` in `guild-engine/generator/` that has `nodes` and `edges` arrays
3. Read the entire file into memory

Also read these reference files:
- `guild-engine/schema/project.schema.json` — node types, required fields, connection rules
- `guild-engine/editor/src/compiler/rules.js` — validation rules (REQUIRED_FIELDS, WARNING_CHECKS)
- `guild-engine/editor/src/canvas/inferRelation.js` — relation types
- `guild-engine/generator/CHANGELOG.md` — implemented systems
- `guild-engine/docs/WIKI.md` — gameplay reference

Extract from the project:
- `meta.schema_version` — for report header
- `meta.title` — for report header
- All nodes grouped by type
- All edges for reference validation

---

## STEP 2 — RUN VALIDATION CHECKS

Run these checks in order of severity. Collect all findings.

### ERRORS (must fix before export)

Check each of these. For each error found, record:
- Node ID
- Node label
- Error type
- Clear description
- Exact fix instruction

**1. Missing required fields**
Check against REQUIRED_FIELDS from rules.js:
```
resource:        ['label', 'base_cap', 'base_income']
item:            ['label', 'rarity', 'subtype']
loot_table:      ['label', 'rolls']
recipe:          ['label', 'output_item_id', 'craft_time_s']
crafting_recipe: ['label', 'output_item', 'required_workflow']
hero_class:      ['label', 'base_stats']
ability:         ['label', 'trigger']
building:        ['label', 'max_level']
building_workflow: ['behavior', 'host_building', 'output_rules', 'success_table']
upgrade:         ['label']
building_upgrade: ['host_building', 'level', 'cost']
expedition:      ['label', 'duration_s', 'party_size', 'level', 'loot_table_id']
boss_expedition: ['label', 'duration_s', 'party_size', 'boss_hp']
act:             ['label', 'act_number']
event:           ['label']
faction:         ['label']
prestige:        ['label', 'currency_id']
```

**2. Dangling ID references**
For each node type, check these fields reference existing nodes:
- `building_workflow.host_building` → must be a `building` node
- `crafting_recipe.required_workflow` → must be a `building_workflow` node
- `crafting_recipe.output_item` → must be an `item` node
- `expedition.loot_table_id` → must be a `loot_table` node
- `boss_expedition.loot_table_id` → must be a `loot_table` node
- `act.expedition_ids[]` → each must be an `expedition` node
- `act.boss_expedition_id` → must be a `boss_expedition` node
- `hero_class.recruit_cost[].resource_id` → must be a `resource` node
- `building.levels[].build_cost[].resource_id` → must be a `resource` node
- `building_upgrade.cost[].resource` → must be a `resource` node
- `building_workflow.output_rules[].target` → must be `resource` or `item` node
- `building_workflow.inputs[].resource` → must be a `resource` node
- `building_upgrade.effects.unlocks_workflows[]` → each must be `building_workflow` node
- `hero_class.building_affinity` → must be a `building` node

**3. Artisan combat eligibility**
For every `hero_class` with `hero_type: "artisan"`:
- If `combat_eligible: true` → ERROR (artisans cannot join expeditions)

**4. Circular building prerequisites**
Build a dependency graph from `building_upgrade` nodes:
- For each `building_upgrade`, check `requires?.cross_building[]`
- Build directed graph: building → prerequisite buildings
- Run cycle detection (DFS with active set)
- If cycle found → ERROR (deadlock in player progression)

**5. Duplicate node IDs**
- Group all nodes by `id`
- If any group has size > 1 → ERROR

**6. Building workflow with null building**
For every `building_workflow`:
- If `building_id` is null, undefined, or empty string → ERROR

---

### WARNINGS (should fix, game will work but poorly)

**1. Equipment with no stat modifiers**
For every `item` with `subtype: "equipment"`:
- If `stat_modifiers` is empty or missing → WARNING

**2. Empty loot tables**
For every `loot_table`:
- If `entries` array is empty or missing → WARNING

**3. Acts with no expeditions**
For every `act`:
- If `expedition_ids` is empty or missing → WARNING

**4. Acts with no boss**
For every `act`:
- If `boss_expedition_id` is empty or missing → WARNING

**5. Orphan expeditions**
- Collect all expedition IDs referenced by acts
- For every `expedition` and `boss_expedition` node:
  - If not referenced by any act → WARNING

**6. Building with workflows but no workflow nodes**
For every `building` with `has_workflows: true`:
- Count `building_workflow` nodes with `building_id` matching this building
- If count is 0 → WARNING

**7. Empty workflow rules**
For every `building_workflow`:
- If both `input_rules` and `output_rules` are empty → WARNING

**8. Recipe with no output**
For every `crafting_recipe` and `recipe`:
- If `output_item_id` is empty or missing → WARNING

**9. Combat hero with no equipment slots**
For every `hero_class` with `hero_type: "combat"` or `combat_eligible: true`:
- If `slots` array is empty or missing → WARNING

**10. Resource with no income source**
For every `resource`:
- If `base_income: 0` AND no `building` produces it (check `building.levels[].production` and `building_workflow.output_rules[]`) → WARNING

**11. Resource with no cap**
For every `resource` that is produced (by building or workflow):
- If `base_cap: 0` (unlimited) → WARNING (may break economy)

---

### BALANCE HINTS (optional improvements)

**1. Thin act content**
For every `act`:
- Count standard expeditions in `expedition_ids` (exclude boss)
- If count < 2 → HINT (acts feel thin with only 1 zone)

**2. No hero diversity**
- Collect all `stat_archetype` values from `hero_class` nodes
- If all combat heroes share the same archetype → HINT

**3. No upgrades defined**
- Count all `upgrade` and `building_upgrade` nodes
- If count is 0 → HINT (no progression systems)

**4. Boss easier than standard zones**
For each `act`:
- Get boss `level` from `boss_expedition_id`
- Get max level from standard expeditions in `expedition_ids`
- If boss level < max standard level → HINT

**5. Uniform recruit costs**
- Collect all `recruit_cost` amounts from combat `hero_class` nodes
- If all costs are identical → HINT (no differentiation)

**6. No loot rarity progression**
- Collect all `rarity` values from `item` nodes
- If all items are `common` → HINT (no loot progression)

---

## STEP 3 — GENERATE FIX REPORT

Write `guild-engine/generator/canvas-doctor-report.md` with this exact structure:

```markdown
# Canvas Doctor Report — [project title]
# Generated: [ISO timestamp]
# Schema version: [from meta.schema_version]

## Summary
[N] errors · [N] warnings · [N] hints
Estimated fix time: [quick / moderate / extensive]

Quick = <5 fixes, Moderate = 5-15 fixes, Extensive = >15 fixes

---

## Errors (fix before exporting)

### [Node label] — [Error type]
**Node ID:** [id]
**Problem:** [clear description of what's wrong]
**Fix:** [exact instruction — what field to set, what value to use]

[Repeat for each error]

---

## Warnings (should fix)

### [Node label] — [Warning type]
**Node ID:** [id]
**Problem:** [description]
**Fix:** [instruction]

[Repeat for each warning]

---

## Balance Hints (optional)

### [Node label] — [Hint type]
**Node ID:** [id]
**Observation:** [description]
**Suggestion:** [light recommendation]

[Repeat for each hint]

---

## Quick fixes (can be scripted)

List fixes that can be applied automatically without designer input.
These are cases where the correct value can be safely inferred:

1. **[Node label] — [field] fix**
   - Current: [value or "missing"]
   - Inferred: [value]
   - Reason: [why this is safe — e.g. "only one building exists", "only one item with matching name"]

[Repeat for each auto-fixable issue]

Total quick fixes available: [N]
```

---

## STEP 4 — OFFER TO AUTO-FIX

After writing the report, print to the terminal:

```
[N] quick fixes can be applied automatically. These are safe changes where
the correct value can be inferred without designer input.

Apply quick fixes? (y/n)
```

**If designer responds "y" or "yes":**
1. Apply each quick fix to the project JSON in memory
2. Write the patched JSON back to `guild-engine/generator/generated-project.json`
3. Update `meta.updated_at` to current timestamp
4. Print: "✓ Applied [N] quick fixes. See canvas-doctor-report.md for details."

**If designer responds "n" or "no":**
1. Leave project.json unchanged
2. Print: "✓ Project unchanged. See canvas-doctor-report.md for manual fix instructions."

**If designer asks "what will you change?":**
List each quick fix with before/after values before proceeding.

---

## STEP 5 — PRINT SUMMARY

Print this summary to the terminal:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Canvas Doctor Complete                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  [Project Title]                                                        │
│  Schema: [version]                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  [N] errors   → must fix before export                                 │
│  [N] warnings → should fix for better gameplay                         │
│  [N] hints    → optional balance improvements                          │
├─────────────────────────────────────────────────────────────────────────┤
│  Report: guild-engine/generator/canvas-doctor-report.md                │
│  Quick fixes: [N] available                                            │
└─────────────────────────────────────────────────────────────────────────┘

Open canvas-doctor-report.md for detailed fix instructions.
```

---

## Critical rules

1. NEVER modify project.json without explicit designer confirmation.
2. ALWAYS write the report file, even if no issues found.
3. If no issues found, write "✓ No issues found — canvas is clean!" in the report.
4. Be specific in fix instructions — tell the designer exactly what field to change.
5. For dangling references, suggest the closest matching node by name if available.
6. Auto-fixes must be 100% safe — only apply when there's one obvious correct answer.
7. If multiple project.json files exist in generator/, ask which one to check.

---

## Example session

```
> Follow guild-engine/generator/CANVASDOCTOR.md exactly.

✓ Read generated-project.json — "Iron Kingdoms" (schema 1.2.0)
✓ Running 23 validation checks...

┌─────────────────────────────────────────────────────────────────────────┐
│  Canvas Doctor Complete                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  Iron Kingdoms                                                          │
│  Schema: 1.2.0                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  2 errors   → must fix before export                                   │
│  5 warnings → should fix for better gameplay                           │
│  3 hints    → optional balance improvements                            │
├─────────────────────────────────────────────────────────────────────────┤
│  Report: guild-engine/generator/canvas-doctor-report.md                │
│  Quick fixes: 3 available                                              │
└─────────────────────────────────────────────────────────────────────────┘

3 quick fixes can be applied automatically:
  1. "Smelt Ore" workflow — building_id is null (only one building exists)
  2. "Forge Weapon" recipe — output_item_id missing (one item "Iron Sword" exists)
  3. "Iron Sword" item — no stat_modifiers (can add default ATK +8)

Apply quick fixes? (y/n)
```

---

## When to run this

- After running Pass 2 (generated first project.json)
- After manual canvas editing in the editor
- Before compiling and exporting to playtest
- When the compiler shows errors — run this first to catch issues

---

## Related files

- `guild-engine/generator/GENERATORPASS2.md` — project generation
- `guild-engine/generator/GENERATORPASS3.md` — world expansion
- `guild-engine/editor/src/compiler/CompileModal.jsx` — in-editor compilation
- `guild-engine/editor/src/compiler/rules.js` — validation rules
