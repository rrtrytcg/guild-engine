# GENERATOR PASS 2 — Full project.json Generation
# Schema version: 1.2.0 (Day 2)
# Run this in Claude Code AFTER Pass 1 has completed.
# Input:  guild-engine/generator/world-template.json
# Output: guild-engine/generator/generated-project.json

---

## Your task

Read `guild-engine/generator/world-template.json` (written by Pass 1 or Translate Pass).
Read `guild-engine/schema/project.schema.json` (the full node schema — currently v1.2.0).
Read `guild-engine/expedition-spec-v2.1.md` (resolver spec — needed for correct stat values).
Read `guild-engine/generator/CHANGELOG.md` — check every PENDING entry before generating.
Read `guild-engine/editor/src/store/useStore.js` (to understand NODE_DEFAULTS structure).

Generate a complete, valid, immediately playable `project.json` that:
- Has real balanced stat values (not placeholder zeroes)
- Has all IDs cross-wired correctly (no dangling references)
- Has node canvas positions laid out in act columns
- Passes the compiler validation with zero errors and minimal warnings

---

## Step 1 — Generate the ID manifest FIRST

Before writing any node data, generate all IDs in one pass.
Use this exact format: `{type}-{key}` where key comes from world-template.json.

```
resource_ids:          { [key]: "resource-{key}" }
item_ids:              { [key]: "item-{key}" }
loot_table_ids:        { [key]: "loot_table-{key}" }   // one per act + one per boss
hero_class_ids:        { [key]: "hero_class-{key}" }
building_ids:          { [key]: "building-{key}" }
building_workflow_ids: { [key]: "building_workflow-{key}" }   // 2-3 per crafting building
building_upgrade_ids:  { [key]: "building_upgrade-{key}" }   // 1 per building level 2+
expedition_ids:        { [key]: "expedition-{act_num}-{key}" }
boss_ids:              { [key]: "boss_expedition-{key}" }
act_ids:               { [num]: "act-{num}" }
upgrade_ids:           {}    // generate 2 generic upgrades per act
blueprint_ids:         {}    // empty unless template specifies blueprints
```

Write this manifest as a comment at the top of your working notes.
Reference it for EVERY id field. Never type an ID from memory.

---

## Step 2 — Stat value calibration

### Resource income rates
```
slow:      base_income = 0.5/s,  base_cap = 500
medium:    base_income = 1.0/s,  base_cap = 1000
fast:      base_income = 2.0/s,  base_cap = 2000
unlimited: base_income = 1.0/s,  base_cap = 0
degrading: base_income = -0.2/s, base_cap = 100  // counts DOWN — see translation-flags.md
```

### Recruit costs (combat hero classes only)
```
cheap:    50  × primary_resource
moderate: 150 × primary_resource
expensive:400 × primary_resource
```
Artisan hero classes (hero_type: artisan) are NOT recruited via cost —
they are produced by building_workflow nodes with output_type: hero_instance.
Set recruit_cost: [] on artisan classes.

### Hero base stats by archetype (level 1)
```
balanced:   ATK:10  DEF:8   SPD:8   HP:100  LCK:5
atk-heavy:  ATK:18  DEF:5   SPD:6   HP:80   LCK:5
def-heavy:  ATK:6   DEF:18  SPD:5   HP:130  LCK:5
spd-heavy:  ATK:8   DEF:6   SPD:18  HP:90   LCK:5
lck-heavy:  ATK:8   DEF:6   SPD:8   HP:90   LCK:18
```

### Stat growth per level
```
balanced:   ATK:2  DEF:1.5  SPD:1.5  HP:20  LCK:1
atk-heavy:  ATK:3  DEF:1    SPD:1    HP:15  LCK:1
def-heavy:  ATK:1  DEF:3    SPD:1    HP:25  LCK:1
spd-heavy:  ATK:1  DEF:1    SPD:3    HP:18  LCK:1
lck-heavy:  ATK:1  DEF:1    SPD:1.5  HP:18  LCK:3
```

### Hero class Day 2 fields
For every hero_class node, add:
```json
{
  "hero_type": "combat",          // "combat" for all standard classes
  "combat_eligible": true,        // false for artisan classes only
  "primary_stat": "atk",         // highest weighted stat from archetype
  "xp_source": "expedition"      // "expedition" for combat, "workflow" for artisan
}
```

primary_stat mapping from archetype:
```
atk-heavy  → "atk"
def-heavy  → "def"
spd-heavy  → "spd"
lck-heavy  → "lck"
balanced   → "atk"
```

