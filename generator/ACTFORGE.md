# ACTFORGE — AI-Assisted Act & Expedition Design
# Run this in Claude Code to generate the complete act structure for a Guild Engine project.
# ACTFORGE is the fourth forge in the Forge Suite — reads WORLDFORGE, HEROFORGE, BUILDFORGE output.
#
# Input:  guild-engine/generated/world-economy.json     (from WORLDFORGE)
#         guild-engine/generated/hero-roster.json        (from HEROFORGE)
#         guild-engine/generated/building-system.json    (from BUILDFORGE)
#         guild-engine/generator/world-template.json     (from TRANSLATEPASS)
#         OR: free-text GAME_PITCH if no source material
#
# Output: guild-engine/generated/acts.json              (act + expedition + boss_expedition + event + loot_table nodes)
#         guild-engine/generator/act-flags.md            (design tensions for review)
#
# Schema version: 1.2.0
# Forge Suite position: 4 of 7 — reads WORLDFORGE, HEROFORGE, BUILDFORGE; feeds ITEMFORGE, UPGRADEFORGE

---

## Purpose

ACTFORGE is not a zone filler. It is a pacing architect and encounter designer.

Its job is to answer the question that determines whether a game's progression feels earned or feels
grindy:
**what should the player overcome at each stage, and what should overcoming it feel like?**

Every act ACTFORGE generates carries three answers: what this act represents in the world's fiction,
what mechanical challenge it presents (DPS check, survival test, speed clear, loot run), and why
completing this act before the next creates a meaningful progression arc. ACTFORGE documents all
three — in the node, in the calibration object, and in flags where the answers are in tension.

An expedition with no mechanical identity is not an encounter. It is a loading screen with combat.
ACTFORGE generates expeditions that create memorable moments — a zone where the timer counts down
faster than expected, forcing a desperate retreat. A boss with phases that change the fight's
rhythm. An event that forces the player to choose between loot and safety.

ACTFORGE also generates the connective tissue: **loot_table** nodes that define what drops,
**event** nodes that create mid-expedition narrative choices, and the **act** containers that gate
progression. The engine does not know what "The Shadow Hound" means — it reads the configuration and
executes the encounter. ACTFORGE writes the configuration that makes each act feel distinct.

Every downstream forge reads ACTFORGE output. ITEMFORGE cannot generate equipment without knowing
what loot tables exist and what rarity distribution each act uses. UPGRADEFORGE cannot size global
upgrades without knowing the act completion curve. ACTFORGE sets the encounter bounds. Everything
else works within them.

---

## Before doing anything else

Read these files in order:

1. `guild-engine/schema/project.schema.json` — act, expedition, boss_expedition, event, loot_table node fields
2. `guild-engine/docs/WIKI.md` — Section 1 (Node Types), Section 2 (Expedition Resolver)
3. `guild-engine/generator/CHANGELOG.md` — pending act/expedition-related systems
4. `guild-engine/generated/world-economy.json` — WORLDFORGE output (required)
5. `guild-engine/generated/hero-roster.json` — HEROFORGE output (required)
6. `guild-engine/generated/building-system.json` — BUILDFORGE output (required)
7. If source material exists: `guild-engine/generator/world-template.json`

Print your read status before proceeding:
```
ACTFORGE reading context...
  ✓ schema/project.schema.json
  ✓ docs/WIKI.md
  ✓ generator/CHANGELOG.md
  [✓ / ✗] generated/world-economy.json    (REQUIRED — abort if missing)
  [✓ / ✗] generated/hero-roster.json      (REQUIRED — abort if missing)
  [✓ / ✗] generated/building-system.json  (REQUIRED — abort if missing)
  [✓ / ✗] world-template.json
```

**If any required forge output is missing, STOP.** Print:
```
ACTFORGE ABORT: Missing upstream forge output.
Run missing forges first:
  WORLDFORGE: guild-engine/generator/WORLDFORGE.md
  HEROFORGE:  guild-engine/generator/HEROFORGE.md
  BUILDFORGE: guild-engine/generator/BUILDFORGE.md
ACTFORGE cannot generate acts without economy, hero, and building constraints.
```

---

## Input Format

User provides:

```
WORLDFORGE_OUTPUT:     "{{path to world-economy.json}}"
HEROFORGE_OUTPUT:      "{{path to hero-roster.json}}"
BUILDFORGE_OUTPUT:     "{{path to building-system.json}}"
SOURCE_MATERIAL:       "{{path to world-template.json, or 'none'}}"
GAME_PITCH:            "{{optional text description if no source material}}"
ACT_COUNT:             "{{2 acts | 3 acts (default) | 4+ acts}}"
PACING_STYLE:          "{{fast (short acts, quick escalation) | standard (balanced) | slow (long acts, gradual)}}"
DIFFICULTY_CURVE:      "{{gentle | standard (default) | punishing}}"
```

**Defaults if not provided:**
- ACT_COUNT: `3 acts`
- PACING_STYLE: `standard`
- DIFFICULTY_CURVE: `standard`

**ACT_COUNT definitions:**
- `2 acts` — Tight progression for short games. Act 1: tutorial + early game. Act 2: mid + endgame.
  Boss levels: 5, 10.
- `3 acts` — Standard Guild Engine progression. Act 1: early (lvl 1-5). Act 2: mid (lvl 6-10).
  Act 3: late (lvl 11-15). Boss levels: 5, 10, 15.
- `4+ acts` — Extended progression for long games. Each act covers 3-5 levels. Boss levels: 5, 10,
  15, 20+.

**PACING_STYLE definitions:**
- `fast` — Expeditions are shorter (30-60s), escalation is aggressive, act completion in 2-3 hours.
- `standard` — Mixed expedition lengths (60-120s), moderate escalation, act completion in 4-6 hours.
- `slow` — Longer expeditions (90-180s), gradual escalation, act completion in 8-12 hours.

