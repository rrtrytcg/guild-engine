# ASSEMBLER — AI-Assisted Pipeline Integration & Validation
# Run this in Claude Code after all upstream forges have completed their runs.
# ASSEMBLER is the seventh and final forge in the Forge Suite — reads all 6 upstream outputs,
# produces the final project.json ready for editor import.
#
# Input:  guild-engine/generated/world-economy.json     (from WORLDFORGE)
#         guild-engine/generated/hero-roster.json        (from HEROFORGE)
#         guild-engine/generated/building-system.json    (from BUILDFORGE)
#         guild-engine/generated/act-*.blueprint.json    (from ACTFORGE, optional)
#         guild-engine/generated/item-ecosystem.json     (from ITEMFORGE)
#         guild-engine/generated/upgrade-ecosystem.json  (from UPGRADEFORGE)
#         guild-engine/generator/source-analysis.json    (optional — metadata only)
#         guild-engine/generator/world-template.json     (optional — metadata only)
#
# Output: guild-engine/generated/project.json            (primary — editor-ready merged project)
#         guild-engine/generator/assembler-report.md     (always — cross-ref errors, calibration, edges)
#         guild-engine/generator/canvas-doctor-report.md (only if CANVASDOCTOR found issues)
#
# Schema version: 1.2.0
# Forge Suite position: 7 of 7 — reads all 6 upstream forges, feeds editor

---

## Purpose

ASSEMBLER is the integration forge. It generates nothing. It merges all upstream forge outputs into
a single node set, resolves every cross-reference, performs cross-system calibration checks that no
individual forge could see, invokes CANVASDOCTOR on the merged result, and writes `project.json`
ready for editor import. A PASS result means the designer opens a canvas with every node in place
and zero blocking errors. A FAIL result means the `assembler-report.md` tells them exactly which
upstream forge to re-run and why.

---

## Before doing anything else

Read these files in order before any validation work:

1. `guild-engine/schema/project.schema.json` — authoritative field names for all node types
2. `guild-engine/editor/src/compiler/rules.js` — REQUIRED_FIELDS per node type (note discrepancies)
3. `guild-engine/generator/CANVASDOCTOR.md` — the 23 validation checks it runs (do NOT duplicate)
4. `guild-engine/generator/WORLDFORGE.md` — downstream_contracts structure
5. `guild-engine/generator/HEROFORGE.md` — downstream_contracts structure
6. `guild-engine/generator/BUILDFORGE.md` — downstream_contracts structure; field name authority
7. `guild-engine/generator/ACTFORGE.md` — output format of act-*.blueprint.json
8. `guild-engine/generator/ITEMFORGE.md` — downstream_contracts structure
9. `guild-engine/generator/UPGRADEFORGE.md` — downstream_contracts structure; unlock_condition types
10. `guild-engine/docs/WIKI.md` — Section 2 (Building Workflow System) for field name authority
11. `guild-engine/generator/CHANGELOG.md` — pending integration systems
12. `guild-engine/docs/DAY2-EVENING-DEEPDIVE.md` — ASSEMBLER's defined role

Print read status:
```
ASSEMBLER reading context...
  ✓ schema/project.schema.json
  ✓ editor/src/compiler/rules.js
  ✓ generator/CANVASDOCTOR.md
  ✓ generator/WORLDFORGE.md
  ✓ generator/HEROFORGE.md
  ✓ generator/BUILDFORGE.md
  ✓ generator/ACTFORGE.md
  ✓ generator/ITEMFORGE.md
  ✓ generator/UPGRADEFORGE.md
  ✓ docs/WIKI.md
  ✓ generator/CHANGELOG.md
  ✓ docs/DAY2-EVENING-DEEPDIVE.md
```

---

## Input Format

User provides:

```
WORLDFORGE_OUTPUT:   "{{path to world-economy.json}}"
HEROFORGE_OUTPUT:    "{{path to hero-roster.json}}"
BUILDFORGE_OUTPUT:   "{{path to building-system.json}}"
ACTFORGE_OUTPUTS:    "{{path to act-*.blueprint.json files, or 'none'}}"
ITEMFORGE_OUTPUT:    "{{path to item-ecosystem.json}}"
UPGRADEFORGE_OUTPUT: "{{path to upgrade-ecosystem.json}}"
SOURCE_MATERIAL:     "{{path to source-analysis.json or world-template.json, or 'none'}}"
STRICT_MODE:         "{{yes | no}}"
CANVASDOCTOR_RUN:    "{{yes | no}}"
```

**Defaults:** `STRICT_MODE: yes`, `CANVASDOCTOR_RUN: yes`

**STRICT_MODE definitions:**

- `yes` — Any ERROR-level cross-reference failure blocks `project.json` output. The designer must
  fix upstream forges and re-run ASSEMBLER. Use for production runs.
- `no` — ERRORs are logged but do not block output. `project.json` is generated with known issues
  documented in `assembler-report.md`.

  ⚠️ **WARNING — STRICT_MODE: no:** A project.json generated with unresolved cross-reference errors
  **will import into the editor** but **WILL FAIL the editor compiler** and **WILL crash the
  runtime** until all errors are resolved. Use only for iterative development where you intend to
  fix issues in the editor canvas directly. Never use for playtest builds.

**CANVASDOCTOR_RUN definitions:**

- `yes` — After node merging, write merged nodes to a temp file and invoke CANVASDOCTOR by
  instructing: `"Follow guild-engine/generator/CANVASDOCTOR.md exactly on the temp file."` Then
  read the resulting `canvas-doctor-report.md` and include its summary in `assembler-report.md`.
- `no` — Skip CANVASDOCTOR. Only ASSEMBLER's integration checks run. Faster, but misses
  field-level issues that CANVASDOCTOR catches independently.

---

## SECTION 3 — Pre-Run Schema Verification

**This section is mandatory and runs before any forge output is read.**

Before processing upstream forge outputs, verify that the schema contains the exact field names
ASSEMBLER will use in cross-reference checks. This prevents false-positive errors caused by field
name drift between forge versions or between forges and the compiler.

```
PRE-RUN SCHEMA CHECK:
  □ building_workflow has field: host_building (string, required)
    → Open schema/project.schema.json, find building_workflow node definition
    → If schema shows building_id instead: log SCHEMA_DISCREPANCY and use whichever field exists
    KNOWN DISCREPANCY: CANVASDOCTOR.md check #6 uses building_id — this is outdated.
    Schema and rules.js both confirm host_building is authoritative.

  □ building_upgrade has field: host_building (string, required)
    → Confirmed in schema. No discrepancy.

  □ building_upgrade has field: cost[].resource (not cost[].resource_id)
    KNOWN DISCREPANCY: CANVASDOCTOR.md dangling-reference check uses cost[].resource_id.
    Schema definition for building_upgrade.cost uses resource (not resource_id).
    Use resource for building_upgrade cost checks (XR-07).

  □ building_workflow has field: inputs[].resource (not input_rules[].resource_id)
    KNOWN DISCREPANCY: CANVASDOCTOR.md uses input_rules[].resource_id.
    Schema building_workflow.inputs[].resource is authoritative.
    Use inputs[].resource for workflow input checks (XR-04).

  □ crafting_recipe has field: output_item (string, required)
    → Confirmed in schema and rules.js.

  □ crafting_recipe has field: required_workflow (string, required)
    → Confirmed in schema and rules.js.

  □ unlock_condition has fields: type (required), target_id (optional), value (optional)
    Note: resource_gte conditions may use resource_id field instead of target_id — this
    is a UPGRADEFORGE convention. Check both at runtime (XR-22 special handling).

  □ prestige has field: trigger_conditions (array of unlock_condition, required)
    → Confirmed in schema.

  □ upgrade has field: cost (array of { resource_id, amount }, required)
    Note: upgrade.cost uses resource_id (shared $ref cost definition).
    This differs from building_upgrade.cost which uses resource.
    Use resource_id for upgrade cost checks (XR-18).

  □ building_upgrade has field: effects.unlocks_workflows (array of strings)
    → Confirmed in schema.

  □ faction has field: rep_tiers (array, required)
    → schema v1.2.0 has NO relations[] field on faction nodes.
    Faction cross-rep dynamics exist only as design annotations in calibration objects.

Print result:
  SCHEMA VERIFICATION: [N] checks passed, [N] discrepancies found
  [List each discrepancy — these change which field names the cross-reference audit uses below]
```

---

## SECTION 4 — Forge Output Discovery

