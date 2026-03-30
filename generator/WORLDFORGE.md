# WORLDFORGE — AI-Assisted Economy Design
# Run this in Claude Code to generate the economy skeleton for a Guild Engine project.
# WORLDFORGE is the first forge in the Forge Suite — every other forge depends on its output.
#
# Input:  guild-engine/generator/source-analysis.json  (from EXTRACTPASS0)
#         guild-engine/generator/world-template.json    (from TRANSLATEPASS)
#         OR: free-text GAME_PITCH if no source material
#
# Output: guild-engine/generated/world-economy.json    (resource nodes + calibration)
#         guild-engine/generator/economy-flags.md       (design tensions for review)
#
# Schema version: 1.2.0
# Forge Suite position: 1 of 7 — feeds HEROFORGE, BUILDFORGE, ACTFORGE, ITEMFORGE, UPGRADEFORGE

---

## Purpose

WORLDFORGE is not a field-filler. It is an economy theorist.

Its job is to answer the question that determines whether a game feels meaningful or feels hollow:
**what should it feel like to accumulate, spend, and run out?**

Every resource node WORLDFORGE generates carries three answers: what this resource represents in the
world's fiction, what mechanical role it plays in the economy, and why its scarcity at a given moment
in the game is intentional rather than accidental. WORLDFORGE documents all three — in the node, in
the calibration object, and in flags where the answers are in tension.

Every other forge in the suite reads WORLDFORGE output before it generates anything. HEROFORGE cannot
price hero recruitment without knowing what resources exist. BUILDFORGE cannot design workflow chains
without knowing which resources flow. ACTFORGE cannot balance expedition rewards without knowing the
income curve. WORLDFORGE sets the bounds. Everything else works within them.

---

## Before doing anything else

Read these files in order:

1. `guild-engine/schema/project.schema.json` — resource node fields and constraints
2. `guild-engine/docs/WIKI.md` — Section 1 (Node Types), Section 19 (Economy Sim)
3. `guild-engine/generator/CHANGELOG.md` — pending economy-related systems
4. `guild-engine/generator/EXTRACTPASS0.md` — what source-analysis.json contains
5. `guild-engine/generator/TRANSLATEPASS.md` — what world-template.json contains
6. If source material exists: `guild-engine/generator/source-analysis.json`
7. If TRANSLATEPASS has run: `guild-engine/generator/world-template.json`

Print your read status before proceeding:
```
WORLDFORGE reading context...
  ✓ schema/project.schema.json
  ✓ docs/WIKI.md
  ✓ generator/CHANGELOG.md
  [✓ / ✗] source-analysis.json
  [✓ / ✗] world-template.json
```

---

## Input Format

User provides:

```
SOURCE_MATERIAL: "{{path to source-analysis.json or world-template.json, or 'none'}}"
GAME_PITCH:      "{{free-text description of the game's world and tone — used if SOURCE_MATERIAL is none}}"
PACING_TARGET:   "{{short (5hr) | medium (15hr) | long (30hr+) | endless}}"
COMPLEXITY:      "{{simple (2-3 resources) | standard (4-6 resources) | complex (7+ resources)}}"
ECONOMY_TYPE:    "{{idle | active | hybrid}}"
```

**Defaults if not provided:**
- PACING_TARGET: `medium`
- COMPLEXITY: `standard`
- ECONOMY_TYPE: `hybrid`

**ECONOMY_TYPE definitions:**
- `idle` — Resources accumulate passively. Player decisions are strategic (what to build, when to send
  expeditions), not moment-to-moment. All income sources are passive or triggered on departure.
- `active` — Resource income requires player-initiated actions. Buildings queue jobs. Expeditions are
  the primary income source. Passive income exists but is minor.
- `hybrid` — One or two resources accumulate passively; others require building workflows and
  expedition activity to generate. The most common Guild Engine economy type.

---

## STEP 1 — NARRATIVE ANALYSIS

Before generating any nodes, analyze the source material for these five signals. Write your analysis
to the console — this is the reasoning that justifies every economy decision that follows.

### 1. Resource Themes

What does this world treat as valuable? Do not default to generic gold/wood/stone unless the source
material genuinely uses these. Look for:

- **Power substances**: blood, mana, essence, fuel, energy, reputation, secrets, fear
- **Material foundations**: ore, timber, stone, fabric, herbs, components
- **Social currencies**: influence, standing, favors, information, contracts
- **Abstract values**: time, knowledge, faith, corruption, harmony, chaos

For each resource theme found, write:
```
RESOURCE THEME: [theme name]
  Source signal: "[quote or paraphrase from source material]"
  Proposed resource: [what game resource this becomes]
  Role: primary | secondary | material | prestige
  Scarcity intent: bottleneck | flow | premium | prestige
```

### 2. Scarcity Intentions

What should feel scarce early vs. abundant late? The source material usually encodes this — a VtM
sourcebook treats Blood as precious; an industrial setting treats coal as cheap but refined metals as
scarce.

Identify:
- **Early bottleneck**: the resource that limits first-hour decisions most severely
- **Mid-game constraint**: the resource that creates friction in acts 2–3
- **Late-game scarcity**: the resource that makes endgame progression feel earned
- **Always-abundant**: what the player should never genuinely run out of (the flow resource)

