# UPGRADEFORGE — AI-Assisted Progression & Meta-System Design
# Run this in Claude Code to generate the upgrade ecosystem, prestige layer, and faction reputation
# system for a Guild Engine project.
# UPGRADEFORGE is the sixth forge in the Forge Suite — reads all upstream forge outputs, feeds ASSEMBLER.
#
# Input:  guild-engine/generated/world-economy.json       (from WORLDFORGE)
#         guild-engine/generated/hero-roster.json          (from HEROFORGE)
#         guild-engine/generated/building-system.json      (from BUILDFORGE)
#         guild-engine/generated/act-*.blueprint.json      (from ACTFORGE — optional)
#         guild-engine/generated/item-ecosystem.json       (from ITEMFORGE)
#         guild-engine/generator/source-analysis.json      (from EXTRACTPASS0)
#         guild-engine/generator/world-template.json       (from TRANSLATEPASS)
#         OR: free-text GAME_PITCH if no source material
#
# Output: guild-engine/generated/upgrade-ecosystem.json   (upgrade + prestige + faction nodes + calibration)
#         guild-engine/generator/upgrade-flags.md          (design tensions for review)
#
# Schema version: 1.2.0
# Forge Suite position: 6 of 7 — reads WORLDFORGE + HEROFORGE + BUILDFORGE + ACTFORGE + ITEMFORGE, feeds ASSEMBLER

---

## Purpose

UPGRADEFORGE is not an upgrade stamper. It is a progression architect.

Its job is to answer the question that determines whether a player's second hour feels different from
their first: **when you spend this, what changes?**

Every upgrade UPGRADEFORGE generates carries three answers: what this purchase represents in the
world's fiction, what measurable impact it has on the systems the player interacts with, and whether
that impact arrives at the moment in the game when the player needs it most. UPGRADEFORGE documents
all three — in the node, in the calibration object, and in flags where the answers are in tension.

A +10% income bonus is not an upgrade. It is a number. An upgrade is the moment a player's resource
income shifts from "I am waiting" to "I can afford things." UPGRADEFORGE calibrates that moment
against WORLDFORGE's income curve, HEROFORGE's stat growth, BUILDFORGE's workflow durations,
ACTFORGE's expedition difficulty, and ITEMFORGE's equipment baselines. A +10% income bonus that
arrives at minute 15 when the player's first building costs 2,000 and they earn 480/min is a
meaningful acceleration. The same bonus at minute 90 when income is 4,800/min is noise. UPGRADEFORGE
knows the difference because it reads the full pipeline.

UPGRADEFORGE is the integration forge. By the time it runs, every content system is specified —
resources exist, heroes have stats, buildings have workflows, expeditions have difficulty curves,
items have power levels. UPGRADEFORGE draws the progression lines between them. It decides which
systems accelerate first, which systems gate others, and where the player's sense of growth comes
from at each phase of the game.

Prestige — if enabled — is the meta layer above progression. It answers a different question: **was
that entire run worth doing again?** UPGRADEFORGE designs the rebirth loop: what resets, what
persists, what currency is earned, and what permanent bonuses make the next run feel faster without
making it feel trivial. Prestige is not free content. It is a bet that the core loop is strong enough
to bear repetition. UPGRADEFORGE only generates prestige when the designer explicitly opts in.

Factions — if enabled — are the political layer. They answer: **who do I align with, and what does
that cost me?** UPGRADEFORGE generates faction nodes with reputation tiers that unlock buildings,
heroes, expeditions, and upgrades. Faction reputation is an alternative progression currency — one
earned through narrative alignment rather than resource accumulation.

Every downstream forge reads UPGRADEFORGE output. ASSEMBLER validates all cross-references, confirms
upgrade costs align with income curves, and checks that prestige resets don't create soft-locks.
UPGRADEFORGE populates the progression layer. ASSEMBLER proves it is internally coherent.

---

## Before doing anything else

Read these files in order:

1. `guild-engine/schema/project.schema.json` — upgrade, prestige, faction node fields and constraints, plus shared definitions: cost, unlock_condition, stat_block
2. `guild-engine/docs/WIKI.md` — Section 1 (Node Types), Section 10 (Upgrade Effects), Section 11 (Prestige System), Section 12 (Faction Reputation)
3. `guild-engine/generator/CHANGELOG.md` — pending upgrade/faction/prestige systems
4. `guild-engine/docs/DAY2-DEEPDIVE.md` — building upgrade system context
5. `guild-engine/docs/DAY2-EXTENDED-DEEPDIVE.md` — Forge Suite architecture, UPGRADEFORGE's role
6. `guild-engine/generator/EXTRACTPASS0.md` — what source-analysis.json contains
7. `guild-engine/generator/TRANSLATEPASS.md` — what world-template.json contains
8. `guild-engine/generated/world-economy.json` — WORLDFORGE output (required)
9. `guild-engine/generated/hero-roster.json` — HEROFORGE output (required)
10. `guild-engine/generated/building-system.json` — BUILDFORGE output (required)
11. `guild-engine/generated/item-ecosystem.json` — ITEMFORGE output (required)
12. If ACTFORGE has run: `guild-engine/generated/act-*.blueprint.json`
13. If source material exists: `guild-engine/generator/source-analysis.json`
14. If TRANSLATEPASS has run: `guild-engine/generator/world-template.json`

Pre-run schema check: verify that `guild-engine/schema/project.schema.json` includes the `upgrade`
node type with fields `cost` ($ref cost array), `max_tier`, and `effect` (object with
resource_cap_multiplier, resource_income_multiplier, hero_stat_modifier, expedition_success_bonus,
craft_speed_multiplier, loot_bonus_pct, unlock_node_ids). Also verify `prestige` node type with
`trigger_conditions[]`, `currency_id`, `currency_formula`, `resets[]`, and `bonuses[]`. Also verify
`faction` node type with `rep_tiers[]` (threshold, label, unlock_node_ids, discount_pct). If any of
these node types or fields are missing, stop and raise a flag before running UPGRADEFORGE.

Print your read status before proceeding:
```
UPGRADEFORGE reading context...
  ✓ schema/project.schema.json
  ✓ docs/WIKI.md
  ✓ generator/CHANGELOG.md
  ✓ docs/DAY2-DEEPDIVE.md
  ✓ docs/DAY2-EXTENDED-DEEPDIVE.md
  [✓ / ✗] source-analysis.json
  [✓ / ✗] world-template.json
  [✓ / ✗] generated/world-economy.json       (REQUIRED — abort if missing)
  [✓ / ✗] generated/hero-roster.json         (REQUIRED — abort if missing)
  [✓ / ✗] generated/building-system.json     (REQUIRED — abort if missing)
  [✓ / ✗] generated/item-ecosystem.json      (REQUIRED — abort if missing)
  [✓ / ✗] generated/act-*.blueprint.json     (OPTIONAL — upgrades generated without act-specific gates if absent)
```

**If `world-economy.json` does not exist, STOP.** Print:
```
UPGRADEFORGE ABORT: world-economy.json not found.
Run WORLDFORGE first: guild-engine/generator/WORLDFORGE.md
UPGRADEFORGE cannot calibrate upgrade costs without economy constraints.
```

**If `hero-roster.json` does not exist, STOP.** Print:
```
UPGRADEFORGE ABORT: hero-roster.json not found.
Run HEROFORGE first: guild-engine/generator/HEROFORGE.md
UPGRADEFORGE cannot size hero stat upgrades without stat growth baselines.
```

**If `building-system.json` does not exist, STOP.** Print:
```
UPGRADEFORGE ABORT: building-system.json not found.
Run BUILDFORGE first: guild-engine/generator/BUILDFORGE.md
UPGRADEFORGE cannot design building upgrades without building system data.
```

**If `item-ecosystem.json` does not exist, STOP.** Print:
```
UPGRADEFORGE ABORT: item-ecosystem.json not found.
Run ITEMFORGE first: guild-engine/generator/ITEMFORGE.md
UPGRADEFORGE cannot size upgrades relative to equipment power without item data.
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
SOURCE_MATERIAL:     "{{path to source-analysis.json or world-template.json, or 'none'}}"
GAME_PITCH:          "{{optional text description if no source material}}"
PRESTIGE_ENABLED:    "{{yes | no}}"
FACTION_COUNT:       "{{none | minimal (1-2 factions) | standard (3-4 factions) | extensive (5+ factions)}}"
UPGRADE_DENSITY:     "{{sparse (5-8 upgrades) | standard (10-15 upgrades) | dense (20+ upgrades)}}"
```

**Defaults if not provided:**
- PRESTIGE_ENABLED: `no` (prestige is advanced — default off for first runs)
- FACTION_COUNT: `standard`
- UPGRADE_DENSITY: `standard`

**PRESTIGE_ENABLED definitions:**
- `yes` — Generate a `prestige` node with trigger conditions, currency formula, reset list, and
  bonus list. Best for games 20hr+ or with strong replay loops. Requires careful reset design to
  avoid soft-locks.
- `no` — Skip prestige generation entirely. The game progresses through acts and building upgrades
  only. Best for short games, narrative-focused projects, or first pipeline runs where the core loop
  is being tested.

**FACTION_COUNT definitions:**
- `none` — No faction nodes generated. Reputation system unused. Upgrade unlock_conditions use
  act_reached, building_level, and resource_gte only.
- `minimal` — 1–2 factions. Simple ally/enemy dynamic. Each faction has 3 rep tiers. Minimal
  cross-faction complexity. Best for games with a clear two-sided conflict.
- `standard` — 3–4 factions. Political complexity. Each faction has 4–5 rep tiers. Cross-faction
  tensions possible. Best for games with multiple competing power structures.
- `extensive` — 5+ factions. Complex web of alliances and rivalries. Each faction has 5+ rep tiers.
  Deep faction-specific unlocks. Best for political/diplomatic games or sandbox worlds.

**UPGRADE_DENSITY definitions:**
- `sparse` — 5–8 global upgrades. Each upgrade is highly impactful. No system bloat. Best for short
  games (5–10hr) where every purchase must feel transformative. Covers only essential categories:
  economy, heroes, buildings.
- `standard` — 10–15 global upgrades. Balanced progression. Upgrades cover all major systems
  (economy, heroes, buildings, expeditions). 2–3 upgrades per category. Best for medium-length
  games (15–25hr).
- `dense` — 20+ global upgrades. Deep customization. Multiple upgrade paths per system. Utility and
  quality-of-life upgrades. Build-defining choices. Best for long games (30hr+) or games with high
  replay variance.

---

## STEP 1 — NARRATIVE ANALYSIS

Before generating any nodes, analyze the source material and all upstream forge outputs for these
five signals. Write your analysis to the console — this is the reasoning that justifies every
progression decision that follows.

### A. Upgrade Theme Discovery

Identify what "progression" means in this world's fiction. Upgrades are not just multipliers — they
represent the player's growing mastery or domain expansion within the game's world. A +10% income
upgrade in a vampire game is not "10% more gold" — it is "your hunting grounds expand" or "your
blood supply network matures."

For each upgrade category, scan the source material for signals:

- **Economic Upgrades** — What does wealth enable in this world? (larger domain, more retainers,
  better supply lines, deeper coffers, expanded territory)
- **Hero Upgrades** — How do characters grow beyond leveling? (training regimens, blood potency,
  martial mastery, arcane insight, equipment attunement)
- **Building Upgrades** — What does infrastructure improvement look like? (expansion, automation,
  specialization, efficiency, prestige architecture)
- **Expedition Upgrades** — How does exploration become more effective? (better maps, scout networks,
  veteran knowledge, ally support, improved logistics)
- **Utility Upgrades** — What quality-of-life improvements make sense? (faster travel, auto-
  collection, expanded storage, reputation visibility, expedition auto-repeat)