Read all upstream forge outputs and build an inventory of all node IDs. Print status for each:

```
ASSEMBLER reading inputs...
  [✓ / ✗] world-economy.json           (REQUIRED — abort if missing)
  [✓ / ✗] hero-roster.json             (REQUIRED — abort if missing)
  [✓ / ✗] building-system.json         (REQUIRED — abort if missing)
  [✓ / ✗] act-*.blueprint.json         (OPTIONAL — N files found)
  [✓ / ✗] item-ecosystem.json          (REQUIRED — abort if missing)
  [✓ / ✗] upgrade-ecosystem.json       (REQUIRED — abort if missing)
  [✓ / ✗] source-analysis.json         (OPTIONAL — for metadata only)
  [✓ / ✗] world-template.json          (OPTIONAL — for metadata only)

NODE INVENTORY:
  WORLDFORGE:   [N] resource nodes
  HEROFORGE:    [N] hero_class nodes
  BUILDFORGE:   [N] building nodes, [N] building_workflow nodes,
                [N] building_upgrade nodes, [N] crafting_recipe nodes
  ACTFORGE:     [N] act nodes, [N] expedition nodes, [N] boss_expedition nodes,
                [N] event nodes, [N] loot_table nodes (from ACTFORGE)
  ITEMFORGE:    [N] item nodes, [N] loot_table nodes (from ITEMFORGE)
  UPGRADEFORGE: [N] upgrade nodes, [N] faction nodes, [N] prestige nodes
  TOTAL:        [N] nodes across all forges
```

**Abort conditions** — If any REQUIRED input is missing, print and stop:

```
ASSEMBLER ABORT: {filename} not found.
Run {FORGENAME} first: guild-engine/generator/{FORGENAME}.md
ASSEMBLER cannot proceed without all required upstream outputs.
```

Mapping of required files to their forge:
- `world-economy.json` → WORLDFORGE
- `hero-roster.json` → HEROFORGE
- `building-system.json` → BUILDFORGE
- `item-ecosystem.json` → ITEMFORGE
- `upgrade-ecosystem.json` → UPGRADEFORGE

---

## SECTION 5 — Cross-Reference Audit

**This is ASSEMBLER's primary job.** Every ID reference in every node is checked against the
merged node inventory. This catches integration errors that individual forges could not see because
they only had partial context.

### 5A — Cross-Reference Resolution Matrix

Run all 23 checks. Use the field names confirmed by the pre-run schema verification above. For each
check, scan every node of the source type and verify the referenced ID exists in the target set.

| Check ID | Source Field | Source Node Type | Expected Target Type | Target Forge |
|---|---|---|---|---|
| XR-01 | `hero_class.recruit_cost[].resource_id` | hero_class | resource | WORLDFORGE |
| XR-02 | `building.levels[].build_cost[].resource_id` | building | resource | WORLDFORGE |
| XR-03 | `building_workflow.host_building` | building_workflow | building | BUILDFORGE |
| XR-04 | `building_workflow.inputs[].resource` | building_workflow | resource | WORLDFORGE |
| XR-05 | `building_workflow.output_rules[].target` | building_workflow | resource OR item | WORLDFORGE or ITEMFORGE |
| XR-06 | `building_upgrade.host_building` | building_upgrade | building | BUILDFORGE |
| XR-07 | `building_upgrade.cost[].resource` | building_upgrade | resource | WORLDFORGE |
| XR-08 | `building_upgrade.effects.unlocks_workflows[]` | building_upgrade | building_workflow | BUILDFORGE |
| XR-09 | `crafting_recipe.required_workflow` | crafting_recipe | building_workflow | BUILDFORGE |
| XR-10 | `crafting_recipe.output_item` | crafting_recipe | item | ITEMFORGE |
| XR-11 | `crafting_recipe.inputs[].resource` | crafting_recipe | resource | WORLDFORGE |
| XR-12 | `hero_class.building_affinity[]` | hero_class | building | BUILDFORGE |
| XR-13 | `expedition.loot_table_id` | expedition | loot_table | ITEMFORGE or ACTFORGE |
| XR-14 | `expedition.resource_rewards[].resource_id` | expedition | resource | WORLDFORGE |
| XR-15 | `boss_expedition.loot_table_id` | boss_expedition | loot_table | ITEMFORGE or ACTFORGE |
| XR-16 | `act.expedition_ids[]` | act | expedition | ACTFORGE |
| XR-17 | `act.boss_expedition_id` | act | boss_expedition | ACTFORGE |
| XR-18 | `upgrade.cost[].resource_id` | upgrade | resource | WORLDFORGE |
| XR-19 | `upgrade.effect.unlock_node_ids[]` | upgrade | any node | any forge |
| XR-20 | `faction.rep_tiers[].unlock_node_ids[]` | faction | any node | any forge |
| XR-21 | `prestige.currency_id` | prestige | resource | WORLDFORGE or UPGRADEFORGE |
| XR-22 | `prestige.trigger_conditions[]` | prestige | type-dependent (see below) | type-dependent |
| XR-23 | `hero_class.specializations[]` | hero_class | action_type string | BUILDFORGE workflows |

**Field name fallbacks (from pre-run schema verification):**

For XR-03 and XR-06, if any forge output uses `building_id` instead of `host_building`
(e.g., output from a BUILDFORGE run before v1.9.2):
- Check for `host_building` first; if absent check `building_id`
- Log fallback as SCHEMA_DISCREPANCY

---

### XR-22 Special Handling — Prestige trigger_conditions

`trigger_conditions[]` uses the `unlock_condition` schema object. The `target_id` field is
type-dependent and NOT present on all condition types. Do NOT flat-check `target_id` across all
conditions — this will produce false-positive errors.

```
For each trigger_condition in prestige.trigger_conditions[]:

  condition.type == "act_reached":
    → target_id IS expected
    → validate condition.target_id exists as an act node (ACTFORGE)
    → if target_id missing: ERROR — prestige references act but target_id is null

  condition.type == "resource_gte":
    → target_id is NOT the resource reference for this condition type
    → check for condition.resource_id field (UPGRADEFORGE convention)
    → if condition.resource_id present: validate it exists as a resource node (WORLDFORGE)
    → if condition.resource_id absent AND condition.target_id present: treat target_id as resource
      reference (schema fallback), validate as resource node
    → if neither resource_id nor target_id: WARNING — resource_gte with no resource reference

  condition.type == "building_level":
    → target_id IS expected (the building being checked)
    → validate condition.target_id exists as a building node (BUILDFORGE)

  condition.type == "upgrade_owned":
    → target_id IS expected (the upgrade that must be purchased)
    → validate condition.target_id exists as an upgrade node (UPGRADEFORGE)

  condition.type == "expedition_completed":
    → target_id IS expected
    → validate condition.target_id exists as an expedition OR boss_expedition node (ACTFORGE)

  condition.type == "faction_rep_gte":
    → target_id IS expected (the faction)
    → validate condition.target_id exists as a faction node (UPGRADEFORGE)

  condition.type == "hero_count_gte" OR "prestige_count_gte":
    → target_id NOT expected (these use value field only)
    → validate condition.value is present and > 0
    → if target_id is present: WARNING (unexpected target_id on count condition)

  OTHER condition types:
    → log as UNKNOWN_CONDITION_TYPE [SEVERITY: WARNING]
    → note: may be valid in a future schema version but unrecognized in v1.2.0
```

---

### XR-23 Special Handling — Artisan Specialization Matching

Artisan `specializations[]` are free strings (`action_type` values), not node IDs. This is a
pipeline coherence check, not an ID resolution check.

```
For each hero_class with hero_type: "artisan":
  For each string in hero_class.specializations[]:
    Check: does any building_workflow node in the merged set have
           action_type == this specialization string?
    If none found:
      WARNING — artisan "{hero_class.id}" specialization "{spec}" matches no
                building_workflow action_type. This artisan can be assigned to buildings
                but gains no artisan skill bonus. Either add a matching workflow in
                BUILDFORGE or update HEROFORGE specializations to match existing workflows.
```

---

### 5B — Dangling Reference Report Format

For each failed cross-reference check, write:

```
DANGLING REFERENCE [XR-{N}] [SEVERITY: ERROR]
  Check:          {description of what was being checked}
  Source node:    {node_id} ({node_type})
  Source field:   {field.path}
  Referenced ID:  "{the missing ID}"
  Expected type:  {node type that should exist}
  Fix:            Run {FORGENAME} — it must generate a node with id: "{missing_id}"
                  of type: "{expected_type}"
  Blocking:       {YES — STRICT_MODE blocks project.json output | NO — logged only}
```