**DIFFICULTY_CURVE definitions:**
- `gentle` — Enemy stats at lower end of danger range, failure is rare, WIPE is forgiving.
- `standard` — Enemy stats in middle of danger range, failure teaches, WIPE is costly but recoverable.
- `punishing` — Enemy stats at upper end, failure is common early, WIPE means significant resource loss.

---

## STEP 1 — NARRATIVE ANALYSIS

Before generating any nodes, analyze the source material and upstream forge outputs for these five
signals. Write your analysis to the console — this is the reasoning that justifies every act
decision that follows.

### A. Act Theme Extraction

Identify the narrative arc from source material or world-template.json. Every act needs a theme,
antagonist force, and escalation pattern.

For each act:
```
ACT {N}: {act name}
  Theme: "[environmental + tonal descriptor, e.g., 'corrupted wilderness', 'drowned ruins']"
  Antagonist: "[who opposes the player — faction, creature type, environmental force]"
  MacGuffin: "[what drives progression — artifact, person, knowledge, territory]"
  Escalation: "[how threat increases from first zone to boss]"
  Boss: "[name + concept — e.g., 'The Shadow Hound: corrupted alpha beast']"
```

### B. Zone Mapping

For each act, identify 2-5 distinct expedition zones. Each zone needs a mechanical identity beyond
flavor text.

For each zone:
```
ZONE: {zone name}
  Expedition ID: exp-{act}-{slug}
  Danger level: {2-4 for Act 1 entry, scaling up}
  Mechanical identity: "[DPS race | survival test | speed clear | loot run | puzzle]"
  Special mechanic: "[tide_change | darkness | reinforcements | trap_laden | time_pressure | environmental_hazard | none]"
  Primary drop: "[which material from WORLDFORGE this zone farms]"
```

### C. Boss Design

For each act boss, define the encounter pattern:

```
BOSS: {boss name}
  Expedition ID: boss-{act}-{slug}
  Danger level: {5 for Act 1, 10 for Act 2, 15 for Act 3}
  HP: {calculated per Table D}
  ATK: {calculated per Table D}
  Phase 1 (100% HP): "[opening state — no modifier or minor buff]"
  Phase 2 (50% HP): "[desperation state — ATK/speed buff, new mechanic]"
  Phase 3 (optional, 25% HP): "[final stand — major buff or enrage timer]"
  Special mechanics: "[1-3 from the library below]"
  Guaranteed drop: "[boss-specific item or material]"
```

### D. Event Design

For each zone, design 1-2 mid-expedition events. Events create narrative texture and meaningful
choices during runs.

For each event:
```
EVENT: {event name}
  Trigger: "on_enter" | "on_kill" | "on_timer"
  Choices:
    A) "[option text]" → "[outcome: resource gain/loss, loot roll, hero status]"
    B) "[option text]" → "[outcome: resource gain/loss, loot roll, hero status]"
    C) "[optional option text]" → "[outcome]"
  Design intent: "[what dilemma this creates — risk vs reward, speed vs safety, etc.]"
```

### E. Translation Flags

Surface contradictions between source material and the expedition system:

```
//TRANSLATE_FLAG [SEVERITY: LOW | MEDIUM | HIGH]
TENSION: "[What the source says or implies about this encounter]"
CONFLICT: "[What the expedition system would do by default]"
OPTIONS:
  A) [Option that honors source intent — may require unusual mechanics]
  B) [Option that honors game mechanics — may simplify source intent]
  C) [Compromise option if available]
DESIGNER DECISION REQUIRED: [Yes/No]
```

**Flag triggers (mandatory):**
- Source describes an encounter that doesn't fit the expedition model (e.g., multi-boss, escort)
- Source boss has a mechanic not in the special_mechanics library
- Source act structure doesn't match the ACT_COUNT parameter (e.g., source has 5 acts, parameter is 3)
- Source describes loot that doesn't match ITEMFORGE's material list

---

## STEP 2 — CALIBRATION TABLES

Use these tables to calculate defensible values for every act/expedition node. Do not estimate. Show
the math for every value that has a calculation behind it.

### Table A — Act/Zone Count by Parameters

| Act Count | Acts | Zones per Act | Total Standard Expeditions | Total Bosses |
|---|---|---|---|---|
| `2 acts` | 2 | 2-3 | 4-6 | 2 |
| `3 acts` | 3 | 3-4 | 9-12 | 3 |
| `4 acts` | 4 | 3-4 | 12-16 | 4 |

**Side zones (optional):** 0-2 per act, with unlock_conditions.

### Table B — Danger Level by Act Position

Danger level determines enemy stat multipliers. Map expedition `level` field to danger.

| Act | Zone 1 | Zone 2 | Zone 3 | Zone 4 | Boss |
|---|---|---|---|---|---|
| Act 1 | 2-3 | 3-4 | 4-5 | — | 5 |
| Act 2 | 6-7 | 7-8 | 8-9 | — | 10 |
| Act 3 | 11-12 | 12-13 | 13-14 | 14-15 | 15 |
| Act 4 | 16-17 | 17-18 | 18-19 | 19-20 | 20 |

**Rule: danger level must increase monotonically within each act.**

### Table C — Enemy Stat Calculation

Enemy ATK and HP scale with level and danger. Use these formulas:

```
enemy_atk = level × atk_multiplier
enemy_hp = level × hp_multiplier
```

