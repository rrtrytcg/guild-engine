# BUILDFORGE — AI-Assisted Building System & Workflow Chain Design
# Run this in Claude Code to generate the building system, workflow chains, and upgrade trees for a Guild Engine project.
# BUILDFORGE is the third forge in the Forge Suite — reads WORLDFORGE + HEROFORGE output, feeds ACTFORGE, ITEMFORGE, UPGRADEFORGE.
#
# Input:  guild-engine/generated/world-economy.json     (from WORLDFORGE)
#         guild-engine/generated/hero-roster.json        (from HEROFORGE)
#         guild-engine/generator/source-analysis.json    (from EXTRACTPASS0)
#         guild-engine/generator/world-template.json     (from TRANSLATEPASS)
#         OR: free-text GAME_PITCH if no source material
#
# Output: guild-engine/generated/building-system.json   (building + building_workflow + building_upgrade + crafting_recipe nodes + calibration)
#         guild-engine/generator/building-flags.md       (design tensions for review)
#
# Schema version: 1.2.0
# Forge Suite position: 3 of 7 — reads WORLDFORGE + HEROFORGE, feeds ACTFORGE, ITEMFORGE, UPGRADEFORGE

---

## Purpose

BUILDFORGE is not a building template stamper. It is a production chain architect.

Its job is to answer the question that determines whether a game's economy feels alive or feels like
a menu:
**what does it mean to operate this building, and what happens when you operate it well?**

Every building BUILDFORGE generates carries three answers: what this structure represents in the
world's fiction, what economic role it plays in the resource-to-power pipeline, and why a player who
invests in upgrading this building over another must accept a real trade-off. BUILDFORGE documents all
three — in the node, in the calibration object, and in flags where the answers are in tension.

A building that produces resources with no decisions is not a building. It is a number that goes up.
BUILDFORGE generates buildings that create production dilemmas — a Forge that melts items into ingots
but requires the player to sacrifice equipment they might want to keep. An Apothecary where streak
bonuses reward recipe specialization but punish switching. A Library where momentum accumulates over
time but decays if the queue goes idle, making continuous research a strategic commitment.

BUILDFORGE also generates the connective tissue: **building_workflow** nodes that define how each
building operates, **building_upgrade** nodes that pace unlocks and power growth, and
**crafting_recipe** nodes that define specific input→output transformations. The engine does not know
what "melt" or "brew" means — it reads the configuration and executes it. BUILDFORGE writes the
configuration that makes each building feel distinct.

Every downstream forge reads BUILDFORGE output. ACTFORGE cannot design expedition rewards without
knowing what materials buildings consume. ITEMFORGE cannot generate equipment without knowing which
workflows produce them. UPGRADEFORGE cannot size upgrade effects without knowing the building power
curve. BUILDFORGE sets the production bounds. Everything else works within them.

---

## Before doing anything else

Read these files in order:

1. `guild-engine/schema/project.schema.json` — building, building_workflow, building_upgrade, crafting_recipe node fields and constraints
2. `guild-engine/docs/WIKI.md` — Section 1 (Node Types), Section 2 (Building Workflow System), Section 3 (Artisan Hero System)
3. `guild-engine/generator/CHANGELOG.md` — pending building-related systems
4. `guild-engine/docs/DAY2-DEEPDIVE.md` — building system architecture, formula evaluator, blueprint system
5. `guild-engine/generator/EXTRACTPASS0.md` — what source-analysis.json contains
6. `guild-engine/generator/TRANSLATEPASS.md` — what world-template.json contains
7. `guild-engine/generated/world-economy.json` — WORLDFORGE output (required)
8. `guild-engine/generated/hero-roster.json` — HEROFORGE output (required)
9. If source material exists: `guild-engine/generator/source-analysis.json`
10. If TRANSLATEPASS has run: `guild-engine/generator/world-template.json`

Print your read status before proceeding:
```
BUILDFORGE reading context...
  ✓ schema/project.schema.json
  ✓ docs/WIKI.md
  ✓ generator/CHANGELOG.md
  ✓ docs/DAY2-DEEPDIVE.md
  [✓ / ✗] source-analysis.json
  [✓ / ✗] world-template.json
  [✓ / ✗] generated/world-economy.json (REQUIRED — abort if missing)
  [✓ / ✗] generated/hero-roster.json   (REQUIRED — abort if missing)
```

**If `world-economy.json` does not exist, STOP.** Print:
```
BUILDFORGE ABORT: world-economy.json not found.
Run WORLDFORGE first: guild-engine/generator/WORLDFORGE.md
BUILDFORGE cannot generate buildings without economy constraints.
```

**If `hero-roster.json` does not exist, STOP.** Print:
```
BUILDFORGE ABORT: hero-roster.json not found.
Run HEROFORGE first: guild-engine/generator/HEROFORGE.md
BUILDFORGE cannot generate artisan staffing without hero roster data.
```

---

## Input Format

User provides:

```
WORLDFORGE_OUTPUT: "{{path to world-economy.json}}"
HEROFORGE_OUTPUT:  "{{path to hero-roster.json}}"
SOURCE_MATERIAL:   "{{path to source-analysis.json or world-template.json, or 'none'}}"
GAME_PITCH:        "{{optional text description if no source material}}"
BUILDING_COUNT:    "{{small (3-4 buildings) | standard (5-7 buildings) | large (8-12 buildings)}}"
WORKFLOW_DEPTH:    "{{shallow (1-2 workflows per building) | standard (2-4 workflows) | deep (4-6 workflows)}}"
UPGRADE_STYLE:     "{{linear (1 upgrade track per building) | branching (2-3 upgrade tracks) | deep (tiered tree)}}"
```

**Defaults if not provided:**
- BUILDING_COUNT: `standard`
- WORKFLOW_DEPTH: `standard`
- UPGRADE_STYLE: `linear`

**BUILDING_COUNT definitions:**
- `small` — Tight building set for short games. 3–4 buildings. Every building must serve a unique
  economic purpose — no overlap. One production building, one crafting building, one utility building
  minimum.
- `standard` — The default Guild Engine building set. 5–7 buildings. Enough diversity for
  specialization decisions. At least one building per major behavior type (produce, consume_resource,
  consume_item). 2–3 artisan-staffed buildings.
- `large` — Expansive building set for long games or rich source material. 8–12 buildings. Multiple
  buildings per behavior type. Deep upgrade dependencies between buildings. 4+ artisan-staffed
  buildings. Cross-building upgrade gates create meaningful progression paths.