For each upgrade category found, write:
```
UPGRADE CATEGORY: [category]
  Source signal: "[quote or paraphrase from source material]"
  Proposed upgrades: [list 3-5 themed upgrade names]
  Fiction role: "[what this upgrade represents in the world]"
  Mechanical role: "[what gameplay system it affects — economy, stats, timing, probability]"
  Effect type: "[which schema effect field it uses]"
```

If the source material does not provide clear signals for a category, write:
```
CATEGORY GAP: [missing category]
  Source provides: [what's available]
  Recommendation: [proposed upgrades to fill the gap, with thematic justification]
  //TRANSLATE_FLAG [SEVERITY: LOW] — gap filled by inference, not source material
```

### B. Prestige Loop Design (If PRESTIGE_ENABLED: yes)

If prestige is enabled, design the rebirth loop. Prestige is the outermost progression shell — it
wraps the entire game in a repeatable cycle. The design must answer four questions:

1. **When can the player prestige?** — What trigger conditions gate availability?
2. **What do they earn?** — What currency, and how much?
3. **What do they lose?** — What resets?
4. **What do they keep?** — What bonuses persist across runs?

```
PRESTIGE LOOP:
  Trigger conditions:
    - [condition 1 — e.g., act_reached: act-3, or resource_gte: 50000]
    - [condition 2 — AND logic, all must be true]
  Currency: [resource_id for prestige currency — must exist in WORLDFORGE or be generated here]
  Formula: [JS expression for currency earned — variables: gold, act, hero_count]
  Resets: [list from enum: resources, buildings, heroes, upgrades, expeditions, factions]
  Preserves: [everything NOT in resets list]
  Bonuses: [list of purchasable permanent effects with prestige currency]
  Fiction justification: "[why does rebirth make sense in this world?]"
  Soft-lock check: "[confirm player can always reach content — expeditions accessible post-reset]"
```

**Prestige design rules:**
- `trigger_conditions[]` must be achievable within the game's expected playtime
- `resets[]` must NOT include both "expeditions" and all progression systems — the player needs at
  least one path forward after reset
- `bonuses[]` must provide enough value to make the next run noticeably faster, but not so much that
  run N+2 is trivial. Target: 20–30% faster per prestige cycle.
- The prestige currency must be defined as a `resource` node (either existing in WORLDFORGE or
  generated as a new resource node by UPGRADEFORGE with `is_material: false`)

### C. Faction Landscape Mapping (If FACTION_COUNT: not "none")

Read source material for faction analogs. Every fictional group with a distinct identity and a reason
to earn reputation becomes a faction candidate:

```
FACTION: [faction name]
  Source signal: "[quote or paraphrase from source material]"
  Fiction role: "[who they are in the world]"
  Mechanical role: "[what reputation with them gates — buildings, heroes, expeditions, upgrades]"
  Rep tiers: [N tiers — typically 3-5]
  Tier breakdown:
    Tier 1: {threshold: 0,  label: "Neutral",  unlocks: "basic vendor access",  discount: 0%}
    Tier 2: {threshold: 25, label: "Allied",   unlocks: "building X unlock",    discount: 5%}
    Tier 3: {threshold: 50, label: "Trusted",  unlocks: "hero recruitment Y",   discount: 10%}
    ...
  Starting rep: [0-100, typically 0 for neutral factions]
```

**Faction design rules:**
- Every faction must unlock at least one node (building, hero, upgrade, or expedition) across its
  rep tiers
- Rep tier thresholds must be sorted ascending and achievable within target playtime
- If the game has fewer factions than FACTION_COUNT expects, flag the gap — do not invent factions
  with no source backing

**Schema note:** The `faction` node type in schema v1.2.0 does NOT have a `relations[]` field.
Cross-faction reputation effects (e.g., "gaining Camarilla rep loses Anarch rep") are not expressible
in the schema. If the source material implies faction rivalry, document the intended relations in the
calibration object and the flags file as a design-only annotation. Do NOT add a `relations` field to
faction nodes — it will be rejected by the compiler.

### D. Upgrade Effect Sizing Audit

Read all upstream forge outputs to size upgrade effects appropriately. An upgrade that is too small
is a wasted purchase. An upgrade that is too large trivializes the content it enhances. UPGRADEFORGE
must thread the needle.

```
UPGRADE EFFECT SIZING:
  vs WORLDFORGE income curve:
    Base income: [N]/tick = [N]/min
    First upgrade cost: [N] resources
    Time to first upgrade at base income: [N] min (target: 15-20 min)
    Income upgrade effect: +[N]% → new income: [N]/min
    Time savings on next purchase: [N] min → [N] min (target: noticeable but not instant)

  vs HEROFORGE stat growth:
    Hero base ATK at level 1: [N]
    Hero ATK at level 5 (Act 1 end): [N]
    Proposed hero stat upgrade: +[N] ATK
    Upgrade as % of level-5 ATK: [N]% (target: 10-20% — meaningful but not dominant)

  vs BUILDFORGE workflow timing:
    Base workflow duration: [N] ticks
    Proposed craft speed multiplier: +[N]%
    New workflow duration: [N] ticks
    Time saved per job: [N] ticks (target: at least 1 full tick reduction)

  vs ITEMFORGE equipment stats:
    Median Act 1 weapon ATK: [N]
    Proposed hero ATK upgrade: +[N]
    Upgrade as % of median weapon power: [N]% (target: <50% — upgrades supplement, not replace gear)

  vs ACTFORGE expedition difficulty:
    Act 1 expedition level: [N]
    Party power needed for CLEAN_SUCCESS: [N]
    Proposed success bonus: +[N]
    Success tier shift: [old tier] → [new tier] (target: shift one tier at most)
```

**Effect sizing rule:** No single upgrade should move a player more than one outcome tier (e.g., from
NARROW_SUCCESS to CLEAN_SUCCESS). Tier-skipping upgrades make mid-tier content feel pointless.

### E. Translation Flags

Surface contradictions between source material and standard upgrade/faction/prestige mechanics:

```
//TRANSLATE_FLAG [SEVERITY: LOW | MEDIUM | HIGH]
TENSION: "[What the source says about progression, power, reputation, or rebirth]"
CONFLICT: "[What standard upgrade/faction/prestige mechanics would do by default]"
OPTIONS:
  A) [Option that honors source intent — may require unusual upgrade design]
  B) [Option that honors game mechanics — may simplify source intent]
  C) [Compromise option if available]
DESIGNER DECISION REQUIRED: [Yes/No]
```

**Flag triggers (mandatory):**
- Source treats power as intrinsic (character growth, enlightenment) but upgrades are extrinsic
  (purchased multipliers) — tension between fiction and mechanics
- Source factions are narrative-only (political groups, no mechanical reputation) but the game needs
  rep tiers with unlock gates
- Source has no rebirth/prestige/reincarnation concept but PRESTIGE_ENABLED is yes
- Source progression is linear (one path, no branching) but UPGRADE_DENSITY suggests multiple
  upgrade paths
- Source factions are monolithic (unified groups with no internal hierarchy) but faction nodes
  require rep_tiers[] with graduated thresholds
- Source treats all factions as hostile to each other (no neutral parties) but the game needs at
  least some faction access from the start
- Source implies faction-locked content that exceeds what the schema can express (faction-specific
  abilities, faction-exclusive items without using unlock_node_ids gates)
- Upgrade effect types in the schema do not cover a progression concept from the source material
  (e.g., source has "morale" but schema has no morale stat)

---

## STEP 2 — CALIBRATION TABLES

Use these tables to calculate defensible values for every upgrade, prestige, and faction node. Do not
estimate. Show the math for every value that has a calculation behind it.

### Table A — Upgrade Count by Density

| Density | Economy | Hero | Building | Expedition | Utility | Total |
|---|---|---|---|---|---|---|
| `sparse` (5–8) | 1–2 | 1–2 | 1–2 | 1 | 0–1 | 5–8 |
| `standard` (10–15) | 2–3 | 2–3 | 2–3 | 2 | 1–2 | 10–15 |
| `dense` (20+) | 4–5 | 4–5 | 4–5 | 3–4 | 3–4 | 20–25 |

**Upgrade category → effect type mapping:**

| Category | Effect Type | Schema Field |
|---|---|---|
| Economy — Income | `resource_income_multiplier` | `effect.resource_income_multiplier` ($ref stat_block) |
| Economy — Cap | `resource_cap_multiplier` | `effect.resource_cap_multiplier` ($ref stat_block) |
| Hero — Stat | `hero_stat_modifier` | `effect.hero_stat_modifier` ($ref stat_block) |
| Building — Speed | `craft_speed_multiplier` | `effect.craft_speed_multiplier` (number) |
| Expedition — Success | `expedition_success_bonus` | `effect.expedition_success_bonus` (number) |
| Expedition — Loot | `loot_bonus_pct` | `effect.loot_bonus_pct` (number) |
| Utility — Unlock | `unlock_node_ids` | `effect.unlock_node_ids` (array of strings) |

**Schema note:** The `effect` object in schema v1.2.0 allows multiple properties simultaneously, but
UPGRADEFORGE should use exactly one effect type per upgrade node for clarity. An upgrade that boosts
both income and hero stats is two separate upgrade nodes, not one node with two effects.

**Schema note:** `resource_cap_multiplier`, `resource_income_multiplier`, and `hero_stat_modifier`
all use the `stat_block` $ref — a flat key-value map of stat name to numeric modifier. For resource
effects, the key is the resource ID. For hero stat effects, the key is the stat name (attack,
defense, speed, hp, luck).

Examples:
```json
"effect": { "resource_income_multiplier": { "resource-blood": 0.10 } }
"effect": { "hero_stat_modifier": { "attack": 5, "defense": 3 } }
"effect": { "expedition_success_bonus": 0.05 }
"effect": { "craft_speed_multiplier": 0.10 }
```

### Table B — Upgrade Cost Curve

Upgrade costs must scale with player income growth. Read WORLDFORGE's
`downstream_contracts.heroforge.first_recruit_cost` and income curve data to anchor the cost ladder.

| Upgrade Tier | Cost Multiplier (vs Tier 1 base) | Target Time at Base Income | Design Intent |
|---|---|---|---|
| Tier 1 (Act 1) | ×1.0 | 15–20 min | First meaningful purchase — player feels acceleration |
| Tier 2 (Act 1–2) | ×2.5–3.0 | 40–60 min | Requires income upgrades or expedition loot |
| Tier 3 (Act 2) | ×6.0–8.0 | 90–120 min | Mid-game investment — deliberate saving required |
| Tier 4 (Act 2–3) | ×15.0–20.0 | 180–240 min | Late mid-game — multiple income sources needed |
| Tier 5 (Act 3+) | ×40.0–50.0 | 360+ min | Endgame completion target |

**Cost anchor formula:**
```
tier_1_base_cost = WORLDFORGE.downstream_contracts.heroforge.first_recruit_cost × 1.5
```
This anchors the first upgrade slightly above the first hero recruitment cost, ensuring the player
recruits a hero before buying their first upgrade. The first upgrade should feel like the second
major purchase, not the first.

**Show your math for every upgrade:**
```
UPGRADE COST: Blood Potency I (hero_stat_modifier: attack +5)
  WORLDFORGE first_recruit_cost: 5,000 Blood
  Tier 1 base: 5,000 × 1.5 = 7,500 Blood
  Tier: 1 (Act 1)
  Cost: 7,500 × 1.0 = 7,500 Blood
  Base income: 2/tick = 480/min
  Time to afford: 7,500 / 480 = 15.6 min ✓ (target: 15-20 min)
```