| Danger Range | ATK Multiplier | HP Multiplier | Best For |
|---|---|---|---|
| 2-3 (tutorial) | 8-10 | 60-70 | Act 1 Zone 1 |
| 4-5 (early) | 10-12 | 70-85 | Act 1 Zone 2-3, Boss |
| 6-7 (mid-early) | 12-14 | 85-100 | Act 2 Zone 1-2 |
| 8-9 (mid-late) | 14-16 | 100-120 | Act 2 Zone 3-4, Boss |
| 10-12 (late) | 16-20 | 120-150 | Act 3 zones |
| 13-15 (endgame) | 18-22 | 150-200 | Act 3 Boss, Act 4 |
| 16-20 (punishing) | 20-25 | 200-280 | Optional super-bosses |

**Example calculation (show this math for every expedition):**
```
EXPEDITION: exp-act1-outskirts (level 3, danger 3-4)
  enemy_atk = 3 × 10 = 30 (early game — players should win consistently)
  enemy_hp = 3 × 70 = 210 (moderate HP — clearable in 2-3 rounds)

BOSS: boss-act1-shadow-hound (level 5, danger 5)
  enemy_atk = 5 × 12 = 60 (threatening but beatable with proper party)
  enemy_hp = 5 × 85 = 425 (boss HP — requires sustained DPS)
  boss_hp = 425 × 3.0 = 1,275 (boss has 3× normal HP for phase mechanics)
```

### Table D — Boss HP & Phase Calculation

Bosses have inflated HP to enable phase mechanics. Calculate:

```
boss_hp = (level × hp_multiplier) × boss_hp_scalar
```

| Boss Position | Boss HP Scalar | Phases | Special Mechanics |
|---|---|---|---|
| Act 1 Boss | ×3.0 | 2 phases (100%, 50%) | 1 mechanic |
| Act 2 Boss | ×3.5 | 2-3 phases (100%, 50%, 25%) | 2 mechanics |
| Act 3+ Boss | ×4.0 | 3 phases (100%, 50%, 25%) | 2-3 mechanics |

**Phase modifier guidelines:**
- Phase 1 (100%): No modifier or minor buff (ATK +2, DEF +2)
- Phase 2 (50%): Moderate buff (ATK +5, SPD +3) or new mechanic
- Phase 3 (25%): Strong buff (ATK +8, SPD +5) or enrage timer

### Table E — Expedition Duration by Pacing

`duration_s` field controls how long expeditions take. Affected by party SPD stat.

| Pacing | Zone 1 | Zone 2 | Zone 3 | Zone 4 | Boss |
|---|---|---|---|---|---|
| `fast` | 30-45s | 45-60s | 60s | — | 90-120s |
| `standard` | 60s | 60-90s | 90s | 90-120s | 120-150s |
| `slow` | 90s | 90-120s | 120s | 120-150s | 150-180s |

**Party size guidelines:**
- Standard expeditions: 3 heroes (flexible composition)
- Boss expeditions: 4 heroes (full party, max synergy)

### Table F — Loot Table Structure

Every expedition needs a loot_table. Rarity distribution matches danger level.

| Danger | Common | Uncommon | Rare | Epic | Legendary | Boss Guaranteed |
|---|---|---|---|---|---|---|
| 2-3 | 60% | 30% | 10% | 0% | 0% | — |
| 4-5 | 45% | 35% | 15% | 5% | 0% | Rare |
| 6-7 | 30% | 35% | 25% | 10% | 0% | Rare |
| 8-9 | 20% | 25% | 30% | 20% | 5% | Epic |
| 10+ | 10% | 15% | 25% | 35% | 15% | Epic+ |

**Entry count rules:**
- Standard loot table: 3-5 entries (mix of materials, equipment, consumables)
- Boss loot table: 4-6 entries + 1 guaranteed rare/epic

### Table G — Resource Reward Calibration (Reads WORLDFORGE)

ACTFORGE must read `economy_calibration.expedition_reward_bands` from `world-economy.json`.
Resource rewards on expeditions must fall within these bands.

```
WORLDFORGE CONTRACT:
  Early expedition reward: {min}–{max} {resource_id}
  Mid expedition reward: {min}–{max} {resource_id}
  Late expedition reward: {min}–{max} {resource_id}
  Boss multiplier: ×{N}
```

**Verification (mandatory):**
```
Expedition: exp-act1-{zone}
  Danger: {N} (early tier)
  Resource reward: {amount} {resource_id}
  WORLDFORGE band: {min}–{max}
  {PASS/FAIL}: within band?

Boss: boss-act1-{boss}
  Resource reward: {amount} {resource_id}
  WORLDFORGE band: early × boss_multiplier = {calculated}
  {PASS/FAIL}: within band?
```

### Table H — Special Mechanics Library

Pick 1-3 mechanics per boss, 0-1 per standard expedition.

| Mechanic | Effect | Best For |
|---|---|---|
| `tide_change` | Duration ±30%, loot table swaps | Coastal, swamp, river |
| `darkness` | Party size -1, LCK matters more | Underground, horror, night |
| `reinforcements` | Enemy ATK +2 per round after round 3 | Siege, guild raids, hive |
| `trap_laden` | Party starts at 70% HP | Dungeons, vaults, ruins |
| `time_pressure` | Duration -30%, boss enrages at 90s | Heist, rescue, escape |
| `environmental_hazard` | Random 5-10 damage to party per round | Volcanic, cursed, storm |
| `faction_interference` | Random event fires mid-fight | Urban, political, contested |
| `corruption` | Heroes gain stacking debuff per round | Shadow zones, plague |
| `terrain_advantage` | SPD-primary heroes gain +5 ATK | Forest, mountain, urban |

---

## STEP 3 — GENERATION RULES

### A. Act Node Structure

Every generated `act` node must use this exact structure:

```json
{
  "id": "act-{slug}",
  "type": "act",
  "label": "{Act Name}",
  "description": "{One sentence: narrative summary and what the player accomplishes}",
  "act_number": 1,
  "completion_conditions": [
    { "type": "boss_defeated", "target_id": "boss-{slug}" }
  ],
  "expedition_ids": ["exp-{slug}-1", "exp-{slug}-2", "exp-{slug}-3"],
  "boss_expedition_id": "boss-{slug}",
  "on_complete_events": [],
  "unlocks_node_ids": [],
  "narrative_log": "{flavor text shown on act completion}",
  "visible": true,
  "canvas_pos": { "x": 0, "y": 0 }
}
```

**Completion conditions:**
- Always include `boss_defeated` condition targeting the act's boss
- Optional: add `expedition_completed` conditions for side zones

### B. Expedition Node Structure

Every generated `expedition` node must use this exact structure:

```json
{
  "id": "exp-{slug}",
  "type": "expedition",
  "label": "{Zone Name}",
  "description": "{Flavor text: what this place is and why it's dangerous}",
  "icon": "{emoji}",
  "duration_s": 60,
  "party_size": 3,
  "level": 5,
  "enemy_atk": 50,
  "enemy_hp": 400,
  "base_xp": null,
  "curse_chance": 0.1,
  "loot_table_id": "loot-{slug}",
  "fail_loot_table_id": "",
  "entry_cost": [],
  "resource_rewards": [
    { "resource_id": "resource-gold", "amount_min": 100, "amount_max": 150 }
  ],
  "faction_rewards": [],
  "on_success_unlock": [],
  "events": ["event-{slug}-1"],
  "unlock_conditions": [],
  "visible": true,
  "canvas_pos": { "x": 200, "y": 100 }
}
```

**Field rules:**
- `duration_s`: from Table E based on pacing style
- `party_size`: 3 for standard, 4 for boss
- `level`: from Table B danger mapping
- `enemy_atk` and `enemy_hp`: calculated per Table C (SHOW YOUR MATH)
- `base_xp`: null for now (ITEMFORGE/UPGRADEFORGE may populate)
- `curse_chance`: 0.05 for Act 1 Zone 1, scaling to 0.30 for final boss
- `loot_table_id`: must reference a loot_table node you generate
- `resource_rewards`: must fall within WORLDFORGE's expedition_reward_bands
- `events`: array of event IDs (at least 1 per expedition)

### C. Boss Expedition Node Structure

Every generated `boss_expedition` node must use this exact structure:

```json
{
  "id": "boss-{slug}",
  "type": "boss_expedition",
  "label": "{Boss Name}",
  "description": "{Boss flavor: who they are and why they matter}",
  "icon": "{emoji}",
  "duration_s": 120,
  "party_size": 4,
  "level": 10,
  "enemy_atk": 150,
  "enemy_hp": 1200,
  "boss_hp": 3600,
  "boss_stats": { "attack": 25, "defense": 15, "speed": 8 },
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
  ],
  "special_mechanics": ["tide_change", "reinforcements"],
  "loot_table_id": "loot-{slug}-boss",
  "on_success_unlock": [],
  "repeatable": false,
  "unlock_conditions": [],
  "visible": true,
  "canvas_pos": { "x": 600, "y": 100 }
}
```

**Phase rules (mandatory):**
- At least 2 phases (100% and 50% HP thresholds)
- Optional 3rd phase at 25% for Act 3+ bosses
- Each phase has `phase_number`, `hp_threshold` (1.0 = 100%, 0.5 = 50%), `label`, `modifier` (can be empty), `log_message`

**Special mechanics rules:**
- At least 1 mechanic from Table H
- Maximum 3 mechanics (more than 3 becomes unreadable)

### D. Loot Table Node Structure

Every generated `loot_table` node must use this exact structure:

```json
{
  "id": "loot-{slug}",
  "type": "loot_table",
  "label": "{Zone} Loot",
  "rolls": 1,
  "entries": [
    {
      "item_id": "item-{material}",
      "weight": 30,
      "min_qty": 1,
      "max_qty": 2,
      "guaranteed": false
    },
    {
      "item_id": "item-{uncommon-gear}",
      "weight": 15,
      "min_qty": 1,
      "max_qty": 1,
      "guaranteed": false
    }
  ],
  "visible": true,
  "canvas_pos": { "x": 400, "y": 300 }
}
```

**Entry rules:**
- 3-5 entries for standard loot tables
- 4-6 entries + 1 guaranteed for boss loot tables
- Weight distribution must match Table F rarity by danger level
- At least one entry should reference a material from WORLDFORGE

### E. Event Node Structure

Every generated `event` node must use this exact structure:

```json
{
  "id": "event-{slug}",
  "type": "event",
  "label": "{Event Name}",
  "description": "{Context: what's happening}",
  "log_message": "{Narrative text shown to player}",
  "trigger_type": "on_enter",
  "trigger_target": "exp-{slug}",
  "choices": [
    {
      "label": "{Choice A text}",
      "outcome": {
        "log_message": "{Result text}",
        "resource_delta": { "resource-gold": 20 },
        "loot_table_id": "",
        "hero_status": ""
      }
    },
    {
      "label": "{Choice B text}",
      "outcome": {
        "log_message": "{Result text}",
        "resource_delta": {},
        "loot_table_id": "loot-{slug}",
        "hero_status": ""
      }
    }
  ],
  "visible": true,
  "canvas_pos": { "x": 200, "y": 250 }
}
```

**Choice rules:**
- 2-4 choices per event
- At least 2 choices must have meaningfully different outcomes
- Outcomes can include: `log_message`, `resource_delta`, `loot_table_id`, `hero_status`

