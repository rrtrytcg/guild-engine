# GENERATOR PASS 2 — Full project.json Generation
# Run this in Claude Code AFTER Pass 1 has completed.
# Input:  guild-engine/generator/world-template.json
# Output: guild-engine/generator/generated-project.json
#         (then auto-imported into the editor canvas)

---

## Your task

Read `guild-engine/generator/world-template.json` (written by Pass 1).
Read `guild-engine/schema/project.schema.json` (the full node schema).
Read `guild-engine/expedition-spec-v2.1.md` (the resolver spec — needed for correct stat values).
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
resource_ids:   { [key]: "resource-{key}" }
item_ids:       { [key]: "item-{key}" }
loot_table_ids: { [key]: "loot_table-{key}" }   // one per act + one per boss
recipe_ids:     {}                                // empty for MVP unless template specifies crafting
hero_class_ids: { [key]: "hero_class-{key}" }
building_ids:   { [key]: "building-{key}" }
expedition_ids: { [key]: "expedition-{act_num}-{key}" }
boss_ids:       { [key]: "boss_expedition-{key}" }
act_ids:        { [num]: "act-{num}" }
upgrade_ids:    {}                                // generate 2 generic upgrades per act
```

Write this manifest as a comment at the top of your working notes. Reference it for EVERY id field in every node. Never type an ID from memory — always look it up from the manifest.

---

## Step 2 — Stat value calibration

Use the difficulty_curve from world-template.json plus these calibration tables:

### Resource income rates
```
slow:   base_income = 0.5/s,  base_cap = 500
medium: base_income = 1.0/s,  base_cap = 1000
fast:   base_income = 2.0/s,  base_cap = 2000
unlimited: base_income = 1.0/s, base_cap = 0
```

### Recruit costs
```
cheap:    50  × primary_resource
moderate: 150 × primary_resource
expensive:400 × primary_resource
```

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

### Equipment stat modifiers by slot and stat_focus
```
weapon  + atk:  { "attack": 8 }
weapon  + spd:  { "attack": 4, "speed": 6 }
armor   + def:  { "defense": 8 }
armor   + hp:   { "hp": 40, "defense": 3 }
accessory + lck:{ "luck": 10 }
accessory + spd:{ "speed": 8 }
relic   + balanced: { "attack": 3, "defense": 3, "luck": 5 }
```

Rarity multipliers on stat modifiers:
```
common:    ×1.0
uncommon:  ×1.5
rare:      ×2.5
epic:      ×4.0
legendary: ×6.0
```
Round to nearest integer.

### Building production rates (per level)
```
Level 1: primary_resource at 1.0/s
Level 2: primary_resource at 2.5/s
Level 3: primary_resource at 5.0/s
Level 4: primary_resource at 10.0/s
```

### Building costs (primary resource)
```
Level 1: 0     (always free to build first level)
Level 2: 200
Level 3: 800
Level 4: 2500
```
Scale by ×1.5 for each additional building (second building costs 1.5× more, third 2.25× more, etc.)

### Expedition calibration (from expedition-spec-v2.1.md resolver)
```
// Standard expedition at difficulty_level N:
enemy_atk = N * 8
enemy_hp  = N * 60
duration:
  short:  30 + (N * 5)  seconds
  medium: 60 + (N * 10) seconds
  long:   120 + (N * 15) seconds

// Boss at difficulty_level N:
enemy_atk = N * 12    // higher burst = wipe threat
enemy_hp  = N * 150   // much more HP = longer fight
duration  = 120 + (N * 20) seconds
boss_hp (runtime): N * 200

party_size:
  act 1 zones: 2
  act 2 zones: 3
  act 3 zones: 4