### 3. Economic Loops

How many distinct resource cycles does this game need? An economy with one loop is shallow. An economy
with four loops is confusing. Two to three is the target for most Guild Engine projects.

A loop is: a resource is gained → spent on something → that something produces a different resource or
accelerates gaining the original.

Example loops:
- **Combat loop**: Gold (expedition reward) → recruit heroes → stronger expeditions → more gold
- **Crafting loop**: Materials (expedition drops) → Forge → equipment → better heroes → better drops
- **Social loop**: Influence (from faction missions) → faction rep → better recruitment options

Name each loop, identify the resources it flows through, and note which resource is the "pump" (the
bottleneck that limits loop throughput).

### 4. Pacing Signals

Does the source suggest rapid escalation or slow burn? Look for:
- The source's own act/chapter structure — does it front-load action or build slowly?
- The density of power-escalation language in the source
- Whether the source treats early-game resources (gold) as trivially available or carefully rationed

This informs whether to use an aggressive, moderate, or conservative income curve.

### 5. Translation Flags

Surface any contradiction between the source material's thematic logic and standard economy game
mechanics. Use this format:

```
//TRANSLATE_FLAG [SEVERITY: LOW | MEDIUM | HIGH]
TENSION: "[What the source says or implies]"
CONFLICT: "[What standard game economy mechanics would do instead]"
OPTIONS:
  A) [Option that honors source intent — may require unusual mechanics]
  B) [Option that honors game mechanics — may betray source intent]
  C) [Compromise option if available]
DESIGNER DECISION REQUIRED: [Yes/No — Yes means this flag blocks default generation]
```

**Flag triggers (mandatory):**
- Source treats a resource as non-scarce that the game engine would model as scarce
- Source treats depletion as philosophically meaningful (Humanity, Corruption) but engine models
  accumulation
- Source's power economy is non-transactional (love, harmony, enlightenment) but game requires costs
- Source resource has no obvious game-economy equivalent

---

## STEP 2 — CALIBRATION TABLES

Use these tables to calculate defensible values for every resource node. Do not estimate. Show the
math for every value that has a calculation behind it.

### Table A — Resource Count by Complexity

| Complexity | Primary Resources | Secondary Resources | Materials | Total Range |
|---|---|---|---|---|
| `simple` | 1 | 0–1 | 1–2 | 2–3 |
| `standard` | 1–2 | 1–2 | 2–3 | 4–6 |
| `complex` | 2–3 | 2–3 | 3–5 | 7–11 |

**Primary resource** — spent on buildings, hero recruitment, upgrades. Always accumulates passively.
Visible in the HUD at all times.

**Secondary resource** — spent on specific systems (crafting, faction actions, prestige). May have
passive income or require expedition/building activity. Visible in HUD when non-zero.

**Material** — `is_material: true`. Crafting inputs. Obtained via expeditions or mining buildings.
Not spent directly — consumed by building workflows. Stack limit applies.

**Prestige currency** — earned only during or after a prestige reset. Not applicable to v1 projects
without a prestige node. If the project has prestige: add 1 prestige currency regardless of complexity.

### Table B — Income-to-Cost Ratios (Mandatory — Show Your Math)

Every primary resource's `base_income` must satisfy these ratios. Calculate and document each.

| Milestone | Target Ratio | Formula |
|---|---|---|
| First building upgrade | ≤ 5 minutes at base income | `first_upgrade_cost / (base_income × 240 ticks)` ≤ 1.0 |
| First hero recruitment | 8–12 minutes at base income | `recruit_cost / (base_income × 480 ticks)` ∈ [0.8, 1.2] |
| Act 1 expedition entry cost | 0 (expeditions are free) or ≤ 2 minutes | Entry cost / base income × 120 ticks ≤ 1.0 |
| Material drop rate vs. crafting cost | First craft ≤ 3 expedition runs | `craft_cost / avg_drop_per_run` ≤ 3 |

**Base tick rate reminder:** The engine runs at 250ms ticks = 4 ticks/second = 240 ticks/minute.

Example (show this math in your output):
```
PRIMARY RESOURCE: Gold
  base_income: 3/tick
  first_upgrade_cost: 400
  Time to first upgrade: 400 / (3 × 240) = 0.56 minutes ✓ (target: ≤ 5min)
  first_recruit_cost: 1,200
  Time to first recruit: 1200 / (3 × 240) = 1.67 minutes (target: 8-12min)
  
  PROBLEM: First recruit at 1.67 minutes is too fast. Recommend:
    Option A: Raise recruit cost to 2,880 → 4.0 min (still below target minimum of 8min)
    Option B: Lower base_income to 1/tick → first upgrade at 1.67min (within target), recruit at 5min
    Option C: Require recruits to cost a secondary resource (feels thematically appropriate for this IP)
  //TRANSLATE_FLAG [LOW] — recruit pacing requires designer decision. Using Option B as default.
```

Do not proceed to generation until every primary resource's ratio is documented and defensible.

### Table C — Income Curve by Pacing Target

`base_income` is the starting rate. Income multipliers are achieved via building upgrades and
prestige bonuses — WORLDFORGE does not generate the upgrades (UPGRADEFORGE does), but it defines
the curve those upgrades must achieve.