### Equipment stat modifiers by slot and stat_focus
```
weapon  + atk:     { "attack": 8 }
weapon  + spd:     { "attack": 4, "speed": 6 }
armor   + def:     { "defense": 8 }
armor   + hp:      { "hp": 40, "defense": 3 }
accessory + lck:   { "luck": 10 }
accessory + spd:   { "speed": 8 }
relic   + balanced:{ "attack": 3, "defense": 3, "luck": 5 }
```

Rarity multipliers:
```
common: ×1.0 / uncommon: ×1.5 / rare: ×2.5 / epic: ×4.0 / legendary: ×6.0
```
Round to nearest integer.

### Item Day 2 fields
For every item node, add:
```json
{
  "item_type": "equipment",   // "equipment" | "material" | "consumable"
  "stack_max": 1              // 1 for equipment, 99 for materials, 10 for consumables
}
```

For consumable items (item_type: consumable), add:
```json
{
  "consumable_config": {
    "buff_type": "stat_boost",     // "stat_boost" | "resource_boost" | "status_clear"
    "stat_modifiers": { "hp": 30 },
    "duration_expeditions": 1,      // lasts N expeditions
    "stack_max": 10
  }
}
```

### Building production rates (per level)
```
Level 1: primary_resource at 1.0/s  (cost: 0 — always free)
Level 2: primary_resource at 2.5/s  (cost: 200)
Level 3: primary_resource at 5.0/s  (cost: 800)
Level 4: primary_resource at 10.0/s (cost: 2500)
```
Scale by ×1.5 per additional building.

### Building Day 2 fields
For every building node, add:
```json
{
  "has_workflows": false,    // true only for crafting stations
  "artisan_slots": { "base_count": 0, "max_count": 0, "expand_by": "none" },
  "passive_events": []
}
```

For buildings with `is_crafting_station: true`:
```json
{
  "has_workflows": true,
  "artisan_slots": { "base_count": 1, "max_count": 3, "expand_by": "building_upgrade" }
}
```

---

## Step 2B — Building workflow generation (NEW in v1.2.0)

For each building with `is_crafting_station: true` in the world template,
generate 2-3 `building_workflow` nodes.

### Workflow behavior mapping from building theme
```
forge / smithy / workshop → behavior: "consume_item", workflow_mode: "queued"
brewery / apothecary / lab → behavior: "consume_resource", workflow_mode: "queued"  
library / academy / scriptorium → behavior: "consume_resource", workflow_mode: "passive"
mine / farm / well → behavior: "produce_resource", workflow_mode: "passive"
barracks / kennel / stable → behavior: "consume_resource", workflow_mode: "queued", output_type: "hero_instance"
```

### Standard workflow template
```json
{
  "id": "building_workflow-{building_key}_{workflow_key}",
  "type": "building_workflow",
  "label": "[Thematic Action] [Output]",
  "description": "string — what this workflow does in world terms",
  "building_id": "[parent building id from manifest]",
  "behavior": "consume_item | consume_resource | produce_resource | recruit_hero",
  "workflow_mode": "queued | passive",
  "action_type": "[specialization key — e.g. smelter, weaponsmith, brewer]",
  "base_duration_ticks": 80,
  "input_rules": [
    { "resource_id": "[id]", "amount": 10 }
  ],
  "output_rules": [
    {
      "output_type": "resource | item | consumable | world_effect | hero_instance",
      "target": "[resource or item id from manifest]",
      "quantity": 1,
      "chance": 1.0
    }
  ],
  "success_table": {
    "base_failure": 0.10,
    "base_crit": 0.05,
    "failure_behavior": "consume_inputs_no_output",
    "crit_behavior": "double_output",
    "crit_multiplier": 2,
    "failure_grants_xp": true,
    "failure_xp_multiplier": 0.5,
    "xp_on_complete": 20
  },
  "visible": true,
  "canvas_pos": { "x": 1760, "y": [calculated] }
}
```

### Calibration by workflow theme

**Forge-type (consume_item → item output):**
```
base_duration_ticks: 80   (~20s at 4 ticks/s)
base_failure:  0.10
base_crit:     0.08
crit_behavior: "quality_upgrade"
failure_behavior: "consume_inputs_no_output"
input: 5-10 units of a material resource
output: 1 equipment item
```

**Apothecary-type (consume_resource → consumable output):**
```
base_duration_ticks: 60   (~15s)
base_failure:  0.08
base_crit:     0.10
crit_behavior: "quality_upgrade"
failure_behavior: "partial_refund"
streak_bonus: { threshold: 5, duration_reduction: 0.15, crit_bonus: 0.05 }
input: 10-20 units of a material resource
output: 1-2 consumable items
```