**WORKFLOW_DEPTH definitions:**
- `shallow` — 1–2 workflows per building. Simple operations. Best for short games or buildings that
  serve one clear purpose (Mine: produce ore. That's it.)
- `standard` — 2–4 workflows per building. One primary workflow available from building level 1, plus
  secondary workflows unlocked through building upgrades. Creates progression within each building.
- `deep` — 4–6 workflows per building. Multiple tiers of workflows, some requiring cross-building
  upgrades to unlock. Creates complex production chains where mastering one building's workflow tree
  is a meaningful mid-game goal.

**UPGRADE_STYLE definitions:**
- `linear` — 1 upgrade track per building. Level 1 → Level 2 → Level 3. Each upgrade improves the
  building's core stats (slots, batch size, workflow unlocks). Simple and readable.
- `branching` — 2–3 upgrade tracks per building. The player chooses which track to invest in first.
  Track A might unlock new workflows while Track B improves batch size. Creates upgrade dilemmas.
- `deep` — Tiered upgrade tree with cross-building prerequisites. Upgrading the Forge to tier 3
  might require the Library at tier 2. Creates building investment dependencies across the settlement.

---

## STEP 1 — NARRATIVE ANALYSIS

Before generating any nodes, analyze the source material and upstream forge outputs for these five
signals. Write your analysis to the console — this is the reasoning that justifies every building
system decision that follows.

### A. Building Archetypes

Identify production locations in the source material or WORLDFORGE economy. Every building set needs
coverage across four economic roles:

- **Producer** — generates raw resources passively. behavior: `produce_resource`, mode: `passive`.
  Source signals: mine, farm, well, generator, extractor, quarry, plantation.
- **Transformer** — converts items or resources into different outputs. behavior: `consume_item` or
  `consume_resource`, mode: `queued`. Source signals: forge, workshop, anvil, smelter, refinery.
- **Creator** — produces new entities (items, consumables, heroes). behavior: `consume_resource` or
  `recruit_hero`, mode: `queued`. Source signals: apothecary, barracks, kennel, academy, brewery.
- **Amplifier** — enhances other systems or produces world_effects. behavior: `consume_resource`,
  mode: `passive` or `queued`. Source signals: library, temple, observatory, war room, archive.

For each archetype found, write:
```
BUILDING ARCHETYPE: [role]
  Source signal: "[quote or paraphrase from source material]"
  Proposed building: [building name]
  Behavior: [produce_resource | consume_item | consume_resource | recruit_hero]
  Workflow mode: [queued | passive]
  Economic role: "[what resource loop this building participates in]"
  Artisan staffed: [yes/no — does this building benefit from artisan assignment?]
```

If the source material does not provide coverage for a required archetype, write:
```
ARCHETYPE GAP: [missing role]
  Source provides: [what's available]
  Recommendation: [proposed building to fill the gap, with thematic justification]
  //TRANSLATE_FLAG [SEVERITY: LOW] — gap filled by inference, not source material
```

### B. Material Flow Mapping

Using WORLDFORGE's `downstream_contracts.buildforge.material_ids[]` and
`economy_calibration.resource_relationships[]`, map every material to a production chain:

```
MATERIAL FLOW: [material_id]
  Source: [how the player acquires this material — expedition drops, building production, etc.]
  Consumed by: [which building workflows consume this material]
  Output: [what the material is transformed into — items, consumables, resources, etc.]
  Bottleneck role: [is this material the pump for a loop? Which act?]
```

**Rule: every material in WORLDFORGE's `material_ids[]` must appear as an input or output in at
least one building_workflow.** A material with no building use is a dead resource — flag it.

### C. Workflow Chain Discovery

Identify multi-step production chains where one building's output feeds another building's input.
These chains are the economic backbone of the building system.

```
WORKFLOW CHAIN: [chain name]
  Step 1: [building A] → [workflow] → [intermediate output]
  Step 2: [building B] → [workflow] → [intermediate output]
  Step 3: [building C] → [workflow] → [final output]
  Chain length: [N steps]
  Player decision: [what the player chooses at each step]
  Design intent: [why this chain exists — what economic tension does it create?]
```

**Target chain lengths by BUILDING_COUNT:**
- `small`: 1–2 step chains maximum
- `standard`: 2–3 step chains (one chain may reach 4 steps)
- `large`: 3–4 step chains with branching paths

### D. Artisan Staffing Plan

Read HEROFORGE's `downstream_contracts.buildforge.artisan_class_ids[]` and `specialization_map`.
Map every artisan class to a building and verify coverage:

```
ARTISAN STAFFING:
  [artisan_class_id]:
    Specializations: [list from HEROFORGE]
    Assigned building: [building_id]
    Building action_types: [which action_types in the building match artisan specializations]
    Skill contribution: "[how worker_skill from this artisan improves building performance]"
    Design hook: "[what makes keeping this artisan at their affinity building worth it]"
```

**Rule: every artisan class in HEROFORGE's output must have at least one building where their
specialization matches a workflow's `action_type`.** An artisan with no matching building is wasted —
flag it.

### E. Translation Flags

Surface contradictions between source material and the building_workflow system:

```
//TRANSLATE_FLAG [SEVERITY: LOW | MEDIUM | HIGH]
TENSION: "[What the source says or implies about this production location]"
CONFLICT: "[What the building_workflow system would do by default]"
OPTIONS:
  A) [Option that honors source intent — may require unusual behavior/mode combination]
  B) [Option that honors game mechanics — may simplify source intent]
  C) [Compromise option if available]
DESIGNER DECISION REQUIRED: [Yes/No]
```

**Flag triggers (mandatory):**
- Source building has a mechanic that doesn't map to any behavior enum value
- Source building needs both queued and passive workflows simultaneously (this IS supported —
  a building can host workflows of different modes)
- Source production location has no resource inputs (everything is free) — violates economic balance
- Source material implies a building_workflow that has no material inputs from WORLDFORGE
- Source treats building progression as narrative (unlock by story) but engine treats it as economy
  (unlock by cost)
- Artisan class has no building with matching action_types

---

## STEP 2 — CALIBRATION TABLES

Use these tables to calculate defensible values for every building-system node. Do not estimate. Show
the math for every value that has a calculation behind it.

### Table A — Building Count by Size

| Building Count | Total Buildings | Producers | Transformers | Creators | Amplifiers |
|---|---|---|---|---|---|
| `small` (3–4) | 3–4 | 1 | 1 | 0–1 | 0–1 |
| `standard` (5–7) | 5–7 | 1–2 | 1–2 | 1–2 | 1–2 |
| `large` (8–12) | 8–12 | 2–3 | 2–3 | 2–3 | 2–3 |

**Minimum requirements regardless of size:**
- At least 1 producer (passive resource generation — the economic heartbeat)
- At least 1 transformer or creator (active resource conversion — the player decision point)
- At least 1 building with `has_workflows: true` and `artisan_slots` configured

### Table B — Build Cost Calibration (Reads WORLDFORGE)

BUILDFORGE must read `downstream_contracts.buildforge` from `world-economy.json`. Building costs
must create a progression curve that respects the economy's income rate.

Use WORLDFORGE's `first_upgrade_cost` as the anchor. The first building is the most expensive Day 1
purchase after the initial upgrade — it should feel like a deliberate investment.

| Building Tier | Cost Multiplier (vs WORLDFORGE first_upgrade_cost) | Timing at Base Income | Design Intent |
|---|---|---|---|
| Tier 1 (starter) | ×1.5–2.0 | 8–12 min | First real investment — player saves up |
| Tier 2 (mid-game) | ×4.0–6.0 | 20–35 min | Requires upgraded income |
| Tier 3 (late-game) | ×10.0–15.0 | 50–80 min | Major commitment, feels earned |
| Tier 4 (endgame) | ×25.0–40.0 | 120+ min | Prestige-adjacent, completionist |

**Level-up cost scaling by level:**

| Level | Cost Multiplier (vs level 1 build_cost) | Notes |
|---|---|---|
| Level 1 | ×1.0 | Initial construction |
| Level 2 | ×2.0–2.5 | First meaningful upgrade |
| Level 3 | ×4.0–5.0 | Mid-building progression |
| Level 4 | ×8.0–10.0 | Significant investment |
| Level 5 | ×15.0–20.0 | Only for `large` building sets |

**Verification (mandatory):**
```
WORLDFORGE CONTRACT: first_upgrade_cost = {N} {resource_id}
  base_income = {N}/tick = {N × 240}/min

  Building: {name} (Tier {N})
    Level 1 cost: {N} — ×{M} of first_upgrade_cost
    Time to build: {N} / ({base_income_per_min}) = {M} minutes
    {PASS/FAIL}: target {T_min}–{T_max} minutes
    
    Level 2 cost: {N} — ×{M} of level 1
    Level 3 cost: {N} — ×{M} of level 1
    ...
```

### Table C — Workflow Duration Calibration

Every workflow needs calibrated timing. Duration is measured in engine ticks (250ms per tick = 4
ticks/second = 240 ticks/minute).

| Workflow Type | Base Duration (ticks) | Real Time | Formula Notes |
|---|---|---|---|
| Quick craft (basic resource conversion) | 60–120 | 15–30 sec | Player sees immediate result |
| Standard craft (item production) | 240–480 | 1–2 min | Worker_skill can reduce by up to 30% |
| Long craft (rare/complex items) | 960–1920 | 4–8 min | Worth batching; upgrade-gated |
| Passive production cycle | 120–240 | 30–60 sec per tick | Continuous, no queue management |
| Hero recruitment | 480–960 | 2–4 min | Feels like "training time" |

**Duration formula standard patterns:**
```
Quick craft:    "base_duration * (1 - worker_skill / 300)"
Standard craft: "base_duration * (1 - worker_skill / 200) * (1 + (batch_size - 1) * 0.3)"
Long craft:     "base_duration * (1 - worker_skill / 200) * (1 + (batch_size - 1) * 0.5)"
Passive cycle:  Fixed — no formula reduction (passive income is balanced by rate, not by speed)
```

**Worker skill impact ranges:**
- Unskilled artisan (skill 0): ×1.0 duration (baseline)
- Novice artisan (skill 5–10): ×0.95–0.97 duration
- Trained artisan (skill 20–40): ×0.87–0.93 duration
- Master artisan (skill 60+): ×0.70–0.80 duration
- Specialization match bonus: additional ×0.85 (stacks multiplicatively)

Show your math:
```
WORKFLOW: Forge Iron Sword (standard craft)
  base_duration: 360 ticks (1.5 min)
  Worker: Forgemaster (craft_skill: 25, specialization match: yes)
  Duration: 360 * (1 - 25/200) * 0.85 = 360 * 0.875 * 0.85 = 267.75 → 268 ticks (1.12 min)
  Batch size 3: 268 * (1 + (3-1) * 0.3) = 268 * 1.6 = 428.8 → 429 ticks (1.79 min)
  Per-item time at batch 3: 429 / 3 = 143 ticks (35.75 sec) — efficiency gain 60% vs single ✓
```

### Table D — Success Table Calibration

Every `success_table` must be balanced to make failure meaningful but not punishing, and crits
rewarding but not mandatory.

| Building Type | base_failure | base_crit | failure_behavior | crit_behavior |
|---|---|---|---|---|
| Forge (consume_item) | 0.10–0.15 | 0.05–0.10 | `partial_refund` | `quality_upgrade` |
| Apothecary (consume_resource) | 0.08–0.12 | 0.08–0.12 | `consume_inputs_no_output` | `double_output` |
| Library (consume_resource, passive) | 0.05–0.08 | 0.10–0.15 | `reset_progress_refund_inputs` | `breakthrough` |
| Mine (produce_resource) | 0.02–0.05 | 0.03–0.05 | `consume_inputs_no_output` | `double_output` |
| Barracks (recruit_hero) | 0.05–0.10 | 0.05–0.08 | `consume_inputs_no_output` | `rarity_upgrade` |

**XP on complete rules:**
- `xp_on_complete`: 10–25 base XP per job (artisan earns this on success)
- `failure_grants_xp`: true (artisans learn from mistakes — idle-game feel-good principle)
- `failure_xp_multiplier`: 0.3–0.5 (failure XP = 30–50% of success XP)

**Crit multiplier rules:**
- `double_output` crit_multiplier: 2.0 (exactly double — clean and readable)
- `quality_upgrade` → no multiplier needed (output item changes to a higher-rarity version)
- `rarity_upgrade` → recruited hero has 1 tier higher rarity
- `breakthrough` → world_effect output fires in addition to normal output

### Table E — Upgrade Cost Scaling (Reads WORLDFORGE)

Building upgrade costs must respect WORLDFORGE's `upgrade_cost_scaling` contract. Default scaling is
×2.0 per tier — each subsequent upgrade costs double the previous.

| Upgrade Level | Cost Multiplier | Example (first_upgrade_cost = 2,000) | Timing |
|---|---|---|---|
| Upgrade 1 | ×1.0 | 2,000 | Early-game, first building upgrade |
| Upgrade 2 | ×2.0 | 4,000 | After first income multiplier |
| Upgrade 3 | ×4.0 | 8,000 | Mid-game, requires dedicated saving |
| Upgrade 4 | ×8.0 | 16,000 | Late mid-game |
| Upgrade 5 | ×16.0 | 32,000 | Late-game, endgame building mastery |

**Cross-building prerequisite rules:**
- Upgrade 1–2: no cross-building prerequisites
- Upgrade 3: may require another building at level 2
- Upgrade 4+: may require 1–2 other buildings at level 2–3
- Maximum cross-building depth: 2 levels (Building A upgrade 4 requires Building B level 3 which
  requires Building C level 2 — never deeper)

### Table F — Crafting Recipe Balance

Every `crafting_recipe` node must balance inputs against output value. The player should feel like
crafting produces something worth more than its parts — but not so much more that buying materials is
always better than using them directly.

| Recipe Tier | Input Count | Input Cost (total resource value) | Output Value Multiplier | Craft Time |
|---|---|---|---|---|
| Basic recipe (Act 1) | 1–2 inputs | 50–200 resources | ×1.5–2.0 of input value | Quick (15–30s) |
| Standard recipe (Act 2) | 2–3 inputs | 200–800 resources | ×2.0–3.0 of input value | Standard (1–2min) |
| Advanced recipe (Act 3+) | 3–4 inputs | 800–3000 resources | ×3.0–5.0 of input value | Long (4–8min) |
| Master recipe (endgame) | 4–5 inputs | 3000+ resources | ×5.0–8.0 of input value | Very long (8+min) |

**Crit output rules:**
- Basic recipes: `double_output` (simple bonus)
- Standard recipes: `quality_upgrade` or `double_output` (player-visible improvement)
- Advanced recipes: `quality_upgrade` with specific `result_item` (named rare version)
- Master recipes: `bonus_material` (returns a rare crafting component —feeds back into the loop)

---

## STEP 3 — GENERATION RULES

### A. Building Node Structure

Every generated `building` node must use this exact structure, validated against
`schema/project.schema.json` v1.2.0:

```json
{
  "id": "building-{slug}",
  "type": "building",
  "label": "{Human-readable name}",
  "description": "{One sentence: what this building does and what economic role it plays}",
  "icon": "{emoji}",
  "max_level": 3,
  "levels": [
    {
      "build_cost": [
        { "resource_id": "{WORLDFORGE primary resource ID}", "amount": 0 }
      ],
      "build_time_s": 0,
      "production": {},
      "hero_slots": 0,
      "recipe_slots": 0,
      "unlock_node_ids": []
    }
  ],
  "is_crafting_station": false,
  "has_workflows": true,
  "artisan_slots": {
    "base_count": 1,
    "max_count": 3,
    "expand_by": "building_upgrade"
  },
  "unlock_conditions": [],
  "canvas_pos": { "x": 0, "y": 0 },
  "connections": []
}
```

**Level array rules:**
- `levels` array has one entry per level (index 0 = level 1, index 1 = level 2, etc.)
- `levels.length` must equal `max_level`
- Each level's `build_cost` must be higher than the previous (use Table B scaling)
- `build_time_s` increases per level: level 1 = 0 (instant), level 2 = 30–60s, level 3+ = 60–120s
- `hero_slots` starts at 0 for non-Barracks buildings; increases with levels if applicable
- `recipe_slots` defines concurrent crafting queue length — increases per level for crafting stations
- `unlock_node_ids` lists node IDs that become visible when this building level is reached

**has_workflows + artisan_slots rules:**
- `has_workflows: true` on any building that hosts `building_workflow` nodes
- `artisan_slots` only relevant when `has_workflows: true`
- `base_count`: number of artisan slots at building level 1 (0 for producer-only buildings)
- `max_count`: maximum artisan slots achievable via upgrades
- `expand_by`: `"building_upgrade"` (most buildings) or `"none"` (fixed slots)

**is_crafting_station rules:**
- `true` only for buildings that host `crafting_recipe` nodes (Forge, Apothecary, etc.)
- `false` for pure producers (Mine), pure amplifiers (Library), and recruitment buildings (Barracks)

**buff_slots rules (omit if not applicable):**
- Only on hero management buildings (Barracks, War Room)
- `base_count`: 2 minimum, `max_count`: 8 maximum
- `expand_by`: `"building_upgrade"` (typical) or `"none"`

**passive_events rules (omit if not applicable):**
- Only on buildings that fire time-based events independently of the workflow queue
- References `passive_event` definition from schema

### B. Building Workflow Node Structure

Every generated `building_workflow` node must use this exact structure:

```json
{
  "id": "workflow-{building_slug}-{action_slug}",
  "type": "building_workflow",
  "label": "{Human-readable action name}",
  "behavior": "consume_resource",
  "action_type": "{free string — melt, brew, research, mine, recruit, etc.}",
  "workflow_mode": "queued",
  "host_building": "building-{slug}",
  "inputs": [
    { "resource": "{resource_id}", "amount": 0 }
  ],
  "duration_formula": "base_duration * (1 - worker_skill / 200)",
  "duration_base_ticks": 240,
  "batch_config": {
    "max_size": 1,
    "unlock_higher_batch_by": "building_upgrade"
  },
  "output_rules": [
    {
      "output_type": "resource",
      "target": "{resource_id or item_id}",
      "quantity": 1,
      "yield_formula": "1"
    }
  ],
  "success_table": {
    "base_failure": 0.10,
    "base_crit": 0.08,
    "failure_behavior": "consume_inputs_no_output",
    "crit_behavior": "double_output",
    "crit_multiplier": 2.0,
    "failure_grants_xp": true,
    "failure_xp_multiplier": 0.4,
    "xp_on_complete": 15
  },
  "xp_on_complete": 15,
  "unlocked_by": {
    "building_level": 1,
    "building_prerequisites": []
  },
  "auto_repeat": {
    "available": false,
    "unlock_by": "building_upgrade"
  }
}
```

**Behavior-specific field rules:**

| Behavior | Required Fields | Omitted Fields |
|---|---|---|
| `consume_item` | `target_filter`, `use_item_salvage_profile` | `inputs` (item IS the input) |
| `consume_resource` | `inputs` | `target_filter`, `use_item_salvage_profile` |
| `produce_resource` | `total_ticks_required` (passive mode) | `inputs`, `target_filter`, `batch_config` |
| `modify_item` | `target_filter` | `inputs` (item IS the input) |
| `recruit_hero` | `inputs` | `target_filter`, `use_item_salvage_profile` |

**consume_item workflows:**
```json
{
  "behavior": "consume_item",
  "target_filter": {
    "item_tags": ["weapon", "armor"],
    "item_rarity": ["common", "uncommon", "rare"],
    "exclude_equipped": true
  },
  "use_item_salvage_profile": true
}
```
When `use_item_salvage_profile: true`, `output_rules` are read from the item's `salvage_profile`
instead of from the workflow — enabling a single "Melt" workflow for all item types.

**produce_resource workflows (passive mode):**
```json
{
  "behavior": "produce_resource",
  "workflow_mode": "passive",
  "total_ticks_required": 120,
  "output_rules": [
    { "output_type": "resource", "target": "resource-iron-ore", "quantity": 5, "yield_formula": "5 * (1 + building_level * 0.2)" }
  ]
}
```
No `inputs`, no `batch_config`. Runs continuously. `total_ticks_required` is the cycle length.

**recruit_hero workflows:**
```json
{
  "behavior": "recruit_hero",
  "output_rules": [
    { "output_type": "hero_instance", "target": "", "quantity": 1 }
  ]
}
```
Output target for `hero_instance` is empty string — the recruited hero's class is determined by
the recruitment system, not hardcoded in the workflow.

**Streak bonus (optional — Apothecary-type buildings):**
```json
"streak_bonus": {
  "action_type": "brewing",
  "threshold": 3,
  "duration_reduction": 0.15,
  "crit_bonus": 0.10,
  "decay_on_switch": true
}
```
Include `streak_bonus` only on workflows where recipe specialization should be rewarded. Omit on
buildings where switching workflows is expected.

**Momentum config (optional — Library-type buildings):**
```json
"momentum_config": {
  "gain_per_job": 10,
  "decay_per_idle_tick": 0.5,
  "thresholds": [
    { "value": 25, "effect": "output_quality_tier_1" },
    { "value": 50, "effect": "output_quality_tier_2" },
    { "value": 100, "effect": "output_quality_tier_3" }
  ],
  "max": 150
}
```
Include `momentum_config` only on passive/research-style buildings where continuous operation should
compound benefits. Omit on discrete-job buildings.

### C. Building Upgrade Node Structure

Every generated `building_upgrade` node must use this exact structure:

```json
{
  "id": "upgrade-{building_slug}-{level_or_track}",
  "type": "building_upgrade",
  "label": "{Human-readable upgrade name}",
  "host_building": "building-{slug}",
  "level": 1,
  "cost": [
    { "resource": "{resource_id}", "amount": 0 }
  ],
  "effects": {
    "slots_added": 0,
    "batch_size_increase": 0,
    "unlocks_workflows": [],
    "unlocks_auto_repeat_on": [],
    "apply_modifier": null
  },
  "ui_discovery": {
    "mode": "mystery",
    "unknown_label": "??",
    "hint_on_hover": true,
    "hint_text": "{hint about what this upgrade does}",
    "show_effects_preview": true
  },
  "requires": {
    "building_level": 1,
    "cross_building": []
  }
}
```

**Effects field rules:**
- `slots_added`: number of artisan slots added (0 if this upgrade doesn't add slots)
- `batch_size_increase`: increase to max batch size (0 if no batch scaling)
- `unlocks_workflows`: array of `building_workflow` IDs made available by this upgrade
- `unlocks_auto_repeat_on`: array of `building_workflow` IDs that gain auto-repeat capability
- `apply_modifier`: null for most upgrades; object `{ "target": string, "operation": "multiply"|"add", "value": number }` for upgrades that permanently modify a stat or formula variable

**UI discovery rules:**
- Level 1 upgrades: `mode: "transparent"` — player sees exactly what they're buying
- Level 2 upgrades: `mode: "transparent"` — visible but requires investment
- Level 3+ upgrades: `mode: "mystery"` — hidden until prerequisites met, `hint_on_hover: true`
  reveals a cryptic hint without spoiling exact effects

**Cross-building prerequisite rules (requires.cross_building):**
- Level 1–2 upgrades: empty array (no cross-building gates)
- Level 3+ upgrades: may require other buildings at specific levels
- Each entry: `{ "building_id": string, "level": integer }`
- Compiler validates these references exist and have sufficient max_level

### D. Crafting Recipe Node Structure

Every generated `crafting_recipe` node must use this exact structure:

```json
{
  "id": "recipe-{output_slug}",
  "type": "crafting_recipe",
  "label": "{Human-readable recipe name}",
  "output_item": "{item_id — generated by ITEMFORGE, use placeholder format}",
  "output_quantity": 1,
  "inputs": [
    { "resource": "{resource_id}", "amount": 0 }
  ],
  "craft_time_formula": "base_duration * (1 - worker_skill / 200)",
  "required_workflow": "workflow-{building_slug}-{action_slug}",
  "required_building_level": 1,
  "success_table_override": null,
  "crit_output": {
    "behavior": "double_output"
  }
}
```

**output_item placeholder rules:**
- BUILDFORGE generates recipes BEFORE ITEMFORGE generates items. Use a predictable placeholder
  format: `"item-{slug}"` (e.g., `"item-iron-sword"`, `"item-health-potion"`)
- ITEMFORGE reads BUILDFORGE's recipe list and generates items matching these IDs
- ASSEMBLER validates all `output_item` references resolve to real item nodes

**success_table_override rules:**
- `null` — recipe inherits the host building_workflow's success_table (default for most recipes)
- Set to a custom `success_table` object only when this recipe has meaningfully different
  failure/crit rates than the workflow default (e.g., a master recipe with higher failure but
  higher crit)

**crit_output rules:**
- `quality_upgrade`: include `result_item` pointing to a higher-tier version (e.g., `"item-fine-iron-sword"`)
- `double_output`: no additional fields needed
- `bonus_material`: include `bonus_resource` and `bonus_amount`

### E. Canvas Layout Algorithm

Position building-system nodes in four columns. All y positions start at 50 and increment by 150
per additional node in the same column.

```
Column 1: Buildings       Column 2: Workflows      Column 3: Upgrades       Column 4: Recipes
x: 1400–1600             x: 1760–1960             x: 2000–2200             x: 2300–2500

building-mine    (1450,50)   wf-mine-extract  (1800,50)   upg-mine-1  (2050,50)
building-forge   (1450,200)  wf-forge-melt    (1800,200)  upg-forge-1 (2050,200) recipe-iron-sword (2350,200)
                             wf-forge-craft   (1800,350)  upg-forge-2 (2050,350) recipe-steel-axe  (2350,350)
building-apoth   (1450,500)  wf-apoth-brew    (1800,500)  upg-apoth-1 (2050,500) recipe-hp-potion  (2350,500)
building-library (1450,650)  wf-library-res   (1800,650)  upg-lib-1   (2050,650)
building-barracks(1450,800)  wf-barr-recruit  (1800,800)  upg-barr-1  (2050,800)
```

**Layout rules:**
- Buildings in Column 1 (x: 1400–1600)
- Workflows in Column 2 (x: 1760–1960), grouped by host_building (workflows for the same building
  are vertically adjacent)
- Upgrades in Column 3 (x: 2000–2200), grouped by host_building
- Recipes in Column 4 (x: 2300–2500), positioned next to their required_workflow
- Within each group, stack vertically with 150px spacing
- Buildings are spaced 150px apart plus extra 150px gap between building groups (building + its
  workflows + its upgrades form a visual cluster)

### F. The building-system.json Output Format

```json
{
  "schema_version": "1.2.0",
  "buildforge_version": "1.0.0",
  "generated_at": "{ISO timestamp}",
  "meta": {
    "project_name": "{from WORLDFORGE meta or source material}",
    "building_count": "{small | standard | large}",
    "workflow_depth": "{shallow | standard | deep}",
    "upgrade_style": "{linear | branching | deep}",
    "source_material": "{path or 'pitch'}",
    "worldforge_input": "{path to world-economy.json}",
    "heroforge_input": "{path to hero-roster.json}",
    "designer_notes": "{brief summary of the building system's core design and production chains}"
  },
  "nodes": [
    // All building nodes
    // All building_workflow nodes
    // All building_upgrade nodes
    // All crafting_recipe nodes
  ],
  "building_calibration": {
    "cost_curves": {
      "worldforge_contract": {
        "primary_resource_id": "{id}",
        "first_upgrade_cost": 0,
        "upgrade_cost_scaling": "×2.0 per tier"
      },
      "building_cost_audit": [
        {
          "building_id": "{id}",
          "tier": 1,
          "level_1_cost": 0,
          "time_to_build_minutes": 0,
          "pass": true
        }
      ]
    },
    "workflow_timing": {
      "duration_audit": [
        {
          "workflow_id": "{id}",
          "base_duration_ticks": 0,
          "with_skilled_artisan_ticks": 0,
          "batch_3_per_item_ticks": 0,
          "pass": true
        }
      ]
    },
    "success_rates": {
      "failure_rate_audit": [
        {
          "workflow_id": "{id}",
          "base_failure": 0.0,
          "effective_failure_with_artisan": 0.0,
          "danger_zone": false
        }
      ]
    },
    "material_flow_map": [
      {
        "material_id": "{id}",
        "source": "{expedition | building}",
        "consumed_by_workflows": ["{id}"],
        "output_produces": ["{id}"],
        "flow_status": "{active | dead — dead means material has no building use}"
      }
    ],
    "artisan_coverage": [
      {
        "artisan_class_id": "{id}",
        "matched_buildings": ["{id}"],
        "matched_action_types": ["{action_type}"],
        "coverage_status": "{matched | unmatched — unmatched means artisan has no building}"
      }
    ],
    "chain_definitions": [
      {
        "chain_name": "{name}",
        "steps": [
          { "building_id": "{id}", "workflow_id": "{id}", "output": "{resource or item}" }
        ],
        "total_time_seconds": 0,
        "bottleneck_step": "{workflow_id of slowest step}"
      }
    ]
  },
  "flags": [
    {
      "id": "flag-{n}",
      "severity": "low | medium | high",
      "tension": "{what the source implies}",
      "conflict": "{what the building system would do by default}",
      "options": ["A) ...", "B) ...", "C) ..."],
      "default_applied": "{which option BUILDFORGE used}",
      "designer_decision_required": true
    }
  ],
  "downstream_contracts": {
    "actforge": {
      "material_consumption_rates": {
        "{material_id}": { "per_craft": 0, "per_minute_at_base": 0 }
      },
      "note": "ACTFORGE expedition drop rates must exceed building consumption at intended pacing"
    },
    "itemforge": {
      "recipe_output_items": ["{item_id_placeholder}"],
      "salvage_workflows": ["{workflow_id that uses consume_item with salvage}"],
      "note": "ITEMFORGE must generate items matching these output_item IDs and salvage_profiles for salvage workflows"
    },
    "upgradeforge": {
      "building_upgrade_ids": ["{id}"],
      "max_building_levels": { "{building_id}": 0 },
      "upgrade_cost_curve": "see building_calibration.cost_curves",
      "note": "UPGRADEFORGE generates global upgrades; building_upgrade nodes are already generated by BUILDFORGE"
    }
  }
}
```

### G. Edges

BUILDFORGE does not generate edges between nodes — edges are drawn in the editor after all forges
have run, or by the auto-rig system. Do not add an `edges` array to building-system.json.

However, BUILDFORGE must document the intended edge connections in the calibration object so the
designer (or auto-rig) knows what to wire:

```
INTENDED CONNECTIONS:
  building-forge → workflow-forge-melt           (hosts)
  building-forge → workflow-forge-craft          (hosts)
  workflow-forge-melt → resource-iron-ingot      (produces)
  resource-iron-ore → workflow-forge-melt        (consumes)
  recipe-iron-sword → workflow-forge-craft       (used_by)
  upgrade-forge-1 → building-forge               (enhances)
```

---

## STEP 4 — SCHEMA COMPLIANCE

Before generating any node, verify against the authoritative schema at
`guild-engine/schema/project.schema.json` v1.2.0.

### Building node required fields:
- `id` (string) — slug format, prefix `building-`
- `type` (const: `"building"`)
- `label` (string)
- `max_level` (integer, minimum: 1)
- `levels` (array — one entry per level, index 0 = level 1)
  - each level requires `build_cost` (cost array: `[{ "resource_id": string, "amount": number }]`)

### Building node optional fields:
- `description` (string)
- `icon` (string — emoji)
- `levels[]` entries: `build_time_s`, `production` (stat_block), `hero_slots`, `recipe_slots`, `unlock_node_ids`
- `is_crafting_station` (boolean, default: false)
- `loot_table_id` (string)
- `unlock_conditions` (array of unlock_condition)
- `canvas_pos` (canvas_position)
- `connections` (array of strings)
- `has_workflows` (boolean, default: false)
- `artisan_slots` (object: `base_count`, `max_count`, `expand_by`)
- `buff_slots` (object: `base_count`, `max_count`, `expand_by`)
- `passive_events` (array of passive_event)

### Building Workflow node required fields:
- `id` (string)
- `type` (const: `"building_workflow"`)
- `behavior` (enum: `consume_item` | `consume_resource` | `produce_resource` | `modify_item` | `recruit_hero`)
- `host_building` (string — building node ID)
- `output_rules` (array, minItems: 1 — each entry is an `output_rule` $ref)
- `success_table` ($ref to success_table definition)

### Building Workflow node optional fields:
- `label` (string)
- `action_type` (string — free text, display purpose)
- `workflow_mode` (enum: `queued` | `passive`, default: `queued`)
- `target_filter` (object or null — `item_tags`, `item_rarity`, `exclude_equipped`, `exclude_tags`)
- `inputs` (array — consume_resource only: `[{ "resource": string, "amount": number|string }]`)
- `use_item_salvage_profile` (boolean, default: false)
- `duration_formula` (string)
- `duration_base_ticks` (integer, minimum: 1)
- `batch_config` (object: `max_size`, `unlock_higher_batch_by`)
- `streak_bonus` ($ref to streak_bonus definition)
- `momentum_config` ($ref to momentum_config definition)
- `xp_on_complete` (integer, minimum: 0)
- `total_ticks_required` (integer — passive mode only)
- `unlocked_by` (object: `building_level`, `building_prerequisites`)
- `auto_repeat` (object: `available`, `unlock_by`, `auto_select_priority`)

### Building Upgrade node required fields:
- `id` (string)
- `type` (const: `"building_upgrade"`)
- `host_building` (string — building node ID)
- `level` (integer, minimum: 1)
- `cost` (array: `[{ "resource": string, "amount": number }]`)

### Building Upgrade node optional fields:
- `label` (string)
- `effects` (object: `slots_added`, `batch_size_increase`, `unlocks_workflows`, `unlocks_auto_repeat_on`, `apply_modifier`)
- `ui_discovery` (object: `mode`, `unknown_label`, `hint_on_hover`, `hint_text`, `show_effects_preview`)
- `requires` (object: `building_level`, `cross_building[]`)

### Crafting Recipe node required fields:
- `id` (string)
- `type` (const: `"crafting_recipe"`)
- `output_item` (string — item node ID)
- `inputs` (array, minItems: 1: `[{ "resource": string, "amount": number }]`)
- `required_workflow` (string — building_workflow node ID)

### Crafting Recipe node optional fields:
- `label` (string)
- `output_quantity` (integer, minimum: 1, default: 1)
- `craft_time_formula` (string)
- `required_building_level` (integer, minimum: 1)
- `success_table_override` (success_table object or null)
- `crit_output` (object: `behavior`, `result_item`, `bonus_resource`, `bonus_amount`)

**Do NOT add fields not in the schema.** No custom properties. No ad-hoc extensions. If a design
decision needs a field that does not exist, write a `//TRANSLATE_FLAG` and use the closest existing
field.

---

## STEP 5 — PIPELINE INTEGRATION

### What BUILDFORGE Reads

| Source | Field | Purpose |
|---|---|---|
| `world-economy.json` | `downstream_contracts.buildforge.primary_resource_id` | Which resource building costs are denominated in |
| `world-economy.json` | `downstream_contracts.buildforge.material_ids[]` | Which materials building workflows can consume |
| `world-economy.json` | `downstream_contracts.buildforge.first_upgrade_cost` | Anchor for building cost calibration |
| `world-economy.json` | `downstream_contracts.buildforge.upgrade_cost_scaling` | Cost scaling contract |
| `world-economy.json` | `economy_calibration.resource_relationships[]` | Scarcity classes and bottleneck progression |
| `world-economy.json` | `economy_calibration.income_curves` | Base income rate for timing calculations |
| `hero-roster.json` | `downstream_contracts.buildforge.artisan_class_ids[]` | Which artisan classes exist |
| `hero-roster.json` | `downstream_contracts.buildforge.specialization_map` | Artisan specializations and building affinities |
| `source-analysis.json` | Production locations, crafting references | Input for building archetype mapping |
| `world-template.json` | Mapped building terms | Input for building naming |
| `CHANGELOG.md` | Pending systems | Awareness of unimplemented features |

### What BUILDFORGE Writes

| File | Content |
|---|---|
| `guild-engine/generated/building-system.json` | Primary output — all building, workflow, upgrade, recipe nodes + calibration |
| `guild-engine/generator/building-flags.md` | Design tension flags (only if flags exist) |
| `guild-engine/generator/CHANGELOG.md` | Append BUILDFORGE run entry |

### What BUILDFORGE Feeds

| Downstream Forge | What It Reads | Why |
|---|---|---|
| ACTFORGE | `material_consumption_rates` | Expedition drop rates must exceed building consumption |
| ITEMFORGE | `recipe_output_items`, `salvage_workflows` | Item generation matching recipe output IDs; salvage profile design |
| UPGRADEFORGE | `building_upgrade_ids`, `max_building_levels`, `upgrade_cost_curve` | Global upgrades that complement building-specific upgrades |
| ASSEMBLER | All of the above | Cross-reference validation: all building IDs, workflow IDs, recipe IDs resolved |

---

## STEP 6 — VALIDATION CHECKLIST

Run through every item before writing the output file. ERRORS block output. WARNINGS are written to
`building-flags.md` and noted in the terminal summary but do not block output.

### Structural Checks (Errors if failed)

- [ ] At least 2 building nodes exist
- [ ] At least 1 building has `has_workflows: true`
- [ ] Every building has required fields: `id`, `type`, `label`, `max_level`, `levels`
- [ ] `levels.length` === `max_level` on every building
- [ ] Every level entry has `build_cost` (array, minItems: 1)
- [ ] All `id` fields are slug-format: lowercase, hyphens only
- [ ] Building IDs use `building-{slug}` prefix
- [ ] Workflow IDs use `workflow-{slug}` format
- [ ] Upgrade IDs use `upgrade-{slug}` format
- [ ] Recipe IDs use `recipe-{slug}` format
- [ ] No duplicate IDs across the entire node set (across all four node types)
- [ ] Every `building_workflow.host_building` references a valid building ID
- [ ] Every `building_upgrade.host_building` references a valid building ID
- [ ] Every `crafting_recipe.required_workflow` references a valid building_workflow ID
- [ ] Every `building_workflow.output_rules` has at least 1 entry
- [ ] Every `building_workflow.success_table` is present and has all required success_table fields
- [ ] `type` field matches the node's actual type on every node
- [ ] `schema_version` in output file is `"1.2.0"`
- [ ] `downstream_contracts` object is present and complete
- [ ] All resource IDs in `inputs`, `cost`, and `build_cost` reference resources from WORLDFORGE output
- [ ] All canvas_pos values use the building system column layout (x ≥ 1400)

### Balance Checks (Warnings if failed)

- [ ] Building cost progression is monotonic (each level costs more than the previous)
- [ ] First building is affordable within 8–12 minutes at base income
- [ ] No workflow has `base_failure` > 0.30 (danger zone — player frustration risk)
- [ ] No workflow has `base_crit` > 0.25 without a flag (crits should feel special, not expected)
- [ ] Every material in WORLDFORGE's `material_ids[]` is consumed by at least one workflow
- [ ] At least one production chain of length 2+ exists (material → intermediate → final output)
- [ ] Artisan XP accumulation is meaningful: at 15 XP/job, artisan reaches level 5 within
  approximately 30–50 successful jobs
- [ ] Batch efficiency provides 40–60% per-item time reduction at batch size 3 (vs single)
- [ ] Duration formulas produce realistic values: no workflow completes in < 5 ticks or > 4800 ticks

### Artisan Coverage Checks (Warnings if failed)

- [ ] Every artisan class in HEROFORGE's output has at least one building with matching `action_type`
- [ ] No building has `artisan_slots.base_count > 0` without at least one workflow with `action_type`
      matching an artisan specialization
- [ ] Building affinity IDs from HEROFORGE reference buildings that actually exist in BUILDFORGE output

### Pipeline Checks (Warnings if failed)

- [ ] `//TRANSLATE_FLAG` comments present on any building where source material created tension
- [ ] `flags[]` array populated if any source material contradictions exist
- [ ] `building-flags.md` file generated if `flags[]` is non-empty
- [ ] `CHANGELOG.md` entry appended
- [ ] `downstream_contracts` values are internally consistent
- [ ] `building_calibration.cost_curves.building_cost_audit` all entries pass
- [ ] `building_calibration.workflow_timing.duration_audit` all entries pass
- [ ] `building_calibration.material_flow_map` has no entries with `flow_status: "dead"`
- [ ] `building_calibration.artisan_coverage` has no entries with `coverage_status: "unmatched"`

---

## STEP 7 — BUILDING FLAGS FILE

If any flags exist, generate `guild-engine/generator/building-flags.md` with this format:

```markdown
# Building System Flags — {Project Name}
### Generated by BUILDFORGE {ISO date}

These flags represent design tensions between your source material and standard Guild Engine
building_workflow mechanics. Review each flag and confirm or override the default decision.

---

## FLAG-001 [SEVERITY: HIGH] — {Flag title}

**Source intent:** {What the source material implies about this production location}
**Engine default:** {What the building_workflow system would do}

**Options:**
- A) {Option A description — honors source production logic}
- B) {Option B description — honors game mechanics}
- C) {Option C, if available}

**Default applied:** {Which option BUILDFORGE used}

**To override:** Edit `building-system.json` nodes as follows:
  - {Specific field change to apply Option A}
  - {Specific field change to apply Option B}

---

## FLAG-002 [SEVERITY: LOW] — ...
```

---

## STEP 8 — FILE WRITING

Write these files in this order:

```
1. guild-engine/generated/building-system.json          (primary output)
2. guild-engine/generator/building-flags.md             (only if flags[] is non-empty)
3. Append to guild-engine/generator/CHANGELOG.md        (always)
```

**Directory creation:** If `guild-engine/generated/` does not exist, create it before writing.

**CHANGELOG entry format:**

```markdown
### BUILDFORGE Run — {ISO date}
- VERSION: v1.9.2
- TYPE: SYSTEM
- SCOPE: BUILDFORGE
- STATUS: IMPLEMENTED
- INPUT: world-economy.json + hero-roster.json + {source material path or pitch summary in ≤20 words}
- OUTPUT: guild-engine/generated/building-system.json
- BUILDINGS: {N} total ({N} producers, {N} transformers, {N} creators, {N} amplifiers)
- WORKFLOWS: {N} total ({N} queued, {N} passive)
- UPGRADES: {N} total
- RECIPES: {N} total
- FLAGS: {N} design tensions flagged ({N} high, {N} medium, {N} low)
- DOWNSTREAM: building-system.json ready for ACTFORGE, ITEMFORGE, UPGRADEFORGE
```

---

## STEP 9 — TERMINAL SUMMARY

Print this summary box after all files are written:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  BuildForge Complete                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  {Project Name}                                                         │
│  Buildings: {count} · Depth: {depth} · Upgrades: {style}              │
├─────────────────────────────────────────────────────────────────────────┤
│  Buildings:   {N} total                                                 │
│    • Producers:     {N}    ({building names, comma-separated})          │
│    • Transformers:  {N}    ({building names, comma-separated})          │
│    • Creators:      {N}    ({building names, comma-separated})          │
│    • Amplifiers:    {N}    ({building names, comma-separated})          │
├─────────────────────────────────────────────────────────────────────────┤
│  Workflows:   {N} total ({N} queued, {N} passive)                      │
│  Upgrades:    {N} total ({N} with cross-building prerequisites)        │
│  Recipes:     {N} total ({N} basic, {N} standard, {N} advanced)        │
├─────────────────────────────────────────────────────────────────────────┤
│  Production Chains:  {N}  ({chain names, comma-separated})              │
│  Artisan Coverage:   {N}/{N} artisan classes matched to buildings       │
│  Material Coverage:  {N}/{N} WORLDFORGE materials consumed              │
├─────────────────────────────────────────────────────────────────────────┤
│  Cost Audit:         {PASS / FAIL — vs WORLDFORGE contract}             │
│  First building:     {N} min at base income                             │
│  Duration Audit:     {PASS / FAIL}                                      │
│  Failure Rate Audit: {PASS / FAIL — any workflow in danger zone?}       │
├─────────────────────────────────────────────────────────────────────────┤
│  Output: guild-engine/generated/building-system.json                   │
│  Flags:  {N} design tensions (see building-flags.md | none)            │
└─────────────────────────────────────────────────────────────────────────┘

Downstream forge contracts written:
  ACTFORGE     — material consumption rates for {N} resources
  ITEMFORGE    — {N} recipe output items defined, {N} salvage workflows
  UPGRADEFORGE — {N} building upgrades, max levels: {building: level, ...}

Next step: Run ACTFORGE
  > Follow guild-engine/generator/ACTFORGE.md exactly.
  > INPUT: guild-engine/generated/world-economy.json
         + guild-engine/generated/hero-roster.json
         + guild-engine/generated/building-system.json
```

---

## EXAMPLE SESSION

```
> Follow guild-engine/generator/BUILDFORGE.md exactly.

WORLDFORGE_OUTPUT: "guild-engine/generated/world-economy.json"
HEROFORGE_OUTPUT:  "guild-engine/generated/hero-roster.json"
SOURCE_MATERIAL:   "guild-engine/generator/world-template.json"
GAME_PITCH:        "none"
BUILDING_COUNT:    "standard"
WORKFLOW_DEPTH:    "standard"
UPGRADE_STYLE:     "linear"

BUILDFORGE reading context...
  ✓ schema/project.schema.json
  ✓ docs/WIKI.md
  ✓ generator/CHANGELOG.md
  ✓ docs/DAY2-DEEPDIVE.md
  ✗ source-analysis.json (not found — will read world-template.json directly)
  ✓ world-template.json
  ✓ generated/world-economy.json
  ✓ generated/hero-roster.json

WORLDFORGE CONTRACTS LOADED:
  Primary resource: resource-blood
  Materials: resource-vessels, resource-territory
  First upgrade cost: 2,000 Blood
  Upgrade scaling: ×2.0 per tier
  Base income: 2/tick = 480/min

HEROFORGE CONTRACTS LOADED:
  Artisan classes: artisan-keeper, artisan-ghoul, artisan-blood-alchemist
  Specialization map:
    artisan-keeper:           research, analysis        → building-elysium
    artisan-ghoul:            construction, maintenance → building-haven, building-workshop
    artisan-blood-alchemist:  brewing, transmutation    → building-apothecary

✓ Step 1 — Narrative Analysis

  BUILDING ARCHETYPES:
    BUILDING ARCHETYPE: Producer
      Source signal: "Hunting grounds provide sustenance; territories are managed for blood supply"
      Proposed building: Haven (Blood Cellars)
      Behavior: produce_resource
      Workflow mode: passive
      Economic role: "Passive blood generation — supplements expedition income"
      Artisan staffed: yes (Ghoul Retainer — construction/maintenance)

    BUILDING ARCHETYPE: Transformer
      Source signal: "Blood is refined for rituals; vessels are processed for vitae extraction"
      Proposed building: Blood Workshop
      Behavior: consume_resource
      Workflow mode: queued
      Economic role: "Converts raw materials (vessels, territory) into refined products"
      Artisan staffed: yes (Ghoul Retainer — construction/maintenance)

    BUILDING ARCHETYPE: Creator (consumable)
      Source signal: "Thin-blood alchemy produces elixirs and tinctures from blood and herbs"
      Proposed building: Apothecary
      Behavior: consume_resource
      Workflow mode: queued
      Economic role: "Produces consumable buffs for expedition preparation"
      Artisan staffed: yes (Blood Alchemist — brewing/transmutation)

    BUILDING ARCHETYPE: Amplifier
      Source signal: "Elysium is where Kindred gather, trade secrets, and broker knowledge"
      Proposed building: Elysium
      Behavior: consume_resource
      Workflow mode: passive
      Economic role: "Research system — produces world_effects that unlock content, apply modifiers"
      Artisan staffed: yes (Keeper of Elysium — research/analysis)

    BUILDING ARCHETYPE: Creator (hero)
      Source signal: "Ghouls are created through the Blood Bond; new retainers are recruited"
      Proposed building: Barracks (Retainer Quarters)
      Behavior: recruit_hero
      Workflow mode: queued
      Economic role: "Produces artisan hero instances for building staffing"
      Artisan staffed: no (recruitment is automated, no artisan bonus)

  MATERIAL FLOW MAPPING:
    MATERIAL FLOW: resource-vessels
      Source: expedition drops (Act 1 expeditions)
      Consumed by: workflow-apothecary-brew, workflow-workshop-refine
      Output: consumable buffs (potions), refined blood components
      Bottleneck role: Act 1 pump — limits early crafting throughput

    MATERIAL FLOW: resource-territory
      Source: expedition drops (Act 2+ expeditions)
      Consumed by: workflow-elysium-research, workflow-workshop-refine
      Output: world_effects (zone unlocks), refined components
      Bottleneck role: Act 2 pump — gates late-game research and unlocks

  WORKFLOW CHAINS:
    WORKFLOW CHAIN: Vessels-to-Potions
      Step 1: Haven → produce blood (passive)
      Step 2: Apothecary → consume vessels + blood → produce health potion
      Chain length: 2 steps
      Player decision: stockpile vessels for brewing or sell for blood?
      Design intent: connects expedition drops to crafting output

    WORKFLOW CHAIN: Territory-to-Knowledge
      Step 1: Expeditions → drop territory fragments
      Step 2: Elysium → consume territory + blood → research unlock
      Chain length: 2 steps
      Player decision: spend territory on research or save for upgrades?
      Design intent: gates late-game content behind deliberate investment

  ARTISAN STAFFING:
    artisan-keeper:
      Specializations: research, analysis
      Assigned building: building-elysium
      Building action_types: research (match ✓)
      Skill contribution: worker_skill reduces research time, momentum accumulates faster
      Design hook: Keeper at Elysium gains momentum; reassignment resets it

    artisan-ghoul:
      Specializations: construction, maintenance
      Assigned building: building-haven, building-workshop
      Building action_types: maintenance (Haven match ✓), construction (Workshop match ✓)
      Skill contribution: worker_skill boosts production rate and reduces build time
      Design hook: Ghouls are generalists — good everywhere, great nowhere

    artisan-blood-alchemist:
      Specializations: brewing, transmutation
      Assigned building: building-apothecary
      Building action_types: brewing (match ✓)
      Skill contribution: worker_skill boosts yield and reduces brew time; streak bonus
      Design hook: Streak specialization — brewing same potion consecutively improves output

  TRANSLATION FLAGS:
    //TRANSLATE_FLAG [SEVERITY: MEDIUM]
    TENSION: "In VtM, Elysium is a social space — Kindred negotiate, not 'research'"
    CONFLICT: "Engine models Elysium as a Library-type building with consume_resource + world_effect"
    OPTIONS:
      A) Rename workflows to social terminology: "broker secrets", "cultivate alliances"
      B) Keep research mechanics, accept thematic simplification
      C) Use both: primary workflow is "Broker Secrets" (research behavior), secondary is
         "Host Gathering" (passive social influence generation)
    DEFAULT APPLIED: Option C — hybrid approach
    DESIGNER DECISION REQUIRED: No (Option C preserves both intent and mechanics)