| Pacing | Hour 1 | Hour 5 | Hour 10 | Hour 20 | Cap Growth Rate |
|---|---|---|---|---|---|
| `short` (5hr) | ×1.0 | ×3.0 | N/A | N/A | Aggressive (doublings every ~1hr) |
| `medium` (15hr) | ×1.0 | ×2.5 | ×4.0 | N/A | Moderate (doublings every ~2hr) |
| `long` (30hr+) | ×1.0 | ×2.0 | ×3.5 | ×6.0 | Conservative (doublings every ~3hr) |
| `endless` | ×1.0 | ×1.5 | ×2.5 | ×4.0 | Prestige-gated (hard cap before reset) |

Record the target curve in the `economy_calibration` object. UPGRADEFORGE reads this to design
upgrade cost/effect values that achieve these multipliers on schedule.

### Table D — Resource Scarcity Classification

Every resource node must be classified. This classification is written as `scarcity_class` in the
`economy_calibration.resource_relationships` array — not on the node itself (not in schema), but
in the output calibration object for downstream forges.

| Class | Definition | Design rule | Example |
|---|---|---|---|
| `bottleneck` | Intentionally scarce. Limits progression. Player should feel the pinch. | 1 per economy at any given act. Bottleneck shifts between acts. | Iron ore in Act 1, rare components in Act 3 |
| `flow` | Abundantly available. Spent on minor transactions. Player rarely runs out. | At least 1 per economy. Never make this the upgrade gating resource. | Gold/coin equivalent |
| `premium` | Rare. Not blocked by bottleneck but requires dedicated activity to accumulate. | 0–2 per economy. Unlocks meaningful choices, not mandatory progression. | Gemstones, rare herbs |
| `prestige` | Meta-currency. Earned on/after prestige reset. Crosses run boundary. | 0–1 per economy. Only if project has prestige node. | Prestige tokens, fame |

At least 1 `bottleneck` and 1 `flow` resource must exist in every economy. Document the intended
bottleneck shift across acts:

```
BOTTLENECK PROGRESSION:
  Act 1: [resource] — [why this is the early constraint]
  Act 2: [resource] — [why the constraint shifts]
  Act 3+: [resource] — [what gates late-game]
```

### Table E — Base Cap Calculation

`base_cap` is the maximum amount of a resource the player can hold without upgrades. It must be
large enough to allow saving for major purchases (heroes, buildings) but small enough to create
meaningful cap management decisions.

**CRITICAL: base_income is per-SECOND in the engine.** Cap should allow 10-20 minutes of saving
for a meaningful purchase window.

| Pacing | Base cap formula | Rationale | Example |
|---|---|---|---|
| `short` | `base_income × 600` (10 minutes of income) | Fast games, quick purchases | base_income=4 → cap=2400 |
| `medium` | `base_income × 1200` (20 minutes of income) | Standard games, save for heroes | base_income=4 → cap=4800 |
| `long` | `base_income × 1800` (30 minutes of income) | Slow games, multiple purchases | base_income=4 → cap=7200 |
| `endless` | `base_income × 2400` (40 minutes of income) | Sandbox, large savings | base_income=4 → cap=9600 |

**Verification (mandatory):**
```
PRIMARY RESOURCE: Gold
  base_income: 4/s
  base_cap: 4800 (medium pacing: 4 × 1200 = 4800)
  Time to fill cap: 4800 / 4 = 1200 seconds = 20 minutes ✓
  Cheapest hero recruit: 2000 gold
  Time to afford: 2000 / 4 = 500 seconds = 8.3 minutes ✓ (target: 8-12 min)
  EXPENSIVE hero recruit: 2800 gold
  Time to afford: 2800 / 4 = 700 seconds = 11.7 minutes ✓ (target: 8-12 min)
```

**Rule: base_cap must be at least 1.5× the cheapest hero recruit cost.** If cap is 480 and cheapest
hero costs 2000, the player can NEVER recruit without spending first — this is a soft-lock.

**For materials** (`is_material: true`): cap = `first_crafting_cost × 5`. The player should be able
to stock enough for several craft runs without hitting the wall constantly.

**For prestige currencies**: cap = `null` (uncapped — prestige currency should never be lost to cap).

### Table F — Expedition Reward Calibration (Feeds ACTFORGE)

WORLDFORGE does not generate expeditions — but it defines the resource reward ranges that ACTFORGE
must use when generating expedition nodes. Write these to `economy_calibration.expedition_reward_bands`.

| Expedition tier | Resource reward range | Material drop qty | Notes |
|---|---|---|---|
| Early (Act 1, danger 2–4) | `base_income × 8–12 per tick of duration` | 1–3 per run | Should feel rewarding vs. passive income |
| Mid (Act 2, danger 5–7) | `base_income × 12–18 per tick` | 2–5 per run | Clearly better than passive, justifies risk |
| Late (Act 3+, danger 8–10) | `base_income × 20–30 per tick` | 4–8 per run | Expeditions become primary income source |
| Boss | `× 3.0 multiplier on late tier` | Rare/epic drops | Boss should feel categorically more rewarding |

The `base_income × N per tick of duration` formula means: an expedition of `duration_s` ticks should
reward approximately `base_income × multiplier × duration_ticks` of the primary resource.