For WARNING-level issues (XR-23, unknown condition types, missing value fields):

```
INTEGRATION WARNING [XR-{N}] [SEVERITY: WARNING]
  Check:          {description}
  Source node:    {node_id} ({node_type})
  Issue:          {description of the problem}
  Impact:         {what will happen at runtime}
  Fix:            {specific recommendation}
```

**Total after all 23 checks:**

```
CROSS-REFERENCE AUDIT COMPLETE
  Checks run:     23
  Passed:         [N]
  Failed (ERROR): [N]
  Warnings:       [N]
  Status:         {PASS | FAIL}

  If FAIL and STRICT_MODE: yes → project.json will NOT be written.
  Fix the upstream forges listed above and re-run ASSEMBLER.
```

---

## SECTION 6 — Cross-System Calibration Audit

Check for systemic imbalances that no individual forge could catch because they only had partial
context. All calibration findings are WARNING-level — they do not block output in either STRICT_MODE
setting, but are documented in `assembler-report.md` for designer review.

### Table A — Income vs. Cost Timing

| Milestone | Target Time | Tolerance | Calculation |
|---|---|---|---|
| First building construction | 8–12 min | ±20% | BUILDFORGE tier-1 cost ÷ WORLDFORGE base_income/min |
| First global upgrade | 15–20 min | ±20% | UPGRADEFORGE tier-1 cost ÷ WORLDFORGE base_income/min |
| First hero recruit | 8–15 min | ±20% | HEROFORGE min recruit_cost ÷ WORLDFORGE base_income/min |
| Act 1 completion | 45–60 min | ±30% | ACTFORGE Act 1 expedition count × avg duration_s |
| First prestige (if enabled) | 8–12 hours | ±50% | UPGRADEFORGE prestige trigger conditions |

Show all math for each check:

```
TIMING CHECK: First building construction
  BUILDFORGE tier-1 building cost: {N} {resource_id}
  WORLDFORGE base_income: {N}/tick × 240 ticks/min = {N}/min
  Time to afford: {N} / {N} = {M} minutes
  Target: 8–12 min (±20% = 6.4–14.4 min)
  Status: {PASS | WARNING — {M} min is outside target range}

TIMING CHECK: First global upgrade
  UPGRADEFORGE cheapest tier-1 upgrade cost: {N} {resource_id}
  WORLDFORGE base_income rate: {N}/min
  Time to afford: {N} / {N} = {M} minutes
  Target: 15–20 min (±20% = 12–24 min)
  Status: {PASS | WARNING}

TIMING CHECK: First hero recruit
  HEROFORGE minimum recruit_cost: {N} {resource_id} ({hero_class_id})
  WORLDFORGE base_income rate: {N}/min
  Time to afford: {N} / {N} = {M} minutes
  Target: 8–15 min (±20% = 6.4–18 min)
  Status: {PASS | WARNING}

TIMING CHECK: Act 1 completion
  ACTFORGE Act 1 expedition count: {N} expeditions
  Average expedition duration_s: {N} sec = {N} min
  Estimated Act 1 clear time (no fails, linear): {N} min
  Target: 45–60 min (±30% = 31.5–78 min)
  Status: {PASS | WARNING}

TIMING CHECK: First prestige (only if prestige node exists)
  UPGRADEFORGE prestige trigger conditions: {list conditions}
  Estimated time to meet all conditions: {N} hours
  Target: 8–12 hours (±50% = 4–18 hours)
  Status: {PASS | WARNING | SKIP — no prestige node}
```

---

### Table B — Material Flow Balance

For each material resource in WORLDFORGE output (resources with no base_income, i.e., gathered
or crafted):

```
MATERIAL FLOW: {resource_id} — {label}
  Sources:
    Expedition drops (ACTFORGE loot tables): {N} per run × est. {N} runs/hour = {N}/hour
      (read loot_table entries for this resource_id, multiply by run frequency estimate)
    Building passive production (BUILDFORGE produce_resource workflows): {N}/hour
      (read building_workflow output_rules with output_type: resource and target: this resource)
    Total source rate: {N}/hour

  Consumption:
    Building workflow inputs (BUILDFORGE consume_resource workflows): {N} per job × {N} jobs/hour = {N}/hour
      (read building_workflow inputs[].resource matching this resource_id)
    Crafting recipe inputs (BUILDFORGE crafting_recipe): {N} per craft × {N} crafts/hour = {N}/hour
    Total consumption rate: {N}/hour

  Balance: {source rate} - {consumption rate} = {+N surplus | -N deficit}
  Cap pressure: {source rate} / {consumption rate} = {N}×
  Status:
    Deficit (consumption > source rate) →
      WARNING — {resource_id} consumption exceeds all source rates. Players will be resource-blocked.
      Fix: Increase expedition drop rates in ACTFORGE or add passive production in BUILDFORGE.
    Surplus > 10× →
      WARNING — {resource_id} probable cap pressure. Player will hit base_cap={N} constantly.
      Fix: Increase base_cap in WORLDFORGE or add more consumption in BUILDFORGE workflows.
    Balanced →
      PASS
```

---

### Table C — Hero Power vs. Expedition Difficulty

Read HEROFORGE `downstream_contracts.actforge.power_curve` and ACTFORGE expedition `level` values.

| Act | Expected Party Level | Party Power Range | Expedition Enemy Power | Clear Rate Target |
|---|---|---|---|---|
| Act 1 | 1–5 | 50–150 | 30–100 | CLEAN_SUCCESS by 2nd attempt |
| Act 2 | 5–10 | 150–400 | 100–250 | CLEAN_SUCCESS on 1st attempt |
| Act 3 | 10–15 | 400–800 | 250–500 | NARROW_SUCCESS minimum |

```
POWER CHECK: Act 1 curve
  HEROFORGE base party power (level-1 heroes): {N} ATK + {N} DEF + {N} SPD composite
  ACTFORGE Act 1 expedition enemy_hp × enemy_atk (weakest): {N}
  Party power vs. weakest expedition: {N} vs. {N}
  Can level-1 party clear weakest Act 1 expedition: {YES | WARNING — party power too low}

POWER CHECK: Act 2 curve
  HEROFORGE projected level-5 party power: {N}
  ACTFORGE Act 2 expedition enemy power range: {N}–{N}
  Status: {PASS | WARNING}

POWER CHECK: Act 3 curve
  HEROFORGE projected level-10 party power: {N}
  ACTFORGE Act 3 expedition enemy power range: {N}–{N}
  Status: {PASS | WARNING}
```

---

### Table D — Equipment vs. Upgrade Power

| Source | Act 1 ATK | Act 2 ATK | Act 3 ATK |
|---|---|---|---|
| Median weapon (ITEMFORGE) | baseline | ×2.0–2.5× | ×3.5–4.5× |
| Total hero stat upgrades (UPGRADEFORGE) | ≤50% of median | ≤50% of median | ≤50% of median |

Rule: Sum all UPGRADEFORGE `upgrade.effect.hero_stat_modifier.attack` values across all purchasable
upgrades. This total must not exceed 60% of ITEMFORGE's median equipped weapon ATK modifier at the
same act. If exceeded: `WARNING — upgrades risk making equipment irrelevant in Act N`

```
EQUIPMENT vs. UPGRADE POWER CHECK: Act 1
  ITEMFORGE median weapon ATK modifier: +{N}
  UPGRADEFORGE total purchasable ATK upgrade bonus (all tiers, Act 1 accessible): +{N}
  Ratio: {N} / {N} = {P}%
  Threshold: 60%
  Status: {PASS | WARNING — upgrade power {P}% exceeds 60% of equipment baseline}

[Repeat for Act 2 and Act 3]
```

---

### Table E — Prestige Soft-Lock Analysis

Only run if a prestige node exists. This is a hard safety check — the only calibration check that
can produce an ERROR (soft-locks break the game irreversibly).

