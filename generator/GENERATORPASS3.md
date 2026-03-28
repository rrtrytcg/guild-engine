# GENERATOR PASS 3 — World Expander (Optional, Repeatable)
# Run this in Claude Code any time after Pass 2 has completed.
# Can be run multiple times — each run adds new content without touching existing content.
#
# Input:  guild-engine/generator/generated-project.json  (the live project)
#         guild-engine/generator/expansion-prompt.txt     (what you want to add)
# Output: guild-engine/generator/generated-project.json  (patched in place)
#         guild-engine/generator/expansion-log.md         (what was added this run)

---

## Purpose

Pass 3 is an iterative expander. It reads your existing generated world and adds new content
on top of it without touching anything that already exists. You can run it as many times
as you want — each run layers more content onto the world.

It never deletes, renames, or re-balances existing nodes. It only adds.

---

## Before doing anything else

Read these files in this order:
1. `guild-engine/schema/project.schema.json` — authoritative field list
2. `guild-engine/expedition-spec-v2.1.md` — resolver and stat rules
3. `guild-engine/docs/WIKI.md` — full system reference
4. `guild-engine/generator/CHANGELOG.md` — what systems are implemented
5. `guild-engine/generator/generated-project.json` — the existing world (READ ONLY until Step 7)
6. `guild-engine/generator/expansion-prompt.txt` — what the designer wants to add

Do NOT modify generated-project.json until Step 7.

---

## Step 1 — Audit the existing world

Before expanding, build a complete picture of what already exists.
Extract and print this audit:

```
EXISTING WORLD AUDIT
────────────────────────────────────────────
Title:      [meta.title]
Acts:       [N] — Act numbers: [list]
  Act [N]:  [N] standard zones, 1 boss — difficulty levels [min]–[max]
Nodes:      [total count]
  Resources:   [N] — IDs: [list with labels]
  Items:       [N] — IDs: [list with labels and slots]
  Loot tables: [N] — IDs: [list]
  Hero classes:[N] — IDs: [list with labels]
  Buildings:   [N] — IDs: [list with labels]
  Upgrades:    [N] — IDs: [list]
  Expeditions: [N] — IDs: [list with labels and levels]
  Boss exps:   [N] — IDs: [list with labels and levels]
  Acts:        [N] — IDs: [list with labels]

Difficulty range: Level [min] to [max]
Highest act number: [N]
Canvas bounds: x [min]–[max], y [min]–[max]
────────────────────────────────────────────
```

This audit is your reference for the entire pass. Use it to:
- Avoid ID collisions (all new IDs must not exist in this list)
- Place new canvas nodes outside existing bounds
- Scale new content correctly relative to existing difficulty

---

## Step 2 — Parse the expansion prompt

Read `guild-engine/generator/expansion-prompt.txt`.

The designer may ask for any combination of:
- "Add a new act" — generate a full act with zones, boss, loot tables, items
- "Add zones to Act [N]" — add 1–3 standard expeditions to an existing act
- "Add a new hero class" — generate a hero class with stats, slots, recruit cost
- "Add items to [zone/act]" — generate new items and wire them into existing loot tables
- "Add events to expeditions" — generate mid-run events for existing expeditions
- Free-form requests — interpret them into one or more of the above

If the prompt is ambiguous, make sensible decisions and document them in the expansion log.
Do not ask for clarification — just proceed with the most reasonable interpretation.

---

## Step 3 — Generate new ID manifest

Generate IDs for ALL new content before writing any data.
Format: `{type}-{descriptive-key}-exp{N}` where N is the expansion run number.

To find the current expansion number: check how many entries exist in `expansion-log.md`.
If the file doesn't exist, this is expansion run 1.

```
NEW IDs THIS RUN (expansion [N]):
  new_resource_ids:    { [key]: "resource-{key}-exp[N]" }
  new_item_ids:        { [key]: "item-{key}-exp[N]" }
  new_loot_table_ids:  { [key]: "loot_table-{key}-exp[N]" }
  new_hero_class_ids:  { [key]: "hero_class-{key}-exp[N]" }
  new_building_ids:    { [key]: "building-{key}-exp[N]" }
  new_upgrade_ids:     { [key]: "upgrade-{key}-exp[N]" }
  new_expedition_ids:  { [key]: "expedition-{key}-exp[N]" }
  new_boss_ids:        { [key]: "boss_expedition-{key}-exp[N]" }
  new_act_ids:         { [num]: "act-{num}-exp[N]" }
```