✓ Step 2 — Calibration

  BUILD COST AUDIT:
    WORLDFORGE CONTRACT: first_upgrade_cost = 2,000 resource-blood
    base_income = 2/tick = 480/min

    Building: Haven (Tier 1)
      Level 1: 3,000 Blood — ×1.5 of first_upgrade — 3000/480 = 6.25 min ✓ (target: 8-12 min)
      //WARNING: 6.25 min is under target minimum of 8 min.
      Correction: raise to 4,000 Blood → 4000/480 = 8.33 min ✓
      Level 2: 8,000 Blood — ×2.0 of level 1
      Level 3: 16,000 Blood — ×4.0 of level 1

    Building: Blood Workshop (Tier 1)
      Level 1: 5,000 Blood — ×2.5 of first_upgrade — 5000/480 = 10.42 min ✓
      Level 2: 10,000 Blood — ×2.0 of level 1
      Level 3: 20,000 Blood — ×4.0 of level 1

    Building: Apothecary (Tier 2)
      Level 1: 10,000 Blood — ×5.0 of first_upgrade — 10000/480 = 20.83 min ✓ (target: 20-35 min)
      Level 2: 20,000 Blood — ×2.0 of level 1
      Level 3: 40,000 Blood — ×4.0 of level 1

    Building: Elysium (Tier 2)
      Level 1: 12,000 Blood — ×6.0 of first_upgrade — 12000/480 = 25.0 min ✓
      Level 2: 24,000 Blood — ×2.0 of level 1
      Level 3: 48,000 Blood — ×4.0 of level 1

    Building: Barracks (Tier 2)
      Level 1: 8,000 Blood — ×4.0 of first_upgrade — 8000/480 = 16.67 min
      //WARNING: 16.67 min falls between Tier 1 and Tier 2 targets (12 < 16.67 < 20).
      Accepted: Barracks is an early Tier 2 building — makes thematic sense as first expansion.
      Level 2: 16,000 Blood — ×2.0 of level 1
      Level 3: 32,000 Blood — ×4.0 of level 1

  WORKFLOW TIMING:
    workflow-haven-produce (passive):
      total_ticks_required: 120 ticks (30 sec cycle)
      Output: 5 blood per cycle → 10/min passive income ✓

    workflow-workshop-refine (queued):
      base_duration: 240 ticks (1 min)
      With Ghoul (craft_skill: 15, match: yes): 240 * (1 - 15/200) * 0.85 = 240 * 0.925 * 0.85 = 188.7 → 189 ticks
      Batch 3: 189 * 1.6 = 302.4 → 302 ticks total, 101 ticks/item → 58% efficiency gain ✓

    workflow-apothecary-brew (queued):
      base_duration: 360 ticks (1.5 min)
      With Alchemist (alchemy_skill: 20, match: yes): 360 * (1 - 20/200) * 0.85 = 360 * 0.9 * 0.85 = 275.4 → 275 ticks
      Streak at 3: 275 * (1 - 0.15) = 233.75 → 234 ticks (0.98 min) ✓

    workflow-elysium-research (passive):
      total_ticks_required: 480 ticks (2 min cycle)
      With Keeper (research_skill: 18, match: yes): reduced via momentum over time
      At momentum 50: speed ×1.15 → effective 417 ticks ✓

    workflow-barracks-recruit (queued):
      base_duration: 720 ticks (3 min)
      No artisan bonus (Barracks has no artisan staffing)
      Output: 1 hero_instance per 3 min ✓

  SUCCESS RATES:
    workflow-haven-produce:     base_failure: 0.03, base_crit: 0.05 — safe ✓
    workflow-workshop-refine:   base_failure: 0.12, base_crit: 0.08 — balanced ✓
    workflow-apothecary-brew:   base_failure: 0.10, base_crit: 0.10 — balanced ✓
    workflow-elysium-research:  base_failure: 0.06, base_crit: 0.12 — low fail, high crit (research breakthroughs) ✓
    workflow-barracks-recruit:  base_failure: 0.08, base_crit: 0.06 — balanced ✓

    Failure rate audit: PASS (no workflow > 0.30)

