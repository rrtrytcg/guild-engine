# HEROFORGE — AI-Assisted Hero & Artisan Class Design
# Run this in Claude Code to generate the hero roster and artisan classes for a Guild Engine project.
# HEROFORGE is the second forge in the Forge Suite — reads WORLDFORGE output, feeds BUILDFORGE, ACTFORGE, ITEMFORGE.
#
# Input:  guild-engine/generated/world-economy.json     (from WORLDFORGE)
#         guild-engine/generator/source-analysis.json    (from EXTRACTPASS0)
#         guild-engine/generator/world-template.json     (from TRANSLATEPASS)
#         OR: free-text GAME_PITCH if no source material
#
# Output: guild-engine/generated/hero-roster.json       (hero_class nodes + calibration)
#         guild-engine/generator/hero-flags.md           (design tensions for review)
#
# Schema version: 1.2.0
# Forge Suite position: 2 of 7 — reads WORLDFORGE, feeds BUILDFORGE, ACTFORGE, ITEMFORGE, UPGRADEFORGE

---

## Purpose

HEROFORGE is not a stat-block filler. It is a character design theorist.

Its job is to answer the question that determines whether heroes feel meaningful or feel interchangeable:
**what strategic dilemma does choosing this hero create?**

Every hero class HEROFORGE generates carries three answers: what this class represents in the world's
fiction, what mechanical identity distinguishes it from every other class on the roster, and why a
player who recruits this hero over another must accept a real trade-off. HEROFORGE documents all
three — in the node, in the calibration object, and in flags where the answers are in tension.

A roster where every hero is "ATK-primary with some SPD" is not a roster. It is a lineup with
different icons. HEROFORGE generates classes that create different strategic dilemmas — a party of
Scholars who maximize research momentum but die in boss fights is a design, not a lineup. A Berserker
who deals catastrophic damage on WIPE-risk expeditions but guarantees team death on failure is a
design decision. HEROFORGE makes these decisions explicit.

HEROFORGE also generates artisan classes — heroes who cannot fight but staff buildings. An artisan
without a meaningful specialization bonus is an artisan who might as well be anonymous. HEROFORGE
ensures every artisan class creates a staffing decision: this Forgemaster reduces job time at the
Forge, but reassigning them to the Apothecary wastes their specialization match. That trade-off is
the design.

Every downstream forge reads HEROFORGE output. BUILDFORGE cannot design building workflows without
knowing which artisan classes exist and what they specialize in. ACTFORGE cannot calibrate expedition
difficulty without knowing the hero power curve. ITEMFORGE cannot generate equipment without knowing
which slots each class uses. HEROFORGE sets the character bounds. Everything else works within them.

---

## Before doing anything else

Read these files in order:

1. `guild-engine/schema/project.schema.json` — hero_class node fields and constraints
2. `guild-engine/docs/WIKI.md` — Section 1 (Node Types), Section 3 (Artisan Hero System)
3. `guild-engine/generator/CHANGELOG.md` — pending hero-related systems (slot subtypes, etc.)
4. `guild-engine/generator/EXTRACTPASS0.md` — what source-analysis.json contains
5. `guild-engine/generator/TRANSLATEPASS.md` — what world-template.json contains
6. `guild-engine/generated/world-economy.json` — WORLDFORGE output (required)
7. If source material exists: `guild-engine/generator/source-analysis.json`
8. If TRANSLATEPASS has run: `guild-engine/generator/world-template.json`

Print your read status before proceeding:
```
HEROFORGE reading context...
  ✓ schema/project.schema.json
  ✓ docs/WIKI.md
  ✓ generator/CHANGELOG.md
  [✓ / ✗] source-analysis.json
  [✓ / ✗] world-template.json
  [✓ / ✗] generated/world-economy.json (REQUIRED — abort if missing)
```

**If `world-economy.json` does not exist, STOP.** Print:
```
HEROFORGE ABORT: world-economy.json not found.
Run WORLDFORGE first: guild-engine/generator/WORLDFORGE.md
HEROFORGE cannot generate hero classes without economy constraints.
```

---

## Input Format

User provides:

```
WORLDFORGE_OUTPUT: "{{path to world-economy.json}}"
SOURCE_MATERIAL:   "{{path to source-analysis.json or world-template.json, or 'none'}}"
GAME_PITCH:        "{{optional text description if no source material}}"
ROSTER_SIZE:       "{{small (4-6 classes) | standard (7-10 classes) | large (11-15 classes)}}"
ARTISAN_FOCUS:     "{{minimal (1-2 classes) | standard (3-4 classes) | extensive (5+ classes)}}"
HERO_SOURCE:       "{{expedition (combat XP) | workflow (artisan XP) | hybrid}}"
```

**Defaults if not provided:**
- ROSTER_SIZE: `standard`
- ARTISAN_FOCUS: `standard`
- HERO_SOURCE: `hybrid`

**ROSTER_SIZE definitions:**
- `small` — Tight roster for short games or low complexity. 4–6 total classes. Every class must be
  mechanically essential — no filler. The player fields most of their roster on every expedition.
- `standard` — The default Guild Engine roster. 7–10 total classes. Enough diversity for party
  composition decisions. The player must choose who goes on each expedition. 3–4 artisan classes
  keep the building economy staffed.
- `large` — Expansive roster for long games or rich source material. 11–15 total classes. Multiple
  classes per archetype. Advanced specialization. Players must make meaningful trade-offs between
  combat power and artisan productivity.

**HERO_SOURCE definitions:**
- `expedition` — All classes gain XP from expeditions. Artisan classes still exist but their XP comes
  from expedition_completion (they ride along as non-combat participants).
- `workflow` — Artisan classes gain XP exclusively from building_jobs_completed. Combat classes gain
  XP from expedition_completion. This is the standard Forge Suite configuration.
- `hybrid` — Both XP sources contribute. Some classes earn from both. Use `both` xp_source value.

---

## STEP 1 — NARRATIVE ANALYSIS

Before generating any nodes, analyze the source material and WORLDFORGE output for these four
signals. Write your analysis to the console — this is the reasoning that justifies every hero
class decision that follows.

### A. Archetype Mapping

Identify character archetypes in the source material or WORLDFORGE economy. Every roster needs
coverage across five strategic roles. Look for:

- **Tank** — absorbs damage, prevents WIPE. High DEF/HP. Source signals: guardian, protector,
  endurance, resilience, shield-bearer, stoic, bodyguard.
- **Damage** — clears DPS checks. High ATK. Source signals: warrior, berserker, striker, predator,
  destroyer, aggressive, weapon-focused.
- **Support** — maintains party status, clears debuffs. Balanced stats. Source signals: healer,
  scholar, priest, diplomat, medic, mentor, buff-provider.
- **Speed** — minimizes expedition duration, enables speed clears. High SPD. Source signals: scout,
  thief, ranger, messenger, spy, quick, agile.
- **Controller** — manipulates outcomes, boosts loot. High LCK. Source signals: trickster, gambler,
  fortune-teller, lucky, opportunist, scavenger.

For each archetype found, write:
```
ARCHETYPE: [role]
  Source signal: "[quote or paraphrase from source material]"
  Proposed class: [class name]
  Primary stat: [ATK / DEF / SPD / HP / LCK]
  Strategic dilemma: "[what the player gives up by choosing this class]"
```

If the source material does not provide coverage for a required archetype, write:
```
ARCHETYPE GAP: [missing role]
  Source provides: [what's available]
  Recommendation: [proposed class to fill the gap, with thematic justification]
  //TRANSLATE_FLAG [SEVERITY: LOW] — gap filled by inference, not source material
```