Verify: none of these IDs exist in the existing world audit from Step 1.

---

## Step 4 — Scale new content to existing difficulty curve

### Determine the expansion difficulty range

If the designer specified a difficulty range in expansion-prompt.txt, use it.
Otherwise apply this rule:

```
existing_max_level = highest expedition.level in current project
new_content_min_level = existing_max_level + 1
new_content_max_level = existing_max_level + (5 * number_of_new_acts)

// For zones added to existing acts:
new_zone_level = avg(levels of other zones in that act) ± 1
```

New content is ALWAYS harder than or equal to the hardest existing content.
Never generate new content that is easier than existing content — it breaks progression.

### Calibration tables (same as Pass 2, applied to new levels)

```
enemy_atk = level * 8       (standard) | level * 12  (boss)
enemy_hp  = level * 60      (standard) | level * 150 (boss)
boss_hp   = level * 200     (runtime)

duration:
  short:  30 + (level * 5) seconds
  medium: 60 + (level * 10) seconds
  long:   120 + (level * 15) seconds

party_size:
  levels 1–7:   2
  levels 8–14:  3
  levels 15–20: 4

base_xp = null  (auto from level * 15)
```

For new items, rarity scales with act:
```
new_act_1_content: common, uncommon
new_act_2_content: uncommon, rare
new_act_3+_content: rare, epic, occasional legendary
```

---

## Step 5 — Canvas placement for new nodes

New nodes must not overlap existing nodes.

```
// Find current canvas bounds from audit
max_x = highest x in existing canvas_pos values
max_y = highest y in existing canvas_pos values

// New act columns start to the right of existing content
new_act_start_x = max_x + 300

// New zones added to existing acts go below existing zones in that act
// Find the lowest y in the target act's expeditions, add 200
new_zone_y = (lowest y of target act's expeditions) + 200

// New items/loot tables go to the right of existing items
new_item_x = max_x + 300
new_item_y = 80  // reset y for new column
```

---

## Step 6 — Generate new nodes

### If adding a new act

Generate a complete act following Pass 2 rules:
- Act node with `expedition_ids` and `boss_expedition_id`
- 2–4 standard expeditions
- 1 boss expedition
- 1 standard loot table
- 1 boss loot table
- 2–4 new items (themed to the new act)
- 2 new upgrades

Wire `on_success_unlock` on the PREVIOUS act's boss to reveal new act expeditions:
```
// Find the existing highest-numbered act's boss expedition
// Add new expedition IDs to its on_success_unlock array
// This is the ONE case where an existing node is modified
```

Set `visible: false` on all new act expeditions (they unlock via on_success_unlock).

### If adding zones to an existing act

Generate 1–3 standard expeditions only:
- Level within the act's existing range ±1
- Reference the act's existing loot_table_id
- Add new expedition IDs to the existing act's `expedition_ids` array
  (this modifies the existing act node — the ONLY allowed modification)
- Set `visible: true` if act is already unlocked, `visible: false` if not

### If adding a new hero class

Generate a complete hero_class node following Pass 2 calibration tables.
Set `visible: true` — new classes are immediately available.
Do not modify existing buildings — hero class stands alone until designer wires it.

### If adding items

Generate new item nodes.
Add entries to the MOST RELEVANT existing loot table:
- If items thematically match a specific act's zones, add to that act's loot_table
- If general purpose, add to the highest-level existing loot table
- This modifies existing loot_table nodes' `entries` arrays — allowed

### If adding mid-run events

For each targeted expedition, generate 2–3 events:
```json
{
  "id": "evt-{key}-exp[N]",
  "label": "string — short evocative name",
  "trigger_chance": 0.25,
  "choices": [
    {
      "label": "string",
      "outcome": {
        "log_message": "string",
        "resource_delta": { "[resource_id]": [positive or negative amount] }
      }
    },
    {
      "label": "string",
      "outcome": {
        "log_message": "string",
        "loot_table_id": "[existing loot_table_id]"
      }
    }
  ]
}
```
Add events to the existing expedition's `events` array — allowed modification.

---