✓ Step 3 — Generating nodes...

  BUILDINGS: 5
    building-haven       (producer — passive blood generation)
    building-workshop    (transformer — refine materials)
    building-apothecary  (creator — brew consumables)
    building-elysium     (amplifier — research and social)
    building-barracks    (creator — recruit heroes)

  WORKFLOWS: 7
    workflow-haven-produce          (passive, produce_resource)
    workflow-workshop-refine        (queued, consume_resource)
    workflow-workshop-salvage       (queued, consume_item — salvage equipment)
    workflow-apothecary-brew        (queued, consume_resource)
    workflow-elysium-research       (passive, consume_resource → world_effect)
    workflow-elysium-broker         (queued, consume_resource → world_effect)
    workflow-barracks-recruit       (queued, recruit_hero)

  UPGRADES: 10
    upgrade-haven-1, upgrade-haven-2
    upgrade-workshop-1, upgrade-workshop-2
    upgrade-apothecary-1, upgrade-apothecary-2
    upgrade-elysium-1, upgrade-elysium-2
    upgrade-barracks-1, upgrade-barracks-2

  RECIPES: 4
    recipe-blood-elixir      (basic — health potion equivalent)
    recipe-shadow-tincture   (standard — stealth buff)
    recipe-vitae-concentrate (standard — stat boost)
    recipe-elders-draught    (advanced — powerful multi-buff)