### B. Stat Identity

For each proposed hero class, determine the PRIMARY stat and document why:

| Stat | Role in Engine | When Primary |
|---|---|---|
| `attack` | Multiplied against enemy_hp in expedition resolver | Damage dealers, berserkers |
| `defense` | Reduces incoming damage, prevents WIPE | Tanks, guardians |
| `speed` | Reduces expedition duration | Scouts, rogues |
| `hp` | Total hit points, survival threshold | Tanks, bruisers |
| `luck` | Affects loot rolls, crit chance, event outcomes | Controllers, tricksters |

**Rule: No two combat classes may share the same primary stat unless thematically justified.**
If two classes must share a primary stat (e.g., both tank archetypes are DEF-primary), write:
```
//TRANSLATE_FLAG [SEVERITY: MEDIUM]
TENSION: "{Class A} and {Class B} share primary stat {stat}"
JUSTIFICATION: "{why this is intentional, not lazy}"
DIFFERENTIATION: "{what mechanic makes them feel different despite shared primary stat}"
```

### C. Artisan Class Discovery

Identify crafting/production roles from source material or WORLDFORGE's material list. Map each to
the `building_workflow` system's `action_type` values.

For each artisan class found:
```
ARTISAN CLASS: [name]
  Source signal: "[crafting role from source material]"
  Specializations: [action_type values, e.g., weaponsmith, armorsmith]
  Building affinity: [building IDs this artisan works best in]
  Primary stat: [the stat that feeds worker_skill in formula context]
  Design hook: "[what makes assigning this artisan to their preferred building meaningful]"
```

### D. Translation Flags

Surface contradictions between source character philosophy and game mechanics:

```
//TRANSLATE_FLAG [SEVERITY: LOW | MEDIUM | HIGH]
TENSION: "[What the source says or implies about this character archetype]"
CONFLICT: "[What standard hero_class mechanics would do instead]"
OPTIONS:
  A) [Option that honors source intent — may require unusual stats or passives]
  B) [Option that honors game mechanics — may betray source character identity]
  C) [Compromise option if available]
DESIGNER DECISION REQUIRED: [Yes/No]
```

**Flag triggers (mandatory):**
- Source character has no combat role but the roster needs them as a combat class
- Source character's identity centers on a mechanic not in the schema (magic, shapeshifting, etc.)
- Source treats a character role as non-hierarchical but the game requires stat ranking
- Source character overlaps mechanically with another class (same primary stat, same role)
- Source material has more archetypes than ROSTER_SIZE allows (who gets cut?)

---

## STEP 2 — CALIBRATION TABLES

Use these tables to calculate defensible values for every hero_class node. Do not estimate. Show the
math for every value that has a calculation behind it.

### Table A — Roster Composition by Size

| Roster Size | Total Classes | Combat Classes | Artisan Classes | Tank | Damage | Support | Speed | Controller |
|---|---|---|---|---|---|---|---|---|
| `small` (4–6) | 4–6 | 3–4 | 1–2 | 1 | 1–2 | 0–1 | 0–1 | 0–1 |
| `standard` (7–10) | 7–10 | 5–7 | 2–3 | 1–2 | 2–3 | 1–2 | 1–2 | 0–1 |
| `large` (11–15) | 11–15 | 8–10 | 3–5 | 2–3 | 3–4 | 2–3 | 2–3 | 1–2 |

**Minimum requirements regardless of size:**
- At least 1 tank archetype (high DEF or HP) — without this, WIPE rate is too high
- At least 1 damage archetype (high ATK) — without this, expedition DPS checks fail
- At least 1 artisan class — without this, building workflows have no artisan bonuses

### Table B — Stat Growth Curves

Define defensible growth per level for each primary stat focus. These values are written to the
`stat_growth` field on each hero_class node. The formula produces the target value at the given level;
`stat_growth` stores the per-level increment that achieves this curve.

| Primary Focus | Level 1 Base | Level 20 Target | Growth Formula | Per-Level (stat_growth) |
|---|---|---|---|---|
| ATK-focused | 15–20 | 80–100 | `floor(base + level^1.4 × 2.5)` | ~4.0–5.0 per level |
| DEF-focused | 12–18 | 70–90 | `floor(base + level^1.3 × 2.2)` | ~3.5–4.5 per level |
| SPD-focused | 10–15 | 60–80 | `floor(base + level^1.2 × 2.0)` | ~3.0–4.0 per level |
| HP-focused | 80–100 | 400–500 | `floor(base + level^1.5 × 15)` | ~20–25 per level |
| LCK-focused | 8–12 | 40–50 | `floor(base + level^1.1 × 1.5)` | ~2.0–2.5 per level |

**Non-primary stats grow at 30–50% of primary rate.** Example: an ATK-focused class with
`attack` growth of 4.5/level has `defense` growth of ~1.5–2.0/level.

**Show your math for every class:**
```
CLASS: Berserker (ATK-focused)
  attack:  base=18, growth=4.5/level → level 20: 18 + (4.5 × 19) = 103.5 → 103 ✓ (target: 80–100, slightly high)
  defense: base=8,  growth=1.5/level → level 20: 8 + (1.5 × 19) = 36.5 → 36
  speed:   base=10, growth=1.8/level → level 20: 10 + (1.8 × 19) = 44.2 → 44
  hp:      base=90, growth=12/level  → level 20: 90 + (12 × 19) = 318
  luck:    base=5,  growth=0.8/level → level 20: 5 + (0.8 × 19) = 20.2 → 20
```

### Table C — Recruitment Cost Calibration (Reads WORLDFORGE)

HEROFORGE must read `downstream_contracts.heroforge.recruit_cost_range` from `world-economy.json`.
All hero recruitment costs must fall within this range (±20% tolerance).

| Class Tier | Cost Multiplier | Example (if WORLDFORGE range: 4000–5000) |
|---|---|---|
| Starter class | ×0.8–1.0 | 3,200–5,000 |
| Standard class | ×1.0–1.2 | 4,000–6,000 |
| Elite class | ×1.5–2.0 | 6,000–10,000 |
| Artisan class | ×0.5–0.8 (or workflow-produced) | 2,000–4,000 |

**Verification (mandatory):**
```
WORLDFORGE CONTRACT: recruit_cost_range = {min}–{max} {resource_id}
  Starter classes:  [cost] — multiplier ×{N} — {PASS/FAIL vs contract}
  Standard classes: [cost] — multiplier ×{N} — {PASS/FAIL vs contract}
  Elite classes:    [cost] — multiplier ×{N} — {PASS/FAIL vs contract}
  Artisan classes:  [cost or "workflow-produced"] — {PASS/FAIL vs contract}
  
  TOLERANCE CHECK: All costs within ±20% of WORLDFORGE range? {YES / NO}
```

If any cost falls outside the ±20% tolerance, write a flag:
```
//TRANSLATE_FLAG [SEVERITY: HIGH]
TENSION: "{Class} recruit cost {cost} exceeds WORLDFORGE contract {range} by {%}"
ACTION: Adjust cost to {corrected value} or request WORLDFORGE re-run with wider range
```

### Table D — Unique Passive Design Space

Every combat class must have a `unique_passive` that creates a distinct mechanical identity. Passives
must reference conditions and effects that exist in the engine's formula evaluator.

