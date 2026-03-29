# ACTFORGE — AI-Assisted Act Generation
# Run this in Claude Code to generate complete act blueprints from text descriptions.
#
# Input:  User's narrative description + difficulty/theme/duration parameters
# Output: guild-engine/generator/act-{name}.blueprint.json
#
# This prompt produces blueprint files compatible with the editor's Blueprint Library.
# Generated acts appear under the "Acts" category tab and support parameter injection.

---

## Your Task

Read the user's act description. Generate a complete, playable act structure using
Guild Engine's existing node types. Output a `.blueprint.json` file that can be
imported via the Blueprint Library.

**Do NOT create new node types.** Map the user's narrative terms to existing types:

| User's term | Guild Engine type | Notes |
|-------------|-------------------|-------|
| "zone" | `expedition` | Standard expedition node |
| "area" / "region" | `expedition` | Same as zone |
| "boss arena" | `boss_expedition` | Final encounter |
| "side zone" | `expedition` | With `unlock_conditions[]` |
| "encounter" | `expedition` | Combat-focused, shorter duration |
| "loot" | `loot_table` | Rewards for expeditions |
| "event" / "story beat" | `event` | Mid-expedition narrative |
| "act" | `act` | Container node |

---

## Input Format

User provides:

```
ACT_DESCRIPTION: "{{USER_TEXT}}"
DIFFICULTY_TARGET: "{{early (lvl 1-5)|mid (lvl 6-10)|late (lvl 11-15)|endgame (lvl 16-20)}}"
THEME: "{{fantasy|scifi|steampunk|horror|industrial|coastal|underground|urban}}"
DURATION_ESTIMATE: "{{short (30min)|medium (1hr)|long (2hr+)}}"
```

If the user doesn't specify, default to:
- DIFFICULTY_TARGET: mid
- THEME: fantasy
- DURATION_ESTIMATE: medium

---

## STEP 1 — NARRATIVE ANALYSIS

Before generating nodes, analyze the input text for:

**1. Location Extraction**
Identify 2-5 distinct areas (caves, cities, temples, ruins, etc.).
Each becomes an `expedition` node.

**2. Actor Identification**
Who are the antagonists? (cultists, smugglers, monsters, rival guilds)
These inform enemy types and event choices.

**3. MacGuffin Detection**
What object/person drives the plot? (kidnapped person, artifact, revenge target)
Used for event text and boss motivation.

**4. Temporal Elements**
Time pressure? (low tide, eclipse, ritual countdown, escaping guards)
Becomes `special_mechanics` on boss or mid-path events.

**5. Moral Choice Points**
Betrayal options? Spare or kill decisions? Faction alignments?
These become `event.choices[]` with different consequences.

**6. Escalation Pattern**
How does threat increase from first zone to finale?
Map to `danger_level` progression (see calibration tables below).

---

## STEP 2 — CALIBRATION TABLES

Use these tables to balance the generated act.

### Zone Count by Duration

| Duration | Standard Expeditions | Boss | Side Zones (max) |
|----------|---------------------|------|------------------|
| short (30min) | 2 | 1 | 0-1 |
| medium (1hr) | 3-4 | 1 | 1-2 |
| long (2hr+) | 4-5 | 1 | 2-3 |

### Danger Level by Act Position

Danger level maps to expedition `level` field and enemy scaling.

| Act Position | Danger Range | Enemy ATK (per level) | Enemy HP (per level) |
|--------------|--------------|----------------------|---------------------|
| Zone 1 (entry) | 2-4 | ×8-10 | ×60-70 |
| Zone 2 (buildup) | 4-6 | ×10-12 | ×70-85 |
| Zone 3 (mid) | 6-8 | ×12-14 | ×85-100 |
| Zone 4 (climax approach) | 8-9 | ×14-16 | ×100-120 |
| Boss (final) | 9-10 | ×15-18 | ×150-200 |
| Secret boss | 11-12 | ×18-22 | ×200-250 |

**Formula for enemy stats:**
```
enemy_atk = level × (8 to 18 based on danger)
enemy_hp = level × (60 to 250 based on danger)
```

### Loot Tier by Danger Level

| Danger | Common | Uncommon | Rare | Epic | Legendary |
|--------|--------|----------|------|------|-----------|
| 2-3 | 60% | 30% | 10% | 0% | 0% |
| 4-5 | 45% | 35% | 15% | 5% | 0% |
| 6-7 | 30% | 35% | 25% | 10% | 0% |
| 8-9 | 20% | 25% | 30% | 20% | 5% |
| 10+ | 10% | 15% | 25% | 35% | 15% |