Example: base_income=3, early expedition at 60s = 240 ticks.
Reward range: `3 × 8 × 240 = 5,760` to `3 × 12 × 240 = 8,640`. Use midpoint ~7,000 gold.

---

## STEP 3 — GENERATION RULES

### A. Resource Node Structure

Every generated resource node must use this exact structure:

```json
{
  "id": "resource-{slug}",
  "type": "resource",
  "label": "{Human-readable name}",
  "description": "{One sentence: what this is in the world's fiction and why it matters}",
  "icon": "{emoji}",
  "base_cap": {number — calculated per Table E},
  "base_income": {number — calculated per Table B and C},
  "is_material": {true | false},
  "visible": true,
  "canvas_pos": {"x": {see layout}, "y": {see layout}}
}
```

**ID rules:**
- Lowercase, hyphens only, no spaces: `resource-gold`, `resource-iron-ore`, `resource-blood`
- Prefix must be `resource-`
- No duplicate IDs across the entire node set

**Description rules:**
- Must capture both fiction and function in one sentence
- Bad: "Gold is the currency." Good: "Guild coin — earned from expeditions and contracts, spent on
  every building, recruit, and upgrade."

**Icon selection:**
- Use a single emoji that a player would immediately associate with the resource
- Avoid text, multi-emoji combinations, or flags
- Thematic priority: source material icon > genre convention > generic icon

### B. Canvas Layout Algorithm

Position resource nodes in three columns based on type. All y positions start at 50 and increment
by 150 per additional resource in the same column.

```
Column 1: Primary/Secondary currencies      Column 2: Secondary currencies (overflow)   Column 3: Materials
x: 0–200                                    x: 200–400                                  x: 400–600

Node 1 (primary)      → (50, 50)
Node 2 (secondary)    → (50, 200)
Node 3 (secondary 2)  → (250, 50)          [if more than 2 secondary, use column 2]
Node 4 (material)     → (450, 50)
Node 5 (material)     → (450, 200)
Node 6 (material)     → (450, 350)
```

Prestige currency (if present) goes in Column 1 below other currencies, at y = last_currency_y + 200.
Materials stack vertically in Column 3 with y increment 150.

### C. The world-economy.json Output Format

```json
{
  "schema_version": "1.2.0",
  "worldforge_version": "1.0.0",
  "generated_at": "{ISO timestamp}",
  "meta": {
    "project_name": "{from source or pitch}",
    "pacing_target": "{short|medium|long|endless}",
    "complexity": "{simple|standard|complex}",
    "economy_type": "{idle|active|hybrid}",
    "source_material": "{path or 'pitch'}",
    "designer_notes": "{brief summary of the economy's core fantasy}"
  },
  "nodes": [
    // All resource nodes here — schema-valid, ready to import
  ],
  "economy_calibration": {
    "income_curves": {
      "primary_resource_id": "{id}",
      "base_income_per_tick": {number},
      "target_multipliers": {
        "hour_1": 1.0,
        "hour_5": {from Table C},
        "hour_10": {from Table C},
        "hour_20": {from Table C, or null}
      },
      "cap_growth_rate": "{aggressive|moderate|conservative|prestige-gated}"
    },
    "cost_ratios": {
      "first_upgrade_ticks": {calculated},
      "first_recruit_ticks": {calculated},
      "ratio_audit": "{pass|fail — fail means values must be corrected before proceeding}"
    },
    "resource_relationships": [
      {
        "resource_id": "{id}",
        "scarcity_class": "{bottleneck|flow|premium|prestige}",
        "feeds_systems": ["{heroforge|buildforge|actforge|itemforge|upgradeforge}"],
        "bottleneck_act": "{act_1|act_2|act_3|none — which act this resource gates}"
      }
    ],
    "expedition_reward_bands": {
      "early": {"resource_min": {number}, "resource_max": {number}, "material_qty": "1–3"},
      "mid":   {"resource_min": {number}, "resource_max": {number}, "material_qty": "2–5"},
      "late":  {"resource_min": {number}, "resource_max": {number}, "material_qty": "4–8"},
      "boss":  {"multiplier": 3.0, "guaranteed_premium_drop": true}
    },
    "bottleneck_progression": {
      "act_1": {"resource_id": "{id}", "reasoning": "{why}"},
      "act_2": {"resource_id": "{id}", "reasoning": "{why}"},
      "act_3": {"resource_id": "{id}", "reasoning": "{why}"}
    },
    "loop_definitions": [
      {
        "loop_name": "{Combat loop / Crafting loop / etc.}",
        "pump_resource": "{the bottleneck resource for this loop}",
        "flow": ["{resource_id_1} → {system} → {resource_id_2} → ..."]
      }
    ]
  },
  "flags": [
    {
      "id": "flag-{n}",
      "severity": "low|medium|high",
      "tension": "{what the source implies}",
      "conflict": "{what the engine would do by default}",
      "options": ["A) ...", "B) ...", "C) ..."],
      "default_applied": "{which option WORLDFORGE used}",
      "designer_decision_required": true
    }
  ],
  "downstream_contracts": {
    "heroforge": {
      "primary_resource_id": "{id — used for recruit costs}",
      "recruit_cost_range": {"min": {number}, "max": {number}},
      "note": "HEROFORGE must price all hero recruitment within this range"
    },
    "buildforge": {
      "primary_resource_id": "{id}",
      "material_ids": ["{id}", "..."],
      "first_upgrade_cost": {number},
      "upgrade_cost_scaling": "×2.0 per tier (default) — UPGRADEFORGE may override",
      "note": "BUILDFORGE workflow inputs must reference materials in this list only"
    },
    "actforge": {
      "reward_resource_ids": ["{id}", "..."],
      "expedition_reward_bands": "see economy_calibration.expedition_reward_bands",
      "note": "ACTFORGE resource_rewards[] on expedition nodes must use these bands"
    },
    "itemforge": {
      "material_ids": ["{id}", "..."],
      "note": "ITEMFORGE crafting recipe inputs must reference materials in this list only"
    },
    "upgradeforge": {
      "income_curve_target": "see economy_calibration.income_curves.target_multipliers",
      "note": "UPGRADEFORGE upgrade effects must achieve these income multipliers on schedule"
    }
  }
}
```