| Passive Type | Condition (formula string) | Effect | Best For |
|---|---|---|---|
| Wipe-risk bonus | `party_min_hp < enemy_atk * 0.8` | `{ "stat": "attack", "operation": "multiply", "value": 1.5 }` | Berserker archetypes |
| Streak synergy | `streak_count >= 3` | `{ "stat": "speed", "operation": "multiply", "value": 1.2 }` | Artisan classes |
| Expedition type bonus | `expedition_level >= 8` | `{ "stat": "luck", "operation": "add", "value": 10 }` | Specialist heroes |
| Resource synergy | `resource_gold > base_cap * 0.8` | `{ "stat": "attack", "operation": "add", "value": 5 }` | Economy-focused builds |
| Status clear | `hero_status == injured` | `{ "stat": "hp", "operation": "add", "value": 50 }` | Support classes |
| Loot bonus | `expedition_result == dominant` | `{ "stat": "luck", "operation": "multiply", "value": 2.0 }` | Luck-focused classes |
| Survival instinct | `hp_pct < 0.3` | `{ "stat": "defense", "operation": "multiply", "value": 1.8 }` | Tank archetypes |
| Momentum rider | `momentum >= 50` | `{ "stat": "speed", "operation": "multiply", "value": 1.15 }` | Research artisans |

**Rules for passive design:**
- Every passive must have a meaningful trigger condition — "always on" passives are not passives, they
  are base stat adjustments
- The condition must reference a variable the engine actually evaluates
- The effect must use `stat`, `operation` (multiply | add), and `value` — matching the schema
- No two classes in the same roster may share the same passive type
- Passive power must scale with the trade-off it creates — a wipe-risk bonus must be strong enough
  to justify the risk

### Table E — Artisan Specialization Matrix

Map artisan classes to `building_workflow` action_type values. Every artisan must have `specializations[]`
that correspond to real workflow action_types used in the game.

| Artisan Class Template | Specializations[] | Building Affinity IDs | Primary Stat | XP Source |
|---|---|---|---|---|
| Forgemaster | `["weaponsmith", "armorsmith"]` | `["building-forge"]` | `craft_skill` | `building_jobs_completed` |
| Alchemist | `["brewing", "potion_crafting"]` | `["building-apothecary"]` | `alchemy_skill` | `building_jobs_completed` |
| Scholar | `["research", "analysis"]` | `["building-library"]` | `research_skill` | `building_jobs_completed` |
| Engineer | `["construction", "modification"]` | `["building-workshop"]` | `craft_skill` | `building_jobs_completed` |
| Handler | `["training", "care"]` | `["building-kennel", "building-barracks"]` | `training_skill` | `building_jobs_completed` |

**These are templates, not mandatory classes.** HEROFORGE must adapt artisan classes to the source
material and WORLDFORGE resource list. A VtM game has no Forgemaster — it has a Keeper of Elysium
with specialization `domain_management`. A sci-fi game has no Alchemist — it has a Chemist with
specialization `synthesis`.

### Table F — Party Composition Guidance

Document recommended party synergies. These are written to the `party_recommendations` array in the
output file.

```
Balanced Party (4 heroes):
  1× Tank (high DEF/HP) — absorbs damage, prevents WIPE
  1× Damage (high ATK) — clears DPS check
  1× Support (buffs/clears) — maintains party status
  1× Flex (SPD/LCK) — speed clears or loot bonuses
  Trade-off: jack of all trades, no expedition type specialization

Speed Party (3 heroes):
  3× SPD-primary heroes — minimizes expedition duration
  Trade-off: lower party_power, higher WIPE chance
  Best for: farming known-safe expeditions for resources

Loot Party (4 heroes):
  2× Damage + 2× LCK-primary — maximizes DOMINANT bonus rolls
  Trade-off: squishy, requires strong gear to survive
  Best for: resource-rich expeditions where DOMINANT matters

Artisan Stack (building-focused):
  Assign all artisans to affinity buildings
  Keep minimum combat roster for expeditions
  Trade-off: slower expedition progress, faster building output
  Best for: mid-game crafting push
```

---

## STEP 3 — GENERATION RULES

### A. Hero Class Node Structure

Every generated `hero_class` node must use this exact structure, validated against
`schema/project.schema.json` v1.2.0:

**Combat hero class:**
```json
{
  "id": "hero-{slug}",
  "type": "hero_class",
  "label": "{Human-readable name}",
  "description": "{One sentence: who this hero is and what strategic dilemma they create}",
  "icon": "{emoji}",
  "hero_type": "combat",
  "combat_eligible": true,
  "xp_source": "expedition_completion",
  "assignment_target": "expedition",
  "base_stats": {
    "attack": 0,
    "defense": 0,
    "speed": 0,
    "hp": 0,
    "luck": 0
  },
  "stat_growth": {
    "attack": 0,
    "defense": 0,
    "speed": 0,
    "hp": 0,
    "luck": 0
  },
  "slots": ["weapon", "armor", "accessory"],
  "recruit_cost": [
    { "resource_id": "{WORLDFORGE primary resource ID}", "amount": 0 }
  ],
  "unique_passive": {
    "id": "passive-{slug}",
    "description": "{One sentence: what it does and when it triggers}",
    "condition": "{formula string — engine-evaluable condition}",
    "effect": {
      "stat": "{stat name}",
      "operation": "{multiply | add}",
      "value": 0
    }
  },
  "recruitment": {
    "source": "guild_roster",
    "base_tier_rarities": ["common", "uncommon"]
  },
  "unlock_conditions": [],
  "visible": true,
  "canvas_pos": { "x": 0, "y": 0 }
}
```

**Artisan hero class:**
```json
{
  "id": "artisan-{slug}",
  "type": "hero_class",
  "label": "{Human-readable name}",
  "description": "{One sentence: what this artisan produces and where they work best}",
  "icon": "{emoji}",
  "hero_type": "artisan",
  "combat_eligible": false,
  "xp_source": "building_jobs_completed",
  "assignment_target": "building",
  "primary_stat": "{craft_skill | alchemy_skill | research_skill | training_skill | etc.}",
  "base_stats": {
    "attack": 0,
    "defense": 0,
    "speed": 0,
    "hp": 0,
    "luck": 0
  },
  "stat_growth": {
    "attack": 0,
    "defense": 0,
    "speed": 0,
    "hp": 0,
    "luck": 0
  },
  "slots": [],
  "specializations": ["{action_type_1}", "{action_type_2}"],
  "building_affinity": ["{building_id}"],
  "recruit_cost": [
    { "resource_id": "{WORLDFORGE primary resource ID}", "amount": 0 }
  ],
  "unique_passive": {
    "id": "passive-{slug}",
    "description": "{One sentence: workflow bonus description}",
    "condition": "{formula string}",
    "effect": {
      "stat": "{stat name}",
      "operation": "{multiply | add}",
      "value": 0
    }
  },
  "recruitment": {
    "source": "building_only",
    "base_tier_rarities": ["common"]
  },
  "unlock_conditions": [],
  "visible": true,
  "canvas_pos": { "x": 0, "y": 0 }
}
```

**ID rules:**
- Lowercase, hyphens only, no spaces
- Combat classes: `hero-{slug}` (e.g., `hero-berserker`, `hero-guardian`)
- Artisan classes: `artisan-{slug}` (e.g., `artisan-forgemaster`, `artisan-alchemist`)
- No duplicate IDs across the entire node set

**Description rules:**
- Must capture both fiction and strategic function in one sentence
- Bad: "A strong warrior." Good: "Raging berserker — highest ATK on the roster but gains a dangerous
  damage bonus when the party is near WIPE, tempting players to run riskier expeditions."

**Icon selection:**
- Use a single emoji that a player would immediately associate with the class
- Combat classes: weapon, shield, or archetype-related emoji
- Artisan classes: tool or craft-related emoji
- Avoid text, multi-emoji combinations, or flags