### Special Mechanics Library

Pick 1-3 mechanics that fit the theme:

| Mechanic | Effect | Best for |
|----------|--------|----------|
| `tide_change` | Duration varies, loot changes | Coastal, swamp |
| `darkness` | Party size reduced, LCK matters | Underground, horror |
| `reinforcements` | Enemy ATK increases over time | Siege, guild raids |
| `trap_laden` | Party HP reduced at start | Dungeons, vaults |
| `time_pressure` | Duration -30%, boss enrages | Heist, rescue |
| `environmental_hazard` | Random party damage | Volcanic, cursed |
| `faction_interference` | Random faction event | Urban, political |

### Side Zone Unlock Conditions

Use existing `unlock_conditions[]` format. Pick one per side zone:

| Trigger Type | unlock_condition | Example |
|--------------|-----------------|---------|
| Secret found | `expedition_completed` + specific expedition | Find hidden switch |
| Boss pre-condition | `expedition_completed` (main path only) | Kill boss before timer |
| Faction standing | `faction_rep_gte` | Rep ≥ 3 with smugglers |
| Rare random | `act_start` (10% chance) | Random encounter |
| Puzzle solved | `expedition_completed` + event choice | Choose "investigate" |
| Item required | `item_owned` (from previous act) | Have key from Act 1 |

---

## STEP 3 — GENERATION RULES

### Act Structure (Mandatory)

Every generated act MUST have:
1. **One `act` node** — container with `expedition_ids[]` and `boss_expedition_id`
2. **2-5 `expedition` nodes** — standard zones (based on duration)
3. **One `boss_expedition` node** — final encounter
4. **1-3 `loot_table` nodes** — standard + boss loot
5. **0-3 `event` nodes** — mid-expedition narrative (at least one per zone)
6. **0-2 side expeditions** — optional content with unlock conditions

### Boss Design Pattern

Every boss MUST have:
- `phases[]` array with at least 2 phases (phase at 100% HP, phase at 50% HP)
- `special_mechanics[]` array with 1-3 mechanics from the library
- `loot_table_id` pointing to boss-specific loot table
- `on_success_unlock[]` array (for next act progression)

Phase structure:
```json
"phases": [
  {
    "phase_number": 1,
    "hp_threshold": 1.0,
    "label": "Opening Stance",
    "modifier": {},
    "log_message": "The boss readies their weapon..."
  },
  {
    "phase_number": 2,
    "hp_threshold": 0.5,
    "label": "Desperate Fury",
    "modifier": { "attack": 5, "speed": 3 },
    "log_message": "Wounded, the boss fights more fiercely!"
  }
]
```

### Loot Table Structure

**Standard loot table:**
- 3-5 item entries with varying weights
- Weight distribution matches loot tier table above
- At least one material/resource entry for crafting

**Boss loot table:**
- 1 guaranteed epic/rare item (`guaranteed: true`)
- 2-4 weighted entries
- Special drop tied to act's MacGuffin (e.g., "Tide Revenant Heart")

### Event Structure

Every event MUST have:
- `trigger_type`: `"on_enter"` or `"on_kill"` or `"on_timer"`
- `trigger_target`: expedition ID or boss ID
- `choices[]` array with 2-4 options
- Each choice has `outcome` with at least one effect:
  - `log_message`
  - `resource_delta`
  - `loot_table_id`
  - `hero_status`

---

## STEP 4 — BLUEPRINT OUTPUT FORMAT

Output a `.blueprint.json` file with this exact structure:

```json
{
  "blueprint_meta": {
    "id": "act-{generated-slug}",
    "label": "{Act Name}",
    "description": "One-sentence summary of the act fantasy",
    "complexity": "basic|medium|complex|epic",
    "requires_schema_version": "1.2.0",
    "created_at": "{ISO timestamp}",
    "flavor": "{THEME}",
    "parameters": [
      {
        "key": "act_number",
        "label": "Act Number",
        "type": "number",
        "required": true,
        "description": "Which act number this is (1, 2, 3...)",
        "injects_into": ["act-{id}.act_number"]
      },
      {
        "key": "difficulty_level",
        "label": "Base Difficulty Level",
        "type": "number",
        "required": true,
        "description": "Starting level for expeditions (1-20)",
        "injects_into": ["expedition-{id}.level", "boss-{id}.level"]
      },
      {
        "key": "loot_prefix",
        "label": "Loot Table Prefix",
        "type": "string",
        "required": true,
        "description": "Prefix for generated loot table IDs",
        "injects_into": ["loot_table-{id}.id"]
      }
    ]
  },
  "nodes": [
    {
      "id": "act-{slug}",
      "type": "act",
      "label": "{Act Name}",
      "description": "{narrative description}",
      "act_number": 1,
      "completion_conditions": [
        { "type": "boss_defeated", "target_id": "boss-{slug}" }
      ],
      "expedition_ids": ["exp-{slug}-1", "exp-{slug}-2"],
      "boss_expedition_id": "boss-{slug}",
      "on_complete_events": [],
      "unlocks_node_ids": [],
      "narrative_log": "{flavor text}",
      "visible": true,
      "canvas_pos": { "x": 0, "y": 0 }
    },
    {
      "id": "exp-{slug}-1",
      "type": "expedition",
      "label": "{Zone Name}",
      "description": "{flavor text}",
      "icon": "{emoji}",
      "duration_s": 60,
      "party_size": 3,
      "level": 5,
      "enemy_atk": 50,
      "enemy_hp": 400,
      "base_xp": null,
      "curse_chance": 0.1,
      "loot_table_id": "loot-{slug}-standard",
      "fail_loot_table_id": "",
      "entry_cost": [],
      "resource_rewards": [],
      "faction_rewards": [],
      "on_success_unlock": [],
      "events": ["event-{slug}-1"],
      "unlock_conditions": [],
      "visible": true,
      "canvas_pos": { "x": 200, "y": 100 }
    },
    {
      "id": "boss-{slug}",
      "type": "boss_expedition",
      "label": "{Boss Name}",
      "description": "{boss flavor}",
      "icon": "{emoji}",
      "duration_s": 120,
      "party_size": 4,
      "level": 7,
      "enemy_atk": 90,
      "enemy_hp": 1200,
      "boss_hp": 2000,
      "boss_stats": { "attack": 25, "defense": 15, "speed": 8 },
      "phases": [...],
      "special_mechanics": ["tide_change", "reinforcements"],
      "loot_table_id": "loot-{slug}-boss",
      "on_success_unlock": [],
      "repeatable": false,
      "unlock_conditions": [],
      "visible": true,
      "canvas_pos": { "x": 600, "y": 100 }
    },
    {
      "id": "loot-{slug}-standard",
      "type": "loot_table",
      "label": "{Act} Standard Loot",
      "rolls": 1,
      "entries": [
        { "item_id": "item-{material}", "weight": 30, "min_qty": 1, "max_qty": 2, "guaranteed": false },
        { "item_id": "item-{uncommon}", "weight": 15, "min_qty": 1, "max_qty": 1, "guaranteed": false }
      ],
      "visible": true,
      "canvas_pos": { "x": 400, "y": 300 }
    },
    {
      "id": "event-{slug}-1",
      "type": "event",
      "label": "{Event Name}",
      "description": "{context}",
      "log_message": "{narrative text}",
      "trigger_type": "on_enter",
      "trigger_target": "exp-{slug}-1",
      "choices": [
        {
          "label": "{Choice A}",
          "outcome": {
            "log_message": "{result text}",
            "resource_delta": {}
          }
        },
        {
          "label": "{Choice B}",
          "outcome": {
            "log_message": "{result text}",
            "loot_table_id": "loot-{slug}-standard"
          }
        }
      ],
      "visible": true,
      "canvas_pos": { "x": 200, "y": 200 }
    }
  ],
  "edges": [
    {
      "id": "edge-act-exp1",
      "source": "act-{slug}",
      "target": "exp-{slug}-1",
      "data": { "relation": "unlocks" },
      "style": { "stroke": "#7F77DD", "strokeWidth": 1.5 },
      "label": "unlocks"
    },
    {
      "id": "edge-act-boss",
      "source": "act-{slug}",
      "target": "boss-{slug}",
      "data": { "relation": "unlocks" },
      "style": { "stroke": "#7F77DD", "strokeWidth": 1.5 },
      "label": "unlocks"
    },
    {
      "id": "edge-exp-loot",
      "source": "loot-{slug}-standard",
      "target": "exp-{slug}-1",
      "data": { "relation": "drops_from" },
      "style": { "stroke": "#1D9E75", "strokeWidth": 1.5 },
      "label": "drops_from"
    },
    {
      "id": "edge-event-exp",
      "source": "event-{slug}-1",
      "target": "exp-{slug}-1",
      "data": { "relation": "triggers" },
      "style": { "stroke": "#639922", "strokeWidth": 1.5 },
      "label": "triggers"
    }
  ],
  "generated_metadata": {
    "estimated_playtime_minutes": 45,
    "combat_encounters": 3,
    "boss_count": 1,
    "side_zones": 1,
    "loot_items": 8,
    "narrative_events": 4
  }
}
```