### D. Edges

WORLDFORGE does not generate edges between resource nodes — resource nodes have no connections to
each other by default. Edges are drawn in the editor after all forges have run. Do not add an `edges`
array to world-economy.json.

---

## STEP 4 — VALIDATION CHECKLIST

Run through every item before writing the output file. ERRORS block output. WARNINGS are written to
`economy-flags.md` and noted in the terminal summary but do not block output.

### Structural Checks (Errors if failed)

- [ ] At least 2 resource nodes exist (minimum: 1 primary, 1 secondary or material)
- [ ] All resource nodes have: `id`, `type`, `label`, `description`, `icon`, `base_cap`,
      `base_income`, `is_material`, `visible`, `canvas_pos`
- [ ] All `id` fields are slug-format: lowercase, hyphens only, prefix `resource-`
- [ ] No duplicate IDs within the node set
- [ ] All canvas_pos values are within bounds: `x ∈ [0, 600]`, `y ∈ [0, 600]`
- [ ] `type` field is exactly `"resource"` on every node — no custom types
- [ ] `is_material: true` on all material nodes and `false` on all currency nodes
- [ ] `schema_version` in output file is `"1.2.0"`
- [ ] `downstream_contracts` object is present and complete

### Balance Checks (Warnings if failed)

- [ ] Income-to-cost ratio audit passes (first upgrade ≤ 5 minutes at base income)
- [ ] First hero recruit timing is documented and within 8–15 minute range
- [ ] At least one `bottleneck` resource is identified in `resource_relationships`
- [ ] At least one `flow` resource is identified in `resource_relationships`
- [ ] Pacing curve is monotonic: `hour_1 ≤ hour_5 ≤ hour_10 ≤ hour_20`
- [ ] No resource has `base_income: 0` unless explicitly prestige-locked (`scarcity_class: "prestige"`)
- [ ] No resource has `base_cap` smaller than `base_income × 60` (less than 15 seconds of cap room)
- [ ] At least one economic loop is defined in `loop_definitions`
- [ ] `bottleneck_progression` covers all acts defined in the project

### Pipeline Checks (Warnings if failed)

- [ ] `//TRANSLATE_FLAG` comments present on any node where source material created tension
- [ ] `flags[]` array populated if any source material contradictions exist
- [ ] `economy-flags.md` file generated if `flags[]` is non-empty
- [ ] `CHANGELOG.md` entry appended
- [ ] `downstream_contracts` values are internally consistent (recruit_cost_range uses primary
      resource; material_ids are a subset of generated material node IDs)

---

## STEP 5 — ECONOMY FLAGS FILE

If any flags exist, generate `guild-engine/generator/economy-flags.md` with this format:

```markdown
# Economy Flags — {Project Name}
### Generated by WORLDFORGE {ISO date}

These flags represent design tensions between your source material and standard Guild Engine
economy mechanics. Review each flag and confirm or override the default decision.

---

## FLAG-001 [SEVERITY: HIGH] — {Flag title}

**Source intent:** {What the source material implies}
**Engine default:** {What standard game economy mechanics would do}

**Options:**
- A) {Option A description — honors source intent}
- B) {Option B description — honors engine mechanics}
- C) {Option C, if available}

**Default applied:** {Which option WORLDFORGE used}

**To override:** Edit `world-economy.json` nodes as follows:
  - {Specific field change to apply Option A}
  - {Specific field change to apply Option B}

---

## FLAG-002 [SEVERITY: LOW] — ...
```

---

## STEP 6 — FILE WRITING

Write these files in this order:

```
1. guild-engine/generated/world-economy.json          (primary output)
2. guild-engine/generator/economy-flags.md            (only if flags[] is non-empty)
3. Append to guild-engine/generator/CHANGELOG.md      (always)
```

**Directory creation:** If `guild-engine/generated/` does not exist, create it before writing.

**CHANGELOG entry format:**