**Slot rules (schema enum: weapon, armor, accessory, relic):**
- Combat classes: typically `["weapon", "armor", "accessory"]` or `["weapon", "armor", "relic"]`
- Artisan classes: empty array `[]` — artisans do not equip items
- Vary slots by archetype: tanks get armor + relic, speed classes get weapon + accessory + accessory

**xp_source rules (schema enum: expedition_completion, building_jobs_completed, both):**
- Combat classes: `expedition_completion`
- Artisan classes: `building_jobs_completed`
- Hybrid classes: `both` (use sparingly — only when HERO_SOURCE is "hybrid")
- Never set `expedition_completion` on artisan classes
- Never set `building_jobs_completed` on combat classes unless HERO_SOURCE is "hybrid"

### B. Canvas Layout Algorithm

Position hero_class nodes in two columns based on hero_type. All y positions start at 50 and
increment by 150 per additional class in the same archetype zone.

```
Column 1: Combat Heroes            Column 2: Artisan Heroes
x: 50–350                           x: 450–550

y: 50–150   (Tank zone)             y: 50–150   (Production artisans)
y: 200–350  (Damage zone)           y: 200–350  (Research artisans)
y: 400–500  (Support zone)          y: 400–500  (Specialized artisans)
y: 550–600  (Speed/Luck zone)
```

**Layout rules:**
- Combat heroes in Column 1 (x: 50–350), grouped by archetype
- Artisan heroes in Column 2 (x: 450–550), grouped by production type
- Within each zone, stack vertically with 150px spacing
- All positions must be within bounds: x ∈ [0, 600], y ∈ [0, 600]
- If roster overflows 600px vertically, compress spacing to 120px

### C. The hero-roster.json Output Format

```json
{
  "schema_version": "1.2.0",
  "heroforge_version": "1.0.0",
  "generated_at": "{ISO timestamp}",
  "meta": {
    "project_name": "{from WORLDFORGE meta or source material}",
    "roster_size": "{small | standard | large}",
    "artisan_focus": "{minimal | standard | extensive}",
    "hero_source": "{expedition | workflow | hybrid}",
    "source_material": "{path or 'pitch'}",
    "worldforge_input": "{path to world-economy.json}",
    "designer_notes": "{brief summary of the roster's core fantasy and strategic identity}"
  },
  "nodes": [
    // All hero_class nodes here — schema-valid, ready to import
  ],
  "roster_calibration": {
    "stat_curves": {
      "atk_focused": { "base_range": [15, 20], "level_20_range": [80, 100], "growth_per_level": [4.0, 5.0] },
      "def_focused": { "base_range": [12, 18], "level_20_range": [70, 90], "growth_per_level": [3.5, 4.5] },
      "spd_focused": { "base_range": [10, 15], "level_20_range": [60, 80], "growth_per_level": [3.0, 4.0] },
      "hp_focused":  { "base_range": [80, 100], "level_20_range": [400, 500], "growth_per_level": [20, 25] },
      "lck_focused": { "base_range": [8, 12], "level_20_range": [40, 50], "growth_per_level": [2.0, 2.5] }
    },
    "cost_ratios": {
      "worldforge_contract": {
        "primary_resource_id": "{id}",
        "min": 0,
        "max": 0
      },
      "starter_multiplier": [0.8, 1.0],
      "standard_multiplier": [1.0, 1.2],
      "elite_multiplier": [1.5, 2.0],
      "artisan_multiplier": [0.5, 0.8],
      "cost_audit": "{pass | fail — fail means values must be corrected before proceeding}"
    },
    "archetype_balance": {
      "tanks": 0,
      "damage": 0,
      "support": 0,
      "speed": 0,
      "controller": 0,
      "artisan": 0,
      "notes": "{archetype coverage notes}"
    },
    "primary_stat_distribution": [
      { "class_id": "{id}", "primary_stat": "{stat}", "justification": "{why}" }
    ]
  },
  "party_recommendations": [
    {
      "name": "Balanced Party",
      "size": 4,
      "composition": ["1× Tank", "1× Damage", "1× Support", "1× Flex"],
      "strengths": "Well-rounded, low WIPE risk",
      "weaknesses": "No specialization advantage",
      "best_for": "General progression"
    }
  ],
  "flags": [
    {
      "id": "flag-{n}",
      "severity": "low | medium | high",
      "tension": "{what the source implies}",
      "conflict": "{what the engine would do by default}",
      "options": ["A) ...", "B) ...", "C) ..."],
      "default_applied": "{which option HEROFORGE used}",
      "designer_decision_required": true
    }
  ],
  "downstream_contracts": {
    "buildforge": {
      "artisan_class_ids": ["{id}", "..."],
      "specialization_map": {
        "{artisan_class_id}": { "specializations": ["..."], "building_affinity": ["..."] }
      },
      "note": "BUILDFORGE must reference these artisan classes when generating building artisan_slots"
    },
    "actforge": {
      "combat_class_ids": ["{id}", "..."],
      "power_curve": {
        "level_1_party_power": 0,
        "level_10_party_power": 0,
        "level_20_party_power": 0
      },
      "note": "ACTFORGE must calibrate expedition difficulty against these power levels"
    },
    "itemforge": {
      "slot_definitions": {
        "{class_id}": ["weapon", "armor", "accessory"]
      },
      "note": "ITEMFORGE must generate equipment that fits these slot configurations"
    },
    "upgradeforge": {
      "stat_growth_curves": "see roster_calibration.stat_curves",
      "note": "UPGRADEFORGE must size upgrade effects relative to hero stat growth"
    }
  }
}
```

### D. Unique Passive Structure (Schema-Compliant)

Every `unique_passive` must conform to the schema's `unique_passive` object definition:

```json
"unique_passive": {
  "id": "passive-{slug}",
  "description": "{One sentence: what it does and when it triggers}",
  "condition": "{formula string — engine-evaluable}",
  "effect": {
    "stat": "{attack | defense | speed | hp | luck | craft_speed | crit_chance | loot_bonus}",
    "operation": "{multiply | add}",
    "value": "{number — the modifier applied when condition is true}"
  }
}
```

**Condition string rules:**
- Must reference variables from the engine's formula evaluator (see WIKI Section 2)
- Valid variables: `party_min_hp`, `enemy_atk`, `hp_pct`, `hero_status`, `expedition_level`,
  `expedition_result`, `streak_count`, `momentum`, `worker_specialization_match`,
  `building_level`, `resource_{id}`, `base_cap`
- Must be parseable as a boolean expression: `variable operator value`
- Examples: `party_min_hp < enemy_atk * 0.8`, `streak_count >= 3`, `hp_pct < 0.3`

**Effect rules:**
- `multiply` effects should range from 1.1 (minor) to 2.0 (extreme)
- `add` effects should range from 3 (minor) to 20 (extreme) for combat stats, 30–100 for HP
- Effect magnitude must justify the condition's restrictiveness — a hard trigger deserves a big payoff

### E. Recruitment Configuration

Each hero_class has a `recruitment` object controlling how the player acquires them:

| Source | Who Uses It | Behavior |
|---|---|---|
| `guild_roster` | Most combat classes | Player recruits from the Recruits tab using recruit_cost |
| `building_only` | Most artisan classes | Produced by building workflow with `hero_instance` output |
| `event_only` | Special/secret classes | Unlocked through events, quests, or achievements |

```json
"recruitment": {
  "source": "guild_roster",
  "base_tier_rarities": ["common", "uncommon"],
  "rare_epic_unlock": {
    "requires_building": "building-barracks",
    "building_level": 3
  }
}
```