**Multi-tier cost scaling:**
For upgrades with `max_tier > 1`, each tier costs more than the last. Use this per-tier multiplier:

| Tier | Per-tier Cost Multiplier |
|---|---|
| Tier 1 (of N) | ×1.0 |
| Tier 2 (of N) | ×2.0 |
| Tier 3 (of N) | ×4.0 |
| Tier 4 (of N) | ×8.0 |
| Tier 5 (of N) | ×16.0 |

**Schema note:** The `cost` field on upgrade nodes is `$ref cost` — an array of
`{ "resource_id": string, "amount": number }` objects. Multi-resource costs are possible (e.g.,
an upgrade costing both Blood and Influence). For multi-tier upgrades, the `cost` array represents
the cost of the FIRST tier. The engine multiplies by the per-tier scaling factor for subsequent
tiers. Document the per-tier cost externally in the calibration object.

### Table C — Upgrade Effect Sizing

Effects must be meaningful but not build-breaking. These bounds are calibrated against typical
upstream forge baselines.

| Effect Type | Tier 1 | Tier 2 | Tier 3 | Tier 4 | Tier 5 |
|---|---|---|---|---|---|
| `resource_income_multiplier` | +10% (0.10) | +15% (0.15) | +20% (0.20) | +25% (0.25) | +30% (0.30) |
| `resource_cap_multiplier` | +20% (0.20) | +30% (0.30) | +40% (0.40) | +50% (0.50) | +75% (0.75) |
| `hero_stat_modifier` (add) | +3–5 | +6–8 | +10–12 | +15–18 | +20–25 |
| `craft_speed_multiplier` | +10% (0.10) | +15% (0.15) | +20% (0.20) | +25% (0.25) | +30% (0.30) |
| `expedition_success_bonus` | +0.05 | +0.08 | +0.12 | +0.15 | +0.20 |
| `loot_bonus_pct` | +5% (0.05) | +8% (0.08) | +12% (0.12) | +15% (0.15) | +20% (0.20) |

**Stacking rules:**
- `resource_income_multiplier` and `resource_cap_multiplier` stack multiplicatively per the engine:
  `final = base × (1 + upgrade_1) × (1 + upgrade_2) × ...`
- `hero_stat_modifier` stacks additively — each upgrade adds flat stat points. The engine re-syncs
  hero stats on purchase.
- `expedition_success_bonus` stacks additively — adds to the DPS check formula.
- `craft_speed_multiplier` stacks multiplicatively.
- `loot_bonus_pct` stacks additively — adds to loot bonus pool.

**Maximum sensible stacking:** Total stacked multiplier for any stat should not exceed ×5 of base
value. Beyond this, content becomes trivial. With three income upgrades at +10%, +15%, +20%:
`1.10 × 1.15 × 1.20 = 1.518×` — well within bounds.

**Show your math for every effect:**
```
EFFECT SIZING: Blood Potency I (hero_stat_modifier)
  Hero base ATK (HEROFORGE median): 12
  Hero ATK at level 5 (Act 1 end): 12 + (5 × 2) = 22
  Proposed effect: { "attack": 5 }
  Effect as % of level-5 ATK: 5/22 = 22.7%
  Within Tier 1 bounds (+3-5)? Yes ✓
  Within 10-20% target? Slightly above — acceptable for Tier 1. ✓

  Check vs ITEMFORGE: Median Act 1 weapon ATK = 8
  Upgrade as % of median weapon: 5/8 = 62.5%
  //WARNING: Upgrade exceeds 50% of weapon power. Recommend reducing to +3.
  Revised: { "attack": 3 } → 3/8 = 37.5% ✓
```

### Table D — Prestige Currency Formula (If PRESTIGE_ENABLED: yes)

The prestige currency formula determines how much meta-currency the player earns per run. It must
reward deep runs without making short runs worthless.

| Formula Component | Variable | Typical Coefficient | Notes |
|---|---|---|---|
| Act completion | `act` | 100–500 per act | Primary reward — scales with progression depth |
| Resources banked | `gold` (primary resource) | 0.01–0.05 per unit | Rewards hoarding — but diminishing returns |
| Heroes recruited | `hero_count` | 10–50 per hero | Rewards roster building |

**Example formula:**
```
prestige_currency = floor((act * 250) + (gold / 50) + (hero_count * 25))
```

**Formula validation:**
```
PRESTIGE FORMULA CHECK:
  Run 1 (Act 3 complete, 50000 gold, 8 heroes):
    (3 × 250) + (50000 / 50) + (8 × 25) = 750 + 1000 + 200 = 1,950 prestige currency
  Run 2 (Act 3 complete, 100000 gold, 12 heroes):
    (3 × 250) + (100000 / 50) + (12 × 25) = 750 + 2000 + 300 = 3,050 prestige currency
  Run 2 with bonuses (20% faster = more gold/heroes):
    Estimated: ~3,500 prestige currency

  Cheapest bonus: 100 prestige currency
  Most expensive bonus: 5,000 prestige currency
  Runs needed for cheapest bonus: 1 (from first prestige)
  Runs needed for most expensive: 2-3 runs ✓ (target: 2-5 runs)
```

**Schema note:** The `currency_formula` field is a JS expression string. Available variables per
schema: `gold`, `act`, `hero_count`. The formula evaluator is sandboxed — only these variables and
standard math operations (floor, ceil, max, min, +, -, *, /) are allowed.

**Schema note:** `currency_formula` is OPTIONAL in schema v1.2.0. If omitted, the engine uses a
default formula. UPGRADEFORGE should always provide a formula for explicit calibration, but this is
a design choice, not a schema requirement.

### Table E — Prestige Reset Configuration (If PRESTIGE_ENABLED: yes)

Define what resets and what persists. The `resets[]` array on the prestige node uses an enum of
category strings.

| System | Reset Enum Value | Recommended Default | Soft-lock Risk | Notes |
|---|---|---|---|---|
| Resources | `"resources"` | Yes (reset) | Low | Core prestige tension — rebuilding the economy |
| Buildings | `"buildings"` | Yes (reset) | Medium | Must be paired with expeditions preserved |
| Heroes | `"heroes"` | Yes (reset) | Medium | Re-recruit loop — but starter hero must be accessible |
| Upgrades | `"upgrades"` | Yes (reset) | Low | Re-purchase loop — prestige bonuses replace upgrades |
| Expeditions | `"expeditions"` | No (preserve) | HIGH if reset | **Never reset expeditions if buildings reset** |
| Factions | `"factions"` | No (preserve) | Medium | Depends on faction design — losing rep is punishing |

**Schema note:** The `resets[]` field is OPTIONAL in schema v1.2.0 — an array of enum values:
`"resources"`, `"buildings"`, `"heroes"`, `"upgrades"`, `"expeditions"`, `"factions"`. Categories
not listed in the array carry over through prestige. If `resets[]` is omitted entirely, nothing
resets (which is not a prestige — flag this as an error).

**Critical soft-lock rules:**
- If `"buildings"` is in resets, `"expeditions"` MUST NOT be in resets. Otherwise, the player has no
  buildings AND no expeditions — they cannot earn resources or progress.
- If `"heroes"` is in resets, there must be a hero recruitment path that does not require buildings
  (e.g., Act 1 starter hero is free, or `recruit_cost` uses a resource that has base_income > 0).
- If `"upgrades"` is in resets, prestige bonuses must compensate — the player should reach their
  previous upgrade state faster each prestige cycle.

### Table F — Prestige Bonus Design (If PRESTIGE_ENABLED: yes)

Prestige bonuses are permanent purchases using the prestige currency. Each bonus is an entry in
the `bonuses[]` array on the prestige node.

| Bonus Type | Cost Scaling | Effect (stat_block) | Max Tiers | Notes |
|---|---|---|---|---|
| Income multiplier | Linear (100, 200, 300…) | `{ "income_multiplier": 0.05 }` | 10 | +5% per stack |
| Cap multiplier | Linear (150, 300, 450…) | `{ "cap_multiplier": 0.10 }` | 5 | +10% per stack |
| Starting resource | Linear (200, 400, 600…) | `{ "starting_resource": N }` | 5 | Begin run with N resources |
| Unlock accelerator | Fixed (500 each) | `{ "unlock_accelerator": 1 }` | 1 per node | Start with specific building/hero |
| Loot bonus | Exponential (1000, 2500, 5000…) | `{ "loot_bonus": 0.01 }` | 5 | +1% rare drop per stack |

**Schema note:** Prestige bonus `effect` is `$ref stat_block` — a flat key-value map. The stat names
used in the bonus effect are engine-interpreted (income_multiplier, cap_multiplier, etc.). These are
the same stat names the engine recognizes for prestige bonus processing. Use these exact keys.

**Schema note:** Prestige bonus `cost` is a simple number (prestige currency cost per tier), NOT an
array of resource costs like upgrade nodes. The prestige currency is implied by the prestige node's
`currency_id`.

**Prestige bonus structure (schema-compliant):**
```json
{
  "id": "bonus-income-boost",
  "label": "Blood Flow Enhancement",
  "max_tier": 10,
  "cost": 100,
  "effect": { "income_multiplier": 0.05 }
}
```

**Bonus design rules:**
- Total prestige bonus value across all stacks should make run N+1 approximately 20–30% faster than
  run N at the same prestige currency investment
- No single bonus should exceed the effect of the strongest in-run upgrade. Prestige bonuses are
  accelerators, not replacements for in-run progression.
- At least one bonus should be affordable from a single prestige run (cost ≤ minimum expected
  currency from first prestige)

### Table G — Faction Rep Tier Calibration (If FACTION_COUNT: not "none")

Each faction has 3–5+ reputation tiers, depending on FACTION_COUNT setting.

| Tier | Threshold | Label Template | Typical Unlocks | Discount |
|---|---|---|---|---|
| 1 | 0 | Neutral / Unknown | Basic vendor access | 0% |
| 2 | 25 | Allied / Friendly | Building unlock via unlock_node_ids | 5% |
| 3 | 50 | Trusted / Respected | Hero class recruitment via unlock_node_ids | 10% |
| 4 | 75 | Honored / Esteemed | Upgrade access via unlock_node_ids | 15% |
| 5 | 100 | Exalted / Champion | Unique expedition or prestige content | 20% |

**Rep gain rate calibration:**
- Passive rep gain (idle): 1–2 rep per real-time hour (if faction has passive rep generation)
- Expedition completion: 5–15 rep per run (via `faction_rewards[]` on expedition nodes)
- Faction-specific events: 20–50 rep per event choice (via `faction_rep_delta` on event choices)
- Total time to max rep (threshold 100): 8–15 hours per faction at standard play

**Show your math:**
```
FACTION REP PACING: The Camarilla (standard, 5 tiers, threshold 100)
  Rep sources:
    Expedition (3 runs/hour × 10 rep/run): 30 rep/hour
    Events (1 event/2 hours × 25 rep/event): 12.5 rep/hour
    Total: ~42.5 rep/hour
  Time to Tier 2 (threshold 25): 25/42.5 = 0.59 hours ≈ 35 min ✓ (target: < 1 hour)
  Time to Tier 3 (threshold 50): 50/42.5 = 1.18 hours ≈ 71 min ✓
  Time to Tier 5 (threshold 100): 100/42.5 = 2.35 hours — too fast.
  
  Adjust: Reduce expedition rep to 5/run → 15 rep/hour + 12.5 events = 27.5 rep/hour
  Time to Tier 5: 100/27.5 = 3.64 hours — still fast for standard play.
  
  Consider non-linear rep gain: early tiers easy, later tiers harder.
  Threshold adjustment: Tier 4 at 200, Tier 5 at 400?
  
  Or: keep thresholds at schema-recommended values (0, 25, 50, 75, 100) and pace rep gain
  sources to hit 8-15 hour target. Rep/run: 3-5, events: 10-20.
  At 3 rep/run × 3 runs/hour = 9/hour + 10/event × 0.5/hour = 14 rep/hour.
  Time to Tier 5: 100/14 = 7.14 hours ✓ (target: 8-15 hours — close, acceptable)
```