```
PRESTIGE SOFT-LOCK CHECK:
  Prestige node: {prestige_id}
  resets[] contains "buildings": {yes/no}
  resets[] contains "expeditions": {yes/no}

  RULE: If both "buildings" AND "expeditions" are in resets →
    ERROR — SOFT-LOCK GUARANTEED. After prestige, the player has no buildings and no
    expeditions. They cannot generate resources or progress. The game is unwinnable after
    first prestige. Fix: Remove "expeditions" from resets, or ensure at least one expedition
    is available without building prerequisites.

  resets[] contains "heroes": {yes/no}
  If heroes in resets:
    Can player recruit at least one hero without buildings post-reset?
    → Any hero_class with recruit_cost using resource with base_income > 0? {yes/no}
    → Any hero_class with recruitment.source: "guild_roster"? {yes/no}
    If no recruitment path without buildings AND buildings in resets:
      WARNING — near soft-lock: heroes reset, buildings reset, no free recruitment path.
      Player will be stuck after first prestige with no heroes and no way to get them.

  Post-reset income check:
    WORLDFORGE resources with base_income > 0: {N}
    If 0 resources have base_income > 0 AND "resources" in resets:
      ERROR — No income post-reset. Player has no way to earn any resource after prestiging.
      Fix: Ensure at least one resource has base_income > 0 in WORLDFORGE, or remove
      "resources" from prestige resets.
```

---

### Table F — Faction Rep Pacing

Only run if faction nodes exist.

For each faction node:

```
FACTION REP PACING: {faction_id} — {label}
  Max rep tier threshold: {N} rep
  Rep sources (from ACTFORGE expedition faction_rewards and UPGRADEFORGE):
    Per-expedition: {N} rep × est. {N} expeditions/hour = {N} rep/hour
    Event-based: estimated {N} rep/hour
    Total estimated rep rate: {N} rep/hour
  Time to max rep: {N} / {N} = {M} hours
  Target: 8–15 hours
  Status:
    {M} < 3 hours → WARNING — faction maxes out too fast. No lasting social stakes.
    {M} > 20 hours → WARNING — faction gates content for too long. Players may quit.
    3–20 hours → PASS
```

---

### Table G — Workflow Duration Bounds

For each `building_workflow` node in the merged set:

```
DURATION CHECK: {workflow_id}
  duration_base_ticks: {N}
  Real-time equivalent: {N} × 0.25 sec = {N} seconds
  Valid range: 20 ticks (5 sec) — 4800 ticks (20 min)
  Status:
    {N} < 20 → WARNING — workflow completes in under 5 seconds. May spam the event queue.
    {N} > 4800 → WARNING — workflow takes over 20 minutes. Players will disengage.
    20–4800 → PASS
```

**Calibration Audit Summary:**

```
CALIBRATION AUDIT COMPLETE
  Categories checked:  7
  Table A (Income timing):    {N} checks, {N} warnings
  Table B (Material flow):    {N} resources checked, {N} warnings
  Table C (Hero power):       {N} act checks, {N} warnings
  Table D (Equipment power):  {N} act checks, {N} warnings
  Table E (Prestige soft-lock): {CHECKED | SKIPPED — no prestige node}, {N} errors, {N} warnings
  Table F (Faction pacing):   {N} factions checked, {N} warnings  (or: SKIPPED — no factions)
  Table G (Workflow duration): {N} workflows checked, {N} warnings
  Total calibration warnings: {N}
  Calibration errors:         {N} (prestige soft-lock only)
  Status:                     {PASS | PASS_WITH_WARNINGS | FAIL — soft-lock detected}
```

---

## SECTION 7 — Node Merging & Deduplication

Merge all upstream forge output `nodes[]` arrays into a single set.

```
MERGE PROCEDURE:
  1. Collect all nodes[] arrays from all 6 forge outputs in this pipeline order:
     WORLDFORGE → HEROFORGE → BUILDFORGE → ACTFORGE → ITEMFORGE → UPGRADEFORGE

  2. For each node, check if its id already exists in the merged set:
     - Not present → add to merged set
     - Present, same type → keep the version from the LATER forge in pipeline order
       (UPGRADEFORGE version beats ITEMFORGE, ITEMFORGE beats ACTFORGE, etc.)
       Log: DUPLICATE_ID [SEVERITY: WARNING]
         ID "{id}" appears in {forge_A} ({type}) and {forge_B} ({type}).
         Kept {forge_B} version (later in pipeline).
     - Present, DIFFERENT type → unresolvable conflict
       Log: TYPE_CONFLICT [SEVERITY: ERROR]
         ID "{id}" is type "{type_A}" in {forge_A} but type "{type_B}" in {forge_B}.
         This cannot be resolved by pipeline order. Both forges must be fixed.
         Fix: Rename one of the nodes in its upstream forge.

  3. Verify canvas_pos within soft bounds: x ∈ [-500, 3000], y ∈ [-500, 2000]
     If any node is out of bounds:
       Log HINT — node "{id}" canvas_pos {x, y} is outside standard editor range.
       Do NOT auto-correct canvas positions.

  4. Count final nodes by type and verify non-zero counts for required types.
```

```
MERGE COMPLETE
  Total nodes merged:    [N]
  Duplicates resolved:   [N] (WARNING — listed in report)
  Type conflicts:        [N] (ERROR — blocks output if any)
  Out-of-bounds hints:   [N]

  Node counts by type:
    resource:         [N]
    hero_class:       [N]
    building:         [N]
    building_workflow:[N]
    building_upgrade: [N]
    crafting_recipe:  [N]
    act:              [N]
    expedition:       [N]
    boss_expedition:  [N]
    event:            [N]
    loot_table:       [N]
    item:             [N]
    upgrade:          [N]
    faction:          [N]
    prestige:         [N]
    Other:            [N]
    TOTAL:            [N]
```

---

## SECTION 7B — Auto-Apply Intended Edges

**This section runs after Section 7 (Node Merging) and before Section 8 (Intended Edge Documentation).**

After merging nodes and generating the intended edge list from resolved cross-references, ASSEMBLER applies all edges to the source nodes' `connections[]` arrays. This ensures `project.json` imports with all edges pre-wired.

```
EDGE APPLICATION PROCEDURE:
  1. For each resolved XR check (XR-03 through XR-20, excluding SKIPPED):
     - Extract: source_node_id, target_node_id, relation_type
     - Find source_node in merged node set
     - If source_node has no connections[] field: add connections: []
     - If target_node_id not already in source_node.connections[]:
       - Append target_node_id to source_node.connections[]
       - Log: Edge applied: {source_node_id} → {target_node_id} ({relation_type})

  2. Count total edges applied:
     - Total edges applied: [N]
     - Nodes with connections: [N]
     - Nodes without connections: [N]

  3. Verify all edges applied successfully:
     - If any edge failed (source node not found): Log ERROR — edge not applied
     - If all edges applied: Log PASS — all connections wired
```

**Schema compliance:**
- `connections[]` is an optional array of strings on all node types in schema v1.2.0
- Values are node IDs (strings) — no validation required at schema level
- This is the intended use of the connections field per WIKI.md Section 1

**Edge mapping (from XR checks):**

| XR Check | Source → Target | Relation |
|---|---|---|
| XR-03 | workflow → building | available_at |
| XR-04 | resource → workflow | consumes |
| XR-05 | workflow → resource/item | produces |
| XR-06 | upgrade → building | hosts |
| XR-08 | upgrade → workflow | unlocks |
| XR-09 | recipe → workflow | used_by |
| XR-10 | recipe → item | produces |
| XR-13 | loot_table → expedition | drops_from |
| XR-15 | loot_table → boss_expedition | drops_from |
| XR-16 | act → expedition | gates |
| XR-17 | act → boss_expedition | gates |
| XR-19 | upgrade → any node | unlocks |
| XR-20 | faction → any node | gates |

```
EDGE APPLICATION COMPLETE
  Total edges applied:    [N]
  Nodes with connections: [N]
  Nodes without:          [N]
  Failed edges:           [N] (ERROR if > 0)
  Status:                 {PASS | FAIL}
```

---

## SECTION 8 — Intended Edge Documentation

ASSEMBLER does not generate edges. Edges are drawn in the editor by the designer or by auto-rig.
However, ASSEMBLER documents all intended connections derived from the cross-reference audit. These
are written to `assembler-report.md` under "Intended Edge Connections" and to
`editor_metadata.intended_edges[]` in `project.json`.

Generate the intended edge list from every resolved (PASS) cross-reference:

```
For each resolved XR check, generate one or more intended edge entries:

  XR-03: building_workflow.host_building → building
    edge: { source: "{workflow_id}", target: "{building_id}", relation: "available_at" }

  XR-04: building_workflow.inputs[].resource → resource
    edge: { source: "{resource_id}", target: "{workflow_id}", relation: "consumes" }

  XR-05: building_workflow.output_rules[].target → resource or item
    If output_type == "resource":
      edge: { source: "{workflow_id}", target: "{resource_id}", relation: "produces" }
    If output_type == "item" or "consumable":
      edge: { source: "{workflow_id}", target: "{item_id}", relation: "produces" }

  XR-06: building_upgrade.host_building → building
    edge: { source: "{upgrade_id}", target: "{building_id}", relation: "hosts" }

  XR-08: building_upgrade.effects.unlocks_workflows[] → building_workflow
    edge: { source: "{upgrade_id}", target: "{workflow_id}", relation: "unlocks" }

  XR-09: crafting_recipe.required_workflow → building_workflow
    edge: { source: "{recipe_id}", target: "{workflow_id}", relation: "used_by" }

  XR-10: crafting_recipe.output_item → item
    edge: { source: "{recipe_id}", target: "{item_id}", relation: "produces" }

  XR-13: expedition.loot_table_id → loot_table
    edge: { source: "{loot_table_id}", target: "{expedition_id}", relation: "drops_from" }

  XR-15: boss_expedition.loot_table_id → loot_table
    edge: { source: "{loot_table_id}", target: "{boss_expedition_id}", relation: "drops_from" }

  XR-16: act.expedition_ids[] → expedition
    edge: { source: "{act_id}", target: "{expedition_id}", relation: "gates" }

  XR-17: act.boss_expedition_id → boss_expedition
    edge: { source: "{act_id}", target: "{boss_expedition_id}", relation: "gates" }

  XR-19: upgrade.effect.unlock_node_ids[] → any node
    edge: { source: "{upgrade_id}", target: "{node_id}", relation: "unlocks" }

  XR-20: faction.rep_tiers[].unlock_node_ids[] → any node
    edge: { source: "{faction_id}", target: "{node_id}", relation: "gates" }
```

Write the complete intended edge list to `assembler-report.md` under "Intended Edge Connections"
for the designer to wire in the editor (or for auto-rig to process automatically on import).

---

## SECTION 9 — CANVASDOCTOR Invocation

**Only run if CANVASDOCTOR_RUN: yes.**

CANVASDOCTOR performs field-level validation that complements ASSEMBLER's cross-reference audit.
Do NOT re-implement its checks. Invoke it as a black box.

```
CANVASDOCTOR INVOCATION:
  1. Write merged node set to temp file:
     Path: guild-engine/generated/.assembler-temp.json
     Format: valid project.json with all merged nodes, schema_version: "1.2.0",
             no editor_metadata (CANVASDOCTOR doesn't need it)

  2. Run CANVASDOCTOR by instructing Claude Code:
     "Follow guild-engine/generator/CANVASDOCTOR.md exactly.
      Input file: guild-engine/generated/.assembler-temp.json
      Write report to: guild-engine/generator/canvas-doctor-report.md"

  3. After CANVASDOCTOR completes, read guild-engine/generator/canvas-doctor-report.md

  4. Extract summary counts from report header:
     - Errors: {N}
     - Warnings: {N}
     - Hints: {N}

  5. Include summary in assembler-report.md under "Canvas Doctor Results"
     If CANVASDOCTOR found issues: also write canvas-doctor-report.md as a separate output file.

  6. Delete temp file after CANVASDOCTOR completes:
     guild-engine/generated/.assembler-temp.json

If CANVASDOCTOR finds issues that appear to contradict ASSEMBLER's cross-reference PASS results:
  Log: CANVASDOCTOR_CONFLICT [SEVERITY: WARNING]
    ASSEMBLER cross-reference audit passed {check_id} but CANVASDOCTOR flagged a related issue.
    ASSEMBLER finding: {what ASSEMBLER reported}
    CANVASDOCTOR finding: {what CANVASDOCTOR reported}
    Resolution: Include both findings in assembler-report.md — let the designer determine which
    is authoritative. Do not suppress either finding.
```

---

## SECTION 10 — Output Format

### A. project.json

```json
{
  "schema_version": "1.2.0",
  "assembler_version": "1.0.0",
  "assembled_at": "{ISO 8601 timestamp — e.g. 2026-03-30T14:22:00Z}",
  "meta": {
    "project_name": "{from WORLDFORGE meta.project_name or source material title}",
    "pacing_target": "{from WORLDFORGE downstream_contracts.pacing_target}",
    "source_material": "{path to source-analysis.json or world-template.json, or 'pitch'}",
    "forge_pipeline": {
      "worldforge":   "{meta.generated_at from world-economy.json, or 'not run'}",
      "heroforge":    "{meta.generated_at from hero-roster.json, or 'not run'}",
      "buildforge":   "{meta.generated_at from building-system.json, or 'not run'}",
      "actforge":     "{comma-separated filenames of act-*.blueprint.json, or 'not run'}",
      "itemforge":    "{meta.generated_at from item-ecosystem.json, or 'not run'}",
      "upgradeforge": "{meta.generated_at from upgrade-ecosystem.json, or 'not run'}"
    },
    "designer_notes": "{concatenated summary of meta.designer_notes from all upstream forge outputs — one paragraph per forge}"
  },
  "nodes": [
    // All merged nodes — schema-valid, deduplicated, ready for editor import.
    // Ordered: WORLDFORGE nodes first, then HEROFORGE, BUILDFORGE, ACTFORGE,
    // ITEMFORGE, UPGRADEFORGE. Order within each forge group is preserved from
    // the upstream output.
  ],
  "editor_metadata": {
    "groups": [],
    "intended_edges": [
      {
        "source": "{source node_id}",
        "target": "{target node_id}",
        "relation": "{relation type string — from inferRelation.js}",
        "xr_check": "{XR-NN — the cross-reference check that produced this edge}"
      }
    ]
  },
  "validation_summary": {
    "cross_reference_errors": 0,
    "cross_reference_warnings": 0,
    "calibration_errors": 0,
    "calibration_warnings": 0,
    "canvas_doctor_errors": 0,
    "canvas_doctor_warnings": 0,
    "canvas_doctor_hints": 0,
    "status": "PASS | FAIL | PASS_WITH_WARNINGS",
    "blocking_issues": [
      // Only populated if status is FAIL. One entry per blocking error.
      // { "check": "XR-NN", "node_id": "...", "field": "...", "missing_id": "..." }
    ]
  }
}
```

**project.json is only written when:**
- STRICT_MODE: yes AND cross-reference errors == 0 AND calibration errors == 0 AND merge type conflicts == 0
- STRICT_MODE: no (always written, with validation_summary reflecting actual counts)

---

### B. assembler-report.md