---

## STEP 5 — CANVAS LAYOUT ALGORITHM

Position nodes using this layout:

```
Act Structure (horizontal flow):

                    ┌─────────────┐
                    │  ACT NODE   │
                    │  (x: 0, y:0)│
                    └─────────────┘
                           │
         ┌─────────────────┼─────────────────┐
         │                 │                 │
         ▼                 ▼                 ▼
  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
  │  Expedition │  │  Expedition │  │     Boss    │
  │   Zone 1    │  │   Zone 2    │  │  Expedition │
  │  (200, 100) │  │  (400, 100) │  │  (600, 100) │
  └─────────────┘  └─────────────┘  └─────────────┘
         │                 │                 │
         ▼                 ▼                 ▼
  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐
  │   Event 1   │  │   Event 2   │  │ Boss Loot   │
  │  (200, 250) │  │  (400, 250) │  │ (600, 250)  │
  └─────────────┘  └─────────────┘  └─────────────┘

Side zones offset +150px on Y axis from parent zone.
Loot tables at y: 300-400 range.
```

**Spacing rules:**
- X spacing between expeditions: 200px
- Y spacing for related nodes: 150px
- Side zones: parent X + 50, parent Y + 200

---

## STEP 6 — VALIDATION CHECKLIST

Before outputting, verify:

**Structure (Errors if wrong):**
- [ ] Exactly one `act` node
- [ ] At least 2 standard `expedition` nodes
- [ ] Exactly one `boss_expedition` node
- [ ] `act.boss_expedition_id` references existing boss
- [ ] `act.expedition_ids[]` references existing expeditions
- [ ] All expeditions have `loot_table_id` referencing existing loot table
- [ ] Boss has `phases[]` with at least 2 entries
- [ ] All `event.trigger_target` references existing expedition or boss

**Balance (Warnings if wrong):**
- [ ] Danger level increases monotonically (Zone 1 < Zone 2 < Boss)
- [ ] Boss level ≥ highest standard expedition level
- [ ] At least one event per standard expedition
- [ ] Boss has `special_mechanics[]` (not empty)
- [ ] Loot tables have 3+ entries

**Blueprint compatibility:**
- [ ] `blueprint_meta.parameters[]` includes act_number, difficulty_level, loot_prefix
- [ ] All node IDs use slug format (no spaces, lowercase, hyphen-separated)
- [ ] Edges have `data.relation` field matching edge color conventions

---

## STEP 7 — WRITE THE FILE

Write the generated blueprint to:
```
guild-engine/generator/act-{slug}.blueprint.json
```

Then append to `guild-engine/generator/CHANGELOG.md`:
```
### ActForge Run — [ISO date]
- INPUT: [first 20 words of ACT_DESCRIPTION]
- OUTPUT: act-{slug}.blueprint.json
- COMPLEXITY: [basic|medium|complex|epic]
- NODES: [N] total ([N] expeditions, [N] events, [N] loot tables)
- ESTIMATED PLAYTIME: [N] minutes
```

---

## STEP 8 — PRINT SUMMARY

Print to terminal:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ActForge Complete                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  {Act Name}                                                             │
│  Theme: {theme} · Difficulty: {difficulty} · Duration: {duration}       │
├─────────────────────────────────────────────────────────────────────────┤
│  Nodes:  [N] total                                                      │
│    • Expeditions:     [N]                                               │
│    • Boss:            1                                                 │
│    • Events:          [N]                                               │
│    • Loot tables:     [N]                                               │
│    • Side zones:      [N]                                               │
├─────────────────────────────────────────────────────────────────────────┤
│  Output: guild-engine/generator/act-{slug}.blueprint.json              │
│  Estimated playtime: [N] minutes                                        │
└─────────────────────────────────────────────────────────────────────────┘