**Trigger rules:**
- `on_enter`: fires when expedition starts (most common)
- `on_kill`: fires after defeating an enemy (for mid-expedition events)
- `on_timer`: fires after X seconds (for time-based events)

### F. Canvas Layout Algorithm

Position nodes using this layout:

```
Act Structure (horizontal flow per act):

Act 1: y: 0-400
Act 2: y: 450-850
Act 3: y: 900-1300

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

Loot tables at y: 300-400 range.
Events at y: 250 range.
```

**Spacing rules:**
- X spacing between expeditions: 200px
- Y spacing per act: 450px (act header + zones + events + loot)
- Side zones: parent X + 50, parent Y + 200

### G. The acts.json Output Format

```json
{
  "schema_version": "1.2.0",
  "actforge_version": "1.0.0",
  "generated_at": "{ISO timestamp}",
  "meta": {
    "project_name": "{from WORLDFORGE meta}",
    "act_count": "{N}",
    "pacing_style": "{fast|standard|slow}",
    "difficulty_curve": "{gentle|standard|punishing}",
    "source_material": "{path or 'pitch'}",
    "worldforge_input": "{path to world-economy.json}",
    "heroforge_input": "{path to hero-roster.json}",
    "buildforge_input": "{path to building-system.json}",
    "designer_notes": "{brief summary of the act structure and progression arc}"
  },
  "nodes": [
    // All act nodes
    // All expedition nodes
    // All boss_expedition nodes
    // All loot_table nodes
    // All event nodes
  ],
  "act_calibration": {
    "danger_progression": [
      { "expedition_id": "{id}", "level": 0, "enemy_atk": 0, "enemy_hp": 0, "calculated": "level × multiplier = value" }
    ],
    "boss_analysis": [
      {
        "boss_id": "{id}",
        "level": 0,
        "base_hp": 0,
        "boss_hp_scalar": 3.0,
        "final_boss_hp": 0,
        "calculated": "level × hp_multiplier × scalar = value"
      }
    ],
    "loot_distribution": [
      {
        "loot_table_id": "{id}",
        "danger_level": 0,
        "rarity_distribution": { "common": "60%", "uncommon": "30%", "rare": "10%" },
        "entry_count": 0
      }
    ],
    "resource_reward_audit": [
      {
        "expedition_id": "{id}",
        "resource_id": "{id}",
        "reward_range": {"min": 0, "max": 0},
        "worldforge_band": {"min": 0, "max": 0},
        "pass": true
      }
    ],
    "event_coverage": [
      { "expedition_id": "{id}", "event_count": 0, "pass": true }
    ]
  },
  "flags": [
    {
      "id": "flag-{n}",
      "severity": "low | medium | high",
      "tension": "{what the source implies}",
      "conflict": "{what the act system would do by default}",
      "options": ["A) ...", "B) ...", "C) ..."],
      "default_applied": "{which option ACTFORGE used}",
      "designer_decision_required": true
    }
  ],
  "downstream_contracts": {
    "itemforge": {
      "loot_table_ids": ["{id}", "..."],
      "rarity_bands_by_act": {
        "act_1": { "common": "60%", "uncommon": "30%", "rare": "10%" },
        "act_2": { "common": "30%", "uncommon": "35%", "rare": "25%", "epic": "10%" },
        "act_3": { "common": "20%", "uncommon": "25%", "rare": "30%", "epic": "20%", "legendary": "5%" }
      },
      "note": "ITEMFORGE must generate items matching these loot table entries. Rarity distribution should match act progression."
    },
    "upgradeforge": {
      "act_completion_curve": {
        "act_1_boss_level": 5,
        "act_2_boss_level": 10,
        "act_3_boss_level": 15
      },
      "note": "UPGRADEFORGE should time global upgrade unlocks around act completion milestones."
    }
  }
}
```

---

## STEP 4 — VALIDATION CHECKLIST

Run through every item before writing the output file. ERRORS block output. WARNINGS are written to
`act-flags.md` and noted in the terminal summary but do not block output.

### Structural Checks (Errors if failed)

- [ ] At least 2 `act` nodes exist (matching ACT_COUNT parameter)
- [ ] Each act has at least 2 standard `expedition` nodes
- [ ] Each act has exactly 1 `boss_expedition` node
- [ ] `act.boss_expedition_id` references an existing boss_expedition node
- [ ] `act.expedition_ids[]` references existing expedition nodes
- [ ] All expeditions have `loot_table_id` referencing an existing loot_table node
- [ ] All boss_expeditions have `phases[]` with at least 2 entries
- [ ] All events have `trigger_target` referencing an existing expedition or boss
- [ ] All `id` fields are slug-format: lowercase, hyphens only
- [ ] Act IDs use `act-{slug}` prefix
- [ ] Expedition IDs use `exp-{slug}` or `exp-act{n}-{slug}` format
- [ ] Boss IDs use `boss-{slug}` or `boss-act{n}-{slug}` format
- [ ] No duplicate IDs across the entire node set
- [ ] `type` field matches the node's actual type on every node
- [ ] `schema_version` in output file is `"1.2.0"`
- [ ] `downstream_contracts` object is present and complete

### Balance Checks (Warnings if failed)

- [ ] Danger level increases monotonically within each act
- [ ] Boss level ≥ all standard expedition levels in the same act
- [ ] Every standard expedition has at least 1 event in `events[]`
- [ ] Every boss has at least 1 entry in `special_mechanics[]`
- [ ] All loot tables have 3+ entries
- [ ] Boss loot tables have 1 guaranteed rare/epic entry
- [ ] Resource rewards fall within WORLDFORGE's expedition_reward_bands (±20% tolerance)
- [ ] Curse chance scales appropriately (0.05 Act 1 Zone 1 → 0.30 final boss)