base_xp = null   // auto-calculated from level
```

### XP curve feel
```
fast:   base_xp override = level * 25
normal: base_xp = null (auto = level * 15)
slow:   base_xp override = level * 8
```

### Resource costs feel (affects building and recruit costs)
```
generous: multiply all costs by 0.7
balanced: multiply by 1.0
tight:    multiply by 1.4
```
Apply this multiplier to ALL cost values after calibration.

---

## Step 3 — Loot table construction

For each act, create one standard loot table and one boss loot table.

**Standard loot table** — items that drop in that act's zones:
- Include all items with `drops_in_act == act.number` and `boss_only == false`
- Weight distribution: common=30, uncommon=15, rare=5
- Rolls: 1 for standard expeditions

**Boss loot table** — boss-only drops plus one guaranteed rare+:
- Include items with `boss_only == true` for this act
- Include one epic/rare item as guaranteed: `"guaranteed": true`
- Rolls: 2 for boss expeditions

If no items are designated for a specific act in the template, distribute items evenly across acts.

---

## Step 4 — Canvas layout

Lay out nodes in vertical columns by act. Palette positions:

```
Column positions (x values):
  Resources + Buildings: x = 80
  Hero Classes:          x = 320
  Act nodes:             x = 560
  Standard expeditions:  x = 800
  Boss expeditions:      x = 1040
  Loot tables:           x = 1280
  Items:                 x = 1520