✓ Step 4 — Validation
  Structural:       20/20 checks passed ✓
  Balance:          8/9 — WARNING: Haven build cost corrected from 3,000 to 4,000
  Artisan Coverage: 3/3 artisan classes matched ✓
  Pipeline:         8/8 checks passed ✓

✓ Step 5 — building-flags.md written (1 flag: 0 HIGH, 1 MEDIUM, 0 LOW)
✓ Step 6 — building-system.json written (847 lines)
✓ Step 7 — CHANGELOG.md updated

┌─────────────────────────────────────────────────────────────────────────┐
│  BuildForge Complete                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Kindred Dark Ages                                                      │
│  Buildings: standard · Depth: standard · Upgrades: linear              │
├─────────────────────────────────────────────────────────────────────────┤
│  Buildings:   5 total                                                   │
│    • Producers:     1    (Haven)                                        │
│    • Transformers:  1    (Blood Workshop)                               │
│    • Creators:      2    (Apothecary, Barracks)                        │
│    • Amplifiers:    1    (Elysium)                                      │
├─────────────────────────────────────────────────────────────────────────┤
│  Workflows:   7 total (4 queued, 3 passive)                            │
│  Upgrades:    10 total (0 with cross-building prerequisites)           │
│  Recipes:     4 total (1 basic, 2 standard, 1 advanced)               │
├─────────────────────────────────────────────────────────────────────────┤
│  Production Chains:  2  (Vessels→Potions, Territory→Knowledge)          │
│  Artisan Coverage:   3/3 artisan classes matched to buildings           │
│  Material Coverage:  2/2 WORLDFORGE materials consumed                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Cost Audit:         PASS — vs WORLDFORGE contract                      │
│  First building:     8.3 min at base income (Haven)                    │
│  Duration Audit:     PASS                                               │
│  Failure Rate Audit: PASS — no workflow in danger zone                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Output: guild-engine/generated/building-system.json                   │
│  Flags:  1 design tension (see building-flags.md)                      │
└─────────────────────────────────────────────────────────────────────────┘