```markdown
### WORLDFORGE Run — {ISO date}
- VERSION: v1.9.0
- TYPE: SYSTEM
- SCOPE: WORLDFORGE
- STATUS: IMPLEMENTED
- INPUT: {source-analysis.json path, or pitch summary in ≤20 words}
- OUTPUT: guild-engine/generated/world-economy.json
- RESOURCES: {N} total ({N} primary, {N} secondary, {N} materials)
- PACING: {short|medium|long|endless}
- ECONOMY_TYPE: {idle|active|hybrid}
- FLAGS: {N} design tensions flagged ({N} high, {N} medium, {N} low)
- DOWNSTREAM: world-economy.json ready for HEROFORGE, BUILDFORGE, ACTFORGE, ITEMFORGE, UPGRADEFORGE
```

---

## STEP 7 — TERMINAL SUMMARY

Print this summary box after all files are written:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  WorldForge Complete                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  {Project Name}                                                         │
│  Pacing: {pacing} · Complexity: {complexity} · Economy: {type}         │
├─────────────────────────────────────────────────────────────────────────┤
│  Resources: {N} total                                                   │
│    • Primary:       {N}    ({resource names, comma-separated})          │
│    • Secondary:     {N}    ({resource names, comma-separated})          │
│    • Materials:     {N}    ({resource names, comma-separated})          │
├─────────────────────────────────────────────────────────────────────────┤
│  Economy loops:     {N}    ({loop names, comma-separated})              │
│  Bottleneck:        {resource name} (Act 1) → {name} (Act 2+)          │
├─────────────────────────────────────────────────────────────────────────┤
│  Ratio Audit:       {PASS / FAIL — fail lists the offending ratio}      │
│  First upgrade:     {N} min at base income                              │
│  First recruit:     {N} min at base income                              │
├─────────────────────────────────────────────────────────────────────────┤
│  Output:  guild-engine/generated/world-economy.json                    │
│  Flags:   {N} design tensions ({see economy-flags.md | none})          │
└─────────────────────────────────────────────────────────────────────────┘

Downstream forge contracts written:
  HEROFORGE  — recruit cost range: {min}–{max} {primary resource}
  BUILDFORGE — {N} material types available; first upgrade cost: {N}
  ACTFORGE   — expedition reward bands: early {min}–{max}, late {min}–{max}
  ITEMFORGE  — {N} craftable materials defined
  UPGRADEFORGE — income curve target: ×{N} by hour 5, ×{N} by hour 10

Next step: Run HEROFORGE
  > Follow guild-engine/generator/HEROFORGE.md exactly.
  > INPUT: guild-engine/generated/world-economy.json
```

---

## EXAMPLE SESSION

```
> Follow guild-engine/generator/WORLDFORGE.md exactly.

SOURCE_MATERIAL: "guild-engine/generator/world-template.json"
GAME_PITCH:      "none"
PACING_TARGET:   "medium"
COMPLEXITY:      "standard"
ECONOMY_TYPE:    "hybrid"

WORLDFORGE reading context...
  ✓ schema/project.schema.json
  ✓ docs/WIKI.md
  ✓ generator/CHANGELOG.md
  ✗ source-analysis.json (not found — will read world-template.json directly)
  ✓ world-template.json

✓ Step 1 — Narrative Analysis

  RESOURCE THEMES FOUND:
    Blood
      Source signal: "Vitae is the substance of power, sustenance, and obligation for all Kindred"
      Proposed resource: resource-blood
      Role: primary
      Scarcity intent: bottleneck (Act 1) → flow (Act 3)
    
    Influence
      Source signal: "Domains and status are the true currency of Kindred society"
      Proposed resource: resource-influence
      Role: secondary
      Scarcity intent: bottleneck (Act 2+)
    
    Hunting Grounds
      Source signal: "Territories must be controlled to ensure reliable feeding"
      Proposed resource: resource-territory
      Role: material (is_material: true)
      Scarcity intent: premium
    
    Mortal Vessels
      Source signal: "Mortals are tools, livestock, and sometimes allies"
      Proposed resource: resource-vessels
      Role: material (is_material: true)
      Scarcity intent: bottleneck (Act 1 only)

  ECONOMIC LOOPS FOUND:
    Loop 1 — Hunt/Feed loop:
      Blood (expedition reward) → spend on abilities/recruitment → stronger coterie →
      more dangerous hunting grounds unlocked → more Blood
      PUMP: resource-vessels (limits early Blood gain)
    
    Loop 2 — Influence loop:
      Influence (social expeditions) → spend on domain upgrades → more territory nodes →
      passive Influence income increases
      PUMP: resource-influence (stays scarce until Act 3)

  //TRANSLATE_FLAG [SEVERITY: HIGH]
  TENSION: "Humanity in VtM decreases as Kindred commit violent or immoral acts — 
            it is a moral degradation meter, not an accumulated resource."
  CONFLICT: "Guild Engine models resources as accumulating. A decreasing resource 
             requires either inversion (track Depravity instead of Humanity) or 
             a separate mechanic outside the resource system."
  OPTIONS:
    A) Invert: track 'resource-depravity' that INCREASES. High Depravity unlocks 
               stronger abilities but triggers negative events. Faithful to source intent.
    B) Ignore: omit Humanity from the economy entirely. Simpler.
    C) Hero status: model as a status effect on individual heroes rather than economy resource.
  DEFAULT APPLIED: Option A (Depravity as accumulating secondary resource)
  DESIGNER DECISION REQUIRED: Yes — confirm depravity model before proceeding