Artisan classes with `source: "building_only"` do not need `recruit_cost` — they are produced by
building workflows. Set `recruit_cost: []` for these classes.

---

## STEP 4 — SCHEMA COMPLIANCE

Before generating any node, verify against the authoritative schema at
`guild-engine/schema/project.schema.json` v1.2.0.

**Required fields for every hero_class node:**
- `id` (string) — slug format
- `type` (const: `"hero_class"`)
- `label` (string)
- `base_stats` (stat_block object — key-value map of stat names to numbers)
- `slots` (array of slot enum values: `weapon`, `armor`, `accessory`, `relic`)

**Schema-defined optional fields (use when appropriate):**
- `description` (string)
- `icon` (string — emoji)
- `stat_growth` (stat_block object)
- `recruit_cost` (cost array — `[{ "resource_id": string, "amount": number }]`)
- `unlock_conditions` (array of unlock_condition objects)
- `canvas_pos` (canvas_position object — `{ "x": number, "y": number }`)
- `connections` (array of strings)
- `hero_type` (enum: `"combat"` | `"artisan"`, default: `"combat"`)
- `combat_eligible` (boolean, default: `true`)
- `primary_stat` (string — artisan only, feeds `worker_skill` in formulas)
- `xp_source` (enum: `"expedition_completion"` | `"building_jobs_completed"` | `"both"`)
- `specializations` (array of strings, maxItems: 4 — artisan only)
- `assignment_target` (enum: `"expedition"` | `"building"`)
- `building_affinity` (array of building ID strings — artisan only)
- `unique_passive` (object with `id`, `description`, `condition`, `effect`)
- `recruitment` (object with `source`, `base_tier_rarities`, `rare_epic_unlock`)

**Do NOT add fields not in the schema.** No custom properties. No ad-hoc extensions. If a design
decision needs a field that does not exist, write a `//TRANSLATE_FLAG` and use the closest existing
field.

---

## STEP 5 — PIPELINE INTEGRATION

### What HEROFORGE Reads

| Source | Field | Purpose |
|---|---|---|
| `world-economy.json` | `downstream_contracts.heroforge.primary_resource_id` | Which resource hero recruitment costs |
| `world-economy.json` | `downstream_contracts.heroforge.recruit_cost_range` | Min/max cost bounds for recruit_cost |
| `world-economy.json` | `economy_calibration.resource_relationships[]` | Which resources are materials vs. currencies |
| `world-economy.json` | `meta.project_name` | Project name for output meta |
| `source-analysis.json` | Character archetypes, narrative roles | Input for archetype mapping |
| `world-template.json` | Mapped character terms | Input for class naming |
| `CHANGELOG.md` | Pending systems | Awareness of unimplemented features (slot subtypes, etc.) |

### What HEROFORGE Writes

| File | Content |
|---|---|
| `guild-engine/generated/hero-roster.json` | Primary output — all hero_class nodes + calibration |
| `guild-engine/generator/hero-flags.md` | Design tension flags (only if flags exist) |
| `guild-engine/generator/CHANGELOG.md` | Append HEROFORGE run entry |

### What HEROFORGE Feeds

| Downstream Forge | What It Reads | Why |
|---|---|---|
| BUILDFORGE | `artisan_class_ids`, `specialization_map` | Building workflow staffing, artisan_slots configuration |
| ACTFORGE | `combat_class_ids`, `power_curve` | Expedition difficulty calibration against hero stats |
| ITEMFORGE | `slot_definitions` | Equipment generation matching hero slot configurations |
| UPGRADEFORGE | `stat_growth_curves` | Upgrade effect sizing relative to natural stat growth |
| ASSEMBLER | All of the above | Cross-reference validation and final calibration |

---

## STEP 6 — VALIDATION CHECKLIST

Run through every item before writing the output file. ERRORS block output. WARNINGS are written to
`hero-flags.md` and noted in the terminal summary but do not block output.

### Structural Checks (Errors if failed)

- [ ] At least 3 combat hero_class nodes exist
- [ ] At least 1 artisan hero_class node exists
- [ ] All hero_class nodes have required fields: `id`, `type`, `label`, `base_stats`, `slots`
- [ ] All `id` fields are slug-format: lowercase, hyphens only
- [ ] Combat IDs use `hero-{slug}` prefix; artisan IDs use `artisan-{slug}` prefix
- [ ] No duplicate IDs within the node set
- [ ] All canvas_pos values are within bounds: x ∈ [0, 600], y ∈ [0, 600]
- [ ] `type` field is exactly `"hero_class"` on every node — no custom types
- [ ] Artisan classes have `combat_eligible: false`, `xp_source: "building_jobs_completed"`, `hero_type: "artisan"`
- [ ] Combat classes have `combat_eligible: true`, `xp_source: "expedition_completion"`, `hero_type: "combat"`
- [ ] Artisan classes have `slots: []` (empty array)
- [ ] Combat classes have at least one slot in `slots[]`
- [ ] `schema_version` in output file is `"1.2.0"`
- [ ] `downstream_contracts` object is present and complete
- [ ] `recruit_cost` references only resource IDs that exist in WORLDFORGE output
- [ ] `specializations[]` has maxItems: 4 (per schema constraint)

### Balance Checks (Warnings if failed)

- [ ] No two combat classes share the same primary stat (unless thematically justified with flag)
- [ ] At least one tank archetype (high DEF or HP) exists
- [ ] At least one damage archetype (high ATK) exists
- [ ] Recruitment costs fall within WORLDFORGE's contract range (±20% tolerance)
- [ ] Stat growth curves are monotonic (stats increase, never decrease)
- [ ] Each class has a unique_passive with a meaningful mechanical identity
- [ ] No two classes share the same unique_passive type
- [ ] Artisan specializations reference valid `action_type` values (matching WORLDFORGE material types)
- [ ] Party of 4 highest-ATK heroes can clear WORLDFORGE's early expedition reward band
- [ ] At least one party composition prevents WIPE on danger-level 5 expeditions

### Pipeline Checks (Warnings if failed)

- [ ] `//TRANSLATE_FLAG` comments present on any node where source material created tension
- [ ] `flags[]` array populated if any source material contradictions exist
- [ ] `hero-flags.md` file generated if `flags[]` is non-empty
- [ ] `CHANGELOG.md` entry appended
- [ ] `downstream_contracts` values are internally consistent
- [ ] `roster_calibration.cost_ratios.cost_audit` is `"pass"`

---

## STEP 7 — HERO FLAGS FILE

If any flags exist, generate `guild-engine/generator/hero-flags.md` with this format:

```markdown
# Hero Roster Flags — {Project Name}
### Generated by HEROFORGE {ISO date}

These flags represent design tensions between your source material and standard Guild Engine
hero_class mechanics. Review each flag and confirm or override the default decision.

---

## FLAG-001 [SEVERITY: HIGH] — {Flag title}

**Source intent:** {What the source material implies about this character}
**Engine default:** {What standard hero_class mechanics would do}

**Options:**
- A) {Option A description — honors source character identity}
- B) {Option B description — honors game mechanics}
- C) {Option C, if available}

**Default applied:** {Which option HEROFORGE used}

**To override:** Edit `hero-roster.json` nodes as follows:
  - {Specific field change to apply Option A}
  - {Specific field change to apply Option B}

---

## FLAG-002 [SEVERITY: LOW] — ...
```

---

## STEP 8 — FILE WRITING

Write these files in this order:

```
1. guild-engine/generated/hero-roster.json              (primary output)
2. guild-engine/generator/hero-flags.md                 (only if flags[] is non-empty)
3. Append to guild-engine/generator/CHANGELOG.md        (always)
```

**Directory creation:** If `guild-engine/generated/` does not exist, create it before writing.

**CHANGELOG entry format:**

```markdown
### HEROFORGE Run — {ISO date}
- VERSION: v1.9.1
- TYPE: SYSTEM
- SCOPE: HEROFORGE
- STATUS: IMPLEMENTED
- INPUT: world-economy.json + {source material path or pitch summary in ≤20 words}
- OUTPUT: guild-engine/generated/hero-roster.json
- CLASSES: {N} total ({N} combat, {N} artisan)
- ARCHETYPES: {list primary archetypes covered}
- FLAGS: {N} design tensions flagged ({N} high, {N} medium, {N} low)
- DOWNSTREAM: hero-roster.json ready for BUILDFORGE, ACTFORGE, ITEMFORGE, UPGRADEFORGE
```

---

## STEP 9 — TERMINAL SUMMARY

Print this summary box after all files are written:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  HeroForge Complete                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  {Project Name}                                                         │
│  Roster Size: {size} · Artisan Focus: {focus} · XP Source: {source}    │
├─────────────────────────────────────────────────────────────────────────┤
│  Classes:  {N} total                                                    │
│    • Combat:        {N}    ({archetype breakdown})                      │
│    • Artisan:       {N}    ({specialization breakdown})                 │
├─────────────────────────────────────────────────────────────────────────┤
│  Primary Stats:     {list which stats are covered by which classes}     │
│  Unique Passives:   {N}    (all mechanically distinct)                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Cost Audit:        {PASS / FAIL — vs WORLDFORGE contract}              │
│  Recruit Range:     {min}–{max} {primary resource}                      │
├─────────────────────────────────────────────────────────────────────────┤
│  Output: guild-engine/generated/hero-roster.json                       │
│  Flags:  {N} design tensions (see hero-flags.md | none)                │
└─────────────────────────────────────────────────────────────────────────┘

Downstream forge contracts written:
  BUILDFORGE   — {N} artisan classes, {N} specializations mapped
  ACTFORGE     — party power curve: lvl 1={N}, lvl 10={N}, lvl 20={N}
  ITEMFORGE    — {N} slot configurations defined
  UPGRADEFORGE — stat growth curves for {N} classes

Next step: Run BUILDFORGE
  > Follow guild-engine/generator/BUILDFORGE.md exactly.
  > INPUT: guild-engine/generated/world-economy.json + guild-engine/generated/hero-roster.json
```

---

## EXAMPLE SESSION

```
> Follow guild-engine/generator/HEROFORGE.md exactly.

WORLDFORGE_OUTPUT: "guild-engine/generated/world-economy.json"
SOURCE_MATERIAL:   "guild-engine/generator/world-template.json"
GAME_PITCH:        "none"
ROSTER_SIZE:       "standard"
ARTISAN_FOCUS:     "standard"
HERO_SOURCE:       "workflow"

HEROFORGE reading context...
  ✓ schema/project.schema.json
  ✓ docs/WIKI.md
  ✓ generator/CHANGELOG.md
  ✓ source-analysis.json (not found — will read world-template.json)
  ✓ world-template.json
  ✓ generated/world-economy.json

WORLDFORGE CONTRACT LOADED:
  Primary resource: resource-blood
  Recruit cost range: 4,000–5,000 Blood
  Materials: resource-vessels, resource-territory

✓ Step 1 — Narrative Analysis

  ARCHETYPE MAPPING:
    ARCHETYPE: Tank
      Source signal: "Gangrel — night hunters, bestial endurance, territorial protectors"
      Proposed class: Gangrel Sentinel
      Primary stat: defense
      Strategic dilemma: "Highest survival, but pulling them from patrol expeditions
        leaves the coterie's flank exposed in unknown territory."

    ARCHETYPE: Damage
      Source signal: "Brujah — political rage, physical dominance, righteous fury"
      Proposed class: Brujah Enforcer
      Primary stat: attack
      Strategic dilemma: "Highest damage output with a wipe-risk passive that doubles
        damage when the party is near death — do you risk the entire party for the kill?"

    ARCHETYPE: Support
      Source signal: "Tremere — blood sorcery, scholarly analysis, ritual buffs"
      Proposed class: Tremere Ritualist
      Primary stat: luck
      Strategic dilemma: "Best loot modifier and status-clearing passive, but low HP
        makes them the first to die in hard fights."

    ARCHETYPE: Speed
      Source signal: "Nosferatu — information brokers, stealth, infiltration"
      Proposed class: Nosferatu Shadow
      Primary stat: speed
      Strategic dilemma: "Fastest expedition clears, but low ATK means they contribute
        nothing to the DPS check on boss fights."

    ARCHETYPE: Damage (secondary)
      Source signal: "Ventrue — commanding presence, domination, iron will"
      Proposed class: Ventrue Commander
      Primary stat: hp
      Strategic dilemma: "Highest HP pool enables aggressive expedition selection, but
        average ATK means they're a bruiser, not a finisher."

    ARCHETYPE GAP: Controller (LCK-primary)
      Source provides: No dedicated luck/fortune archetype in VtM core clans
      Recommendation: Malkavian Oracle — insight-driven luck class. "Madness grants
        visions that guide the coterie to hidden treasures."
      //TRANSLATE_FLAG [SEVERITY: LOW] — LCK archetype filled by thematic inference

  STAT IDENTITY TABLE:
    hero-gangrel-sentinel   → DEF primary (tank, territorial protector)
    hero-brujah-enforcer    → ATK primary (berserker, physical domination)
    hero-tremere-ritualist  → LCK primary (support via loot and status effects)
    hero-nosferatu-shadow   → SPD primary (scout, infiltrator)
    hero-ventrue-commander  → HP primary (bruiser, high survival)
    hero-malkavian-oracle   → LCK primary
      //TRANSLATE_FLAG [SEVERITY: MEDIUM] — Tremere and Malkavian both LCK-primary
      JUSTIFICATION: Tremere uses luck for ritual outcomes; Malkavian uses luck for
        prophetic loot bonuses. Different passive mechanics differentiate them.
      DIFFERENTIATION: Tremere passive clears status effects on expedition complete;
        Malkavian passive grants bonus loot rolls on DOMINANT result.

  ARTISAN CLASSES:
    ARTISAN CLASS: Keeper of Elysium
      Source signal: "Keeper maintains the neutral gathering place, broker of secrets"
      Specializations: ["research", "analysis"]
      Building affinity: ["building-elysium"]
      Primary stat: research_skill
      Design hook: "Momentum bonus — continuous research at Elysium compounds knowledge
        gains. Pulling the Keeper to another building resets momentum."

    ARTISAN CLASS: Ghoul Retainer
      Source signal: "Ghouls perform daytime tasks, bound by Blood"
      Specializations: ["construction", "maintenance"]
      Building affinity: ["building-haven", "building-workshop"]
      Primary stat: craft_skill
      Design hook: "Specialization match reduces construction time. Assigning multiple
        ghouls to the same building stacks worker_skill contributions."

    ARTISAN CLASS: Blood Alchemist
      Source signal: "Thin-bloods can practice alchemy, transmuting Blood into substances"
      Specializations: ["brewing", "transmutation"]
      Building affinity: ["building-apothecary"]
      Primary stat: alchemy_skill
      Design hook: "Streak bonus — brewing the same recipe consecutively unlocks faster
        production and higher crit chance on potent elixirs."