Downstream forge contracts written:
  ACTFORGE     — material consumption rates for 2 resources
  ITEMFORGE    — 4 recipe output items defined, 1 salvage workflow
  UPGRADEFORGE — 10 building upgrades, max levels: haven:3, workshop:3, apothecary:3, elysium:3, barracks:3

Next step: Run ACTFORGE
  > Follow guild-engine/generator/ACTFORGE.md exactly.
  > INPUT: guild-engine/generated/world-economy.json
         + guild-engine/generated/hero-roster.json
         + guild-engine/generated/building-system.json
```

---

## CRITICAL RULES

1. **NEVER create new node types.** BUILDFORGE generates exactly four node types: `building`,
   `building_workflow`, `building_upgrade`, and `crafting_recipe`. No custom types. No extensions.

2. **ALWAYS respect WORLDFORGE's cost contracts.** Building costs and upgrade costs must be
   calibrated against `first_upgrade_cost` and `upgrade_cost_scaling`. Show the math. If a building
   cost makes the first construction unaffordable within reasonable play time, correct it.

3. **ALWAYS reference only WORLDFORGE materials in workflow inputs.** Every `resource` referenced in
   `inputs[]` on a workflow or recipe must exist in WORLDFORGE's `material_ids[]` or be the primary
   resource. Referencing a nonexistent resource is a structural error.

4. **ALWAYS match artisan specializations to workflow action_types.** Every artisan class in
   HEROFORGE's output must have at least one building where their specialization matches a workflow's
   `action_type`. An unmatched artisan is a dead artisan — flag it.

5. **ALWAYS output valid schema v1.2.0 JSON.** Every node must validate against
   `project.schema.json`. No custom fields. No ad-hoc extensions. If a design decision needs a field
   that does not exist, write a flag and use the closest existing field.

6. **ALWAYS generate at least one building_upgrade per building.** A building with no upgrade path
   has no progression — it is a static fixture, not a meaningful game object.

7. **ALWAYS show your calibration math.** Every `build_cost`, `duration_base_ticks`, `base_failure`,
   `base_crit`, and recipe input amount must have its calculation documented in the terminal output.
   No unexplained numbers.

8. **ALWAYS include `success_table` on every workflow.** The schema requires it. A workflow without a
   success table cannot be processed by `processBuildingTick`.

9. **ALWAYS include `host_building` on every workflow and upgrade.** Orphaned workflows and upgrades
   are structural errors — the compiler rejects them.

10. **NEVER set `base_failure` above 0.30 without a flag.** Failure rates above 30% enter the danger
    zone — players feel punished, not challenged. If a design requires high failure, document it as a
    `//TRANSLATE_FLAG` with justification.