**Discount cap rule:** Faction discounts MUST NOT exceed 20% at any tier. Discounts above 20% break
vendor economy pricing. If the source material implies stronger faction benefits, use `unlock_node_ids`
to gate content access rather than increasing discount_pct.

### Table H — Faction Relation Annotations (Design-only)

If multiple factions exist and the source material implies cross-faction dynamics, document the
intended relations. These are NOT written to faction nodes (the schema has no `relations[]` field)
but are recorded in the calibration object for designer reference and potential future schema
extension.

| Faction A | Faction B | Relation | Intended Mechanical Effect |
|---|---|---|---|
| Template — Allied | Template — Allied | allied | Rep gains for A grant 50% bonus rep for B |
| Template — Hostile | Template — Hostile | hostile | Rep gains for A reduce rep for B by 25% |
| Template — Enemy | Template — Enemy | enemy | Cannot reach Tier 4+ with both simultaneously |

**Implementation note:** Cross-faction rep effects require event node design or custom runtime logic.
UPGRADEFORGE cannot express these in faction nodes alone. Document the intended relations in the
calibration object. The designer implements cross-faction dynamics through event nodes with
`faction_rep_delta` outcomes, or accepts that factions are independent reputation tracks.

---

## STEP 3 — GENERATION RULES

### A. Upgrade Node Structure

Every generated `upgrade` node must use this exact structure, validated against
`schema/project.schema.json` v1.2.0:

**Single-tier upgrade (one-time purchase):**
```json
{
  "id": "upgrade-{slug}",
  "type": "upgrade",
  "label": "{Human-readable name}",
  "description": "{One sentence: fiction + function}",
  "icon": "{emoji}",
  "cost": [
    {
      "resource_id": "{resource_id from WORLDFORGE}",
      "amount": 7500
    }
  ],
  "max_tier": 1,
  "effect": {
    "resource_income_multiplier": {
      "{resource_id}": 0.10
    }
  },
  "unlock_conditions": [],
  "canvas_pos": { "x": 900, "y": 50 },
  "connections": []
}
```

**Multi-tier upgrade (tiered purchase):**
```json
{
  "id": "upgrade-{slug}",
  "type": "upgrade",
  "label": "{Human-readable name}",
  "description": "{One sentence: fiction + function}",
  "icon": "{emoji}",
  "cost": [
    {
      "resource_id": "{resource_id from WORLDFORGE}",
      "amount": 7500
    }
  ],
  "max_tier": 5,
  "effect": {
    "hero_stat_modifier": {
      "attack": 5
    }
  },
  "unlock_conditions": [
    {
      "type": "act_reached",
      "target_id": "act-1",
      "value": 1
    }
  ],
  "canvas_pos": { "x": 900, "y": 200 },
  "connections": []
}
```

**Unlock-type upgrade (utility):**
```json
{
  "id": "upgrade-{slug}",
  "type": "upgrade",
  "label": "{Human-readable name}",
  "description": "{One sentence: what it unlocks and why}",
  "icon": "{emoji}",
  "cost": [
    {
      "resource_id": "{resource_id from WORLDFORGE}",
      "amount": 15000
    }
  ],
  "max_tier": 1,
  "effect": {
    "unlock_node_ids": ["building-{slug}", "expedition-{slug}"]
  },
  "unlock_conditions": [
    {
      "type": "building_level",
      "target_id": "building-{slug}",
      "value": 3
    }
  ],
  "canvas_pos": { "x": 900, "y": 650 },
  "connections": []
}
```

**Upgrade field rules:**

| Field | Required | Type | Notes |
|---|---|---|---|
| `id` | Yes | string | Slug format: `upgrade-{slug}` |
| `type` | Yes | const | `"upgrade"` |
| `label` | Yes | string | Human-readable name |
| `cost` | Yes | $ref cost | Array of `{ resource_id, amount }` |
| `effect` | Yes | object | Exactly one effect property populated |
| `description` | No | string | One sentence: fiction + function |
| `icon` | No | string | Emoji |
| `max_tier` | No | integer | Default 1. 1 = one-time. >1 = tiered. |
| `unlock_conditions` | No | array | $ref unlock_condition entries |
| `canvas_pos` | No | $ref canvas_position | x: 800–1000 range |
| `connections` | No | array | IDs of nodes this upgrade affects |

### B. Prestige Node Structure (If PRESTIGE_ENABLED: yes)

Generate exactly one `prestige` node:

```json
{
  "id": "prestige-{project-slug}",
  "type": "prestige",
  "label": "{Human-readable prestige name}",
  "description": "{One sentence: what rebirth means in this world}",
  "trigger_conditions": [
    {
      "type": "act_reached",
      "target_id": "act-3",
      "value": 1
    }
  ],
  "currency_id": "resource-{prestige-currency-slug}",
  "currency_formula": "floor((act * 250) + (gold / 50) + (hero_count * 25))",
  "resets": [
    "resources",
    "buildings",
    "heroes",
    "upgrades"
  ],
  "bonuses": [
    {
      "id": "bonus-{slug}",
      "label": "{Human-readable bonus name}",
      "max_tier": 10,
      "cost": 100,
      "effect": { "income_multiplier": 0.05 }
    }
  ],
  "canvas_pos": { "x": 1150, "y": 50 },
  "connections": []
}
```

**Prestige field rules:**

| Field | Required | Type | Notes |
|---|---|---|---|
| `id` | Yes | string | Slug format: `prestige-{slug}` |
| `type` | Yes | const | `"prestige"` |
| `label` | Yes | string | Human-readable name |
| `trigger_conditions` | Yes | array | $ref unlock_condition, minItems 1 |
| `currency_id` | Yes | string | References a resource node ID |
| `bonuses` | Yes | array | Purchasable bonus definitions |
| `description` | No | string | One sentence: fiction + function |
| `currency_formula` | No | string | JS expression: `gold`, `act`, `hero_count` |
| `resets` | No | array | Enum: resources, buildings, heroes, upgrades, expeditions, factions |
| `canvas_pos` | No | $ref canvas_position | x: 1100–1200 range |
| `connections` | No | array | Resource and act node IDs |

**Prestige bonus field rules:**

| Field | Required | Type | Notes |
|---|---|---|---|
| `id` | Yes | string | Slug format: `bonus-{slug}` |
| `label` | Yes | string | Human-readable name |
| `cost` | Yes | number | Prestige currency cost per tier (simple number, NOT array) |
| `effect` | Yes | $ref stat_block | Flat key-value: `{ "stat_name": value }` |
| `max_tier` | No | integer | Default 1. Stackable bonuses use max_tier > 1. |

### C. Faction Node Structure (If FACTION_COUNT: not "none")

Generate one `faction` node per faction:

```json
{
  "id": "faction-{slug}",
  "type": "faction",
  "label": "{Faction name}",
  "description": "{One sentence: faction identity and what they offer}",
  "icon": "{emoji}",
  "starting_rep": 0,
  "rep_tiers": [
    {
      "threshold": 0,
      "label": "Neutral",
      "unlock_node_ids": [],
      "discount_pct": 0
    },
    {
      "threshold": 25,
      "label": "Allied",
      "unlock_node_ids": ["building-{slug}"],
      "discount_pct": 5
    },
    {
      "threshold": 50,
      "label": "Trusted",
      "unlock_node_ids": ["hero-class-{slug}"],
      "discount_pct": 10
    },
    {
      "threshold": 75,
      "label": "Honored",
      "unlock_node_ids": ["upgrade-{slug}"],
      "discount_pct": 15
    },
    {
      "threshold": 100,
      "label": "Exalted",
      "unlock_node_ids": ["expedition-{slug}"],
      "discount_pct": 20
    }
  ],
  "canvas_pos": { "x": 675, "y": 50 },
  "connections": []
}
```

**Faction field rules:**

| Field | Required | Type | Notes |
|---|---|---|---|
| `id` | Yes | string | Slug format: `faction-{slug}` |
| `type` | Yes | const | `"faction"` |
| `label` | Yes | string | Human-readable name |
| `rep_tiers` | Yes | array | Sorted by threshold ascending |
| `description` | No | string | One sentence: faction identity |
| `icon` | No | string | Emoji |
| `starting_rep` | No | number | Default 0 |
| `canvas_pos` | No | $ref canvas_position | x: 600–750 range |
| `connections` | No | array | Event, building, upgrade node IDs |

**Rep tier field rules:**

| Field | Required | Type | Notes |
|---|---|---|---|
| `threshold` | Yes | number | Minimum rep to reach this tier |
| `label` | Yes | string | Tier name (Neutral, Honored, etc.) |
| `unlock_node_ids` | No | array | Node IDs made visible at this tier |
| `discount_pct` | No | number | Cost discount on faction-linked items (max 20) |

### D. Canvas Layout Algorithm

Position upgrade-system nodes using three columns with internal grouping by category.

```
Factions Column        Upgrades Column          Prestige Column
x: 600–750            x: 800–1000              x: 1100–1200

Faction 1 (y: 50)     Economy Upgrades:         Prestige Node (y: 50)
Faction 2 (y: 200)      Upgrade 1 (y: 50)
Faction 3 (y: 350)      Upgrade 2 (y: 200)
Faction 4 (y: 500)    --- (50px gap) ---
...                    Hero Upgrades:
                         Upgrade 3 (y: 400)
                         Upgrade 4 (y: 550)
                       --- (50px gap) ---
                       Building Upgrades:
                         Upgrade 5 (y: 750)
                       --- (50px gap) ---
                       Expedition Upgrades:
                         Upgrade 6 (y: 950)
                       --- (50px gap) ---
                       Utility Upgrades:
                         Upgrade 7 (y: 1150)
```

**Layout rules:**
- Factions: x = 675 (centered in 600–750 range), stacked with 150px vertical spacing
- Upgrades: x = 900 (centered in 800–1000 range), stacked with 150px spacing within categories,
  50px extra gap between categories
- Prestige: x = 1150 (centered in 1100–1200 range), single node at y: 50
- Within upgrade categories, sort by cost (cheapest at top)

### E. The upgrade-ecosystem.json Output Format