To import into the editor:
  1. Open Blueprint Library (⌘B or Ctrl+B)
  2. Select "Acts" tab
  3. Click "Import .blueprint.json"
  4. Select act-{slug}.blueprint.json
  5. Parameter modal appears — set act number, difficulty, loot prefix
  6. Blueprint drops onto canvas pre-wired

Next steps:
  - Rig expedition inputs to your resource nodes (gold, materials)
  - Customize event choices with your faction IDs
  - Adjust boss phases for your party composition
```

---

## EXAMPLE SESSION

```
> Follow guild-engine/generator/ACTFORGE.md exactly.

ACT_DESCRIPTION: "A plague-ridden coastal region where smugglers operate from 
tidal caves. The baron's son has been kidnapped by fish-cultists. Final 
confrontation in a sunken cathedral at low tide."
DIFFICULTY_TARGET: mid
THEME: coastal
DURATION_ESTIMATE: medium

✓ Analyzing narrative...
  • Locations: Tidal Caves, Smuggler's Landing, Sunken Cathedral
  • Antagonists: Fish-cultists, smuggler collaborators
  • MacGuffin: Baron's kidnapped son
  • Temporal: Low tide window (time pressure)
  • Mechanics: tide_change, environmental_hazard

✓ Generating act structure...
  • 3 standard expeditions
  • 1 boss expedition (Sunken Cathedral)
  • 1 side zone (Hidden Sea Cave)
  • 4 narrative events
  • 3 loot tables

┌─────────────────────────────────────────────────────────────────────────┐
│  ActForge Complete                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  The Tides of Rot                                                       │
│  Theme: coastal · Difficulty: mid · Duration: medium                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Nodes:  12 total                                                       │
│    • Expeditions:     4                                                 │
│    • Boss:            1                                                 │
│    • Events:          4                                                 │
│    • Loot tables:     3                                                 │
│    • Side zones:      1                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  Output: guild-engine/generator/act-tides-of-rot.blueprint.json        │
│  Estimated playtime: 55 minutes                                         │
└─────────────────────────────────────────────────────────────────────────┘

To import into the editor:
  1. Open Blueprint Library (⌘B or Ctrl+B)
  2. Select "Acts" tab
  3. Click "Import .blueprint.json"
  4. Select act-tides-of-rot.blueprint.json
  5. Parameter modal appears — set act number, difficulty, loot prefix
  6. Blueprint drops onto canvas pre-wired
```

---

## CRITICAL RULES

1. NEVER create new node types — use existing `expedition`, `boss_expedition`, `act`, `loot_table`, `event`.
2. ALWAYS include `blueprint_meta.parameters[]` for parameter injection (act_number, difficulty_level, loot_prefix).
3. ALWAYS use slug-format IDs (lowercase, hyphens, no spaces).
4. ALWAYS include edges with `data.relation` for auto-coloring.
5. Boss MUST have `phases[]` — no flat boss fights.
6. Every standard expedition MUST have at least one `event` in its `events[]` array.
7. Side zones MUST have non-trivial `unlock_conditions[]` — not just `act_start`.
8. Danger level MUST increase monotonically through the act.

---

## KNOWN LIMITATIONS (v1.0)

**Item generation deferred to v1.1**

Loot tables reference item IDs that may not exist in your project. You have two options:

**Option A: Manual wiring (current)**
- Import the act blueprint
- Create your own item nodes (or use existing ones)
- Edit loot table entries to reference your items

**Option B: Auto-create stub items (workaround)**
- After import, the Canvas Doctor will flag "dangling loot_table item_id"
- Use auto-fix to create stub material items
- Customize item stats later

**v1.1 roadmap (PENDING):**
- Add `items[]` parameter array with `injects_into` for loot entries
- OR: Generate stub item nodes alongside act (positioned left of main act)
- See `CHANGELOG.md` — "ACTFORGE v1.1 — Item parameter injection"

---

## ACTFORGE v1.1 — AUTO-GENERATED STUB ITEMS

**STATUS: IMPLEMENTED**

Loot tables now include auto-generated stub item nodes. These are placeholder items
themed to the act's narrative, positioned to the left of the main act structure.

### Item Generation Rules

**For each loot table, generate 2-4 stub items:**

1. **Common material** (weight 30-40%) — Crafting ingredient
   - Type: `item`, subtype: `material`
   - Rarity: `common`
   - Stack: 99
   - Example: "Tidal Herb", "Cultist Scrap", "Rusted Key"

2. **Uncommon equipment** (weight 15-25%) — Basic gear
   - Type: `item`, subtype: `equipment`
   - Slot: `weapon` or `armor` (based on theme)
   - Rarity: `uncommon`
   - Stats: ATK +5 or DEF +4
   - Example: "Smuggler's Knife", "Cultist Robe"

3. **Rare boss drop** (boss loot only, weight 5-10%) — Unique item
   - Type: `item`, subtype: `equipment` or `material`
   - Slot: `accessory` or `relic`
   - Rarity: `rare` or `epic`
   - Special stat: LCK +8 or unique modifier
   - Example: "Tide Revenant Heart", "Baron's Signet"

### Stub Item Canvas Position

Position stub items in a column to the LEFT of the act:
```
Stub Items Column    Act Structure
x: -300 to -200      x: 0 to 600