**Library-type (consume_resource → world_effect output):**
```
base_duration_ticks: 200  (~50s)
base_failure:  0.05
base_crit:     0.05
crit_behavior: "breakthrough"
failure_behavior: "reset_progress_refund_inputs"
momentum_config: { gain_per_job: 10, decay_per_idle_tick: 0.5, thresholds: [25, 50, 75] }
input: 20-50 units of a primary resource
output: world_effect (unlock_node or apply_modifier)
```

### Artisan hero class generation

For each crafting building, generate one artisan hero_class:
```json
{
  "id": "hero_class-{building_key}_artisan",
  "type": "hero_class",
  "label": "[Thematic Title]",   // Forgemaster, Alchemist, Scholar, etc.
  "icon": "[appropriate emoji]",
  "description": "string",
  "hero_type": "artisan",
  "combat_eligible": false,
  "primary_stat": "atk",         // "atk" = craft skill for artisans
  "xp_source": "workflow",
  "stat_archetype": "balanced",
  "base_stats": { "attack": 10, "defense": 5, "speed": 5, "hp": 80, "luck": 8 },
  "stat_growth": { "attack": 2, "defense": 1, "speed": 1, "hp": 10, "luck": 1 },
  "slots": [],                   // artisans don't equip combat gear
  "recruit_cost": [],            // produced by workflow, not purchased
  "specializations": ["[action_type_1]", "[action_type_2]", "[action_type_3]"],
  "building_affinity": "[parent building id]",
  "visible": true,
  "canvas_pos": { "x": 320, "y": [calculated — below combat classes] }
}
```

Specialization names come from the action_type values of the building's workflows.

### Building upgrade generation (per crafting building)

Generate one building_upgrade node per level after level 1:
```json
{
  "id": "building_upgrade-{building_key}_l{N}",
  "type": "building_upgrade",
  "label": "[Thematic name for level N]",
  "description": "string",
  "building_id": "[parent building id]",
  "required_building_level": N,
  "cost": [{ "resource_id": "[primary_resource_id]", "amount": [200/800/2500 scaled] }],
  "unlocks_workflow_ids": ["[workflow id unlocked at this level]"],
  "artisan_slot_increase": 1,
  "visible": true,
  "canvas_pos": { "x": 2000, "y": [calculated] }
}
```

---

## Step 3 — Loot table construction

For each act, create one standard loot table and one boss loot table.

**Standard loot table:**
- Items with `drops_in_act == act.number` and `boss_only == false`
- Weight: common=30, uncommon=15, rare=5
- Rolls: 1

**Boss loot table:**
- Items with `boss_only == true` for this act
- One guaranteed epic/rare: `"guaranteed": true`
- Rolls: 2

---

## Step 4 — Canvas layout

```
Column positions (x values):
  Resources + Buildings:   x = 80
  Hero Classes (combat):   x = 320
  Hero Classes (artisan):  x = 320   (below combat classes, +gap)
  Act nodes:               x = 560
  Standard expeditions:    x = 800
  Boss expeditions:        x = 1040
  Loot tables:             x = 1280
  Items:                   x = 1520
  Building workflows:      x = 1760
  Building upgrades:       x = 2000

Row spacing: y += 200 per node within a column
Act 1 starts at y = 80
Act 2 starts at y = 80 + (act1_node_count * 200) + 100
Act 3 follows same pattern
```

---

## Step 5 — Upgrade generation

**Act 1 upgrades (2):**
```json
{ "label": "[Theme] Training", "effect": { "hero_stat_modifier": { "attack": 5 } },
  "cost": [{ "resource_id": "[primary]", "amount": 300 }], "max_tier": 3 }

{ "label": "[Theme] Fortification", "effect": { "resource_cap_multiplier": { "[primary_key]": 1.5 } },
  "cost": [{ "resource_id": "[primary]", "amount": 500 }], "max_tier": 2 }
```

**Act 2 upgrades (2):**
```json
{ "label": "Veteran Tactics", "effect": { "expedition_success_bonus": 0.05 },
  "cost": [{ "resource_id": "[primary]", "amount": 1200 }], "max_tier": 3 }

{ "label": "Master Craft", "effect": { "craft_speed_multiplier": 2.0 },
  "cost": [{ "resource_id": "[primary]", "amount": 2000 }], "max_tier": 1 }
```

Scale all upgrade costs by `resource_costs_feel` multiplier.

---

## Step 6 — Wire everything together

### Standard cross-references (unchanged from v1.0.0)
- Act boss `on_success_unlock` → next act expedition IDs
- Expedition `loot_table_id` → act standard loot table
- Boss expedition `loot_table_id` → act boss loot table
- Loot table entries `item_id` → item IDs from manifest
- Building levels `build_cost resource_id` → resource IDs
- Hero class `recruit_cost resource_id` → resource IDs