```json
{
  "schema_version": "1.2.0",
  "upgradeforge_version": "1.0.0",
  "generated_at": "{ISO timestamp}",
  "meta": {
    "project_name": "{from WORLDFORGE meta or source material}",
    "upgrade_density": "{sparse | standard | dense}",
    "prestige_enabled": true,
    "faction_count": "{none | minimal | standard | extensive}",
    "source_material": "{path or 'pitch'}",
    "worldforge_input": "{path to world-economy.json}",
    "heroforge_input": "{path to hero-roster.json}",
    "buildforge_input": "{path to building-system.json}",
    "actforge_inputs": "{paths or 'none'}",
    "itemforge_input": "{path to item-ecosystem.json}",
    "designer_notes": "{brief summary of the progression design philosophy}"
  },
  "nodes": [
    // All upgrade nodes
    // Prestige node (if enabled)
    // All faction nodes (if any)
  ],
  "upgrade_calibration": {
    "cost_curve": {
      "tier_1_base_cost": 0,
      "cost_anchor_source": "{how tier 1 base was calculated}",
      "upgrades": [
        {
          "upgrade_id": "{id}",
          "tier": 1,
          "cost_amount": 0,
          "cost_resource": "{resource_id}",
          "time_to_afford_min": 0,
          "within_target": true
        }
      ]
    },
    "effect_sizing": [
      {
        "upgrade_id": "{id}",
        "effect_type": "{field name}",
        "effect_value": 0,
        "vs_heroforge_baseline": "{comparison}",
        "vs_itemforge_baseline": "{comparison}",
        "vs_worldforge_income": "{comparison}",
        "within_bounds": true
      }
    ],
    "stacking_analysis": {
      "max_income_multiplier": 0,
      "max_cap_multiplier": 0,
      "max_hero_stat_addition": 0,
      "max_success_bonus": 0,
      "max_craft_speed": 0,
      "max_loot_bonus": 0,
      "any_exceeds_5x": false
    }
  },
  "prestige_calibration": {
    "enabled": true,
    "currency_id": "{resource_id}",
    "formula": "{JS expression}",
    "formula_validation": {
      "run_1_estimate": 0,
      "run_2_estimate": 0,
      "run_3_estimate": 0,
      "currency_per_hour_estimate": 0
    },
    "reset_impact": {
      "resets": [],
      "preserves": [],
      "soft_lock_check": "PASS",
      "recovery_path": "{how player rebuilds after reset}"
    },
    "bonus_audit": [
      {
        "bonus_id": "{id}",
        "cost_per_tier": 0,
        "max_tier": 0,
        "total_cost_all_tiers": 0,
        "runs_to_max": 0,
        "total_effect_at_max": "{description}",
        "within_bounds": true
      }
    ]
  },
  "faction_calibration": {
    "faction_count": 0,
    "factions": [
      {
        "faction_id": "{id}",
        "tier_count": 0,
        "max_threshold": 0,
        "estimated_time_to_max_hours": 0,
        "unlocks_count": 0,
        "max_discount_pct": 0,
        "within_pacing_target": true
      }
    ],
    "intended_relations": [
      {
        "faction_a": "{id}",
        "faction_b": "{id}",
        "relation": "allied | hostile | enemy",
        "intended_effect": "{description — NOT in schema, design annotation only}",
        "implementation_note": "Requires event nodes with faction_rep_delta outcomes"
      }
    ]
  },
  "flags": [
    {
      "id": "flag-{n}",
      "severity": "low | medium | high",
      "tension": "{what the source implies}",
      "conflict": "{what the upgrade/faction/prestige system would do by default}",
      "options": ["A) ...", "B) ...", "C) ..."],
      "default_applied": "{which option UPGRADEFORGE used}",
      "designer_decision_required": true
    }
  ],
  "downstream_contracts": {
    "assembler": {
      "all_upgrade_ids": ["{id}"],
      "all_faction_ids": ["{id}"],
      "prestige_id": "{id or null}",
      "prestige_currency_id": "{resource_id or null}",
      "upgrade_cost_resource_ids": ["{resource_id}"],
      "faction_unlock_node_ids": ["{id}"],
      "upgrade_unlock_node_ids": ["{id}"],
      "note": "ASSEMBLER validates all cross-references: cost resource_ids exist in WORLDFORGE, unlock_node_ids exist in upstream forges, prestige currency_id is a valid resource."
    }
  }
}
```

### F. Edges

UPGRADEFORGE does not generate edges between nodes — edges are drawn in the editor after all forges
have run, or by the auto-rig system. Do not add an `edges` array to upgrade-ecosystem.json.

However, UPGRADEFORGE must document the intended edge connections in the calibration object so the
designer (or auto-rig) knows what to wire:

```
INTENDED CONNECTIONS:
  upgrade-blood-potency → hero-class-brujah        (enhances)
  upgrade-income-boost  → resource-blood            (multiplies income)
  upgrade-craft-speed   → building-forge            (speeds workflows)
  faction-camarilla     → building-elysium          (gates access at Tier 2)
  faction-camarilla     → upgrade-political-favor   (gates access at Tier 4)
  prestige-rebirth      → resource-soul-shards      (produces currency)
  prestige-rebirth      → act-3                     (trigger gate)
```

---

## STEP 4 — SCHEMA COMPLIANCE

Before generating any node, verify against the authoritative schema at
`guild-engine/schema/project.schema.json` v1.2.0.

### Upgrade node required fields:
- `id` (string) — slug format, prefix `upgrade-`
- `type` (const: `"upgrade"`)
- `label` (string)
- `cost` ($ref cost — array of `{ "resource_id": string, "amount": number }`)
- `effect` (object — one or more of: `resource_cap_multiplier`, `resource_income_multiplier`,
  `hero_stat_modifier`, `expedition_success_bonus`, `craft_speed_multiplier`, `loot_bonus_pct`,
  `unlock_node_ids`)

### Upgrade node optional fields:
- `description` (string)
- `icon` (string — emoji)
- `max_tier` (integer, minimum: 1, default: 1)
- `unlock_conditions` (array of $ref unlock_condition)
- `canvas_pos` ($ref canvas_position)
- `connections` (array of strings)

### Prestige node required fields:
- `id` (string) — slug format, prefix `prestige-`
- `type` (const: `"prestige"`)
- `label` (string)
- `trigger_conditions` (array of $ref unlock_condition, minItems: 1)
- `currency_id` (string — references a resource node ID)
- `bonuses` (array of bonus objects, each with required: `id`, `label`, `cost`, `effect`)

### Prestige node optional fields:
- `description` (string)
- `currency_formula` (string — JS expression with variables: `gold`, `act`, `hero_count`)
- `resets` (array of enum: `"resources"`, `"buildings"`, `"heroes"`, `"upgrades"`, `"expeditions"`,
  `"factions"`)
- `canvas_pos` ($ref canvas_position)
- `connections` (array of strings)

### Prestige bonus required fields:
- `id` (string) — slug format, prefix `bonus-`
- `label` (string)
- `cost` (number — prestige currency cost per tier, NOT an array)
- `effect` ($ref stat_block — flat key-value map)

### Prestige bonus optional fields:
- `max_tier` (integer, minimum: 1, default: 1)

### Faction node required fields:
- `id` (string) — slug format, prefix `faction-`
- `type` (const: `"faction"`)
- `label` (string)
- `rep_tiers` (array of rep tier objects — sorted by threshold ascending)

### Faction node optional fields:
- `description` (string)
- `icon` (string — emoji)
- `starting_rep` (number, default: 0)
- `canvas_pos` ($ref canvas_position)
- `connections` (array of strings)

### Rep tier required fields:
- `threshold` (number — minimum rep value for this tier)
- `label` (string — tier name)

### Rep tier optional fields:
- `unlock_node_ids` (array of strings — node IDs made visible at this tier)
- `discount_pct` (number — cost discount percentage, max 20)

### unlock_condition fields:
- `type` (required, enum: `"resource_gte"`, `"building_level"`, `"act_reached"`,
  `"faction_rep_gte"`, `"upgrade_owned"`, `"hero_count_gte"`, `"prestige_count_gte"`)
- `target_id` (string — references a node ID)
- `value` (number)

**Do NOT add fields not in the schema.** No `relations[]` on faction nodes. No custom bonus
properties on prestige bonuses. No ad-hoc extensions. If a design decision needs a field that does
not exist, write a `//TRANSLATE_FLAG` and document the intended behavior in the calibration object.

---

## STEP 5 — PIPELINE INTEGRATION

### What UPGRADEFORGE Reads

| Source | Field | Purpose |
|---|---|---|
| `world-economy.json` | Resource IDs, primary resource | Cost reference for upgrade pricing |
| `world-economy.json` | `downstream_contracts.heroforge.first_recruit_cost` | Cost anchor for upgrade tier ladder |
| `world-economy.json` | `economy_calibration.income_curves` | Timing validation for cost curve |
| `world-economy.json` | `downstream_contracts` target multipliers | Hour-5, hour-10 progression targets |
| `hero-roster.json` | `roster_calibration.stat_growth` | Baseline for hero stat upgrade sizing |
| `hero-roster.json` | Hero class count | Network size for upgrade coverage |
| `building-system.json` | Building IDs, workflow durations | Baseline for craft speed upgrade sizing |
| `building-system.json` | `downstream_contracts.upgradeforge` | Building upgrade IDs, max levels, cost curves |
| `item-ecosystem.json` | `downstream_contracts.upgradeforge` | Equipment stat baselines, rarity ceiling, max item stat |
| `item-ecosystem.json` | Item count, loot table count | Network size for loot bonus calibration |
| `act-*.blueprint.json` | Act count, expedition levels | Progression tier anchors for unlock conditions |
| `act-*.blueprint.json` | Expedition IDs | unlock_node_ids targets for utility upgrades |
| `source-analysis.json` | Faction themes, progression vocabulary | Input for naming and theming |
| `world-template.json` | Mapped faction/upgrade terms | Input for naming |
| `CHANGELOG.md` | Pending upgrade/prestige/faction systems | Awareness of unimplemented features |

### What UPGRADEFORGE Writes

| File | Content |
|---|---|
| `guild-engine/generated/upgrade-ecosystem.json` | Primary output — all upgrade + prestige + faction nodes + calibration |
| `guild-engine/generator/upgrade-flags.md` | Design tension flags (only if flags exist) |
| `guild-engine/generator/CHANGELOG.md` | Append UPGRADEFORGE run entry |

### What UPGRADEFORGE Feeds

| Downstream Forge | What It Reads | Why |
|---|---|---|
| ASSEMBLER | `all_upgrade_ids[]` | Cross-reference validation of upgrade_owned unlock conditions |
| ASSEMBLER | `all_faction_ids[]` | Cross-reference validation of faction_rep_gte unlock conditions |
| ASSEMBLER | `prestige_id`, `prestige_currency_id` | Validates prestige currency exists as a resource |
| ASSEMBLER | `upgrade_cost_resource_ids[]` | Validates all cost resource_ids exist in WORLDFORGE |
| ASSEMBLER | `faction_unlock_node_ids[]` | Validates all faction tier unlock_node_ids exist in upstream forges |
| ASSEMBLER | `upgrade_unlock_node_ids[]` | Validates all upgrade effect unlock_node_ids exist in upstream forges |
| ASSEMBLER | All calibration data | Final balance check across all systems |

---

## STEP 6 — VALIDATION CHECKLIST

Run through every node before writing the output file. ERRORS block output. WARNINGS are written to
`upgrade-flags.md` and noted in the terminal summary but do not block output.

### Structural Checks (Errors if failed)

- [ ] At least 5 upgrade nodes exist (minimum viable upgrade set)
- [ ] Every upgrade node has required fields: `id`, `type`, `label`, `cost`, `effect`
- [ ] Every upgrade `cost` is a valid array of `{ resource_id, amount }` objects
- [ ] Every upgrade `cost[].resource_id` references a WORLDFORGE resource ID
- [ ] Every upgrade `effect` has at least one valid effect property
- [ ] All `id` fields are slug-format: lowercase, hyphens only
- [ ] Upgrade IDs use `upgrade-{slug}` prefix
- [ ] Faction IDs use `faction-{slug}` prefix (if any factions)
- [ ] Prestige ID uses `prestige-{slug}` prefix (if enabled)
- [ ] No duplicate IDs across the entire node set
- [ ] `type` field matches the node's actual type on every node
- [ ] `schema_version` in output file is `"1.2.0"`
- [ ] If PRESTIGE_ENABLED: yes, exactly one prestige node exists with required fields:
  `id`, `type`, `label`, `trigger_conditions[]` (minItems 1), `currency_id`, `bonuses[]`
- [ ] If PRESTIGE_ENABLED: yes, prestige `currency_id` references a valid resource node
- [ ] If PRESTIGE_ENABLED: yes, every bonus has required fields: `id`, `label`, `cost` (number),
  `effect` ($ref stat_block)