┌─────────────┐
│ Item 1      │  (−300, 100)
│ (common)    │
├─────────────┤
│ Item 2      │  (−300, 250)
│ (uncommon)  │
├─────────────┤
│ Item 3      │  (−300, 400)
│ (rare/boss) │
└─────────────┘
```

### Stub Item Node Template

```json
{
  "id": "item-{slug}-{item_key}",
  "type": "item",
  "label": "{Themed Item Name}",
  "description": "A {adjective} {item} found in {location}. {Flavor text}.",
  "icon": "{emoji}",
  "rarity": "common|uncommon|rare|epic",
  "item_type": "material|equipment",
  "subtype": "material|equipment",
  "slot": null,
  "stat_modifiers": { "attack": 5 },
  "stack_limit": 99,
  "stack_max": 99,
  "visible": true,
  "canvas_pos": { "x": -300, "y": 150 }
}
```

### Loot Table Wiring

Auto-wire stub items to their loot tables:
```json
{
  "id": "loot-{slug}-standard",
  "type": "loot_table",
  "entries": [
    {
      "item_id": "item-{slug}-herb",
      "weight": 35,
      "min_qty": 1,
      "max_qty": 2,
      "guaranteed": false
    },
    {
      "item_id": "item-{slug}-knife",
      "weight": 20,
      "min_qty": 1,
      "max_qty": 1,
      "guaranteed": false
    }
  ]
}
```

### Edge Generation

Create `drops_from` edges from items to loot tables:
```json
{
  "id": "edge-item-loot-1",
  "source": "item-{slug}-herb",
  "target": "loot-{slug}-standard",
  "data": { "relation": "drops_from" },
  "style": { "stroke": "#1D9E75", "strokeWidth": 1.5 },
  "label": "drops_from"
}
```

### Item Naming by Theme

Use these thematic prefixes/suffixes:

| Theme | Material | Equipment | Boss Drop |
|-------|----------|-----------|-----------|
| coastal | Tidal _, _ of the Deep | Smuggler's _, Fisherman's _ | Tide _, Drowned _ |
| underground | Cave _, Stone _, _ Shard | Delver's _, Deep _ | Earth _, Void _ |
| horror | Rotting _, Cursed _ | Haunted _, _ Shroud | Nightmare _, Terror _ |
| steampunk | Gear _, _ Coil, _ Fuel | Engineer's _, Brass _ | Clockwork _, Steam _ |
| fantasy | Arcane _, _ Essence | Mage's _, Knight's _ | Dragon _, Phoenix _ |

### Updated Validation Checklist

Add to STEP 6 validation:

**Item generation (v1.1+):**
- [ ] Each loot table has 2-4 stub items generated
- [ ] At least one common material per standard loot table
- [ ] At least one uncommon equipment per standard loot table
- [ ] Boss loot table has one rare/epic boss drop
- [ ] All item IDs referenced in loot tables exist in nodes[]
- [ ] Stub items positioned at x: -300 to -200 (left column)
- [ ] `drops_from` edges created for all item→loot_table pairs

---

## RELATED FILES

- `guild-engine/generator/GENERATORPASS2.md` — Full project generation
- `guild-engine/generator/GENERATORPASS3.md` — World expansion (add zones to acts)
- `guild-engine/generator/CANVASDOCTOR.md` — Validation after generation
- `guild-engine/schema/project.schema.json` — Authoritative field list
- `guild-engine/docs/WIKI.md` — Section 8 (Act System), Section 2 (Expedition resolver)