```markdown
# Assembler Report — {Project Name}
### Generated {ISO date} · Schema v1.2.0 · Assembler v1.0.0

## Summary
- **Status:** {PASS | FAIL | PASS_WITH_WARNINGS}
- **Nodes Merged:** {N} total
- **Cross-Reference Errors:** {N} (blocking in STRICT_MODE: yes)
- **Cross-Reference Warnings:** {N} (non-blocking)
- **Calibration Errors:** {N} (soft-lock checks)
- **Calibration Warnings:** {N} (non-blocking)
- **Canvas Doctor:** {N} errors, {N} warnings, {N} hints  ·OR·  skipped (CANVASDOCTOR_RUN: no)
- **Schema Discrepancies Found:** {N} (field name drift — see Pre-Run Verification section)

---

## ❌ Cross-Reference Errors (Must Fix Before Import)
{If none: "None — all cross-references resolved."}

### [XR-NN] {brief title}
**Source:** `{node_id}.{field}` = `"{missing_id}"`
**Problem:** {what node is missing and what type it should be}
**Fix:** Run {FORGENAME} — it must generate a node with id: `"{missing_id}"` of type: `"{type}"`

---

## ❌ Calibration Errors (Must Fix Before Import)
{If none: "None — no soft-lock or income failure detected."}

### {Error title}
**Check:** Table {E/other}
**Problem:** {what the check found}
**Fix:** {which forge to update and how}

---

## ⚠️ Schema Discrepancies Found
{If none: "None — all field names match between forges and schema."}

### {Field name discrepancy}
**Expected (schema-canonical):** `{correct_field_name}`
**Found in forge output:** `{actual_field_name}`
**Impact:** {how this was handled — fallback used or error produced}
**Long-term fix:** Update {FORGENAME} or rules.js to use the schema-canonical field name.

---

## ⚠️ Calibration Warnings (Non-Blocking)
{If none: "None — all calibration checks passed."}

### {Warning title}
**Check:** Table {A-G}
**Expected:** {target value or range}
**Actual:** {what was found}
**Impact:** {what gameplay problem this may cause if not addressed}
**Fix:** {which upstream forge to adjust, and what to change}

---

## 🔍 Canvas Doctor Results
{If CANVASDOCTOR_RUN: no → "Canvas Doctor skipped (CANVASDOCTOR_RUN: no). Re-run with CANVASDOCTOR_RUN: yes before final import."}
{If run and no issues → "Canvas Doctor: No issues found — canvas is clean."}
{If run with issues → "Canvas Doctor: {N} errors, {N} warnings, {N} hints. See canvas-doctor-report.md for details."}

---

## 🔗 Intended Edge Connections
Auto-rig instructions — wire these edges in the editor or run auto-rig (⚡ Rig) on import.
These are derived from resolved cross-references only. Dangling references produce no edges.

| Source Node | Target Node | Relation | From Check |
|---|---|---|---|
| {id} | {id} | {relation} | XR-{N} |

Total intended edges: {N}

---

## 📊 Upstream Forge Summary

| Forge | Status | Nodes Generated | Flags in Upstream Output |
|---|---|---|---|
| WORLDFORGE | run | {N} resources | {N} flags (from economy-flags.md if present) |
| HEROFORGE | run | {N} hero_class | {N} flags (from hero-flags.md if present) |
| BUILDFORGE | run | {N} buildings + {N} workflows + {N} upgrades + {N} recipes | {N} flags |
| ACTFORGE | {run/not run} | {N} acts + {N} expeditions + {N} boss_expeditions + {N} events | {N} flags |
| ITEMFORGE | run | {N} items + {N} loot_tables | {N} flags (from item-flags.md if present) |
| UPGRADEFORGE | run | {N} upgrades + {N} factions + {N} prestige | {N} flags (from upgrade-flags.md if present) |

{If any upstream flags files exist, list their key flags here — the designer needs this context.}

---

## ✅ Recommended Next Actions

{Prioritized — blocking errors first, then warnings, then improvements}

1. {If FAIL: "Fix all cross-reference errors above. Re-run the listed upstream forges, then re-run ASSEMBLER."}
2. {If calibration errors: "Fix prestige soft-lock or income failure before import."}
3. {If PASS_WITH_WARNINGS: "Review calibration warnings above before extended playtesting. Address the highest-impact warnings first."}
4. {If Canvas Doctor issues: "Open canvas-doctor-report.md and address CANVASDOCTOR errors before compiling."}
5. {If PASS: "Import project.json into editor → run auto-rig (⚡ Rig) to wire intended edges → Compile → zero errors → open engine/index.html to playtest."}
```

---

## SECTION 11 — Validation Checklist

Run before writing any output file. Mark each item explicitly.

**Structural (ERROR if failed — blocks output in STRICT_MODE: yes):**

- [ ] All 6 required upstream forge outputs present and readable
- [ ] No type conflicts in merged node set (same ID, different types)
- [ ] All 23 cross-reference checks completed (XR-01 through XR-23)
- [ ] `prestige.trigger_conditions[]` evaluated with type-branched logic (not flat target_id lookup)
- [ ] `schema_version: "1.2.0"` in output project.json
- [ ] `assembler_version: "1.0.0"` in output project.json
- [ ] `validation_summary` populated with accurate counts from this run
- [ ] `downstream_contracts` read from all 6 forges and used in calibration checks
- [ ] Pre-run schema verification completed before any validation work

**Balance (WARNING if failed — logged, does not block):**

- [ ] Income vs. cost timing within targets (Table A)
- [ ] No material with sustained deficit or >10× surplus (Table B)
- [ ] Level-1 party power exceeds Act 1 weakest expedition requirement (Table C)
- [ ] Upgrade ATK total < 60% of median weapon ATK (Table D)
- [ ] Prestige reset soft-lock check passed — no buildings + expeditions in same reset (Table E)
- [ ] Faction rep pacing within 3–20 hour range per faction (Table F — only if factions exist)
- [ ] All building_workflow base_duration_ticks within 20–4800 range (Table G)

**Pipeline (WARNING if failed):**

- [ ] All upstream forge flags files read and referenced in assembler-report.md
- [ ] CANVASDOCTOR invoked if CANVASDOCTOR_RUN: yes — results included in report
- [ ] Intended edges documented in assembler-report.md and editor_metadata.intended_edges[]
- [ ] CHANGELOG.md entry appended with this run's details

---

## SECTION 12 — File Writing

Write files in this order:

```
1. guild-engine/generated/project.json               (primary output)
   → Only written if STRICT_MODE: yes AND no blocking errors
   → Always written if STRICT_MODE: no (with validation_summary reflecting errors)

2. guild-engine/generator/assembler-report.md        (always — even on PASS)
   → Include all cross-reference errors, calibration warnings, Canvas Doctor summary,
     intended edges, upstream forge flags summary, next actions

3. guild-engine/generator/canvas-doctor-report.md    (only if CANVASDOCTOR ran and found issues)
   → CANVASDOCTOR writes this itself during invocation; include path in report

4. Append to guild-engine/generator/CHANGELOG.md     (always)
```

**CHANGELOG entry format:**

```markdown
### ASSEMBLER Run — {ISO date}
- VERSION: v1.9.5
- TYPE: SYSTEM
- SCOPE: ASSEMBLER
- STATUS: {PASS | FAIL | PASS_WITH_WARNINGS}
- INPUT: world-economy.json + hero-roster.json + building-system.json + {N act blueprints} +
         item-ecosystem.json + upgrade-ecosystem.json
- OUTPUT: guild-engine/generated/project.json  {OR: blocked by {N} cross-reference errors}
- NODES MERGED: {N} total (resources: {N}, hero_class: {N}, building: {N}, building_workflow: {N},
  building_upgrade: {N}, crafting_recipe: {N}, act: {N}, expedition: {N}, boss_expedition: {N},
  event: {N}, loot_table: {N}, item: {N}, upgrade: {N}, faction: {N}, prestige: {N})
- CROSS-REFERENCE ERRORS: {N}
- CALIBRATION WARNINGS: {N}
- CANVAS DOCTOR: {N errors, N warnings, N hints  |  skipped}
- NEXT: {Import project.json into editor  |  Fix upstream forges per assembler-report.md}
```

---

## SECTION 13 — Terminal Summary

Print this after all file writing is complete:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Assembler Complete                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  {Project Name}                                                         │
│  Status: {PASS | FAIL | PASS_WITH_WARNINGS}                            │
├─────────────────────────────────────────────────────────────────────────┤
│  Nodes Merged: {N} total                                                │
│    • Resources:       {N}   (WORLDFORGE)                                │
│    • Hero Classes:    {N}   (HEROFORGE)                                 │
│    • Buildings:       {N}   (BUILDFORGE)                                │
│    • Workflows:       {N}   (BUILDFORGE)                                │
│    • Bldg Upgrades:   {N}   (BUILDFORGE)                                │
│    • Recipes:         {N}   (BUILDFORGE)                                │
│    • Acts:            {N}   (ACTFORGE)                                  │
│    • Expeditions:     {N}   (ACTFORGE)                                  │
│    • Boss Exped.:     {N}   (ACTFORGE)                                  │
│    • Events:          {N}   (ACTFORGE)                                  │
│    • Items:           {N}   (ITEMFORGE)                                 │
│    • Loot Tables:     {N}   (ITEMFORGE + ACTFORGE)                      │
│    • Upgrades:        {N}   (UPGRADEFORGE)                              │
│    • Factions:        {N}   (UPGRADEFORGE)                              │
│    • Prestige:        {N}   (UPGRADEFORGE)                              │
├─────────────────────────────────────────────────────────────────────────┤
│  Validation:                                                            │
│    Cross-Reference Errors:   {N}   {✓ PASS | ✗ FAIL}                   │
│    Calibration Errors:       {N}   {✓ PASS | ✗ FAIL}                   │
│    Calibration Warnings:     {N}   (logged in assembler-report.md)     │
│    Canvas Doctor:     {N errors · N warnings · N hints | skipped}      │
├─────────────────────────────────────────────────────────────────────────┤
│  Output:  guild-engine/generated/project.json                          │
│  Report:  guild-engine/generator/assembler-report.md                   │
│  Canvas:  {guild-engine/generator/canvas-doctor-report.md | skipped}  │
├─────────────────────────────────────────────────────────────────────────┤
│  PASS:              Import project.json into editor                    │
│  PASS_WITH_WARNINGS: Import + review assembler-report.md first         │
│  FAIL:              Fix upstream forges → re-run ASSEMBLER             │
└─────────────────────────────────────────────────────────────────────────┘