- [ ] If FACTION_COUNT: not "none", at least 1 faction node exists with required fields:
  `id`, `type`, `label`, `rep_tiers[]`
- [ ] All faction `rep_tiers[]` are sorted by threshold ascending
- [ ] All faction `rep_tiers[].threshold` values are non-negative numbers
- [ ] All faction `rep_tiers[].discount_pct` values are ≤ 20
- [ ] All `unlock_conditions[].type` values are from the enum: resource_gte, building_level,
  act_reached, faction_rep_gte, upgrade_owned, hero_count_gte, prestige_count_gte
- [ ] All canvas_pos values use the three-column layout (factions x: 600–750, upgrades x: 800–1000,
  prestige x: 1100–1200)
- [ ] `downstream_contracts` object is present and complete
- [ ] No fields exist on any node that are not defined in the schema

### Balance Checks (Warnings if failed)

- [ ] Upgrade costs follow the cost curve (±20% tolerance per tier)
- [ ] Upgrade effects are within calibrated bounds (Table C)
- [ ] No single upgrade shifts expedition outcome by more than one tier
- [ ] Total stacked multiplier for any stat does not exceed ×5 of base value
- [ ] At least one upgrade exists per major system (economy, hero, building, expedition)
- [ ] If PRESTIGE_ENABLED: prestige currency formula produces 100–10,000 per run (typical)
- [ ] If PRESTIGE_ENABLED: prestige resets do not create soft-locks (expeditions accessible)
- [ ] If PRESTIGE_ENABLED: at least one bonus is affordable from a single prestige run
- [ ] If PRESTIGE_ENABLED: total bonuses make run N+1 approximately 20–30% faster
- [ ] Faction rep tiers are achievable within target playtime (8–15 hours per faction to max)
- [ ] Faction discounts do not exceed 20% at any tier
- [ ] All unlock_node_ids in faction rep_tiers reference existing nodes from upstream forges
- [ ] All unlock_node_ids in upgrade effects reference existing nodes from upstream forges

### Pipeline Checks (Warnings if failed)

- [ ] `//TRANSLATE_FLAG` comments present on any node where source material created tension
- [ ] `flags[]` array populated if any source material contradictions exist
- [ ] `upgrade-flags.md` file generated if `flags[]` is non-empty
- [ ] `CHANGELOG.md` entry appended
- [ ] `downstream_contracts` values are internally consistent
- [ ] All calibration objects are populated (upgrade_calibration, prestige_calibration if enabled,
  faction_calibration if any factions)

---

## STEP 7 — UPGRADE FLAGS FILE

If any flags exist, generate `guild-engine/generator/upgrade-flags.md` with this format:

```markdown
# Upgrade System Flags — {Project Name}
### Generated by UPGRADEFORGE {ISO date}

These flags represent design tensions between your source material and standard Guild Engine
upgrade, prestige, and faction mechanics. Review each flag and confirm or override the default
decision.

---

## FLAG-001 [SEVERITY: HIGH] — {Flag title}

**Source intent:** {What the source material implies about progression, power, or reputation}
**Engine default:** {What the upgrade/prestige/faction system would do}

**Options:**
- A) {Option A description — honors source intent}
- B) {Option B description — honors game mechanics}
- C) {Option C, if available}

**Default applied:** {Which option UPGRADEFORGE used}

**To override:** Edit `upgrade-ecosystem.json` nodes as follows:
  - {Specific field change to apply Option A}
  - {Specific field change to apply Option B}

---

## FLAG-002 [SEVERITY: LOW] — ...
```

---

## STEP 8 — FILE WRITING

Write these files in this order:

```
1. guild-engine/generated/upgrade-ecosystem.json   (primary output)
2. guild-engine/generator/upgrade-flags.md         (only if flags[] is non-empty)
3. Append to guild-engine/generator/CHANGELOG.md   (always)
```

**Directory creation:** If `guild-engine/generated/` does not exist, create it before writing.

**Prestige currency resource:** If PRESTIGE_ENABLED: yes and the prestige currency does not already
exist in WORLDFORGE's output, generate a new `resource` node for the prestige currency and include it
in the `nodes[]` array. Set `is_material: false`, `base_cap: 999999`, `base_income: 0` (prestige
currency is only earned through prestige).

**CHANGELOG entry format:**

```markdown
### UPGRADEFORGE Run — {ISO date}
- VERSION: v1.9.4
- TYPE: SYSTEM
- SCOPE: UPGRADEFORGE
- STATUS: IMPLEMENTED
- INPUT: world-economy.json + hero-roster.json + building-system.json + item-ecosystem.json + {act blueprints or 'none'}
- OUTPUT: guild-engine/generated/upgrade-ecosystem.json
- UPGRADES: {N} total ({N} economy, {N} hero, {N} building, {N} expedition, {N} utility)
- PRESTIGE: {enabled/disabled} {— currency: {id}, bonuses: {N}, resets: {list}}
- FACTIONS: {N} total ({N} with {avg} rep tiers each)
- FLAGS: {N} design tensions flagged ({N} high, {N} medium, {N} low)
- DOWNSTREAM: upgrade-ecosystem.json ready for ASSEMBLER
```

---

## STEP 9 — TERMINAL SUMMARY

Print this summary box after all files are written:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  UpgradeForge Complete                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  {Project Name}                                                         │
│  Upgrades: {density} · Prestige: {enabled/disabled} · Factions: {N}    │
├─────────────────────────────────────────────────────────────────────────┤
│  Upgrades:  {N} total                                                   │
│    • Economy:       {N}                                                 │
│    • Hero:          {N}                                                 │
│    • Building:      {N}                                                 │
│    • Expedition:    {N}                                                 │
│    • Utility:       {N}                                                 │
├─────────────────────────────────────────────────────────────────────────┤
│  Prestige:          {enabled/disabled}                                  │
│    • Currency:      {resource_id or N/A}                                │
│    • Trigger:       {trigger condition summary}                         │
│    • Resets:        {list or N/A}                                       │
│    • Bonuses:       {N} purchasable                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  Factions:          {N} total                                           │
│    • Rep Tiers:     {avg tiers per faction}                             │
│    • Total Unlocks: {N} nodes gated by faction rep                     │
│    • Relations:     {N} intended relations (design-only, not in schema) │
├─────────────────────────────────────────────────────────────────────────┤
│  Cost Audit:        {PASS / FAIL — vs WORLDFORGE income curve}          │
│  Effect Audit:      {PASS / FAIL — within calibrated bounds}            │
│  Stacking Audit:    {PASS / FAIL — no stat exceeds 5× base}            │
│  Prestige Audit:    {PASS / FAIL / N/A — no soft-locks, bonuses valid}  │
│  Faction Audit:     {PASS / FAIL / N/A — rep pacing, discount caps}     │
├─────────────────────────────────────────────────────────────────────────┤
│  Output: guild-engine/generated/upgrade-ecosystem.json                 │
│  Flags:  {N} design tensions (see upgrade-flags.md | none)             │
└─────────────────────────────────────────────────────────────────────────┘

Downstream forge contracts written:
  ASSEMBLER — {N} upgrade IDs, {N} faction IDs, prestige: {id or null}
             All cross-reference targets listed for validation.

Next step: Run ASSEMBLER
  > Follow guild-engine/generator/ASSEMBLER.md exactly.
  > INPUT: guild-engine/generated/world-economy.json
         + guild-engine/generated/hero-roster.json
         + guild-engine/generated/building-system.json
         + guild-engine/generated/act-*.blueprint.json
         + guild-engine/generated/item-ecosystem.json
         + guild-engine/generated/upgrade-ecosystem.json
```

---

## EXAMPLE SESSION

```
> Follow guild-engine/generator/UPGRADEFORGE.md exactly.

WORLDFORGE_OUTPUT:   "guild-engine/generated/world-economy.json"
HEROFORGE_OUTPUT:    "guild-engine/generated/hero-roster.json"
BUILDFORGE_OUTPUT:   "guild-engine/generated/building-system.json"
ACTFORGE_OUTPUTS:    "guild-engine/generated/act-tides-of-rot.blueprint.json"
ITEMFORGE_OUTPUT:    "guild-engine/generated/item-ecosystem.json"
SOURCE_MATERIAL:     "guild-engine/generator/world-template.json"
GAME_PITCH:          "none"
PRESTIGE_ENABLED:    "yes"
FACTION_COUNT:       "standard"
UPGRADE_DENSITY:     "standard"

UPGRADEFORGE reading context...
  ✓ schema/project.schema.json
  ✓ docs/WIKI.md
  ✓ generator/CHANGELOG.md
  ✓ docs/DAY2-DEEPDIVE.md
  ✓ docs/DAY2-EXTENDED-DEEPDIVE.md
  ✓ world-template.json
  ✓ generated/world-economy.json
  ✓ generated/hero-roster.json
  ✓ generated/building-system.json
  ✓ generated/item-ecosystem.json
  ✓ generated/act-tides-of-rot.blueprint.json

SCHEMA CHECK:
  ✓ upgrade node has cost ($ref cost array)
  ✓ upgrade node has max_tier (integer, default 1)
  ✓ upgrade node has effect (object with 7 property types)
  ✓ prestige node has trigger_conditions[] ($ref unlock_condition, minItems 1)
  ✓ prestige node has currency_id (string)
  ✓ prestige node has bonuses[] (array with id, label, cost, effect)
  ✓ prestige node has currency_formula (optional, JS expression)
  ✓ prestige node has resets[] (optional, enum array)
  ✓ faction node has rep_tiers[] (threshold, label required)
  ✓ faction node does NOT have relations[] — will use calibration annotations

UPSTREAM CONTRACTS LOADED:
  WORLDFORGE:
    Primary resource: resource-blood (base_income: 2/tick = 480/min)
    Secondary resources: resource-influence, resource-secrecy
    First recruit cost: 5,000 Blood
    Income targets: hour-5 = ×2.0, hour-10 = ×4.0

  HEROFORGE:
    Hero classes: 6 combat + 3 artisan = 9 total
    Median base ATK: 12
    ATK at level 5: 22
    Stat growth per level: +2 ATK, +1.5 DEF, +1 SPD

  BUILDFORGE:
    Buildings: 5 total (Forge, Apothecary, Library, Mine, Barracks)
    Base workflow duration: 30 ticks (Forge), 20 ticks (Apothecary)
    Upgrade IDs: building-upgrade-forge-1, building-upgrade-forge-2, ...
    Max building level: 5

  ITEMFORGE:
    Equipment stat baselines:
      Act 1 weapon ATK median: 8
      Act 2 weapon ATK median: 18
    Rarity ceiling: legendary
    Max item stat: 80 (ATK on legendary weapon)

  ACTFORGE:
    Acts: 3
    Act 1 expedition levels: 2-4
    Act 2 expedition levels: 5-7
    Act 3 expedition levels: 8-10
    Boss expedition IDs: expedition-act1-boss, expedition-act2-boss, expedition-act3-boss