### Pipeline Checks (Warnings if failed)

- [ ] `//TRANSLATE_FLAG` comments present on any node where source material created tension
- [ ] `flags[]` array populated if any source material contradictions exist
- [ ] `act-flags.md` file generated if `flags[]` is non-empty
- [ ] `CHANGELOG.md` entry appended
- [ ] `act_calibration.danger_progression` shows math for every expedition
- [ ] `act_calibration.boss_analysis` shows math for every boss
- [ ] `act_calibration.resource_reward_audit` all entries pass

---

## STEP 5 — ACT FLAGS FILE

If any flags exist, generate `guild-engine/generator/act-flags.md` with this format:

```markdown
# Act System Flags — {Project Name}
### Generated by ACTFORGE {ISO date}

These flags represent design tensions between your source material and standard Guild Engine
act/expedition mechanics. Review each flag and confirm or override the default decision.

---

## FLAG-001 [SEVERITY: HIGH] — {Flag title}

**Source intent:** {What the source material implies about this encounter}
**Engine default:** {What the expedition system would do}

**Options:**
- A) {Option A description — honors source encounter design}
- B) {Option B description — honors game mechanics}
- C) {Option C, if available}

**Default applied:** {Which option ACTFORGE used}

**To override:** Edit `acts.json` nodes as follows:
  - {Specific field change to apply Option A}
  - {Specific field change to apply Option B}

---

## FLAG-002 [SEVERITY: LOW] — ...
```

---

## STEP 6 — FILE WRITING

Write these files in this order:

```
1. guild-engine/generated/acts.json                  (primary output)
2. guild-engine/generator/act-flags.md               (only if flags[] is non-empty)
3. Append to guild-engine/generator/CHANGELOG.md     (always)
```

**CHANGELOG entry format:**

```markdown
### ACTFORGE Run — {ISO date}
- VERSION: v1.0.0
- TYPE: SYSTEM
- SCOPE: ACTFORGE
- STATUS: IMPLEMENTED
- INPUT: world-economy.json + hero-roster.json + building-system.json + {source or pitch}
- OUTPUT: guild-engine/generated/acts.json
- ACTS: {N} total
- EXPEDITIONS: {N} standard, {N} boss
- EVENTS: {N} total
- LOOT TABLES: {N} total
- FLAGS: {N} design tensions ({N} high, {N} medium, {N} low)
- DOWNSTREAM: acts.json ready for ITEMFORGE, UPGRADEFORGE
```

---

## STEP 7 — TERMINAL SUMMARY

Print this summary box after all files are written:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ActForge Complete                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  {Project Name}                                                         │
│  Acts: {N} · Pacing: {style} · Difficulty: {curve}                     │
├─────────────────────────────────────────────────────────────────────────┤
│  Acts:       {N} total                                                  │
│  Expeditions: {N} standard, {N} boss                                   │
│  Events:     {N} total                                                  │
│  Loot Tables: {N} total                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  Danger Progression: Act 1 (lvl 2-5) → Act 2 (lvl 6-10) → Act 3 (lvl 11-15) │
│  Boss HP Curve: Act 1 ({N}) → Act 2 ({N}) → Act 3 ({N})                │
├─────────────────────────────────────────────────────────────────────────┤
│  Resource Audit:  {PASS / FAIL — vs WORLDFORGE bands}                  │
│  Event Coverage:  {PASS / FAIL — all expeditions have events?}         │
├─────────────────────────────────────────────────────────────────────────┤
│  Output: guild-engine/generated/acts.json                              │
│  Flags:  {N} design tensions (see act-flags.md | none)                 │
└─────────────────────────────────────────────────────────────────────────┘

Downstream forge contracts written:
  ITEMFORGE    — {N} loot tables, rarity bands by act defined
  UPGRADEFORGE — act completion curve: boss levels 5, 10, 15

Next step: Run ITEMFORGE
  > Follow guild-engine/generator/ITEMFORGE.md exactly.
  > INPUT: guild-engine/generated/world-economy.json
         + guild-engine/generated/building-system.json
         + guild-engine/generated/acts.json
```

---

## EXAMPLE SESSION

```
> Follow guild-engine/generator/ACTFORGE.md exactly.

WORLDFORGE_OUTPUT:     "guild-engine/generated/world-economy.json"
HEROFORGE_OUTPUT:      "guild-engine/generated/hero-roster.json"
BUILDFORGE_OUTPUT:     "guild-engine/generated/building-system.json"
SOURCE_MATERIAL:       "guild-engine/generator/world-template.json"
GAME_PITCH:            "none"
ACT_COUNT:             "2 acts"
PACING_STYLE:          "standard"
DIFFICULTY_CURVE:      "standard"

ACTFORGE reading context...
  ✓ schema/project.schema.json
  ✓ docs/WIKI.md
  ✓ generator/CHANGELOG.md
  ✓ generated/world-economy.json
  ✓ generated/hero-roster.json
  ✓ generated/building-system.json
  ✓ world-template.json

WORLDFORGE CONTRACTS LOADED:
  Primary resource: resource-gold
  Materials: resource-iron-ore, resource-shadow-essence
  Expedition reward bands:
    Early: 3,840–5,760 gold
    Mid: 8,640–12,960 gold
    Late: 19,200–28,800 gold
    Boss: ×3.0 multiplier

HEROFORGE CONTRACTS LOADED:
  Combat classes: 5 (tank, damage ×2, support, speed)
  Party power curve: lvl 1=145, lvl 10=580, lvl 20=1100

BUILDFORGE CONTRACTS LOADED:
  Material consumption: iron ore 10/min, shadow essence 4/min