To import into the editor:
  1. Open editor: npm run dev  (in guild-engine/editor/)
  2. Click "Import" in the toolbar
  3. Select guild-engine/generated/project.json
  4. Select all nodes → click ⚡ Rig to wire intended edges automatically
  5. Click "Compile" to run the editor compiler
  6. Zero errors → open engine/index.html to playtest
```

---

## SECTION 14 — Example Session

**Project:** VtM "Kindred Dark Ages" — 3 Acts, 6 resource nodes, 4 hero classes,
3 buildings, 8 workflows, 6 building upgrades, 4 recipes, 12 items, 4 loot tables,
8 upgrades, 2 factions, 1 prestige node

---

### Step 1 — Pre-Run Schema Verification

```
SCHEMA VERIFICATION:
  □ building_workflow.host_building — CONFIRMED in schema
  □ building_upgrade.host_building — CONFIRMED in schema
  □ building_upgrade.cost[].resource — CONFIRMED in schema
    SCHEMA_DISCREPANCY: CANVASDOCTOR uses cost[].resource_id — noted, using schema-canonical 'resource'
  □ building_workflow.inputs[].resource — CONFIRMED in schema
    SCHEMA_DISCREPANCY: CANVASDOCTOR uses input_rules[].resource_id — noted, using 'inputs[].resource'
  □ crafting_recipe.output_item — CONFIRMED in schema
    SCHEMA_DISCREPANCY: rules.js REQUIRED_FIELDS uses output_item_id — noted, using schema 'output_item'
  □ crafting_recipe.required_workflow — CONFIRMED in schema
    SCHEMA_DISCREPANCY: rules.js REQUIRED_FIELDS uses workflow_id — noted, using 'required_workflow'
  □ unlock_condition: type required, target_id optional — CONFIRMED
  □ prestige.trigger_conditions — CONFIRMED
  □ upgrade.cost[].resource_id — CONFIRMED (shared $ref cost definition)
  □ building_upgrade.effects.unlocks_workflows — CONFIRMED
  □ faction.rep_tiers — CONFIRMED, no relations[] field in v1.2.0

SCHEMA VERIFICATION: 11 checks passed, 4 discrepancies found (all field name drift, handled)
```

---

### Step 2 — Forge Output Discovery

```
ASSEMBLER reading inputs...
  ✓ world-economy.json
  ✓ hero-roster.json
  ✓ building-system.json
  ✓ act-1-the-great-burning.blueprint.json, act-2-domains.blueprint.json,
    act-3-council-of-thorns.blueprint.json  (3 files found)
  ✓ item-ecosystem.json
  ✓ upgrade-ecosystem.json
  ✗ source-analysis.json  (not found — OPTIONAL, skipping)
  ✓ world-template.json

NODE INVENTORY:
  WORLDFORGE:   6 resource nodes
  HEROFORGE:    4 hero_class nodes
  BUILDFORGE:   3 building nodes, 8 building_workflow nodes,
                6 building_upgrade nodes, 4 crafting_recipe nodes
  ACTFORGE:     3 act nodes, 9 expedition nodes, 3 boss_expedition nodes,
                6 event nodes, 6 loot_table nodes
  ITEMFORGE:    12 item nodes, 4 loot_table nodes (total loot_tables: 10)
  UPGRADEFORGE: 8 upgrade nodes, 2 faction nodes, 1 prestige node
  TOTAL:        85 nodes across all forges
```

---

### Step 3 — Cross-Reference Audit (showing 2 failures)

```
CROSS-REFERENCE AUDIT running...

XR-01 through XR-08: PASS — all building costs, hero recruit costs, workflow hosts resolve.

DANGLING REFERENCE [XR-10] [SEVERITY: ERROR]
  Check:          crafting_recipe.output_item must be an item node (ITEMFORGE)
  Source node:    recipe-blood-chalice (crafting_recipe)
  Source field:   output_item
  Referenced ID:  "item-blood-chalice"
  Expected type:  item
  Fix:            Run ITEMFORGE — it must generate a node with id: "item-blood-chalice"
                  of type: "item". Add "item-blood-chalice" to ITEMFORGE's item definitions
                  (or verify BUILDFORGE recipe uses a correct placeholder ID).
  Blocking:       YES (STRICT_MODE: yes)

XR-11 through XR-21: PASS — all resource refs, expedition loot, act structure, upgrade costs resolve.

DANGLING REFERENCE [XR-22] [SEVERITY: ERROR]
  Check:          prestige trigger_condition (type: act_reached) target_id must be an act node
  Source node:    prestige-gehenna (prestige)
  Source field:   trigger_conditions[0].target_id
  Referenced ID:  "act-4"
  Expected type:  act
  Fix:            Run ACTFORGE — it must generate an act node with id: "act-4",
                  OR run UPGRADEFORGE and change the prestige trigger condition target to
                  an existing act ID (act-1, act-2, or act-3).
  Blocking:       YES (STRICT_MODE: yes)

XR-23: PASS — all artisan specializations match at least one workflow action_type.

CROSS-REFERENCE AUDIT COMPLETE
  Checks run:     23
  Passed:         21
  Failed (ERROR): 2  [XR-10, XR-22]
  Warnings:       0
  Status:         FAIL
```

---

### Step 4 — Calibration Audit (showing 1 warning)

```
CALIBRATION AUDIT:
  Table A — Timing: PASS (all 5 milestones within target)
  Table B — Material Flow: WARNING
    MATERIAL FLOW: resource-vitae — Vitae
      Sources: 3 expedition drops × 4 runs/hour = 12/hour
               Passive (Feeding Ground passive workflow): 2/hour
               Total: 14/hour
      Consumption: Haven workflow inputs: 8/hour
                   Recipe inputs: 12/hour
                   Total: 20/hour
      Balance: -6/hour DEFICIT
      WARNING — resource-vitae consumption exceeds source rate by 6/hour.
      Players will be vitae-blocked after 2–3 hours of play.
      Fix: Increase expedition vitae drops in ACTFORGE loot tables,
           or reduce Haven workflow vitae input costs in BUILDFORGE.
  Table C — Hero Power: PASS
  Table D — Equipment vs. Upgrade Power: PASS
  Table E — Prestige Soft-Lock:
    resets: ["resources", "buildings", "heroes", "upgrades"] — no expeditions reset. PASS
    Hero recruitment post-reset: Blood Bound (hero_class) has recruit_cost using
    resource-vitae with base_income: 2. PASS.
  Table F — Faction Pacing:
    Camarilla: 15.2 hours to max rep. PASS
    Sabbat: 11.8 hours to max rep. PASS
  Table G — Workflow Duration: PASS (all 8 workflows within 20–4800 ticks)

CALIBRATION AUDIT COMPLETE
  Calibration errors: 0
  Calibration warnings: 1 (vitae material deficit — Table B)
  Status: PASS_WITH_WARNINGS
```

---

### Step 5 — Node Merge

```
MERGE COMPLETE
  Total nodes merged: 83 (2 fewer than inventory — 2 duplicate loot_table IDs resolved)
  Duplicates resolved: 2 (ACTFORGE and ITEMFORGE both defined "loot-common-drops" —
                          kept ITEMFORGE version per pipeline order)
  Type conflicts: 0
  Status: PASS
```

---

### Step 6 — CANVASDOCTOR Results

```
CANVASDOCTOR INVOCATION:
  Wrote 83 nodes to .assembler-temp.json
  Running CANVASDOCTOR...
  Canvas Doctor Complete: 1 error · 2 warnings · 1 hint
    Error: recipe-blood-chalice — output_item "item-blood-chalice" not found
           (redundant with XR-10 — confirmed by ASSEMBLER)
    Warning: act-2-domains — no boss_expedition_id set
    Warning: faction-camarilla — rep_tiers is empty
    Hint: item-crimson-brooch — equipment has no stat modifiers
  Deleted .assembler-temp.json

  CANVASDOCTOR_CONFLICT detected:
    ASSEMBLER: XR-10 error for item-blood-chalice (dangling reference in crafting_recipe)
    CANVASDOCTOR: Same issue found independently via recipe output check
    Resolution: Same root cause — both reported in assembler-report.md. Fix XR-10 to resolve both.