✓ Step 2 — Calibration

  RECRUITMENT COST AUDIT:
    WORLDFORGE CONTRACT: recruit_cost_range = 4,000–5,000 resource-blood

    hero-gangrel-sentinel:   4,200 Blood — ×1.05 — PASS (standard tier)
    hero-brujah-enforcer:    4,800 Blood — ×1.20 — PASS (standard tier, upper end)
    hero-tremere-ritualist:  5,600 Blood — ×1.40 — PASS (elite tier, within +20%)
    hero-nosferatu-shadow:   4,000 Blood — ×1.00 — PASS (standard tier)
    hero-ventrue-commander:  5,000 Blood — ×1.25 — PASS (standard tier, upper)
    hero-malkavian-oracle:   5,800 Blood — ×1.45 — PASS (elite tier, within +20%)
    artisan-keeper:          workflow-produced — PASS (building_only recruitment)
    artisan-ghoul:           2,500 Blood — ×0.63 — PASS (artisan tier)
    artisan-blood-alchemist: workflow-produced — PASS (building_only recruitment)

    TOLERANCE CHECK: All costs within ±20% of WORLDFORGE range? YES ✓

  STAT GROWTH (showing math for 3 classes):

    CLASS: Brujah Enforcer (ATK-focused)
      attack:  base=18, growth=4.5/level → lvl 20: 18 + (4.5 × 19) = 103.5 → 103
      defense: base=8,  growth=1.5/level → lvl 20: 8 + (1.5 × 19) = 36.5 → 36
      speed:   base=10, growth=1.8/level → lvl 20: 10 + (1.8 × 19) = 44.2 → 44
      hp:      base=90, growth=12/level  → lvl 20: 90 + (12 × 19) = 318
      luck:    base=5,  growth=0.8/level → lvl 20: 5 + (0.8 × 19) = 20.2 → 20

    CLASS: Gangrel Sentinel (DEF-focused)
      attack:  base=10, growth=1.8/level → lvl 20: 10 + (1.8 × 19) = 44.2 → 44
      defense: base=16, growth=4.0/level → lvl 20: 16 + (4.0 × 19) = 92
      speed:   base=8,  growth=1.2/level → lvl 20: 8 + (1.2 × 19) = 30.8 → 30
      hp:      base=95, growth=18/level  → lvl 20: 95 + (18 × 19) = 437
      luck:    base=6,  growth=0.8/level → lvl 20: 6 + (0.8 × 19) = 21.2 → 21

    CLASS: Nosferatu Shadow (SPD-focused)
      attack:  base=12, growth=2.0/level → lvl 20: 12 + (2.0 × 19) = 50
      defense: base=10, growth=1.5/level → lvl 20: 10 + (1.5 × 19) = 38.5 → 38
      speed:   base=14, growth=3.5/level → lvl 20: 14 + (3.5 × 19) = 80.5 → 80
      hp:      base=75, growth=10/level  → lvl 20: 75 + (10 × 19) = 265
      luck:    base=8,  growth=1.2/level → lvl 20: 8 + (1.2 × 19) = 30.8 → 30

  UNIQUE PASSIVE ASSIGNMENTS:
    hero-brujah-enforcer:    "Righteous Fury" — wipe-risk bonus (ATK ×1.5 when party near death)
    hero-gangrel-sentinel:   "Bestial Endurance" — survival instinct (DEF ×1.8 when hp_pct < 0.3)
    hero-tremere-ritualist:  "Ritual Cleansing" — status clear (HP +50 when hero_status == injured)
    hero-nosferatu-shadow:   "Shadow Network" — expedition type bonus (LCK +10 at danger ≥ 8)
    hero-ventrue-commander:  "Iron Will" — resource synergy (ATK +5 when blood > cap × 0.8)
    hero-malkavian-oracle:   "Prophetic Vision" — loot bonus (LCK ×2.0 on DOMINANT result)
    artisan-keeper:          "Momentum Scholar" — momentum rider (SPD ×1.15 at momentum ≥ 50)
    artisan-ghoul:           "Daylight Service" — streak synergy (SPD ×1.2 at streak ≥ 3)
    artisan-blood-alchemist: "Transmutation Focus" — streak synergy variant (crit_chance +0.15 at streak ≥ 4)

  EXAMPLE NODES (2 combat, 1 artisan):

    {
      "id": "hero-brujah-enforcer",
      "type": "hero_class",
      "label": "Brujah Enforcer",
      "description": "Raging enforcer — highest ATK on the roster with a wipe-risk passive that doubles damage when the party is near death, tempting players to run riskier expeditions.",
      "icon": "👊",
      "hero_type": "combat",
      "combat_eligible": true,
      "xp_source": "expedition_completion",
      "assignment_target": "expedition",
      "base_stats": { "attack": 18, "defense": 8, "speed": 10, "hp": 90, "luck": 5 },
      "stat_growth": { "attack": 4.5, "defense": 1.5, "speed": 1.8, "hp": 12, "luck": 0.8 },
      "slots": ["weapon", "armor", "accessory"],
      "recruit_cost": [{ "resource_id": "resource-blood", "amount": 4800 }],
      "unique_passive": {
        "id": "passive-righteous-fury",
        "description": "ATK ×1.5 when party HP is critically low — the fury of the doomed.",
        "condition": "party_min_hp < enemy_atk * 0.8",
        "effect": { "stat": "attack", "operation": "multiply", "value": 1.5 }
      },
      "recruitment": {
        "source": "guild_roster",
        "base_tier_rarities": ["common", "uncommon"]
      },
      "unlock_conditions": [],
      "visible": true,
      "canvas_pos": { "x": 100, "y": 200 }
    }

    {
      "id": "hero-gangrel-sentinel",
      "type": "hero_class",
      "label": "Gangrel Sentinel",
      "description": "Bestial guardian — highest DEF and HP with a survival passive that hardens further when wounded, making them nearly unkillable but useless as a damage source.",
      "icon": "🐺",
      "hero_type": "combat",
      "combat_eligible": true,
      "xp_source": "expedition_completion",
      "assignment_target": "expedition",
      "base_stats": { "attack": 10, "defense": 16, "speed": 8, "hp": 95, "luck": 6 },
      "stat_growth": { "attack": 1.8, "defense": 4.0, "speed": 1.2, "hp": 18, "luck": 0.8 },
      "slots": ["weapon", "armor", "relic"],
      "recruit_cost": [{ "resource_id": "resource-blood", "amount": 4200 }],
      "unique_passive": {
        "id": "passive-bestial-endurance",
        "description": "DEF ×1.8 when HP drops below 30% — the beast refuses to die.",
        "condition": "hp_pct < 0.3",
        "effect": { "stat": "defense", "operation": "multiply", "value": 1.8 }
      },
      "recruitment": {
        "source": "guild_roster",
        "base_tier_rarities": ["common", "uncommon"]
      },
      "unlock_conditions": [],
      "visible": true,
      "canvas_pos": { "x": 100, "y": 50 }
    }

    {
      "id": "artisan-keeper",
      "type": "hero_class",
      "label": "Keeper of Elysium",
      "description": "Scholarly custodian — manages the Elysium's knowledge archive; continuous research compounds into momentum bonuses that decay if the Keeper is reassigned.",
      "icon": "📜",
      "hero_type": "artisan",
      "combat_eligible": false,
      "xp_source": "building_jobs_completed",
      "assignment_target": "building",
      "primary_stat": "research_skill",
      "base_stats": { "attack": 3, "defense": 5, "speed": 8, "hp": 50, "luck": 10 },
      "stat_growth": { "attack": 0.2, "defense": 0.5, "speed": 1.0, "hp": 5, "luck": 1.5 },
      "slots": [],
      "specializations": ["research", "analysis"],
      "building_affinity": ["building-elysium"],
      "recruit_cost": [],
      "unique_passive": {
        "id": "passive-momentum-scholar",
        "description": "Workflow speed ×1.15 when momentum reaches 50 — deep focus.",
        "condition": "momentum >= 50",
        "effect": { "stat": "speed", "operation": "multiply", "value": 1.15 }
      },
      "recruitment": {
        "source": "building_only",
        "base_tier_rarities": ["common"]
      },
      "unlock_conditions": [],
      "visible": true,
      "canvas_pos": { "x": 500, "y": 50 }
    }

  FLAGS:
    FLAG-001 [SEVERITY: LOW] — LCK archetype gap filled by inference
      Malkavian Oracle was inferred from VtM madness/insight theme to fill the
      Controller (LCK) archetype gap. Source material has no dedicated fortune class.
      Default: Accepted inference. Designer may replace with a different clan.

    FLAG-002 [SEVERITY: MEDIUM] — Shared primary stat (LCK)
      Tremere Ritualist and Malkavian Oracle both use LCK as primary stat.
      Differentiation: Tremere's passive clears status effects; Malkavian's passive
      grants bonus loot rolls. Mechanically distinct despite shared primary.
      Default: Accepted with differentiation noted. Designer may reassign one to HP.