Row spacing: y += 200 per node within a column
Act 1 starts at y = 80
Act 2 starts at y = 80 + (act1_node_count * 200) + 100 (gap between acts)
Act 3 follows same pattern
```

Every node must have a `canvas_pos: { x, y }` field.

---

## Step 5 — Upgrade generation

Generate 2 upgrades per act. These are unlocked progressively:

**Act 1 upgrades:**
```json
{
  "label": "[Theme] Training",
  "description": "Increases hero ATK by 10%",
  "cost": [{ "resource_id": "[primary_resource_id]", "amount": 300 }],
  "max_tier": 3,
  "effect": { "hero_stat_modifier": { "attack": 5 } }
}
```

```json
{
  "label": "[Theme] Fortification",
  "description": "Increases resource cap by 50%",
  "cost": [{ "resource_id": "[primary_resource_id]", "amount": 500 }],
  "max_tier": 2,
  "effect": { "resource_cap_multiplier": { "[primary_resource_key]": 1.5 } }
}
```

**Act 2 upgrades:**
```json
{
  "label": "Veteran Tactics",
  "description": "Improves expedition success rate",
  "cost": [{ "resource_id": "[primary_resource_id]", "amount": 1200 }],
  "max_tier": 3,
  "effect": { "expedition_success_bonus": 0.05 }
}
```

```json
{
  "label": "Master Craft",
  "description": "Crafting speed doubled",
  "cost": [{ "resource_id": "[primary_resource_id]", "amount": 2000 }],
  "max_tier": 1,
  "effect": { "craft_speed_multiplier": 2.0 }
}
```

Scale upgrade costs by the `resource_costs_feel` multiplier.

---

## Step 6 — Wire everything together

### Act node — expedition_ids and on_success_unlock chain
```
act 1 boss on_success_unlock → act 2 expedition ids (makes them visible)
act 2 boss on_success_unlock → act 3 expedition ids (if act 3 exists)
```

### Act node — expedition_ids
List all standard expedition IDs for that act (not boss).

### Expedition node — loot_table_id
Reference the act's standard loot_table ID.

### Boss expedition node — loot_table_id
Reference the act's boss loot_table ID.

### Loot table entries — item_id
Reference the correct item IDs from the manifest.

### Building levels — build_cost resource_id
Reference the correct resource IDs from the manifest.

### Hero class — recruit_cost resource_id
Reference the correct resource IDs from the manifest.

---

## Step 7 — Output format

Write the complete project.json to `guild-engine/generator/generated-project.json`.

The file must match this top-level structure exactly:
```json
{
  "meta": {
    "schema_version": "0.1.0",
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

Edges are empty — the editor will allow the designer to draw connections manually.
Node order in the array: resources, items, loot_tables, hero_classes, buildings, upgrades, expeditions, boss_expeditions, acts.

---

## Step 8 — Validation pass

After writing the file, run this validation mentally:

**Errors (must fix before finishing):**
- [ ] Every node has a unique `id`
- [ ] Every expedition node has a `level` field (integer 1–20)
- [ ] Every expedition node has NO `base_success_chance` field
- [ ] Every loot_table entry `item_id` exists in the nodes array
- [ ] Every expedition `loot_table_id` exists in the nodes array
- [ ] Every act `expedition_ids` entry exists in the nodes array
- [ ] Every act `boss_expedition_id` exists in the nodes array
- [ ] Every building level has a `build_cost` array (can be empty for level 1)
- [ ] Every hero_class has a `base_stats` object with all 5 stats
- [ ] JSON is valid (no trailing commas, no comments)

**Warnings (acceptable for MVP):**
- Acts with no additional completion_conditions (expected)
- Items with no recipes (expected — crafting is post-MVP)

If any errors are found, fix them before writing the final file.

---

## Step 9 — Auto-import instruction

After writing `generated-project.json`, print these instructions for the designer:

```
✓ Generated project written to guild-engine/generator/generated-project.json

  [title]
  ─────────────────────────────────────────
  Acts:      [N]
  Zones:     [N] standard + [N] boss
  Heroes:    [N] classes
  Resources: [N]
  Buildings: [N]
  Upgrades:  [N]
  Items:     [N]
  ─────────────────────────────────────────

To import into the editor:
  1. Run: npm run dev  (in guild-engine/editor/)
  2. Open: http://localhost:5173
  3. Click "Import project.json" in the toolbar
  4. Select: guild-engine/generator/generated-project.json
  5. Nodes will appear laid out in act columns on the canvas.
  6. Review warnings in Compile & Export before playing.

Recommended first edits:
  - Check building level costs feel right for your pacing
  - Review expedition enemy_atk values (wipe risk)
  - Add mid-run events to expeditions for narrative flavour
  - Write narrative_log text on each act node
```

---

## Critical rules

1. NEVER use a label as an ID. Always use the manifest IDs from Step 1.
2. NEVER leave `loot_table_id` as a placeholder string like "loot_table-id". It must be a real manifest ID or omitted entirely.
3. NEVER add `base_success_chance` to any expedition node.
4. ALWAYS set `canvas_pos` on every node.
5. ALWAYS set `visible: true` on resources, buildings, hero classes, and act 1 expeditions. Set `visible: false` on act 2+ expeditions (they unlock via on_success_unlock).
6. Stat values must be integers — no floats in stat blocks.
7. Costs must use `resource_id` (the manifest ID, not the key).

---

## Generator self-maintenance

Before doing anything else, read these files in this order:
1. `guild-engine/schema/project.schema.json` — authoritative field list
2. `guild-engine/expedition-spec-v2.1.md` — resolver and stat rules
3. `guild-engine/docs/WIKI.md` — full system reference
4. `guild-engine/generator/CHANGELOG.md` — what is and isn't supported

### Check CHANGELOG before generating

Read every entry in CHANGELOG.md. For each PENDING entry:
- If SCOPE is PASS2 or BOTH AND the feature is now in the schema: mark IMPLEMENTED, update the generator prompt section below to include it, and generate that content.
- If SCOPE is PASS2 or BOTH AND the feature is NOT yet in the schema: skip it silently — do not attempt to generate unsupported content.

This means the generator automatically expands its output as new systems are implemented, without requiring manual prompt rewrites for each feature.

### After generating

Append this entry to `guild-engine/generator/CHANGELOG.md`:
```
### Run log — [ISO date]
- INPUT: world-template.json title
- OUTPUT: generated-project.json
- PASS2 VERSION: v[current]
- NODE COUNT: [N] nodes total
- WARNINGS: [list any validation warnings found]
- NOTES: [any calibration decisions, anything skipped, any issues]
```

### If you discover a schema field that has no calibration table in this prompt

Generate a sensible default value, document it in the run log, and add it to the PENDING section of CHANGELOG.md with:
- TYPE: CALIBRATION
- SCOPE: PASS2
- STATUS: PENDING
- SUMMARY: "[field name] has no calibration table — using default [value]"

This ensures calibration gaps are tracked and fixed in the next prompt update.