```

---

### Terminal Summary

```
┌─────────────────────────────────────────────────────────────────────────┐
│  Assembler Complete                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  Kindred Dark Ages                                                      │
│  Status: FAIL                                                          │
├─────────────────────────────────────────────────────────────────────────┤
│  Nodes Merged: 83 total                                                 │
│    • Resources:       6   (WORLDFORGE)                                  │
│    • Hero Classes:    4   (HEROFORGE)                                   │
│    • Buildings:       3   (BUILDFORGE)                                  │
│    • Workflows:       8   (BUILDFORGE)                                  │
│    • Bldg Upgrades:   6   (BUILDFORGE)                                  │
│    • Recipes:         4   (BUILDFORGE)                                  │
│    • Acts:            3   (ACTFORGE)                                    │
│    • Expeditions:     9   (ACTFORGE)                                    │
│    • Boss Exped.:     3   (ACTFORGE)                                    │
│    • Events:          6   (ACTFORGE)                                    │
│    • Items:          12   (ITEMFORGE)                                   │
│    • Loot Tables:    10   (ITEMFORGE + ACTFORGE, 2 duplicates resolved) │
│    • Upgrades:        8   (UPGRADEFORGE)                                │
│    • Factions:        2   (UPGRADEFORGE)                                │
│    • Prestige:        1   (UPGRADEFORGE)                                │
├─────────────────────────────────────────────────────────────────────────┤
│  Validation:                                                            │
│    Cross-Reference Errors:   2   ✗ FAIL                                │
│    Calibration Errors:       0   ✓ PASS                                │
│    Calibration Warnings:     1   (vitae deficit — logged in report)    │
│    Canvas Doctor:     1 error · 2 warnings · 1 hint                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Output:  project.json NOT written (STRICT_MODE: yes, 2 errors)        │
│  Report:  guild-engine/generator/assembler-report.md                   │
│  Canvas:  guild-engine/generator/canvas-doctor-report.md               │
├─────────────────────────────────────────────────────────────────────────┤
│  FAIL: Fix upstream forges → re-run ASSEMBLER                          │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### assembler-report.md excerpt

```markdown
# Assembler Report — Kindred Dark Ages
### Generated 2026-03-30T14:22:00Z · Schema v1.2.0 · Assembler v1.0.0

## Summary
- **Status:** FAIL
- **Nodes Merged:** 83 total
- **Cross-Reference Errors:** 2 (blocking)
- **Calibration Warnings:** 1 (vitae deficit)
- **Canvas Doctor:** 1 error, 2 warnings, 1 hint

---

## ❌ Cross-Reference Errors (Must Fix Before Import)

### [XR-10] Missing item node referenced by crafting_recipe
**Source:** `recipe-blood-chalice.output_item` = `"item-blood-chalice"`
**Problem:** No item node with id "item-blood-chalice" exists in item-ecosystem.json.
ITEMFORGE must generate this item.
**Fix:** Run ITEMFORGE — it must generate a node with id: `"item-blood-chalice"` of type: `"item"`.
Check that BUILDFORGE recipe-blood-chalice.output_item matches the item ID ITEMFORGE generates.

### [XR-22] Missing act node referenced by prestige trigger condition
**Source:** `prestige-gehenna.trigger_conditions[0].target_id` = `"act-4"`
**Problem:** No act node with id "act-4" exists. The prestige requires reaching an act that
was never generated.
**Fix (option A):** Run ACTFORGE — generate a 4th act with id: `"act-4"`.
**Fix (option B):** Run UPGRADEFORGE — change prestige-gehenna trigger_conditions[0].target_id
from "act-4" to "act-3" (the final existing act).
```

---

## SECTION 15 — Critical Rules

1. **NEVER generate new content nodes.** ASSEMBLER only merges and validates. If a node is
   missing, report which upstream forge must generate it with the exact ID. Never generate the
   node itself.

2. **ALWAYS block output on ERROR-level failures when STRICT_MODE: yes.** A project.json with
   broken cross-references will import but will crash the runtime. Never silently skip this.

3. **NEVER auto-correct node field values.** Report issues. Let the designer fix upstream forges.
   The only exception: CANVASDOCTOR's own quick-fix system, which has designer confirmation built in.

4. **ALWAYS use type-branched logic for prestige trigger_conditions.** Do not flat-check `target_id`
   across all condition types. `resource_gte` conditions reference resources via `resource_id` (or
   `target_id` as fallback) — do not report false ERROR on conditions where `target_id` is
   intentionally absent.

5. **NEVER treat CANVASDOCTOR as a duplicate.** Invoke it as a black box after merging. Do not
   re-implement its field-level checks inside ASSEMBLER. If CANVASDOCTOR and ASSEMBLER both find the
   same issue, document both findings as a confirmation — do not suppress either.

6. **ALWAYS use pipeline order for duplicate resolution.** Same ID, same type: keep later forge's
   version. Same ID, different type: ERROR — cannot be resolved automatically.

7. **ALWAYS preserve all upstream forge flags** in assembler-report.md. The designer needs to know
   which design tensions exist in the generated content, even if the cross-references all pass.

8. **ALWAYS warn on STRICT_MODE: no.** The warning must be visible, prominent, and specific: the
   output project.json WILL FAIL the editor compiler and WILL crash the runtime if errors exist.

9. **ALWAYS document intended edges** derived from resolved cross-references in both
   `assembler-report.md` and `editor_metadata.intended_edges[]` in `project.json`.

10. **ALWAYS run the pre-run schema verification first.** Field name drift between forge versions
    produces false-positive errors. Verify before checking. Log every discrepancy found.

---

## SECTION 16 — Known Limitations (v1.0)

- **No auto-fix for dangling references** — reports the error, the upstream forge must be re-run
- **No edge generation** — documents intended connections for editor auto-rig; does not write edges
- **No editor compiler equivalent** — project.json still must pass the editor compiler's checks
- **No runtime behavior validation** — only schema-structural and cross-reference validation
- **No type-conflict resolution** — same ID, different types = ERROR; designer must rename one
- **No blueprint import handling** — blueprints are imported in editor after assembly
- **No formula string validation** — `duration_formula`, `yield_formula`, `currency_formula` field
  syntax is not checked (requires a formula evaluator)
- **Numeric value ranges not fully validated** — `unlock_condition.value` sensibility not checked
- **No faction cross-rep dynamics** — schema v1.2.0 has no `relations[]` field on faction nodes;
  intended faction relations exist only as design annotations in upstream forge calibration objects
  and are passed through to assembler-report.md but cannot be validated as node connections
- **`resource_gte` condition field ambiguity** — schema only defines `target_id`, but UPGRADEFORGE
  may generate `resource_id` field on these conditions; ASSEMBLER handles both at runtime but the
  long-term fix is to standardize on one field name across schema, UPGRADEFORGE, and ASSEMBLER

---

## SECTION 17 — Related Files

| File | Relationship |
|---|---|
| `guild-engine/generator/WORLDFORGE.md` | Upstream forge 1 — produces world-economy.json |
| `guild-engine/generator/HEROFORGE.md` | Upstream forge 2 — produces hero-roster.json |
| `guild-engine/generator/BUILDFORGE.md` | Upstream forge 3 — produces building-system.json |
| `guild-engine/generator/ACTFORGE.md` | Upstream forge 4 — produces act-*.blueprint.json |
| `guild-engine/generator/ITEMFORGE.md` | Upstream forge 5 — produces item-ecosystem.json |
| `guild-engine/generator/UPGRADEFORGE.md` | Upstream forge 6 — produces upgrade-ecosystem.json |
| `guild-engine/generator/CANVASDOCTOR.md` | Invoked after merge — field-level validation black box |
| `guild-engine/schema/project.schema.json` | Schema authority — all field names verified here first |
| `guild-engine/editor/src/compiler/rules.js` | Required fields per node type (has known discrepancies) |
| `guild-engine/editor/src/canvas/inferRelation.js` | Relation type strings for intended edges |
| `guild-engine/docs/WIKI.md` | Full node type reference — Section 2 for workflow field authority |
| `guild-engine/docs/DAY2-EVENING-DEEPDIVE.md` | ASSEMBLER's defined role in the Forge Suite |
| `guild-engine/generator/CHANGELOG.md` | Generator version history — append entry after each run |