✓ Step 2 — Calibration

  PRIMARY RESOURCE: Blood (resource-blood)
    base_income: 2/tick
    pacing: medium → target multipliers: ×1.0 / ×2.5 / ×4.0
    
    Base cap: 2 × 240 = 480 ✓
    
    First upgrade cost target: 2 × 240 × 5 = 2,400 → set first upgrade at 2,000
    Ratio check: 2,000 / (2 × 240) = 4.17 minutes ✓ (target: ≤ 5min)
    
    First recruit cost target: 2 × 240 × 10 = 4,800 → set recruit range 3,500–5,000
    Ratio check: 3,500 / (2 × 240) = 7.29 min (lower bound — slightly under target)
              : 5,000 / (2 × 240) = 10.42 min (upper bound — within target)
    //WARNING: Lower bound recruit at 7.29min is under the 8min minimum.
    Correction: raise minimum recruit to 4,000 → 8.33 min ✓

  MATERIAL: resource-vessels
    is_material: true
    base_income: 0 (no passive income — obtained from expeditions only)
    base_cap: first crafting use × 5 = 20 × 5 = 100
    //TRANSLATE_FLAG [SEVERITY: LOW] — vessels with base_income: 0 require explicit
    expedition loot wiring. ACTFORGE must include vessels in Act 1 expedition rewards.

  Expedition Reward Bands (medium pacing, base_income=2):
    Early (240-tick expedition): reward 2 × 8 × 240 = 3,840 to 2 × 12 × 240 = 5,760
      → Use range 4,000–5,500 Blood ✓
    Late (600-tick expedition): reward 2 × 20 × 600 = 24,000 to 2 × 30 × 600 = 36,000
      → Use range 25,000–35,000 Blood ✓
    Boss: Late ×3 → 75,000–105,000 Blood ✓

✓ Step 3 — Generating 5 resource nodes...
  resource-blood        (primary, bottleneck Act 1)
  resource-influence    (secondary, bottleneck Act 2+)
  resource-depravity    (secondary, accumulating — FLAGGED)
  resource-vessels      (material, is_material: true)
  resource-territory    (material, is_material: true)

✓ Step 4 — Validation
  Structural: 5/5 checks passed ✓
  Balance:    4/5 — WARNING: vessels has base_income: 0 (expected for material — noted in flag)
  Pipeline:   3/3 — CHANGELOG entry written ✓

✓ Step 5 — economy-flags.md written (2 flags: 1 HIGH, 1 LOW)
✓ Step 6 — world-economy.json written (523 lines)
✓ Step 7 — CHANGELOG.md updated

┌─────────────────────────────────────────────────────────────────────────┐
│  WorldForge Complete                                                    │
├─────────────────────────────────────────────────────────────────────────┤
│  Masquerade Eternal — Kindred of the City                               │
│  Pacing: medium · Complexity: standard · Economy: hybrid               │
├─────────────────────────────────────────────────────────────────────────┤
│  Resources: 5 total                                                     │
│    • Primary:       1    (Blood)                                        │
│    • Secondary:     2    (Influence, Depravity)                         │
│    • Materials:     2    (Vessels, Territory)                           │
├─────────────────────────────────────────────────────────────────────────┤
│  Economy loops:     2    (Hunt/Feed loop, Influence loop)               │
│  Bottleneck:        Vessels (Act 1) → Influence (Act 2+)               │
├─────────────────────────────────────────────────────────────────────────┤
│  Ratio Audit:       PASS                                                │
│  First upgrade:     4.2 min at base income                              │
│  First recruit:     8.3 min at base income                              │
├─────────────────────────────────────────────────────────────────────────┤
│  Output:  guild-engine/generated/world-economy.json                    │
│  Flags:   2 design tensions (see economy-flags.md)                     │
└─────────────────────────────────────────────────────────────────────────┘

Downstream forge contracts written:
  HEROFORGE  — recruit cost range: 4,000–5,000 Blood
  BUILDFORGE — 2 material types (Vessels, Territory); first upgrade: 2,000 Blood
  ACTFORGE   — expedition rewards: early 4,000–5,500, late 25,000–35,000 Blood
  ITEMFORGE  — 2 craftable materials defined (Vessels, Territory)
  UPGRADEFORGE — income curve target: ×2.5 by hour 5, ×4.0 by hour 10

Next step: Run HEROFORGE
  > Follow guild-engine/generator/HEROFORGE.md exactly.
  > INPUT: guild-engine/generated/world-economy.json
```

---

## CRITICAL RULES

1. **NEVER create new node types.** The only node type WORLDFORGE generates is `resource`. All other
   systems (heroes, buildings, expeditions, items) are handled by downstream forges.

2. **ALWAYS show your calibration math.** Every `base_income`, `base_cap`, and cost ratio must have
   its calculation documented in the terminal output before the value is committed to the JSON.

3. **ALWAYS flag source material contradictions.** The `//TRANSLATE_FLAG` system is not optional.
   A resource whose thematic role conflicts with its mechanical role is a design debt that the
   designer must consciously accept or resolve. Surface it.

4. **ALWAYS output valid schema v1.2.0 JSON.** No custom fields. No new field names. If the source
   material implies a mechanic the schema cannot represent, flag it rather than inventing new fields.