✓ Step 1 — Narrative Analysis

  UPGRADE CATEGORY: Economy
    Source signal: "The coterie's domain expands, blood supply grows more reliable"
    Proposed upgrades: Domain Expansion (+income), Blood Reserves (+cap), Hunting Grounds (income II)
    Fiction role: "Growing territorial control yields more resources"
    Mechanical role: "resource_income_multiplier and resource_cap_multiplier for resource-blood"
    Effect type: resource_income_multiplier, resource_cap_multiplier

  UPGRADE CATEGORY: Hero
    Source signal: "Blood potency increases with age and experience"
    Proposed upgrades: Blood Potency I-III (+ATK), Iron Will I-II (+DEF), Celerity Training (+SPD)
    Fiction role: "Kindred growing in power through practice and vitae"
    Mechanical role: "hero_stat_modifier adding flat stat bonuses"
    Effect type: hero_stat_modifier

  UPGRADE CATEGORY: Building
    Source signal: "The Rack becomes more refined, the Forge more efficient"
    Proposed upgrades: Efficient Workflows (+craft speed), Artisan Mastery (+craft speed II)
    Fiction role: "Infrastructure improvement through better methods"
    Mechanical role: "craft_speed_multiplier reducing workflow duration"
    Effect type: craft_speed_multiplier

  UPGRADE CATEGORY: Expedition
    Source signal: "Scouting networks improve, coterie veterans share wisdom"
    Proposed upgrades: Scout Network (+success), Veteran's Insight (+success II), Plunder (+loot)
    Fiction role: "Better preparation yields better expedition outcomes"
    Mechanical role: "expedition_success_bonus and loot_bonus_pct"
    Effect type: expedition_success_bonus, loot_bonus_pct

  UPGRADE CATEGORY: Utility
    Source signal: "Political connections open new doors"
    Proposed upgrades: Political Favor (unlock building), Primogen Contact (unlock expedition)
    Fiction role: "Social maneuvering grants access to new systems"
    Mechanical role: "unlock_node_ids revealing gated content"
    Effect type: unlock_node_ids

  PRESTIGE LOOP:
    Trigger conditions:
      - act_reached: act-3, value: 1
      - resource_gte: resource-blood, value: 50000
    Currency: resource-soul-shards (new resource node — "Fragments of consumed elders' power")
    Formula: floor((act * 250) + (gold / 50) + (hero_count * 25))
    Resets: resources, buildings, heroes, upgrades
    Preserves: expeditions, factions
    Bonuses: 5 (Income Flow, Reserve Depth, Unlock Recall, Starting Hoard, Rare Sight)
    Fiction justification: "Diablerie — consuming an elder's essence remakes you. You awaken
      diminished but wiser, carrying fragments of consumed power that cannot be taken."
    Soft-lock check: Expeditions preserved → player can always earn resources. ✓

  FACTION: The Camarilla
    Source signal: "The Ivory Tower — traditional power structure of vampire society"
    Fiction role: "Political establishment — order, tradition, hierarchy"
    Mechanical role: "Gates prestige buildings and high-tier hero recruitment"
    Rep tiers: 5
    Tier 1: {threshold: 0,   label: "Unrecognized", unlocks: none, discount: 0%}
    Tier 2: {threshold: 25,  label: "Acknowledged",  unlocks: building-elysium, discount: 5%}
    Tier 3: {threshold: 50,  label: "Valued",        unlocks: hero-class-ventrue, discount: 10%}
    Tier 4: {threshold: 75,  label: "Primogen",      unlocks: upgrade-political-favor, discount: 15%}
    Tier 5: {threshold: 100, label: "Prince's Court", unlocks: expedition-act3-secret, discount: 20%}
    Starting rep: 0

  FACTION: The Anarchs
    Source signal: "Rebels against the Camarilla's rigid hierarchy"
    Fiction role: "Freedom fighters — independence, street-level power"
    Mechanical role: "Gates street-level buildings and combat heroes"
    Rep tiers: 5
    Tier 1: {threshold: 0,   label: "Unknown",   unlocks: none, discount: 0%}
    Tier 2: {threshold: 25,  label: "Ally",       unlocks: building-safehouse, discount: 5%}
    Tier 3: {threshold: 50,  label: "Trusted",    unlocks: hero-class-brujah-elder, discount: 10%}
    Tier 4: {threshold: 75,  label: "Inner Circle", unlocks: upgrade-guerrilla-tactics, discount: 15%}
    Tier 5: {threshold: 100, label: "Baron",       unlocks: expedition-anarch-raid, discount: 20%}
    Starting rep: 0

  FACTION: The Independents
    Source signal: "Unaligned clans operating outside both power structures"
    Fiction role: "Merchants, seers, and lone wolves — pragmatic allies"
    Mechanical role: "Gates exotic items, unique expeditions, and specialist heroes"
    Rep tiers: 4
    Tier 1: {threshold: 0,   label: "Stranger",  unlocks: none, discount: 0%}
    Tier 2: {threshold: 30,  label: "Customer",   unlocks: building-black-market, discount: 5%}
    Tier 3: {threshold: 60,  label: "Associate",  unlocks: hero-class-assamite, discount: 10%}
    Tier 4: {threshold: 90,  label: "Partner",    unlocks: expedition-independent-contract, discount: 15%}
    Starting rep: 0

  UPGRADE EFFECT SIZING:
    vs WORLDFORGE income curve:
      Base income: 480 Blood/min
      First upgrade cost (Tier 1 base): 5000 × 1.5 = 7,500 Blood
      Time to first upgrade: 7,500 / 480 = 15.6 min ✓ (target: 15-20 min)
      Domain Expansion (+10% income): 480 → 528/min
      Time savings on Tier 2 upgrade (18,750): 39.1 → 35.5 min (10% faster) ✓

    vs HEROFORGE stat growth:
      Hero ATK at level 5: 22
      Blood Potency I: +3 ATK → 25 ATK (13.6% boost) ✓ (target: 10-20%)

    vs BUILDFORGE workflow timing:
      Base Forge duration: 30 ticks
      Efficient Workflows (+10%): 30 → 27 ticks (3 ticks faster) ✓

    vs ITEMFORGE equipment stats:
      Median Act 1 weapon ATK: 8
      Blood Potency I: +3 ATK → 37.5% of weapon power ✓ (target: <50%)

    vs ACTFORGE expedition difficulty:
      Act 1 level 3 — party power needed: 30
      Scout Network: +0.05 success bonus
      Effect: minor shift within NARROW_SUCCESS band ✓ (target: ≤1 tier shift)

  TRANSLATION FLAGS:
    //TRANSLATE_FLAG [SEVERITY: MEDIUM]
    TENSION: "In VtM, Diablerie (prestige analog) is a forbidden act — feared and punished"
    CONFLICT: "Prestige is a mechanical incentive — players should WANT to prestige"
    OPTIONS:
      A) Frame prestige as a shameful but powerful choice — flavor text emphasizes cost
      B) Rename prestige to something positive ("Awakening", "Ascension")
      C) Keep Diablerie framing, add a faction rep cost (Camarilla rep drops on prestige)
    DEFAULT APPLIED: Option C — Diablerie framing with Camarilla rep consequence
    DESIGNER DECISION REQUIRED: Yes

    //TRANSLATE_FLAG [SEVERITY: LOW]
    TENSION: "VtM factions have complex political dynamics — gaining Camarilla standing
      should strain Anarch relations"
    CONFLICT: "Schema faction nodes have no relations[] field — factions are independent
      reputation tracks"
    OPTIONS:
      A) Document intended relations in calibration, implement via event nodes later
      B) Treat factions as fully independent — no cross-faction dynamics
    DEFAULT APPLIED: Option A — documented in calibration, implementation deferred
    DESIGNER DECISION REQUIRED: No

✓ Step 2 — Calibration

  COST CURVE:
    Tier 1 base: 7,500 Blood
    Upgrade 1 (Domain Expansion, economy, Tier 1): 7,500 → 15.6 min ✓
    Upgrade 2 (Blood Potency I, hero, Tier 1): 7,500 → 15.6 min ✓
    Upgrade 3 (Scout Network, expedition, Tier 1): 7,500 → 15.6 min ✓
    Upgrade 4 (Blood Reserves, economy, Tier 2): 18,750 → 35.5 min (with +10% income) ✓
    Upgrade 5 (Blood Potency II, hero, Tier 2): 18,750 → 35.5 min ✓
    Upgrade 6 (Efficient Workflows, building, Tier 2): 22,500 → 42.6 min ✓
    ...

  EFFECT SIZING:
    Domain Expansion: resource_income_multiplier { "resource-blood": 0.10 } ✓
    Blood Reserves: resource_cap_multiplier { "resource-blood": 0.20 } ✓
    Blood Potency I: hero_stat_modifier { "attack": 3 } ✓
    Blood Potency II: hero_stat_modifier { "attack": 6 } ✓
    Scout Network: expedition_success_bonus 0.05 ✓
    Efficient Workflows: craft_speed_multiplier 0.10 ✓
    Plunder: loot_bonus_pct 0.05 ✓

  STACKING ANALYSIS:
    Max income multiplier: 1.10 × 1.15 = 1.265× ✓ (< 5×)
    Max cap multiplier: 1.20 × 1.30 = 1.56× ✓
    Max hero ATK addition: +3 + 6 + 10 = +19 ✓ (vs level-15 ATK of ~42 → 45% addition)
    Max success bonus: 0.05 + 0.08 = 0.13 ✓
    Max craft speed: 1.10 × 1.15 = 1.265× ✓
    Max loot bonus: 0.05 + 0.08 = 0.13 ✓
    Any exceeds 5×? No ✓

  PRESTIGE FORMULA CHECK:
    Run 1 (Act 3, 50000 Blood, 8 heroes):
      floor((3 × 250) + (50000 / 50) + (8 × 25)) = floor(750 + 1000 + 200) = 1,950 ✓
    Run 2 (Act 3, 100000 Blood, 12 heroes):
      floor((3 × 250) + (100000 / 50) + (12 × 25)) = floor(750 + 2000 + 300) = 3,050 ✓
    Cheapest bonus: 100 soul shards (Income Flow Tier 1) — affordable from first prestige ✓
    Most expensive single tier: 5,000 soul shards (Rare Sight Tier 5) — 2-3 runs ✓
    Bonuses at Tier 1: +5% income, +10% cap, 200 starting resources → ~20% faster Run 2 ✓

  FACTION REP PACING:
    Camarilla: 5 rep/expedition × 3 runs/hour = 15/hour + 15/event × 0.5/hour = 22.5 rep/hour
      Time to Tier 5 (100 rep): 100/22.5 = 4.4 hours ✓
      Adjustment: Reduce to 3 rep/expedition + 10/event → 14 rep/hour → 7.1 hours ✓
    Anarchs: Similar pacing with different expedition sources. ✓
    Independents: 4 tiers, max threshold 90 → 90/14 = 6.4 hours ✓

✓ Step 3 — Generating nodes...

  UPGRADES: 12 total
    Economy:    3 (Domain Expansion, Blood Reserves, Hunting Grounds)
    Hero:       3 (Blood Potency I, Blood Potency II, Iron Will)
    Building:   2 (Efficient Workflows, Artisan Mastery)
    Expedition: 2 (Scout Network, Plunder)
    Utility:    2 (Political Favor, Primogen Contact)

  PRESTIGE: enabled
    Currency: resource-soul-shards
    Trigger: act_reached act-3 AND resource_gte 50000
    Resets: resources, buildings, heroes, upgrades
    Bonuses: 5 (Income Flow ×10, Reserve Depth ×5, Unlock Recall ×1 each,
      Starting Hoard ×5, Rare Sight ×5)

  FACTIONS: 3
    The Camarilla (5 tiers, 4 unlocks)
    The Anarchs (5 tiers, 4 unlocks)
    The Independents (4 tiers, 3 unlocks)

✓ Step 4 — Schema compliance verified
✓ Step 5 — Validation

  Structural:       22/22 checks passed ✓
  Balance:          12/13 — WARNING: Camarilla rep pacing slightly fast (4.4h → adjusted to 7.1h)
  Pipeline:         6/6 checks passed ✓

✓ Step 6 — upgrade-flags.md written (2 flags: 0 HIGH, 1 MEDIUM, 1 LOW)
✓ Step 7 — upgrade-ecosystem.json written (485 lines)
✓ Step 8 — CHANGELOG.md updated