## Step 7 — Patch generated-project.json

This is the only step that writes to the file.

Apply changes in this order:
1. Append all new nodes to the `nodes` array
2. Apply allowed modifications to existing nodes:
   - Previous act boss: add new expedition IDs to `on_success_unlock`
   - Existing acts (zone additions): add new expedition IDs to `expedition_ids`
   - Existing loot tables (item additions): add new entries to `entries`
   - Existing expeditions (event additions): add new events to `events`
3. Update `meta.updated_at` to current ISO timestamp
4. Write the complete patched file

### Modification rules — strictly enforced
```
ALLOWED to modify on existing nodes:
  ✓ act.expedition_ids              — append only, never remove
  ✓ act.on_success_unlock           — append only (via previous act's boss)
  ✓ boss_expedition.on_success_unlock — append only
  ✓ loot_table.entries              — append only, never remove
  ✓ expedition.events               — append only, never remove
  ✓ meta.updated_at                 — always update

NEVER modify on existing nodes:
  ✗ Any node's id
  ✗ Any node's label
  ✗ Any stat value (ATK, DEF, level, enemy_atk, enemy_hp, costs)
  ✗ Any existing loot entry's weight or guaranteed flag
  ✗ canvas_pos of any existing node
  ✗ visible flag of any existing node
  ✗ Any field not explicitly listed as ALLOWED above
```

---

## Step 8 — Validation pass

After patching, validate:
- [ ] All new node IDs are unique across the entire file
- [ ] All new expedition nodes have `level` field, no `base_success_chance`
- [ ] All new loot table entries reference existing or new item IDs
- [ ] All new act `expedition_ids` entries exist in nodes
- [ ] All new act `boss_expedition_id` values exist in nodes
- [ ] JSON is valid
- [ ] Total node count increased (never decreased)

---

## Step 9 — Write expansion log

Write or append to `guild-engine/generator/expansion-log.md`:

```markdown
## Expansion Run [N] — [ISO date]

**Prompt:** [first 30 words of expansion-prompt.txt]

**Added:**
- [N] new acts (Act [numbers])
- [N] new expeditions ([labels], levels [range])
- [N] new boss expeditions ([labels])
- [N] new items ([labels])
- [N] new hero classes ([labels])
- [N] events added to existing expeditions

**Modified existing nodes:**
- [list each modified node ID and what was appended]

**Difficulty range this expansion:** Level [min]–[max]
**Total nodes now:** [N]
**Canvas bounds now:** x [min]–[max], y [min]–[max]

**Designer notes:**
[Any decisions made, ambiguities resolved, things to review manually]
```

Then append a run log entry to `guild-engine/generator/CHANGELOG.md`:
```
### Pass 3 Run [N] — [ISO date]
- TYPE: EXPANSION
- SCOPE: PASS3
- STATUS: IMPLEMENTED
- SUMMARY: [one line — what was added]
- GENERATOR IMPACT: None (expansion run, not a system change)
```

---

## Step 10 — Print import instructions

```
✓ World expanded — Run [N] complete
  guild-engine/generator/generated-project.json updated in place

  Added this run:
  [repeat the summary from expansion-log.md]

  To see changes in the editor:
    1. Open http://localhost:5173
    2. Click "Import project.json"
    3. Select guild-engine/generator/generated-project.json
    4. New nodes appear to the right of existing content.

  To expand further:
    Edit guild-engine/generator/expansion-prompt.txt and run Pass 3 again.
    Each run layers on top of the previous — nothing is ever removed.

  Recommended review after this run:
  [list specific things to check based on what was generated]
```

---

## Critical rules

1. NEVER delete or modify existing node IDs, labels, stats, or costs.
2. NEVER re-balance existing content — if it's wrong, the designer fixes it manually.
3. NEVER generate content at a lower difficulty than existing content.
4. ALWAYS append new expedition IDs to the previous act's boss `on_success_unlock`.
5. ALWAYS set new act expeditions to `visible: false`.
6. ALWAYS use the exp[N] suffix on new IDs to prevent collisions across runs.
7. If expansion-prompt.txt is empty or missing, print an error and stop:
   ```
   ERROR: guild-engine/generator/expansion-prompt.txt is empty or missing.
   Write what you want to add to the world in that file, then run Pass 3 again.
   ```