### New Day 2 cross-references
- `building_workflow.building_id` → parent building ID
- `building_upgrade.building_id` → parent building ID
- `building_upgrade.unlocks_workflow_ids[]` → building_workflow IDs
- `hero_class[artisan].building_affinity` → parent building ID
- `building_workflow.output_rules[].target` → resource or item ID from manifest
- `building_workflow.input_rules[].resource_id` → resource ID from manifest

---

## Step 7 — Output format

Write complete project.json to `guild-engine/generator/generated-project.json`.

```json
{
  "meta": {
    "schema_version": "1.2.0",
    "title": "string",
    "author": "",
    "description": "string",
    "created_at": "[ISO timestamp]",
    "updated_at": "[ISO timestamp]"
  },
  "nodes": [ ...all nodes... ],
  "edges": []
}
```

Node order: resources, items, loot_tables, hero_classes (combat first, artisan second),
buildings, building_workflows, building_upgrades, upgrades, expeditions,
boss_expeditions, acts.

---

## Step 8 — Validation pass

**Errors (must fix):**
- [ ] Every node has a unique id
- [ ] Every expedition has `level` field, no `base_success_chance`
- [ ] Every loot_table entry `item_id` exists in nodes
- [ ] Every expedition `loot_table_id` exists in nodes
- [ ] Every act `expedition_ids` entry exists in nodes
- [ ] Every act `boss_expedition_id` exists in nodes
- [ ] Every building level has `build_cost` array
- [ ] Every hero_class has `base_stats` with all 5 stats
- [ ] Every `building_workflow.building_id` exists in nodes
- [ ] Every `building_upgrade.building_id` exists in nodes
- [ ] Every `building_workflow` output_rule `target` exists in nodes
- [ ] Every artisan hero_class has `combat_eligible: false`
- [ ] No circular building prerequisites
- [ ] JSON is valid

**Warnings (acceptable):**
- Acts with no additional completion_conditions
- Buildings with no workflows (non-crafting buildings — expected)
- Workflows with no building_upgrade unlocking them (level 1 workflows — expected)

---

## Step 9 — Auto-import instructions

```
✓ Generated project written to guild-engine/generator/generated-project.json

  [title]
  ─────────────────────────────────────────────
  Schema:          1.2.0
  Acts:            [N]
  Zones:           [N] standard + [N] boss
  Heroes:          [N] combat + [N] artisan classes
  Resources:       [N]
  Buildings:       [N] ([N] crafting stations)
  Workflows:       [N]
  Building upgrades:[N]
  Upgrades:        [N]
  Items:           [N]
  ─────────────────────────────────────────────

To import into the editor:
  1. npm run dev  (in guild-engine/editor/)
  2. Open http://localhost:5173
  3. Click "Import project.json"
  4. Select guild-engine/generator/generated-project.json
  5. Nodes appear in act columns. Workflows appear in right columns.

Recommended first edits:
  - Review workflow base_duration_ticks (feel is set at ~20-50s per job)
  - Check building_upgrade unlock chains match your intended progression
  - Add artisan specialization flavour text
  - Wire any world_effect workflow outputs to specific expedition/building IDs
```

---

## Critical rules

1. NEVER use a label as an ID. Always use the manifest.
2. NEVER add `base_success_chance` to expeditions.
3. NEVER set `combat_eligible: true` on artisan hero classes.
4. ALWAYS set `canvas_pos` on every node including workflows and upgrades.
5. ALWAYS set `visible: true` on act 1 content, `visible: false` on act 2+.
6. Stat values must be integers — no floats in stat blocks.
7. Artisan classes have `recruit_cost: []` — they are produced, not purchased.
8. Schema version in meta must be `"1.2.0"`.

---

## Generator self-maintenance

Before doing anything else, read in order:
1. `guild-engine/schema/project.schema.json`
2. `guild-engine/expedition-spec-v2.1.md`
3. `guild-engine/docs/WIKI.md`
4. `guild-engine/generator/CHANGELOG.md`

Check every PENDING entry. If SCOPE is PASS2 or BOTH AND the feature is
now in the schema: mark IMPLEMENTED, include it in generation.

After generating, append to `guild-engine/generator/CHANGELOG.md`:
```
### Run log — [ISO date]
- INPUT: [world-template.json title]
- OUTPUT: generated-project.json
- SCHEMA VERSION: 1.2.0
- NODE COUNT: [N] total ([N] workflows, [N] artisan classes)
- WARNINGS: [list]
- NOTES: [decisions made]
```

If you find a schema field with no calibration table, document it:
```
- TYPE: CALIBRATION
- SCOPE: PASS2
- STATUS: PENDING
- SUMMARY: "[field] has no calibration table — used default [value]"
```