11. **NEVER generate crafting_recipe nodes without `required_workflow`.** A recipe must point to the
    workflow that runs it. An unattached recipe is invisible to the engine.

12. **ALWAYS position building nodes in Column 1 (x: 1400–1600), workflows in Column 2
    (x: 1760–1960), upgrades in Column 3 (x: 2000–2200), recipes in Column 4 (x: 2300–2500).**
    Mixed columns create canvas confusion in the editor.

---

## KNOWN LIMITATIONS (v1.0)

BUILDFORGE v1.0 does **not** handle:

- **Item generation** — BUILDFORGE generates `crafting_recipe` nodes with `output_item` placeholders.
  ITEMFORGE generates the actual `item` nodes matching those IDs. Until ITEMFORGE runs, recipe
  `output_item` references are dangling — the compiler will warn but this is expected.

- **Loot table generation** — Buildings with `loot_table_id` (shops, treasure chests) have their
  loot tables generated by ITEMFORGE, not BUILDFORGE. BUILDFORGE sets the ID reference only.

- **Global upgrades** — BUILDFORGE generates `building_upgrade` nodes (per-building). Global
  `upgrade` nodes (cross-system multipliers like "All crafting 10% faster") are generated by
  UPGRADEFORGE.

- **Faction-gated buildings** — BUILDFORGE can set `unlock_conditions` on buildings, but faction
  reputation gates require faction nodes that are not yet generated (FACTIONFORGE is not implemented).
  For v1.0, use building level gates or act completion gates only.