✓ Step 1 — Narrative Analysis

  ACT 1: The Outskirts
    Theme: Corrupted wilderness — plague-tainted wilds outside the city walls
    Antagonist: Shadow beasts, bandits, corrupted wildlife
    MacGuffin: Secure the northern mine route
    Escalation: Wisps → wolf packs → bandit ambushes → Shadow Hound lair
    Boss: The Shadow Hound — corrupted alpha beast, massive, plague-scarred

  ACT 2: The Undercity
    Theme: Drowned ruins beneath the city — flooded sewers, abandoned districts
    Antagonist: Undead, cultists, shadow elementals
    MacGuffin: Sever the plague's source before it reaches the surface
    Escalation: Sewer drones → undead patrols → cult rituals → Pale Archivist's vault
    Boss: The Pale Archivist — lich who knows too much, keeper of forbidden lore

  ZONE MAPPING:
    ACT 1:
      exp-act1-outskirts-road   (danger 2-3, iron ore drop zone)
      exp-act1-bandit-hideout   (danger 4, gold + iron ore)
      exp-act1-wolf-den         (danger 4, side zone — unlock: expedition_completed bandit-hideout)
      boss-act1-shadow-hound    (danger 5, guaranteed boss drop)

    ACT 2:
      exp-act2-flooded-sewers   (danger 6-7, shadow essence drop zone)
      exp-act2-abandoned-district (danger 8, gold + essence)
      exp-act2-cult-catacombs   (danger 9, side zone — unlock: expedition_completed sewers)
      boss-act2-pale-archivist  (danger 10, guaranteed rare/epic drop)

  BOSS DESIGN:
    BOSS: The Shadow Hound
      Level: 5, Danger: 5
      enemy_atk = 5 × 12 = 60
      enemy_hp = 5 × 85 = 425
      boss_hp = 425 × 3.0 = 1,275
      Phase 1 (100%): "The beast circles, jaws dripping with shadow" — no modifier
      Phase 2 (50%): "Wounded, the Shadow Hound calls its pack!" — ATK +5, reinforcements mechanic
      Special mechanics: reinforcements (wolf spawns after round 3)
      Guaranteed drop: item-hound-fang (rare material)

    BOSS: The Pale Archivist
      Level: 10, Danger: 10
      enemy_atk = 10 × 16 = 160
      enemy_hp = 10 × 120 = 1,200
      boss_hp = 1,200 × 3.5 = 4,200
      Phase 1 (100%): "The lich's eyes glow with ancient knowledge" — SPD +2
      Phase 2 (50%): "Forbidden words twist the air" — ATK +8, corruption mechanic
      Phase 3 (25%): "Death is a door I hold the key to" — enrage timer (90s)
      Special mechanics: corruption (stacking debuff), environmental_hazard (shadow damage)
      Guaranteed drop: item-archivist-key (epic quest item)

  EVENT DESIGN:
    EVENT: Ambush at Dawn
      Trigger: on_enter, exp-act1-outskirts-road
      Choices:
        A) "Prepare for battle!" → +20 gold, loot roll
        B) "Flee to the main road" → -30s duration, no loot
      Design intent: risk vs reward — fight for loot or play safe?

    EVENT: Cultist Ritual
      Trigger: on_enter, exp-act2-cult-catacombs
      Choices:
        A) "Interrupt the ritual!" → combat, high loot, +curse chance
        B) "Observe from shadows" → no combat, low loot, no curse
        C) "Join the ritual (LCK check)" → high risk, epic loot on success, WIPE on fail
      Design intent: multi-layer risk/reward with class check option

✓ Step 2 — Calibration

  DANGER PROGRESSION:
    exp-act1-outskirts-road:   lvl 3, ATK = 3×10 = 30, HP = 3×70 = 210
    exp-act1-bandit-hideout:   lvl 4, ATK = 4×11 = 44, HP = 4×75 = 300
    exp-act1-wolf-den:         lvl 4, ATK = 4×11 = 44, HP = 4×75 = 300
    boss-act1-shadow-hound:    lvl 5, ATK = 5×12 = 60, HP = 5×85 = 425, boss_hp = 1,275

    exp-act2-flooded-sewers:   lvl 7, ATK = 7×13 = 91, HP = 7×90 = 630
    exp-act2-abandoned-district: lvl 8, ATK = 8×14 = 112, HP = 8×100 = 800
    exp-act2-cult-catacombs:   lvl 9, ATK = 9×15 = 135, HP = 9×110 = 990
    boss-act2-pale-archivist:  lvl 10, ATK = 10×16 = 160, HP = 10×120 = 1,200, boss_hp = 4,200

  RESOURCE REWARD AUDIT:
    WORLDFORGE CONTRACT:
      Early band: 3,840–5,760 gold
      Mid band: 8,640–12,960 gold
      Boss multiplier: ×3.0

    exp-act1-outskirts-road: 4,000 gold — PASS (within early band)
    exp-act1-bandit-hideout: 5,500 gold — PASS (within early band, upper end)
    boss-act1-shadow-hound: 15,000 gold — PASS (early ×3.0 = 11,520–17,280)

    exp-act2-flooded-sewers: 10,000 gold — PASS (within mid band)
    exp-act2-abandoned-district: 12,000 gold — PASS (within mid band, upper end)
    boss-act2-pale-archivist: 35,000 gold — PASS (mid ×3.0 = 25,920–38,880)

✓ Step 3 — Generating nodes...

  ACTS: 2
    act-1-outskirts
    act-2-undercity

  EXPEDITIONS: 7
    6 standard expeditions
    2 boss expeditions

  EVENTS: 6
    3 events Act 1
    3 events Act 2

  LOOT TABLES: 4
    2 standard loot tables
    2 boss loot tables