5. **NEVER generate a resource node with `base_income: 0`** unless it is explicitly a material node
   (`is_material: true`) obtained only from expeditions, OR it is a prestige currency with
   `scarcity_class: "prestige"`. A currency with no income source is a dead resource.

6. **ALWAYS write downstream_contracts.** Every forge that runs after WORLDFORGE reads its contract.
   An incomplete downstream_contracts block is an incomplete WORLDFORGE run.

7. **ALWAYS run the ratio audit before writing the output file.** A ratio audit failure (FAIL status)
   means `base_income` or cost values must be corrected before proceeding. Do not write world-economy.json
   with a failing ratio audit and hope the downstream forges compensate.

8. **NEVER position material nodes in Column 1 (x: 0–200).** Column 1 is for currency resources only.
   Materials belong in Column 3 (x: 400–600). Mixed columns create canvas confusion in the editor.

---

## KNOWN LIMITATIONS (v1.0)

WORLDFORGE v1.0 generates the economy skeleton only. These systems are explicitly deferred:

- **Hero classes** — HEROFORGE handles hero roster, stat blocks, artisan class definitions.
  WORLDFORGE writes the `heroforge.recruit_cost_range` contract but does not generate hero nodes.

- **Buildings and workflows** — BUILDFORGE handles all `building`, `building_workflow`,
  `building_upgrade`, and `crafting_recipe` nodes. WORLDFORGE writes the material list contract.

- **Items and loot tables** — ITEMFORGE handles all `item` and `loot_table` nodes.
  WORLDFORGE writes the material ID list that ITEMFORGE uses for crafting recipes.

- **Expeditions and acts** — ACTFORGE handles all `expedition`, `boss_expedition`, and `act` nodes.
  WORLDFORGE writes the expedition reward band contract.

- **Upgrade trees** — UPGRADEFORGE handles all `upgrade` and `building_upgrade` nodes.
  WORLDFORGE writes the income curve target that UPGRADEFORGE must achieve.

- **Cross-system validation** — ASSEMBLER validates that all forges' outputs are internally
  consistent. WORLDFORGE validates only its own output (resource nodes) and the contracts it writes.

- **Prestige layer** — If the project includes a prestige node, WORLDFORGE will generate a
  prestige currency resource. However, the `prestige` node itself, including its reset list and
  bonus list, is generated by UPGRADEFORGE.

- **Faction resources** — If the source material has faction-specific currencies (e.g., a faction's
  unique favor token), WORLDFORGE flags the tension but defers faction node generation to a future
  FACTIONFORGE (not yet implemented). For v1.0, model faction currencies as secondary resources.

---

## PIPELINE INTEGRATION

### Reads

| File | Source | What WORLDFORGE uses |
|---|---|---|
| `source-analysis.json` | EXTRACTPASS0 | World elements, tone markers, accumulation signals |
| `world-template.json` | TRANSLATEPASS | Mapped resource terms, income rate signals, scarcity intent |
| `schema/project.schema.json` | Repository | Resource node field names and constraints |
| `docs/WIKI.md` | Repository | Node type reference, economy sim calibration |
| `generator/CHANGELOG.md` | Repository | Pending economy systems that may affect output |

### Writes

| File | Contents |
|---|---|
| `generated/world-economy.json` | Resource nodes + economy_calibration + downstream_contracts + flags |
| `generator/economy-flags.md` | Human-readable flag review document (only if flags exist) |
| `generator/CHANGELOG.md` | Appended WORLDFORGE run entry |

### Feeds

| Forge | What it reads from WORLDFORGE |
|---|---|
| HEROFORGE | `downstream_contracts.heroforge` — recruit cost range, primary resource ID |
| BUILDFORGE | `downstream_contracts.buildforge` — material IDs, upgrade cost baseline |
| ACTFORGE | `downstream_contracts.actforge` — reward resource IDs, expedition reward bands |
| ITEMFORGE | `downstream_contracts.itemforge` — craftable material IDs |
| UPGRADEFORGE | `downstream_contracts.upgradeforge` — income curve targets |
| ASSEMBLER | Full `world-economy.json` — cross-references every resource ID against downstream nodes |

---

## RELATED FILES

- `guild-engine/generator/EXTRACTPASS0.md` — Source extraction (pre-pipeline)
- `guild-engine/generator/TRANSLATEPASS.md` — Source-to-template translation (pre-pipeline)
- `guild-engine/generator/HEROFORGE.md` — Next forge in sequence (future)
- `guild-engine/generator/BUILDFORGE.md` — Third forge (future)
- `guild-engine/generator/ACTFORGE.md` — Fourth forge (exists — now reads WORLDFORGE output)
- `guild-engine/generator/ITEMFORGE.md` — Fifth forge (future)
- `guild-engine/generator/UPGRADEFORGE.md` — Sixth forge (future)
- `guild-engine/generator/ASSEMBLER.md` — Final integration forge (future)
- `guild-engine/schema/project.schema.json` — Authoritative field definitions
- `guild-engine/docs/WIKI.md` — Section 1 (Node Types), Section 19 (Economy Sim)
- `guild-engine/generator/CHANGELOG.md` — Generator version history