- **Item modifier workflows** — The `modify_item` behavior (enchanting) is defined in the schema but
  BUILDFORGE v1.0 does not generate modifier workflows. Enchanter-type buildings require a future
  BUILDFORGE update with item modification calibration tables.

- **Passive events** — BUILDFORGE can set `passive_events` on buildings, but the event design
  (triggers, outcomes, narrative) is complex enough to warrant its own calibration. For v1.0, omit
  `passive_events` unless the source material strongly implies time-based building events.

- **Blueprint generation** — BUILDFORGE generates individual nodes, not preset blueprints (the
  `blueprint` node type). Blueprint packaging of building clusters (Forge System, Apothecary System)
  is handled by a separate utility, not by BUILDFORGE.

- **Cross-system validation** — BUILDFORGE validates its own output against the schema and upstream
  contracts. Full cross-system validation (do all recipe output_items exist as item nodes? do all
  upgrade unlock_workflow IDs match real workflows?) is handled by ASSEMBLER.

---

## PIPELINE INTEGRATION

### Reads

| File | Source | What BUILDFORGE uses |
|---|---|---|
| `world-economy.json` | WORLDFORGE | Primary resource, materials, cost anchor, income curves, scarcity classes |
| `hero-roster.json` | HEROFORGE | Artisan classes, specialization map, building affinities |
| `source-analysis.json` | EXTRACTPASS0 | Production locations, crafting references |
| `world-template.json` | TRANSLATEPASS | Mapped building terms, workflow descriptions |
| `schema/project.schema.json` | Repository | Node type field names, constraints, enums |
| `docs/WIKI.md` | Repository | Sections 1–3: building workflow system, artisan hero system |
| `docs/DAY2-DEEPDIVE.md` | Repository | Architecture decisions, formula evaluator, blueprint system |
| `generator/CHANGELOG.md` | Repository | Pending building systems that may affect output |

### Writes

| File | Contents |
|---|---|
| `generated/building-system.json` | Building + workflow + upgrade + recipe nodes + building_calibration + downstream_contracts + flags |
| `generator/building-flags.md` | Human-readable flag review document (only if flags exist) |
| `generator/CHANGELOG.md` | Appended BUILDFORGE run entry |

### Feeds

| Forge | What It Reads from BUILDFORGE |
|---|---|
| ACTFORGE | `material_consumption_rates` — expedition drops must exceed building consumption |
| ITEMFORGE | `recipe_output_items` — item generation matching recipe output IDs; `salvage_workflows` — items need salvage_profile for salvage workflows |
| UPGRADEFORGE | `building_upgrade_ids` — avoid duplication; `max_building_levels` — global upgrades complement per-building upgrades; `upgrade_cost_curve` — cost consistency |
| ASSEMBLER | Full `building-system.json` — cross-references every building, workflow, upgrade, recipe ID |

---

## RELATED FILES

| File | Relationship |
|---|---|
| `guild-engine/generator/WORLDFORGE.md` | Upstream forge — produces economy constraints BUILDFORGE reads |
| `guild-engine/generator/HEROFORGE.md` | Upstream forge — produces artisan staffing data BUILDFORGE reads |
| `guild-engine/generator/EXTRACTPASS0.md` | Pre-pipeline — produces source-analysis.json for building mapping |
| `guild-engine/generator/TRANSLATEPASS.md` | Pre-pipeline — produces world-template.json with mapped terms |
| `guild-engine/generator/ACTFORGE.md` | Downstream — reads material consumption rates for expedition drop calibration |
| `guild-engine/generator/ITEMFORGE.md` | Downstream (future) — reads recipe output items for item generation |
| `guild-engine/generator/UPGRADEFORGE.md` | Downstream (future) — reads building upgrade data for global upgrade sizing |
| `guild-engine/generator/ASSEMBLER.md` | Integration (future) — reads all forge outputs for cross-validation |
| `guild-engine/schema/project.schema.json` | Schema authority — all nodes must validate against v1.2.0 |
| `guild-engine/docs/WIKI.md` | Section 1: node types. Section 2: Building Workflow System. Section 3: Artisan Hero System |
| `guild-engine/docs/DAY2-DEEPDIVE.md` | Architecture: formula evaluator, blueprint system, building design philosophy |
| `guild-engine/generator/CHANGELOG.md` | Pending systems: crafting recipe generation, buildings affecting heroes |