✓ Step 4 — Validation
  Structural:       15/15 checks passed ✓
  Balance:          8/8 checks passed ✓
  Resource Audit:   6/6 PASS ✓
  Event Coverage:   8/8 expeditions have events ✓

✓ Step 5 — act-flags.md written (0 flags)
✓ Step 6 — acts.json written (623 lines)
✓ Step 7 — CHANGELOG.md updated

┌─────────────────────────────────────────────────────────────────────────┐
│  ActForge Complete                                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  Shadowbound Guild                                                      │
│  Acts: 2 · Pacing: standard · Difficulty: standard                     │
├─────────────────────────────────────────────────────────────────────────┤
│  Acts:       2 total                                                    │
│  Expeditions: 6 standard, 2 boss                                       │
│  Events:     6 total                                                    │
│  Loot Tables: 4 total                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Danger Progression: Act 1 (lvl 2-5) → Act 2 (lvl 6-10)                │
│  Boss HP Curve: Act 1 (1,275) → Act 2 (4,200)                          │
├─────────────────────────────────────────────────────────────────────────┤
│  Resource Audit:  PASS — vs WORLDFORGE bands                          │
│  Event Coverage:  PASS — all expeditions have events                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Output: guild-engine/generated/acts.json                              │
│  Flags:  0 design tensions                                             │
└─────────────────────────────────────────────────────────────────────────┘

Downstream forge contracts written:
  ITEMFORGE    — 4 loot tables, rarity bands by act defined
  UPGRADEFORGE — act completion curve: boss levels 5, 10

Next step: Run ITEMFORGE
  > Follow guild-engine/generator/ITEMFORGE.md exactly.
```

---

## CRITICAL RULES

1. **NEVER create new node types** — use existing `act`, `expedition`, `boss_expedition`,
   `loot_table`, `event`. No custom types.

2. **ALWAYS read WORLDFORGE's expedition_reward_bands** — resource rewards must fall within these
   bands (±20% tolerance). Show the math for every reward calculation.

3. **ALWAYS show enemy stat calculations** — `enemy_atk = level × multiplier`,
   `enemy_hp = level × multiplier`. No unexplained numbers.

4. **ALWAYS include at least 2 phases on every boss** — no flat boss fights. Phase at 100% and 50%
   HP minimum.

5. **ALWAYS include at least 1 event per expedition** — expeditions without events are empty
   loading screens.

6. **ALWAYS include at least 1 special_mechanic on every boss** — bosses without mechanics are
   damage sponges, not encounters.

7. **ALWAYS use slug-format IDs** — lowercase, hyphens only, no spaces.

8. **ALWAYS verify loot_table_id references** — every expedition and boss must reference a loot_table
   node that exists.

9. **NEVER set curse_chance above 0.30** — higher values feel unfair, not challenging.

10. **ALWAYS position act nodes using the canvas layout** — acts stack vertically (Act 1: y=0-400,
    Act 2: y=450-850, etc.), expeditions flow horizontally within each act.

---

## KNOWN LIMITATIONS (v1.0)

ACTFORGE v1.0 does **not** handle:

- **Faction rewards** — `faction_rewards[]` on expeditions is supported but ACTFORGE leaves it empty.
  FACTIONFORGE (not yet implemented) will populate faction rewards.

- **Entry costs** — `entry_cost[]` on expeditions is supported but ACTFORGE leaves it empty. Future
  update may add consumable-gated expeditions.

- **Multi-boss encounters** — The schema supports multiple bosses but ACTFORGE generates one boss
  per act. Multi-boss fights require manual editing.

- **Escort missions** — No support for escort-type expeditions where the goal is protecting an NPC.
  Would require new node type or extensive event wiring.

- **Dynamic expedition modifiers** — Expeditions have fixed `level`, `enemy_atk`, `enemy_hp`.
  Dynamic scaling (party level-based difficulty) is a runtime feature, not a generation feature.

---

## PIPELINE INTEGRATION

### Reads

| File | Source | What ACTFORGE uses |
|---|---|---|
| `world-economy.json` | WORLDFORGE | Expedition reward bands, primary resource ID, material IDs |
| `hero-roster.json` | HEROFORGE | Party power curve, combat class count (for party size recommendations) |
| `building-system.json` | BUILDFORGE | Material consumption rates (drop rates must exceed consumption) |
| `world-template.json` | TRANSLATEPASS | Act themes, boss names, zone descriptions |

### Writes

| File | Contents |
|---|---|
| `generated/acts.json` | Primary output — all act, expedition, boss, loot, event nodes + calibration |
| `generator/act-flags.md` | Design tension flags (only if flags exist) |
| `generator/CHANGELOG.md` | Appended ACTFORGE run entry |

### Feeds

| Downstream Forge | What It Reads | Why |
|---|---|---|
| ITEMFORGE | `loot_table_ids`, `rarity_bands_by_act` | Item generation matching loot table entries, rarity distribution |
| UPGRADEFORGE | `act_completion_curve` | Global upgrade timing around act milestones |
| ASSEMBLER | All of the above | Cross-reference validation |

---

## RELATED FILES

| File | Relationship |
|---|---|
| `guild-engine/generator/WORLDFORGE.md` | Upstream — economy constraints |
| `guild-engine/generator/HEROFORGE.md` | Upstream — hero roster, party power |
| `guild-engine/generator/BUILDFORGE.md` | Upstream — building system, material consumption |
| `guild-engine/generator/ITEMFORGE.md` | Downstream — item generation for loot tables |
| `guild-engine/generator/UPGRADEFORGE.md` | Downstream — global upgrades timed to act completion |
| `guild-engine/schema/project.schema.json` | Schema authority |
| `guild-engine/docs/WIKI.md` | Section 1 (Node Types), Section 2 (Expedition Resolver) |