┌─────────────────────────────────────────────────────────────────────────┐
│  HeroForge Complete                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  Kindred Dark Ages                                                      │
│  Roster Size: standard · Artisan Focus: standard · XP Source: workflow  │
├─────────────────────────────────────────────────────────────────────────┤
│  Classes:  9 total                                                      │
│    • Combat:        6    (1 tank, 2 damage, 1 support, 1 speed, 1 ctrl) │
│    • Artisan:       3    (1 research, 1 construction, 1 alchemy)        │
├─────────────────────────────────────────────────────────────────────────┤
│  Primary Stats:     ATK=Brujah, DEF=Gangrel, SPD=Nosferatu,            │
│                     HP=Ventrue, LCK=Tremere+Malkavian(flagged)          │
│  Unique Passives:   9    (all mechanically distinct)                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Cost Audit:        PASS — vs WORLDFORGE contract                       │
│  Recruit Range:     2,500–5,800 Blood                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Output: guild-engine/generated/hero-roster.json                       │
│  Flags:  2 design tensions (see hero-flags.md)                         │
└─────────────────────────────────────────────────────────────────────────┘

Downstream forge contracts written:
  BUILDFORGE   — 3 artisan classes, 6 specializations mapped
  ACTFORGE     — party power curve: lvl 1=135, lvl 10=520, lvl 20=980
  ITEMFORGE    — 6 slot configurations defined (weapon/armor/accessory, weapon/armor/relic)
  UPGRADEFORGE — stat growth curves for 9 classes

Next step: Run BUILDFORGE
  > Follow guild-engine/generator/BUILDFORGE.md exactly.
  > INPUT: guild-engine/generated/world-economy.json + guild-engine/generated/hero-roster.json
```

---

## CRITICAL RULES

1. **NEVER create new node types** — use existing `hero_class` type only. Do not invent `hero_instance`, `passive`, or any other type.
2. **ALWAYS respect WORLDFORGE's recruit cost contract** — ±20% tolerance max. If costs drift outside this range, flag and correct.
3. **ALWAYS give each combat class a distinct primary stat** — no ATK-clones. If two classes must share a primary stat, it requires a flag with mechanical differentiation documented.
4. **ALWAYS include unique_passive with mechanical identity** — not just flavor text. The condition must be engine-evaluable and the effect must change gameplay.
5. **ALWAYS output valid schema v1.2.0 JSON** — every node must validate against `project.schema.json`.
6. **NEVER set `combat_eligible: true` on artisan classes** — artisans do not fight.
7. **NEVER set `xp_source: "expedition_completion"` on artisan classes** — artisans earn XP from building_jobs_completed.
8. **ALWAYS position combat heroes in Column 1 (x: 50–350), artisans in Column 2 (x: 450–550)** — layout must be readable.
9. **ALWAYS document stat growth math** — show the formula and calculated values for every class. No unexplained numbers.
10. **ALWAYS include recruitment configuration** — each class must specify how the player acquires them (guild_roster, building_only, or event_only).
11. **NEVER add fields not defined in the schema** — if you need a field that doesn't exist, write a flag.
12. **ALWAYS verify recruit_cost resource_ids exist in WORLDFORGE output** — referencing a nonexistent resource is a structural error.

---

## KNOWN LIMITATIONS (v1.0)

HEROFORGE v1.0 does **not** handle:

- **Individual hero instances** — HEROFORGE generates class templates, not individual recruits. Players instantiate heroes from class templates at recruitment time. Instance variance (rarity tiers, stat rolls) is handled by the recruitment system, not HEROFORGE.
- **Equipment items** — HEROFORGE defines which slots each class uses but does not generate the items themselves. ITEMFORGE handles equipment generation using HEROFORGE's `slot_definitions` contract.
- **Building assignments** — HEROFORGE defines artisan building affinities and specializations but does not assign artisans to buildings. BUILDFORGE handles building workflow staffing using HEROFORGE's `specialization_map` contract.
- **Expedition difficulty** — HEROFORGE provides hero power curves but does not calibrate expedition enemy stats. ACTFORGE handles difficulty calibration using HEROFORGE's `power_curve` contract.
- **Cross-system validation** — HEROFORGE validates its own output against the schema and WORLDFORGE contracts. Full cross-system validation (do all referenced building IDs exist? do all loot tables contain items that fit hero slots?) is handled by ASSEMBLER.
- **Hero slot subtypes** — PENDING in CHANGELOG. Schema does not yet support sword/staff/bow filtering on weapon slots. When implemented, HEROFORGE will need a subtype calibration table mapping class archetype to allowed weapon subtypes. For now, all combat classes use the generic `weapon` slot.
- **Ability nodes** — HEROFORGE generates `unique_passive` on each hero_class node but does not generate separate `ability` nodes. A future HEROFORGE update may generate ability trees as connected `ability` nodes.

---

## RELATED FILES

| File | Relationship |
|---|---|
| `guild-engine/generator/WORLDFORGE.md` | Upstream forge — produces economy constraints HEROFORGE reads |
| `guild-engine/generator/EXTRACTPASS0.md` | Pre-pipeline — produces source-analysis.json for archetype mapping |
| `guild-engine/generator/TRANSLATEPASS.md` | Pre-pipeline — produces world-template.json with mapped terms |
| `guild-engine/generator/ACTFORGE.md` | Downstream — reads hero power curves for difficulty calibration |
| `guild-engine/generator/BUILDFORGE.md` | Downstream (future) — reads artisan specializations for building staffing |
| `guild-engine/generator/ITEMFORGE.md` | Downstream (future) — reads slot definitions for equipment generation |
| `guild-engine/generator/UPGRADEFORGE.md` | Downstream (future) — reads stat growth curves for upgrade sizing |
| `guild-engine/generator/ASSEMBLER.md` | Integration (future) — reads all forge outputs for cross-validation |
| `guild-engine/schema/project.schema.json` | Schema authority — all nodes must validate against v1.2.0 |
| `guild-engine/docs/WIKI.md` | Section 1: hero_class node type. Section 3: Artisan Hero System |
| `guild-engine/generator/CHANGELOG.md` | Pending systems: slot subtypes, ability trees |