┌─────────────────────────────────────────────────────────────────────────┐
│  UpgradeForge Complete                                                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Kindred Dark Ages                                                      │
│  Upgrades: standard · Prestige: enabled · Factions: 3                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Upgrades:  12 total                                                    │
│    • Economy:       3                                                   │
│    • Hero:          3                                                   │
│    • Building:      2                                                   │
│    • Expedition:    2                                                   │
│    • Utility:       2                                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Prestige:          enabled                                             │
│    • Currency:      resource-soul-shards                                │
│    • Trigger:       act-3 complete + 50,000 Blood banked                │
│    • Resets:        resources, buildings, heroes, upgrades              │
│    • Bonuses:       5 purchasable                                       │
├─────────────────────────────────────────────────────────────────────────┤
│  Factions:          3 total                                             │
│    • Rep Tiers:     4.7 avg per faction                                 │
│    • Total Unlocks: 11 nodes gated by faction rep                      │
│    • Relations:     2 intended (design-only, not in schema)             │
├─────────────────────────────────────────────────────────────────────────┤
│  Cost Audit:        PASS — all upgrades within ±20% of target timing   │
│  Effect Audit:      PASS — all effects within calibrated bounds         │
│  Stacking Audit:    PASS — max multiplier 1.265× (well below 5×)       │
│  Prestige Audit:    PASS — no soft-locks, bonuses affordable            │
│  Faction Audit:     PASS — 7-8 hours to max rep per faction             │
├─────────────────────────────────────────────────────────────────────────┤
│  Output: guild-engine/generated/upgrade-ecosystem.json                 │
│  Flags:  2 design tensions (see upgrade-flags.md)                      │
└─────────────────────────────────────────────────────────────────────────┘

Downstream forge contracts written:
  ASSEMBLER — 12 upgrade IDs, 3 faction IDs, prestige: prestige-kindred-dark-ages
             resource-soul-shards as prestige currency
             11 faction unlock targets, 2 upgrade unlock targets for validation

Next step: Run ASSEMBLER
  > Follow guild-engine/generator/ASSEMBLER.md exactly.
  > INPUT: guild-engine/generated/world-economy.json
         + guild-engine/generated/hero-roster.json
         + guild-engine/generated/building-system.json
         + guild-engine/generated/act-tides-of-rot.blueprint.json
         + guild-engine/generated/item-ecosystem.json
         + guild-engine/generated/upgrade-ecosystem.json
```

---

## CRITICAL RULES

1. **NEVER create new node types.** UPGRADEFORGE generates exactly three node types: `upgrade`,
   `prestige`, and `faction`. Plus optionally one `resource` node for prestige currency. No custom
   types. No extensions.

2. **ALWAYS respect WORLDFORGE's income curve.** Upgrade costs must align with pacing targets. A
   Tier 1 upgrade that takes 60 minutes to afford when the target is 15–20 minutes is a wall, not
   a goal. A Tier 1 upgrade that takes 2 minutes is free.

3. **ALWAYS size effects relative to upstream forge baselines.** A hero stat upgrade should be
   meaningful relative to HEROFORGE's stat growth curve. A craft speed upgrade should noticeably
   reduce BUILDFORGE's workflow duration. An expedition bonus should shift outcomes by at most one
   tier. No upgrade should make any content system trivial.

4. **ALWAYS output valid schema v1.2.0 JSON.** Every node must validate against
   `project.schema.json`. No custom fields. No ad-hoc extensions.

5. **NEVER reference a resource_id that doesn't exist.** Every `cost[].resource_id` must reference a
   resource from WORLDFORGE output or a prestige currency resource generated by UPGRADEFORGE.

6. **NEVER create a prestige node with trigger_conditions that can never be met.** If prestige
   requires act-5 but the game has only 3 acts, the player can never prestige. Always validate
   trigger conditions against ACTFORGE's act structure.

7. **NEVER create faction rep_tiers that are unachievable within target playtime.** If the game
   expects 20 hours of total play, a faction requiring 30 hours to max is broken. Calibrate rep
   gain rates against expected play patterns.

8. **NEVER create prestige resets that cause soft-locks.** If both buildings and expeditions reset,
   the player has no way to earn resources. Always ensure at least one income path survives reset.

9. **ALWAYS position factions in Column 1 (x: 600–750), upgrades in Column 2 (x: 800–1000),
   prestige in Column 3 (x: 1100–1200).** Mixed columns create canvas confusion in the editor.

10. **ALWAYS show your calibration math.** Upgrade costs, effect sizes, prestige formula values,
    faction rep pacing — every number must have a documented calculation. No unexplained values.

11. **ALWAYS include at least one upgrade per major system.** Economy, hero, building, and expedition
    must each have at least one upgrade. Utility upgrades are optional at sparse density.

12. **NEVER set faction discounts above 20%.** Discounts beyond 20% break vendor economy pricing.
    Use `unlock_node_ids` for stronger faction benefits instead of increasing discount_pct.

13. **NEVER add a `relations[]` field to faction nodes.** The schema does not define this field.
    Cross-faction dynamics are documented in the `faction_calibration.intended_relations` object as
    design annotations only. Implementation requires event nodes with `faction_rep_delta` outcomes.

14. **ALWAYS use exactly one effect type per upgrade node.** An upgrade that boosts both income and
    hero stats is two separate upgrade nodes with clear individual identity. No multi-effect upgrades.

---

## KNOWN LIMITATIONS (v1.0)

UPGRADEFORGE v1.0 does **not** handle:

- **Upgrade trees with prerequisites** — All upgrades are independent. An upgrade that requires
  another upgrade to be purchased first is not expressible in the schema's `unlock_conditions`
  (which supports `upgrade_owned` type, but not chained trees). UPGRADEFORGE uses flat tiers
  (max_tier) instead of tree dependencies.

- **Faction-specific upgrades** — Upgrades gated by faction rep use `unlock_conditions` with
  `faction_rep_gte`, but there is no dedicated "faction upgrade" node type. Faction benefits come from
  `rep_tiers[].unlock_node_ids` and `discount_pct`.

- **Cross-faction dynamics** — The schema has no `relations[]` field on faction nodes. UPGRADEFORGE
  documents intended relations (allied, hostile, enemy) in the calibration object, but cannot express
  them as schema-valid node properties. Implementation requires event-based `faction_rep_delta`
  mechanics.

- **Prestige-specific content** — Prestige resets and bonuses are generated, but prestige-exclusive
  expeditions, items, or heroes (content only available on run 2+) require ACTFORGE/ITEMFORGE/
  HEROFORGE integration that is not yet specced.

- **Upgrade prerequisites** — The `upgrade_owned` unlock condition type exists in the schema, but
  UPGRADEFORGE v1.0 does not generate chains where Upgrade B requires Upgrade A. All upgrades use
  act_reached, building_level, or faction_rep_gte conditions.

- **Dynamic upgrade costs** — Upgrade costs are static (cost array per node). Costs that scale with
  player progression (e.g., cost increases each time an upgrade is purchased globally) require
  formula-based pricing not yet in the schema.

- **Faction war mechanics** — Faction conflict is reputation-only. There are no faction combat
  systems, faction territory control, or faction alliance mechanics beyond reputation tracking.

- **Hero ability upgrades** — Ability trees are separate from stat upgrades. UPGRADEFORGE generates
  `hero_stat_modifier` upgrades for flat stat bonuses, not ability unlocks or ability enhancements.

- **Cross-system validation** — UPGRADEFORGE validates its own output against the schema and upstream
  contracts. Full cross-system validation (do all unlock_node_ids reference real nodes? do all cost
  resource_ids exist?) is handled by ASSEMBLER.

---

## PIPELINE INTEGRATION

### Reads

| File | Source | What UPGRADEFORGE uses |
|---|---|---|
| `world-economy.json` | WORLDFORGE | Resource IDs for costs, primary resource, income curves, cost anchors |
| `hero-roster.json` | HEROFORGE | Stat growth baselines for hero upgrade sizing, hero class count |
| `building-system.json` | BUILDFORGE | Building IDs for unlock upgrades, workflow durations for speed calibration |
| `item-ecosystem.json` | ITEMFORGE | Equipment stat baselines, rarity ceiling, max item stat for sizing |
| `act-*.blueprint.json` | ACTFORGE | Act count for prestige triggers, expedition IDs for utility unlocks |
| `source-analysis.json` | EXTRACTPASS0 | Faction themes, progression vocabulary |
| `world-template.json` | TRANSLATEPASS | Mapped faction/upgrade terms |
| `schema/project.schema.json` | Repository | Node type fields, constraints, enums |
| `docs/WIKI.md` | Repository | Section 1 (node types), 10 (Upgrade Effects), 11 (Prestige), 12 (Faction Rep) |
| `docs/DAY2-DEEPDIVE.md` | Repository | Building upgrade context, formula evaluator |
| `generator/CHANGELOG.md` | Repository | Pending upgrade/faction/prestige systems |

### Writes

| File | Contents |
|---|---|
| `generated/upgrade-ecosystem.json` | Upgrade + prestige + faction nodes + calibration + downstream_contracts + flags |
| `generator/upgrade-flags.md` | Human-readable flag review document (only if flags exist) |
| `generator/CHANGELOG.md` | Appended UPGRADEFORGE run entry |

### Feeds

| Forge | What It Reads from UPGRADEFORGE |
|---|---|
| ASSEMBLER | `all_upgrade_ids[]` — validates upgrade_owned unlock conditions across all nodes |
| ASSEMBLER | `all_faction_ids[]` — validates faction_rep_gte unlock conditions across all nodes |
| ASSEMBLER | `prestige_id`, `prestige_currency_id` — validates prestige currency exists as resource |
| ASSEMBLER | `upgrade_cost_resource_ids[]` — validates all cost resource_ids exist in WORLDFORGE |
| ASSEMBLER | `faction_unlock_node_ids[]` — validates all rep tier unlock targets exist upstream |
| ASSEMBLER | `upgrade_unlock_node_ids[]` — validates all unlock_node_ids effect targets exist upstream |
| ASSEMBLER | All calibration data — final cross-system balance check |

---

## RELATED FILES

| File | Relationship |
|---|---|
| `guild-engine/generator/WORLDFORGE.md` | Upstream forge — produces economy constraints, resource IDs, income curves |
| `guild-engine/generator/HEROFORGE.md` | Upstream forge — produces hero stat baselines and growth curves |
| `guild-engine/generator/BUILDFORGE.md` | Upstream forge — produces building IDs, workflow durations, upgrade IDs |
| `guild-engine/generator/ACTFORGE.md` | Upstream forge — produces act structure, expedition IDs, boss triggers |
| `guild-engine/generator/ITEMFORGE.md` | Upstream forge — produces equipment stat baselines, item/loot IDs |
| `guild-engine/generator/ASSEMBLER.md` | Downstream (future) — reads all node IDs for cross-reference validation |
| `guild-engine/generator/EXTRACTPASS0.md` | Pre-pipeline — produces source-analysis.json for faction/upgrade themes |
| `guild-engine/generator/TRANSLATEPASS.md` | Pre-pipeline — produces world-template.json with mapped terms |
| `guild-engine/schema/project.schema.json` | Schema authority — all nodes must validate against v1.2.0 |
| `guild-engine/docs/WIKI.md` | Section 1: node types. Section 10: Upgrade Effects. Section 11: Prestige. Section 12: Faction Rep |
| `guild-engine/docs/DAY2-DEEPDIVE.md` | Architecture: building upgrades, formula evaluator |
| `guild-engine/docs/DAY2-EXTENDED-DEEPDIVE.md` | Forge Suite architecture, UPGRADEFORGE's role in pipeline |
| `guild-engine/generator/CHANGELOG.md` | Pending systems: faction wars, ability trees, dynamic costs |
