# ITEMFORGE — AI-Assisted Item & Loot System Design
# Run this in Claude Code to generate the item ecosystem, loot tables, and salvage profiles for a Guild Engine project.
# ITEMFORGE is the fifth forge in the Forge Suite — reads WORLDFORGE + HEROFORGE + BUILDFORGE + ACTFORGE output, feeds UPGRADEFORGE and ASSEMBLER.
#
# Input:  guild-engine/generated/world-economy.json     (from WORLDFORGE)
#         guild-engine/generated/hero-roster.json        (from HEROFORGE)
#         guild-engine/generated/building-system.json    (from BUILDFORGE)
#         guild-engine/generated/act-*.blueprint.json    (from ACTFORGE — optional)
#         guild-engine/generator/source-analysis.json    (from EXTRACTPASS0)
#         guild-engine/generator/world-template.json     (from TRANSLATEPASS)
#         OR: free-text GAME_PITCH if no source material
#
# Output: guild-engine/generated/item-ecosystem.json    (item nodes + loot_table nodes + calibration)
#         guild-engine/generator/item-flags.md           (design tensions for review)
#
# Schema version: 1.2.0
# Forge Suite position: 5 of 7 — reads WORLDFORGE + HEROFORGE + BUILDFORGE + ACTFORGE, feeds UPGRADEFORGE and ASSEMBLER

---

## Purpose

ITEMFORGE is not an item stamper. It is a reward architect.

Its job is to answer the question that determines whether a player keeps playing or closes the tab:
**was that worth it?**

Every item ITEMFORGE generates carries three answers: what this object represents in the world's
fiction, what mechanical role it plays in the player's progression, and whether receiving it at this
moment in the game — from this loot table, at this rarity, with these stats — feels like a reward or
like noise. ITEMFORGE documents all three — in the node, in the calibration object, and in flags
where the answers are in tension.

A loot table is a probability machine with a budget. The budget is the designer's attention — if
every item in the table feels like a real upgrade or a meaningful crafting input, the table is
correctly designed. If half the drops are vendor trash with no salvage value, the table needs
redesign. ITEMFORGE doesn't just generate items; it generates loot tables that feel rewarding.

The item tier ladder — Common, Uncommon, Rare, Epic, Legendary — is not just a rarity tag. ITEMFORGE
designs the mechanical distance between tiers and the frequency at which players bridge them. In a
twenty-hour game, a player should see their first Epic at hour six and their first Legendary at hour
fifteen. ITEMFORGE's rarity distribution is calibrated to that curve.

ITEMFORGE also generates the connective tissue that makes the building economy tangible:
**salvage_profile** objects on equipment so items can be recycled through BUILDFORGE's `consume_item`
workflows, **consumable_config** on buff items so the Apothecary's output actually does something,
and **loot_table** nodes that expedition reward systems reference. Without ITEMFORGE, buildings
produce nothing usable, expeditions drop nothing interesting, and heroes have nothing to equip.

Every downstream forge reads ITEMFORGE output. UPGRADEFORGE cannot size stat growth upgrades without
knowing equipment baselines. ASSEMBLER cannot validate loot table references without knowing which
items exist. ITEMFORGE populates the reward layer. Everything else prices access to it.

---

## Before doing anything else

Read these files in order:

1. `guild-engine/schema/project.schema.json` — item, loot_table node fields and constraints, plus shared definitions: rarity, slot, stat_block, loot_entry, buff_config, output_rule
2. `guild-engine/docs/WIKI.md` — Section 1 (Node Types), Section 4 (Consumable Buff System), Section 9 (Loot System)
3. `guild-engine/generator/CHANGELOG.md` — pending item-related systems
4. `guild-engine/docs/DAY2-DEEPDIVE.md` — consumable system design decisions (idle model, auto-apply)
5. `guild-engine/docs/DAY2-EXTENDED-DEEPDIVE.md` — Forge Suite architecture, ITEMFORGE's role
6. `guild-engine/generator/EXTRACTPASS0.md` — what source-analysis.json contains
7. `guild-engine/generator/TRANSLATEPASS.md` — what world-template.json contains
8. `guild-engine/generated/world-economy.json` — WORLDFORGE output (required)
9. `guild-engine/generated/hero-roster.json` — HEROFORGE output (required)
10. `guild-engine/generated/building-system.json` — BUILDFORGE output (required)
11. If ACTFORGE has run: `guild-engine/generated/act-*.blueprint.json`
12. If source material exists: `guild-engine/generator/source-analysis.json`
13. If TRANSLATEPASS has run: `guild-engine/generator/world-template.json`

Pre-run schema check: verify that `guild-engine/schema/project.schema.json` includes the `item`
node type with fields `item_type` (enum including "consumable"), `salvage_profile` (object with
`outputs` array of output_rule), and `consumable_config` ($ref buff_config). If any of these fields
are missing, stop and raise a flag before running ITEMFORGE.

Print your read status before proceeding:
```
ITEMFORGE reading context...
  ✓ schema/project.schema.json
  ✓ docs/WIKI.md
  ✓ generator/CHANGELOG.md
  ✓ docs/DAY2-DEEPDIVE.md
  ✓ docs/DAY2-EXTENDED-DEEPDIVE.md
  [✓ / ✗] source-analysis.json
  [✓ / ✗] world-template.json
  [✓ / ✗] generated/world-economy.json     (REQUIRED — abort if missing)
  [✓ / ✗] generated/hero-roster.json       (REQUIRED — abort if missing)
  [✓ / ✗] generated/building-system.json   (REQUIRED — abort if missing)
  [✓ / ✗] generated/act-*.blueprint.json   (OPTIONAL — loot tables generated fresh if absent)
```

**If `world-economy.json` does not exist, STOP.** Print:
```
ITEMFORGE ABORT: world-economy.json not found.
Run WORLDFORGE first: guild-engine/generator/WORLDFORGE.md
ITEMFORGE cannot generate items without economy constraints.
```

**If `hero-roster.json` does not exist, STOP.** Print:
```
ITEMFORGE ABORT: hero-roster.json not found.
Run HEROFORGE first: guild-engine/generator/HEROFORGE.md
ITEMFORGE cannot generate equipment without hero slot definitions.
```

**If `building-system.json` does not exist, STOP.** Print:
```
ITEMFORGE ABORT: building-system.json not found.
Run BUILDFORGE first: guild-engine/generator/BUILDFORGE.md
ITEMFORGE cannot generate salvage profiles or recipe output items without building system data.
```

---

## Input Format

User provides:

```
WORLDFORGE_OUTPUT:  "{{path to world-economy.json}}"
HEROFORGE_OUTPUT:   "{{path to hero-roster.json}}"
BUILDFORGE_OUTPUT:  "{{path to building-system.json}}"
ACTFORGE_OUTPUTS:   "{{path to act-*.blueprint.json files, or 'none'}}"
SOURCE_MATERIAL:    "{{path to source-analysis.json or world-template.json, or 'none'}}"
GAME_PITCH:         "{{optional text description if no source material}}"
ITEM_COMPLEXITY:    "{{minimal (20-30 items) | standard (40-60 items) | extensive (80+ items)}}"
RARITY_CURVE:       "{{front-loaded (early epics) | balanced (steady progression) | gated (late epics)}}"
LOOT_FOCUS:         "{{equipment (gear-heavy) | consumable (buff-heavy) | material (crafting-heavy) | balanced}}"
```

**Defaults if not provided:**
- ITEM_COMPLEXITY: `standard`
- RARITY_CURVE: `balanced`
- LOOT_FOCUS: `balanced`

**ITEM_COMPLEXITY definitions:**
- `minimal` — 20–30 items total. Tight item pool where every drop matters. Best for short games
  (5–10hr). No filler items — every Common is a useful crafting input or situational equip.
- `standard` — 40–60 items total. The default Guild Engine item pool. Enough variety for meaningful
  choices without overwhelming players. At least 2 items per slot per rarity tier up to Rare;
  1 per slot for Epic; 0–1 per slot for Legendary.
- `extensive` — 80+ items total. Expansive item pool for long games (30hr+). Multiple items per
  slot per rarity tier. Deep crafting material hierarchies. Niche consumables for specific encounter
  types.

**RARITY_CURVE definitions:**
- `front-loaded` — Players see Rare items by hour 2, Epic by hour 4. High early satisfaction, risk
  of power creep. Best for short games where the endgame is the middle. Requires steeper stat
  scaling between tiers to preserve progression feel.
- `balanced` — Players see Rare by hour 4, Epic by hour 8, Legendary by hour 15. Steady
  progression. Each rarity tier feels like a genuine milestone. The default for most games.
- `gated` — Players see Rare by hour 6, Epic by hour 12, Legendary by hour 20+. Late-game payoff
  focus. Common and Uncommon items must be interesting enough to carry players through long early
  stretches. Best for long games with deep upgrade systems.

**LOOT_FOCUS definitions:**
- `equipment` — 60%+ of items are equipable gear. Combat progression focused. Loot tables emphasize
  weapon/armor/accessory drops. Salvage profiles feed back into equipment crafting.
- `consumable` — 40%+ of items are consumable buffs. Preparation strategy focused. Apothecary-type
  buildings are central. Players stockpile before hard expeditions.
- `material` — 50%+ of items are crafting materials. Building economy focused. Expedition drops feed
  BUILDFORGE's workflow chains. Players invest in production infrastructure.
- `balanced` — Even distribution across all item types. No single category dominates. The default
  for games where all three systems (combat, preparation, crafting) are equally important.

---

## STEP 1 — NARRATIVE ANALYSIS

Before generating any nodes, analyze the source material and all upstream forge outputs for these
five signals. Write your analysis to the console — this is the reasoning that justifies every item
system decision that follows.

### A. Item Theme Discovery

Identify what items mean in this world's fiction. Items are not just stat sticks — they carry
narrative weight. The difference between "Iron Sword (+5 ATK)" and "Ashen Blade of the Burned
Parish (+5 ATK)" is fiction, not mechanics. ITEMFORGE generates the fiction.

For each item category, scan the source material for signals:

- **Weapons** — What tools of violence exist? (swords, guns, blood magic, claws, technology,
  improvised weapons, ritual implements)
- **Armor** — What protects people here? (plate, robes, shields, wards, stealth suits, chitinous
  hides, blessed vestments)
- **Accessories** — What trinkets hold power? (rings, amulets, chips, talismans, relics, bone
  fetishes, data drives)
- **Consumables** — What temporary boosts make sense? (potions, stimulants, prayers, hacks, blood
  draughts, inscribed scrolls, combat drugs)
- **Materials** — What raw substances matter? (ore, herbs, data, blood, essence, bone dust, void
  fragments, reclaimed circuitry)

For each item category found, write:
```
ITEM CATEGORY: [category]
  Source signal: "[quote or paraphrase from source material]"
  Proposed items: [list 3-5 themed item names per rarity tier present]
  Fiction role: "[what this item type represents in the world]"
  Mechanical role: "[what gameplay function it serves — stat progression, crafting input, buff, etc.]"
  Slot mapping: "[which hero_class slot(s) this category fills, or null for non-equipment]"
```

If the source material does not provide clear signals for a category, write:
```
CATEGORY GAP: [missing category]
  Source provides: [what's available]
  Recommendation: [proposed items to fill the gap, with thematic justification]
  //TRANSLATE_FLAG [SEVERITY: LOW] — gap filled by inference, not source material
```

### B. Slot Coverage Analysis

Read HEROFORGE's `downstream_contracts.itemforge.slot_definitions` and the hero_class nodes to
determine which equipment slots exist and how many heroes use each slot. Every slot must have item
coverage across rarity tiers:

```
SLOT COVERAGE:
  weapon:    [N] hero classes use this slot
             Target items: [N per rarity tier × tiers present]
             Status: {PASS / FAIL — need at least 1 per rarity tier up to Rare minimum}
  armor:     [N] hero classes use this slot
             ...
  accessory: [N] hero classes use this slot
             ...
  relic:     [N] hero classes use this slot (may be 0 — optional slot)
             ...
```

**Rule: every slot defined in HEROFORGE's hero_class nodes must have at least one item at Common,
one at Uncommon, and one at Rare rarity.** Epic and Legendary are pacing-controlled — not every slot
needs coverage at those tiers, but at least one slot should have an Epic item per act.

### C. Recipe Output Matching

Read BUILDFORGE's `downstream_contracts.itemforge.recipe_output_items[]`. Every item ID in that list
must have a matching `item` node generated by ITEMFORGE:

```
RECIPE OUTPUT MATCHING:
  BUILDFORGE expects: [list of item_id placeholders from recipe_output_items]
  ITEMFORGE generates: [matching item_id for each]
  Unmatched: [any BUILDFORGE recipe_output_items without a generated item — ERROR]
```

**Rule: every `recipe_output_items` entry from BUILDFORGE must resolve to a real item node.** An
unmatched recipe output is a dangling reference — the compiler will reject it.

### D. Salvage Profile Mapping

Read BUILDFORGE's `downstream_contracts.itemforge.salvage_workflows[]`. These are `building_workflow`
nodes with `behavior: "consume_item"` and `use_item_salvage_profile: true`. Every equipment item
that can enter a salvage workflow needs a `salvage_profile`:

```
SALVAGE COVERAGE:
  Equipment items:  [N] total, [N] with salvage_profile — {PASS / FAIL — all equipment needs salvage}
  Salvage workflows: [N] from BUILDFORGE (consume_item + use_item_salvage_profile)
  Material IDs used in salvage outputs: [list — all must exist in WORLDFORGE materials]
```

**Rule: every equipment item must have a `salvage_profile` with at least one `outputs` entry.** An
equipment item without a salvage profile is permanently stuck in inventory once obsolete — it violates
the idle-game "everything has a use" principle.

### E. Loot Table Audit

If ACTFORGE has run, read `act-*.blueprint.json` files and extract all `loot_table_id` and
`fail_loot_table_id` references from expedition and boss_expedition nodes:

```
LOOT TABLE AUDIT:
  ACTFORGE references:
    Act 1 expeditions: [list of loot_table_id values]
    Act 1 boss:        [loot_table_id, fail_loot_table_id]
    Act 2 expeditions: [list]
    ...
  ITEMFORGE generates:
    [matching loot_table_id for each reference]
  Unmatched: [any ACTFORGE loot_table_id without a generated loot_table — WARNING]
```

If ACTFORGE has NOT run (`ACTFORGE_OUTPUTS: "none"`), ITEMFORGE generates default loot tables based
on the act structure implied by WORLDFORGE's pacing data. These default tables will be replaced or
refined when ACTFORGE runs later.

### F. Translation Flags

Surface contradictions between source material and standard item mechanics:

```
//TRANSLATE_FLAG [SEVERITY: LOW | MEDIUM | HIGH]
TENSION: "[What the source says or implies about items, equipment, or power]"
CONFLICT: "[What standard item mechanics would do by default]"
OPTIONS:
  A) [Option that honors source intent — may require unusual item design]
  B) [Option that honors game mechanics — may simplify source intent]
  C) [Compromise option if available]
DESIGNER DECISION REQUIRED: [Yes/No]
```

**Flag triggers (mandatory):**
- Source treats items as narrative artifacts (unique named items with story) but engine uses generic
  stat items with rarity tiers
- Source has no equipment concept (characters are powerful intrinsically) but the game needs hero
  stat progression via gear
- Source treats power as intrinsic (character growth) not extrinsic (gear-based) — stat progression
  should come from levels/upgrades, not items
- Source material has more unique items than the rarity curve allows at the chosen ITEM_COMPLEXITY
- Source implies free-flowing loot (everything drops everywhere) but the act structure gates item
  tiers by progression
- Source material's consumable concept doesn't map to the idle-model buff system (buffs apply
  on expedition departure, last N expeditions)
- Material names from source don't map to WORLDFORGE's `material_ids[]`

---

## STEP 2 — CALIBRATION TABLES

Use these tables to calculate defensible values for every item-system node. Do not estimate. Show the
math for every value that has a calculation behind it.

### Table A — Item Count by Complexity

| Complexity | Weapons | Armor | Accessories | Relics | Consumables | Materials | Total |
|---|---|---|---|---|---|---|---|
| `minimal` (20–30) | 4–6 | 3–4 | 3–4 | 2–3 | 4–6 | 4–6 | 20–30 |
| `standard` (40–60) | 8–12 | 6–8 | 6–8 | 4–6 | 8–12 | 8–12 | 40–60 |
| `extensive` (80+) | 15–20 | 12–15 | 12–15 | 8–12 | 15–20 | 15–20 | 80–100 |

**Weapons/Armor/Accessories** = `item_type: "equipment"`, `subtype: "equipment"`, `slot` set to
the appropriate slot enum value (weapon, armor, accessory, relic).

**Consumables** = `item_type: "consumable"`, `subtype: "material"` (schema subtype is
"equipment"|"material" — consumables use "material" as subtype since they are not equipped),
`consumable_config` populated, `slot: null`.

**Materials** = `item_type: "material"`, `subtype: "material"`, `slot: null`, `stack_max` set
(typically 99), no `stat_modifiers`.

**Schema note:** The `subtype` field in schema v1.2.0 has enum `["equipment", "material"]` only.
The `item_type` field provides finer granularity: `equipment | material | consumable | quest | key`.
Use `subtype` for the binary equipment-vs-material distinction and `item_type` for the full
classification. Do NOT use values outside the schema enum for `subtype`.

### Table B — Rarity Distribution by Curve

| Rarity Curve | Common | Uncommon | Rare | Epic | Legendary |
|---|---|---|---|---|---|
| `front-loaded` | 25% | 30% | 25% | 15% | 5% |
| `balanced` | 35% | 30% | 20% | 12% | 3% |
| `gated` | 45% | 30% | 15% | 8% | 2% |

**Tolerance:** ±10% per tier. If generating 50 items on the `balanced` curve, Common should be
15–20 items (30–40%), not 10 or 25.

**Show your math:**
```
RARITY DISTRIBUTION: balanced curve, 50 items
  Common:    50 × 0.35 = 17.5 → 18 items (36%)  ✓ (target 35% ±10%)
  Uncommon:  50 × 0.30 = 15.0 → 15 items (30%)  ✓
  Rare:      50 × 0.20 = 10.0 → 10 items (20%)  ✓
  Epic:      50 × 0.12 =  6.0 →  6 items (12%)  ✓
  Legendary: 50 × 0.03 =  1.5 →  1 item  (2%)   ✓ (minimum 1 Legendary)
  Total: 50 ✓
```

### Table C — Stat Progression by Act (Equipment)

Equipment stats must scale with expedition difficulty. Use HEROFORGE's `base_stats` and
`stat_growth` as the reference: equipment should provide meaningful bonuses relative to hero base
stats at the expected hero level for each act.

| Act | Expected Hero Level | Weapon ATK Range | Armor DEF Range | Accessory Bonus Range | Relic Special |
|---|---|---|---|---|---|
| Act 1 (danger 2–4) | 1–5 | +5 to +12 | +4 to +10 | +3 to +8 | +2 to +5 (any stat) |
| Act 2 (danger 5–7) | 5–10 | +13 to +25 | +11 to +20 | +9 to +18 | +6 to +12 (any stat) |
| Act 3 (danger 8–10) | 10–15 | +26 to +45 | +21 to +35 | +19 to +30 | +13 to +22 (any stat) |
| Endgame (danger 11–15) | 15–20 | +46 to +80 | +36 to +60 | +31 to +50 | +23 to +40 (any stat) |

**Stat progression rules:**
- Within the same act, higher-rarity items have higher stats
- The lowest stat at Act N+1 should be higher than the median stat at Act N (monotonic progression)
- Stat ranges overlap slightly between adjacent acts (an Epic weapon from Act 1 may rival an
  Uncommon weapon from Act 2 — this is intentional, rewarding lucky drops)

**Rarity-within-act stat multiplier:**
| Rarity | Stat Multiplier (vs act baseline) |
|---|---|
| Common | ×1.0 (baseline) |
| Uncommon | ×1.3–1.5 |
| Rare | ×1.8–2.2 |
| Epic | ×2.5–3.0 |
| Legendary | ×3.5–4.5 |

**Show your math:**
```
STAT CALC: Act 1 weapon, Rare rarity
  Act 1 weapon ATK baseline: 5–12
  Baseline midpoint: 8.5
  Rare multiplier: ×2.0
  Rare ATK: 8.5 × 2.0 = 17.0 → 17 ATK
  Verify: 17 is within Act 1 range upper bound? No — 17 > 12.
  This is correct: Rare items exceed the Common/Uncommon range. The range in Table C is
  the FULL range including all rarities. Rare items sit at the top of the act's range.
```

### Table D — Loot Table Entry Count

| Loot Table Type | Min Entries | Max Entries | Guaranteed Slots | Notes |
|---|---|---|---|---|
| Act 1 Standard | 3 | 5 | 0–1 | Common-heavy, 1 Uncommon chance |
| Act 1 Boss | 4 | 6 | 1 (Rare+) | Boss always drops something good |
| Act 2 Standard | 4 | 6 | 0–1 | Uncommon-heavy, Rare chance |
| Act 2 Boss | 5 | 7 | 1 (Epic candidate) | Meaningful upgrade from Act 1 boss |
| Act 3+ Standard | 5 | 7 | 1 (Rare+) | Rare is the new baseline |
| Act 3+ Boss | 6 | 8 | 1 (Legendary candidate) | Endgame payoff |
| Building Salvage | 2 | 4 | 0 | Materials only, no equipment |

**Loot table structure rules:**
- `rolls`: 1 for standard expeditions, 2 for boss expeditions, 1 for building salvage
- `guaranteed: true` entries always drop regardless of roll — they don't consume a roll
- Weight distribution: higher weight = more common drop. Common items: weight 40–60.
  Uncommon: weight 20–35. Rare: weight 10–18. Epic: weight 3–8. Legendary: weight 1–3.
- Every loot table must contain at least one material item (so every expedition feeds crafting)

### Table E — Salvage Profile Calibration

Equipment salvage returns materials via the `salvage_profile.outputs[]` array. Each entry is an
`output_rule` object. Returns are calibrated to prevent infinite value loops while keeping salvage
meaningful.

| Item Rarity | Material Return (% of craft cost) | Bonus Output Chance | Design Intent |
|---|---|---|---|
| Common | 80–100% of equivalent craft inputs | 0% | Efficient recycling — commons are never wasted |
| Uncommon | 60–80% of equivalent craft inputs | 5% rare material | Small chance of bonus |
| Rare | 50–70% of equivalent craft inputs | 15% rare material | Worth salvaging obsolete rares |
| Epic | 40–60% of equivalent craft inputs | 30% unique component | Meaningful material recovery |
| Legendary | 30–50% of equivalent craft inputs | 50% prestige material | Hard decision: use or salvage |

**Salvage output_rule structure (schema-compliant):**
```json
"salvage_profile": {
  "outputs": [
    {
      "output_type": "resource",
      "target": "{resource_id from WORLDFORGE}",
      "quantity": 3,
      "chance": 1.0
    },
    {
      "output_type": "resource",
      "target": "{rare_material_id}",
      "quantity": 1,
      "chance": 0.15
    }
  ]
}
```

**Rule: salvage `target` resource IDs must exist in WORLDFORGE's material_ids[] or primary resource.**
An item that salvages into a nonexistent resource is a structural error.

**Rule: total material return value must not exceed 100% of the item's equivalent craft cost.** If
a Rare item costs 500 resources to craft, its salvage profile should return at most 350 resources
(70%) on average. This prevents craft→salvage value loops.

### Table F — Consumable Buff Calibration

Consumables use the `buff_config` schema definition. The engine applies buffs on expedition departure
using the idle model (auto-apply from buff_stockpile).

| Rarity | Duration (expeditions) | Stat Effect | Stack Behavior | Buff Slot Cost |
|---|---|---|---|---|
| Common | 1 | add +5–10 to one stat | refresh | 1 |
| Uncommon | 1–2 | add +10–20 or multiply ×1.10–1.15 | refresh | 1 |
| Rare | 2–3 | add +20–35 or multiply ×1.15–1.25 | extend | 1 |
| Epic | 3–5 | add +35–50 or multiply ×1.25–1.40 | intensify (cap: 3) | 2 |
| Legendary | 5+ | add +50–75 or multiply ×1.40–1.60 | intensify (cap: 2) | 3 |

**buff_config structure (schema-compliant):**
```json
"consumable_config": {
  "apply_scope": "party",
  "duration_type": "expedition_count",
  "duration_value": 2,
  "effect": {
    "stat": "attack",
    "operation": "add",
    "value": 15
  },
  "stack_behavior": "refresh",
  "buff_slot_cost": 1
}
```

**apply_scope rules:**
- `"party"` — buff applies to all heroes on the expedition. Common for general stat boosts.
- `"hero"` — buff applies to one hero (engine picks best match). Rare; for targeted buffs.
- `"hero_class"` — buff applies only to heroes of a specific class. Requires `apply_target`. Niche;
  for class-specific consumables.

**duration_type rules:**
- `"expedition_count"` — consumed after N expeditions regardless of outcome. Default for most buffs.
- `"expedition_success"` — only decrements on success. More efficient but unpredictable. Use for
  Rare+ consumables.
- `"permanent_until_death"` — consumed when the hero dies. Legendary-tier only. Creates a tension:
  send your buffed hero on dangerous expeditions (risk losing the buff) or play it safe.

**stat targeting rules:**
- Core combat stats: `"attack"`, `"defense"`, `"speed"`, `"hp"`, `"luck"`
- Meta stats: `"xp_gain"` (multiply XP earned), `"loot_bonus"` (multiply loot table rolls)
- Common/Uncommon should target core stats. Rare+ can target meta stats.

### Table G — Material-to-Item Value Ratio

Crafting efficiency expectations. These values must be consistent with BUILDFORGE's recipe calibration
(Table F in BUILDFORGE.md). ITEMFORGE defines item values; BUILDFORGE defines recipe costs.

| Recipe Tier | Material Cost (resource value) | Output Item Value | Efficiency Multiplier |
|---|---|---|---|
| Act 1 Craft | 50–200 resources | ×1.5–2.0 of input value | Crafting clearly worth it |
| Act 2 Craft | 200–800 resources | ×2.0–3.0 of input value | Clear upgrade path |
| Act 3 Craft | 800–3000 resources | ×3.0–5.0 of input value | Major investment, major payoff |
| Endgame Craft | 3000+ resources | ×5.0–8.0 of input value | Prestige-level goal |

**Item value is not a schema field** — it is an internal calibration metric ITEMFORGE uses to ensure
crafted items feel worth their cost. Item value = sum of stat_modifier bonuses × rarity multiplier.

**Show your math:**
```
ITEM VALUE: Iron Sword (Common weapon, Act 1)
  stat_modifiers: { "attack": 8 }
  rarity: common (multiplier: ×1.0)
  Item value: 8 × 1.0 = 8 value units

  Required craft inputs (from BUILDFORGE recipe): 100 iron ore
  Iron ore unit value: 1.0 (base material)
  Input value: 100 × 1.0 = 100 value units
  
  Efficiency: 8 / 100 = 0.08 — that seems low.
  
  Correction: item value includes equip benefit over N expeditions.
  At 8 ATK bonus over ~20 expeditions, effective value = 8 × 20 = 160.
  Efficiency: 160 / 100 = 1.6× — within Act 1 Craft range (1.5–2.0×). ✓
```

### Table H — Drop Rate Calibration

ITEMFORGE defines the rarity distribution of items within loot tables. These rates determine what
players actually receive from expeditions:

| Expedition Tier | Common Drop Rate | Uncommon | Rare | Epic | Legendary |
|---|---|---|---|---|---|
| Act 1 (danger 2–4) | 60% | 30% | 10% | 0% | 0% |
| Act 2 (danger 5–7) | 40% | 35% | 20% | 5% | 0% |
| Act 3 (danger 8–10) | 25% | 30% | 30% | 12% | 3% |
| Boss (any act) | 20% | 25% | 30% | 20% | 5% |

**Drop rate implementation:** These percentages are realized through loot_entry `weight` values.
For a table with 5 entries and Act 1 rates:
```
LOOT TABLE: loot-act1-standard
  Entry 1: item-iron-ore         weight: 60  (Common material — 60%)
  Entry 2: item-leather-scraps   weight: 30  (Common material — combined Common = 60%)
     Wait — need to split weights correctly across items, not categories.

  Correct approach: distribute category weight across items in that category.
  Act 1 Standard, 4 entries:
    item-iron-ore       (Common material)  weight: 35
    item-basic-herb     (Common material)  weight: 25
    item-worn-blade     (Uncommon weapon)  weight: 25
    item-scout-cloak    (Rare armor)       weight: 15
    Total weight: 100
    Common rate: (35+25)/100 = 60% ✓
    Uncommon rate: 25/100 = 25%  (close to 30% target, acceptable)
    Rare rate: 15/100 = 15% (close to 10% target, acceptable)
```

---

## STEP 3 — GENERATION RULES

### A. Item Node Structure

Every generated `item` node must use this exact structure, validated against
`schema/project.schema.json` v1.2.0:

**Equipment item:**
```json
{
  "id": "item-{slug}",
  "type": "item",
  "label": "{Human-readable name}",
  "description": "{One sentence: fiction + function}",
  "icon": "{emoji}",
  "rarity": "common",
  "subtype": "equipment",
  "item_type": "equipment",
  "slot": "weapon",
  "stat_modifiers": {
    "attack": 8
  },
  "stack_limit": 1,
  "salvage_profile": {
    "outputs": [
      {
        "output_type": "resource",
        "target": "{resource_id from WORLDFORGE}",
        "quantity": 3,
        "chance": 1.0
      }
    ]
  },
  "canvas_pos": { "x": -200, "y": 50 },
  "connections": []
}
```

**Consumable item:**
```json
{
  "id": "item-{slug}",
  "type": "item",
  "label": "{Human-readable name}",
  "description": "{One sentence: fiction + buff effect}",
  "icon": "{emoji}",
  "rarity": "uncommon",
  "subtype": "material",
  "item_type": "consumable",
  "slot": null,
  "stat_modifiers": {},
  "stack_limit": 10,
  "stack_max": 10,
  "consumable_config": {
    "apply_scope": "party",
    "duration_type": "expedition_count",
    "duration_value": 2,
    "effect": {
      "stat": "attack",
      "operation": "add",
      "value": 15
    },
    "stack_behavior": "refresh",
    "buff_slot_cost": 1
  },
  "canvas_pos": { "x": -200, "y": 950 },
  "connections": []
}
```

**Material item:**
```json
{
  "id": "item-{slug}",
  "type": "item",
  "label": "{Human-readable name}",
  "description": "{One sentence: what it is + what it's used for}",
  "icon": "{emoji}",
  "rarity": "common",
  "subtype": "material",
  "item_type": "material",
  "slot": null,
  "stat_modifiers": {},
  "stack_limit": 99,
  "stack_max": 99,
  "canvas_pos": { "x": -200, "y": 1150 },
  "connections": []
}
```

**Field rules by item_type:**

| Field | equipment | consumable | material | quest | key |
|---|---|---|---|---|---|
| `subtype` | `"equipment"` | `"material"` | `"material"` | `"material"` | `"material"` |
| `slot` | weapon/armor/accessory/relic | `null` | `null` | `null` | `null` |
| `stat_modifiers` | populated | `{}` empty | `{}` empty | `{}` empty | `{}` empty |
| `salvage_profile` | populated | omit | omit | omit | omit |
| `consumable_config` | omit | populated | omit | omit | omit |
| `stack_limit` | `1` | varies (5–25) | `99` | `1` | `1` |
| `stack_max` | omit | same as stack_limit | `99` | omit | omit |

### B. Loot Table Node Structure

Every generated `loot_table` node must use this exact structure:

```json
{
  "id": "loot-{context}-{tier}",
  "type": "loot_table",
  "label": "{Human-readable name}",
  "rolls": 1,
  "entries": [
    {
      "item_id": "item-{slug}",
      "weight": 40,
      "min_qty": 1,
      "max_qty": 1,
      "guaranteed": false
    },
    {
      "item_id": "item-{slug}",
      "weight": 10,
      "min_qty": 1,
      "max_qty": 1,
      "guaranteed": true
    }
  ],
  "canvas_pos": { "x": 1100, "y": 50 },
  "connections": []
}
```

**Loot table ID conventions:**
- Standard expedition: `loot-act{N}-standard` or `loot-act{N}-{expedition_slug}`
- Boss expedition: `loot-act{N}-boss`
- Fail table: `loot-act{N}-fail`
- Building (shop/chest): `loot-building-{building_slug}`
- Salvage output: handled by `salvage_profile` on items, not by loot_table nodes

**rolls rules:**
- Standard expedition: `1` (one roll per completion)
- Boss expedition: `2` (bosses are harder, reward more)
- DOMINANT tier adds bonus rolls via engine formula: `min(3, floor(avg_lck / 20))`
- Building tables: `1`

**entries rules:**
- Every entry must reference a valid `item_id` that exists in the generated item set
- `weight` is relative — only the ratio matters (weight 40 vs 10 = 80% vs 20%)
- `guaranteed: true` items always drop AND do not consume a roll
- Boss tables should have exactly 1 guaranteed entry (the signature boss drop)
- Standard tables may have 0–1 guaranteed entries (usually 0)
- At least 1 material item per table (ensures crafting always progresses)

### C. Canvas Layout Algorithm

Position item-system nodes using two columns with internal grouping by category and rarity.

```
Items Column                          Loot Tables Column
x: -300 to -100                       x: 1000 to 1200

Equipment — Weapons (y: 50–300)       Act 1 Standard (y: 50)
  Common    (y: 50)                   Act 1 Boss     (y: 200)
  Uncommon  (y: 100)                  Act 1 Fail     (y: 350)
  Rare      (y: 150)                  ---
  Epic      (y: 200)                  Act 2 Standard (y: 500)
  Legendary (y: 250)                  Act 2 Boss     (y: 650)
                                      Act 2 Fail     (y: 800)
Equipment — Armor (y: 350–550)        ---
  Common    (y: 350)                  Act 3+ tables  (y: 950+)
  Uncommon  (y: 400)
  ...

Equipment — Accessories (y: 600–750)
Equipment — Relics (y: 800–900)
Consumables (y: 950–1100)
Materials (y: 1150–1400)
```

**Layout rules:**
- Items in Column 1: x = -200 (centered in the -300 to -100 range)
- Loot tables in Column 2: x = 1100 (centered in the 1000 to 1200 range)
- Within each item category, sort by rarity (Common at top, Legendary at bottom)
- Within the same rarity, stack with 50px vertical spacing
- Leave 100px vertical gap between item categories (weapons → armor → accessories, etc.)
- Loot tables stack with 150px spacing, grouped by act

### D. The item-ecosystem.json Output Format

```json
{
  "schema_version": "1.2.0",
  "itemforge_version": "1.0.0",
  "generated_at": "{ISO timestamp}",
  "meta": {
    "project_name": "{from WORLDFORGE meta or source material}",
    "item_complexity": "{minimal | standard | extensive}",
    "rarity_curve": "{front-loaded | balanced | gated}",
    "loot_focus": "{equipment | consumable | material | balanced}",
    "source_material": "{path or 'pitch'}",
    "worldforge_input": "{path to world-economy.json}",
    "heroforge_input": "{path to hero-roster.json}",
    "buildforge_input": "{path to building-system.json}",
    "actforge_inputs": "{paths or 'none'}",
    "designer_notes": "{brief summary of the item ecosystem's design philosophy}"
  },
  "nodes": [
    // All item nodes (equipment, consumables, materials)
    // All loot_table nodes
  ],
  "item_calibration": {
    "rarity_distribution": {
      "target_curve": "{front-loaded | balanced | gated}",
      "actual": {
        "common": { "count": 0, "percentage": 0 },
        "uncommon": { "count": 0, "percentage": 0 },
        "rare": { "count": 0, "percentage": 0 },
        "epic": { "count": 0, "percentage": 0 },
        "legendary": { "count": 0, "percentage": 0 }
      },
      "within_tolerance": true
    },
    "stat_progression": {
      "act_baselines": [
        {
          "act": 1,
          "weapon_atk_range": [5, 12],
          "armor_def_range": [4, 10],
          "accessory_range": [3, 8],
          "monotonic_vs_previous": true
        }
      ]
    },
    "slot_coverage": [
      {
        "slot": "weapon",
        "hero_classes_using": 0,
        "items_by_rarity": {
          "common": 0,
          "uncommon": 0,
          "rare": 0,
          "epic": 0,
          "legendary": 0
        },
        "coverage_pass": true
      }
    ],
    "salvage_audit": [
      {
        "item_id": "{id}",
        "rarity": "common",
        "craft_cost_value": 0,
        "salvage_return_value": 0,
        "return_percentage": 0,
        "within_bounds": true
      }
    ],
    "recipe_matching": {
      "buildforge_recipe_items": ["{item_id}"],
      "matched": ["{item_id}"],
      "unmatched": [],
      "pass": true
    },
    "loot_table_audit": {
      "actforge_references": ["{loot_table_id}"],
      "matched": ["{loot_table_id}"],
      "unmatched": [],
      "pass": true
    },
    "consumable_balance": [
      {
        "item_id": "{id}",
        "rarity": "common",
        "duration": 1,
        "stat": "attack",
        "operation": "add",
        "value": 10,
        "buff_slot_cost": 1,
        "within_calibration": true
      }
    ],
    "drop_rate_audit": [
      {
        "loot_table_id": "{id}",
        "target_tier": "act_1",
        "common_rate_actual": 0,
        "uncommon_rate_actual": 0,
        "rare_rate_actual": 0,
        "epic_rate_actual": 0,
        "legendary_rate_actual": 0,
        "within_tolerance": true
      }
    ]
  },
  "flags": [
    {
      "id": "flag-{n}",
      "severity": "low | medium | high",
      "tension": "{what the source implies}",
      "conflict": "{what the item system would do by default}",
      "options": ["A) ...", "B) ...", "C) ..."],
      "default_applied": "{which option ITEMFORGE used}",
      "designer_decision_required": true
    }
  ],
  "downstream_contracts": {
    "upgradeforge": {
      "equipment_stat_baselines": {
        "act_1_weapon_atk_median": 0,
        "act_1_armor_def_median": 0,
        "act_2_weapon_atk_median": 0,
        "act_2_armor_def_median": 0
      },
      "rarity_ceiling": "legendary",
      "max_item_stat": 0,
      "note": "UPGRADEFORGE uses equipment stat baselines to size upgrade effects. A +10% ATK upgrade should be meaningful relative to the median weapon ATK at the act where it unlocks."
    },
    "assembler": {
      "all_item_ids": ["{id}"],
      "all_loot_table_ids": ["{id}"],
      "recipe_output_items_resolved": true,
      "actforge_loot_tables_resolved": true,
      "note": "ASSEMBLER validates all item_id and loot_table_id cross-references."
    }
  }
}
```

### E. Edges

ITEMFORGE does not generate edges between nodes — edges are drawn in the editor after all forges have
run, or by the auto-rig system. Do not add an `edges` array to item-ecosystem.json.

However, ITEMFORGE must document the intended edge connections in the calibration object so the
designer (or auto-rig) knows what to wire:

```
INTENDED CONNECTIONS:
  item-iron-sword → loot-act1-standard    (drops from)
  item-iron-sword → recipe-iron-sword     (output of)
  item-iron-ore → recipe-iron-sword       (input to)
  loot-act1-boss → expedition-act1-boss   (rewards)
```

---

## STEP 4 — SCHEMA COMPLIANCE

Before generating any node, verify against the authoritative schema at
`guild-engine/schema/project.schema.json` v1.2.0.

### Item node required fields:
- `id` (string) — slug format, prefix `item-`
- `type` (const: `"item"`)
- `label` (string)
- `subtype` (enum: `"equipment"` | `"material"`)
- `rarity` ($ref rarity: `"common"` | `"uncommon"` | `"rare"` | `"epic"` | `"legendary"`)

### Item node optional fields:
- `description` (string)
- `icon` (string — emoji)
- `slot` ($ref slot: `"weapon"` | `"armor"` | `"accessory"` | `"relic"` — required for equipment)
- `stat_modifiers` ($ref stat_block — flat key-value map of stat name to number)
- `stack_limit` (integer, minimum: 1, default: 1)
- `item_type` (enum: `"equipment"` | `"material"` | `"consumable"` | `"quest"` | `"key"`, default: `"equipment"`)
- `salvage_profile` (object with `outputs[]` array of $ref output_rule)
- `consumable_config` ($ref buff_config — present when item_type = consumable)
- `stack_max` (integer — consumable/material only)
- `canvas_pos` ($ref canvas_position)
- `connections` (array of strings)

### Loot table node required fields:
- `id` (string) — slug format, prefix `loot-`
- `type` (const: `"loot_table"`)
- `label` (string)
- `rolls` (integer, minimum: 1)
- `entries` (array of $ref loot_entry, minItems: 1)

### Loot table node optional fields:
- `canvas_pos` ($ref canvas_position)
- `connections` (array of strings)

### loot_entry required fields:
- `item_id` (string — references an item node ID)
- `weight` (number, minimum: 1)

### loot_entry optional fields:
- `min_qty` (integer, minimum: 1, default: 1)
- `max_qty` (integer, minimum: 1, default: 1)
- `guaranteed` (boolean, default: false)

### buff_config required fields (for consumable items):
- `apply_scope` (enum: `"party"` | `"hero"` | `"hero_class"`)
- `duration_type` (enum: `"expedition_count"` | `"expedition_success"` | `"permanent_until_death"`)
- `duration_value` (integer, minimum: 1)
- `effect` (object with required: `stat`, `operation`, `value`)

### buff_config optional fields:
- `apply_target` (string — hero_class only)
- `stack_behavior` (enum: `"refresh"` | `"extend"` | `"intensify"`, default: `"refresh"`)
- `stack_cap` (integer — intensify only)
- `buff_slot_cost` (integer, 1–3, default: 1)

**Do NOT add fields not in the schema.** No custom properties. No ad-hoc extensions. If a design
decision needs a field that does not exist, write a `//TRANSLATE_FLAG` and use the closest existing
field.

---

## STEP 5 — PIPELINE INTEGRATION

### What ITEMFORGE Reads

| Source | Field | Purpose |
|---|---|---|
| `world-economy.json` | `downstream_contracts.itemforge` or material list | Material IDs for salvage profile targets |
| `world-economy.json` | `economy_calibration.income_curves` | Resource income rate for item value calibration |
| `world-economy.json` | Primary resource ID | Base currency for value calculations |
| `hero-roster.json` | `downstream_contracts.itemforge.slot_definitions` | Which equipment slots exist and need coverage |
| `hero-roster.json` | Hero class count | Item pool sizing relative to roster |
| `hero-roster.json` | `roster_calibration.stat_growth` | Stat scaling reference for equipment bonus sizing |
| `building-system.json` | `downstream_contracts.itemforge.recipe_output_items[]` | Item IDs that must exist (recipes produce these) |
| `building-system.json` | `downstream_contracts.itemforge.salvage_workflows[]` | Workflows that read salvage_profile |
| `act-*.blueprint.json` | `loot_table_id`, `fail_loot_table_id` | Loot table IDs that must exist |
| `act-*.blueprint.json` | Act count, danger levels | Stat progression tiers |
| `source-analysis.json` | Item themes, named artifacts | Input for item naming and fiction |
| `world-template.json` | Mapped item terms | Input for item naming |
| `CHANGELOG.md` | Pending item systems | Awareness of unimplemented features |

### What ITEMFORGE Writes

| File | Content |
|---|---|
| `guild-engine/generated/item-ecosystem.json` | Primary output — all item + loot_table nodes + calibration |
| `guild-engine/generator/item-flags.md` | Design tension flags (only if flags exist) |
| `guild-engine/generator/CHANGELOG.md` | Append ITEMFORGE run entry |

### What ITEMFORGE Feeds

| Downstream Forge | What It Reads | Why |
|---|---|---|
| UPGRADEFORGE | `equipment_stat_baselines` | Sizes upgrade effects relative to equipment power |
| UPGRADEFORGE | `rarity_ceiling`, `max_item_stat` | Ensures upgrades don't make items irrelevant |
| ASSEMBLER | `all_item_ids[]` | Cross-reference validation of every item_id in loot tables and recipes |
| ASSEMBLER | `all_loot_table_ids[]` | Cross-reference validation of every loot_table_id in expeditions |
| ASSEMBLER | `recipe_output_items_resolved` | Confirms BUILDFORGE→ITEMFORGE contract fulfilled |
| ASSEMBLER | `actforge_loot_tables_resolved` | Confirms ACTFORGE→ITEMFORGE contract fulfilled |

---

## STEP 6 — VALIDATION CHECKLIST

Run through every item before writing the output file. ERRORS block output. WARNINGS are written to
`item-flags.md` and noted in the terminal summary but do not block output.

### Structural Checks (Errors if failed)

- [ ] At least 20 item nodes exist (minimum viable item pool)
- [ ] Every item node has required fields: `id`, `type`, `label`, `subtype`, `rarity`
- [ ] Every loot_table node has required fields: `id`, `type`, `label`, `rolls`, `entries[]`
- [ ] All `id` fields are slug-format: lowercase, hyphens only
- [ ] Item IDs use `item-{slug}` prefix
- [ ] Loot table IDs use `loot-{slug}` prefix
- [ ] No duplicate IDs across the entire node set
- [ ] `type` field matches the node's actual type on every node
- [ ] `schema_version` in output file is `"1.2.0"`
- [ ] Equipment items (`item_type: "equipment"`) have `subtype: "equipment"` and valid `slot`
- [ ] Equipment items have non-empty `stat_modifiers`
- [ ] Consumable items (`item_type: "consumable"`) have `consumable_config` populated with all
  required buff_config fields: `apply_scope`, `duration_type`, `duration_value`, `effect`
- [ ] Consumable items have `subtype: "material"` (schema enum only allows "equipment"|"material")
- [ ] Material items (`item_type: "material"`) have `subtype: "material"` and `slot: null`
- [ ] Non-equipment items have `slot: null` or slot omitted
- [ ] Every loot_entry `item_id` references a valid item node ID in the generated set
- [ ] Every loot_table has at least 1 entry (`minItems: 1` per schema)
- [ ] All salvage_profile `outputs[].target` resource IDs reference WORLDFORGE materials
- [ ] All canvas_pos values use the item system layout (items x: -300 to -100, loot tables x: 1000–1200)
- [ ] `downstream_contracts` object is present and complete

### Balance Checks (Warnings if failed)

- [ ] Rarity distribution matches RARITY_CURVE setting (±10% tolerance per tier)
- [ ] Stat progression is monotonic (higher act ≥ higher stats at same rarity)
- [ ] Every HEROFORGE slot type has at least 3 items across rarities (Common + Uncommon + Rare
  minimum)
- [ ] Every BUILDFORGE `recipe_output_items` entry has a matching item node
- [ ] Every ACTFORGE `loot_table_id` reference has a matching loot_table node (if ACTFORGE ran)
- [ ] Salvage return values are within calibrated bounds (no item returns > 100% of craft cost)
- [ ] Consumable durations are within calibrated bounds (1–10 expeditions typical)
- [ ] Consumable buff effects are within calibrated bounds per rarity (Table F)
- [ ] No loot table has all guaranteed entries (at least some entries should use weighted rolls)
- [ ] At least one material item exists in every loot table (crafting always progresses)
- [ ] Drop rate distribution per loot table tier matches Table H (±15% tolerance)

### Pipeline Checks (Warnings if failed)

- [ ] `//TRANSLATE_FLAG` comments present on any item where source material created tension
- [ ] `flags[]` array populated if any source material contradictions exist
- [ ] `item-flags.md` file generated if `flags[]` is non-empty
- [ ] `CHANGELOG.md` entry appended
- [ ] `downstream_contracts` values are internally consistent
- [ ] `item_calibration.recipe_matching.pass` is true (all BUILDFORGE recipe items resolved)
- [ ] `item_calibration.loot_table_audit.pass` is true (all ACTFORGE loot references resolved)
- [ ] `item_calibration.slot_coverage` shows all HEROFORGE slots covered
- [ ] `item_calibration.salvage_audit` shows all equipment items have salvage profiles

---

## STEP 7 — ITEM FLAGS FILE

If any flags exist, generate `guild-engine/generator/item-flags.md` with this format:

```markdown
# Item System Flags — {Project Name}
### Generated by ITEMFORGE {ISO date}

These flags represent design tensions between your source material and standard Guild Engine item
mechanics. Review each flag and confirm or override the default decision.

---

## FLAG-001 [SEVERITY: HIGH] — {Flag title}

**Source intent:** {What the source material implies about items, gear, or power}
**Engine default:** {What the item system would do}

**Options:**
- A) {Option A description — honors source intent}
- B) {Option B description — honors game mechanics}
- C) {Option C, if available}

**Default applied:** {Which option ITEMFORGE used}

**To override:** Edit `item-ecosystem.json` nodes as follows:
  - {Specific field change to apply Option A}
  - {Specific field change to apply Option B}

---

## FLAG-002 [SEVERITY: LOW] — ...
```

---

## STEP 8 — FILE WRITING

Write these files in this order:

```
1. guild-engine/generated/item-ecosystem.json    (primary output)
2. guild-engine/generator/item-flags.md          (only if flags[] is non-empty)
3. Append to guild-engine/generator/CHANGELOG.md (always)
```

**Directory creation:** If `guild-engine/generated/` does not exist, create it before writing.

**CHANGELOG entry format:**

```markdown
### ITEMFORGE Run — {ISO date}
- VERSION: v1.9.3
- TYPE: SYSTEM
- SCOPE: ITEMFORGE
- STATUS: IMPLEMENTED
- INPUT: world-economy.json + hero-roster.json + building-system.json + {act blueprints or 'none'}
- OUTPUT: guild-engine/generated/item-ecosystem.json
- ITEMS: {N} total ({N} equipment, {N} consumables, {N} materials)
- RARITY: {N} common, {N} uncommon, {N} rare, {N} epic, {N} legendary
- LOOT TABLES: {N} total ({N} standard, {N} boss, {N} fail)
- SALVAGE PROFILES: {N}/{N} equipment items with salvage defined
- FLAGS: {N} design tensions flagged ({N} high, {N} medium, {N} low)
- DOWNSTREAM: item-ecosystem.json ready for UPGRADEFORGE, ASSEMBLER
```

---

## STEP 9 — TERMINAL SUMMARY

Print this summary box after all files are written:

```
┌─────────────────────────────────────────────────────────────────────────┐
│  ItemForge Complete                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  {Project Name}                                                         │
│  Complexity: {complexity} · Rarity: {curve} · Focus: {focus}           │
├─────────────────────────────────────────────────────────────────────────┤
│  Items:  {N} total                                                      │
│    • Equipment:     {N}    ({N} weapons, {N} armor, {N} accessories)    │
│    • Consumables:   {N}    ({N} buffs, {N} clears, {N} modifiers)       │
│    • Materials:     {N}    ({N} common, {N} rare, {N} unique)           │
├─────────────────────────────────────────────────────────────────────────┤
│  Rarity Distribution:                                                   │
│    Common: {N} ({N}%) · Uncommon: {N} ({N}%) · Rare: {N} ({N}%)        │
│    Epic: {N} ({N}%) · Legendary: {N} ({N}%)                            │
├─────────────────────────────────────────────────────────────────────────┤
│  Loot Tables:  {N} total ({N} standard, {N} boss, {N} fail)            │
│  Slot Coverage:     {PASS / FAIL — all HEROFORGE slots covered}         │
│  Salvage Coverage:  {N}/{N} equipment items have salvage_profile        │
│  Recipe Matching:   {N}/{N} BUILDFORGE recipe items resolved            │
│  Loot Table Audit:  {N}/{N} ACTFORGE references resolved                │
├─────────────────────────────────────────────────────────────────────────┤
│  Stat Progression:  {PASS / FAIL — monotonic across acts}               │
│  Rarity Tolerance:  {PASS / FAIL — within ±10% of target curve}        │
│  Salvage Bounds:    {PASS / FAIL — no returns > 100% of craft cost}     │
│  Consumable Bounds: {PASS / FAIL — within calibrated ranges}            │
├─────────────────────────────────────────────────────────────────────────┤
│  Output: guild-engine/generated/item-ecosystem.json                    │
│  Flags:  {N} design tensions (see item-flags.md | none)                │
└─────────────────────────────────────────────────────────────────────────┘

Downstream forge contracts written:
  UPGRADEFORGE — equipment stat baselines for {N} acts, rarity ceiling: legendary
  ASSEMBLER    — {N} item IDs, {N} loot table IDs for cross-reference

Next step: Run UPGRADEFORGE
  > Follow guild-engine/generator/UPGRADEFORGE.md exactly.
  > INPUT: guild-engine/generated/world-economy.json
         + guild-engine/generated/hero-roster.json
         + guild-engine/generated/building-system.json
         + guild-engine/generated/item-ecosystem.json
```

---

## EXAMPLE SESSION

```
> Follow guild-engine/generator/ITEMFORGE.md exactly.

WORLDFORGE_OUTPUT:  "guild-engine/generated/world-economy.json"
HEROFORGE_OUTPUT:   "guild-engine/generated/hero-roster.json"
BUILDFORGE_OUTPUT:  "guild-engine/generated/building-system.json"
ACTFORGE_OUTPUTS:   "guild-engine/generated/act-tides-of-rot.blueprint.json"
SOURCE_MATERIAL:    "guild-engine/generator/world-template.json"
GAME_PITCH:         "none"
ITEM_COMPLEXITY:    "standard"
RARITY_CURVE:       "balanced"
LOOT_FOCUS:         "balanced"

ITEMFORGE reading context...
  ✓ schema/project.schema.json
  ✓ docs/WIKI.md
  ✓ generator/CHANGELOG.md
  ✓ docs/DAY2-DEEPDIVE.md
  ✓ docs/DAY2-EXTENDED-DEEPDIVE.md
  ✓ world-template.json
  ✓ generated/world-economy.json
  ✓ generated/hero-roster.json
  ✓ generated/building-system.json
  ✓ generated/act-tides-of-rot.blueprint.json

SCHEMA CHECK:
  ✓ item node has item_type field (enum includes "consumable")
  ✓ item node has salvage_profile (object with outputs[] array)
  ✓ item node has consumable_config ($ref buff_config)
  ✓ loot_table node has entries[] array ($ref loot_entry)
  ✓ buff_config has required fields (apply_scope, duration_type, duration_value, effect)

UPSTREAM CONTRACTS LOADED:
  WORLDFORGE:
    Primary resource: resource-blood
    Materials: resource-vessels, resource-territory
    Base income: 2/tick = 480/min

  HEROFORGE:
    Slot definitions: weapon, armor, accessory, relic
    Hero classes: 6 combat + 3 artisan = 9 total
    Combat classes with equipment: Brujah (weapon, armor, accessory), Tremere (weapon, accessory,
      relic), Nosferatu (armor, accessory), Gangrel (weapon, armor), Malkavian (accessory, relic),
      Ventrue (weapon, armor, accessory, relic)

  BUILDFORGE:
    Recipe output items: item-blood-elixir, item-shadow-tincture, item-vitae-concentrate,
      item-elders-draught
    Salvage workflows: workflow-workshop-salvage (consume_item, use_item_salvage_profile: true)

  ACTFORGE:
    Act 1 loot tables: loot-act1-patrol, loot-act1-investigation, loot-act1-boss
    Act 2 loot tables: loot-act2-raid, loot-act2-infiltration, loot-act2-boss

✓ Step 1 — Narrative Analysis

  ITEM CATEGORY: Weapons
    Source signal: "Kindred fight with fangs, blades, and blood sorcery"
    Proposed items:
      Common: Worn Knife, Street Bat
      Uncommon: Silver-Edged Blade, Reinforced Machete
      Rare: Thaumaturgic Focus, Ancestral Kris
      Epic: Blood-Forged Saber
      Legendary: Fang of the Antediluvian
    Fiction role: "Tools of the Jyhad — from improvised weapons to artifacts of the Ancients"
    Mechanical role: "ATK progression for combat classes"
    Slot mapping: weapon (Brujah, Tremere, Gangrel, Ventrue)

  ITEM CATEGORY: Armor
    Source signal: "Kindred rely on fortitude, armored vestments, and shadow"
    Proposed items:
      Common: Leather Jacket, Ballistic Vest Fragment
      Uncommon: Reinforced Trenchcoat, Blessed Vestments
      Rare: Shadow-Woven Cloak, Fortitude Harness
      Epic: Caul of the Hecata
    Fiction role: "Protection through mundane and supernatural means"
    Mechanical role: "DEF progression for combat classes"
    Slot mapping: armor (Brujah, Nosferatu, Gangrel, Ventrue)

  ITEM CATEGORY: Accessories
    Source signal: "Amulets, clan sigils, and occult talismans hold power"
    Proposed items:
      Common: Bone Rosary, Copper Ring
      Uncommon: Clan Sigil Pendant, Engraved Locket
      Rare: Tremere Phylactery, Eye of the Malkavian
      Epic: Heart of Darkness (metaphorical)
    Fiction role: "Occult trinkets and political tokens"
    Mechanical role: "Mixed stat bonuses — SPD, LCK, or HP for combat flexibility"
    Slot mapping: accessory (Brujah, Tremere, Nosferatu, Malkavian, Ventrue)

  ITEM CATEGORY: Relics
    Source signal: "Ancient artifacts of the clans — powerful, rare, contested"
    Proposed items:
      Rare: Engraved Skull of Cappadocius
      Epic: Sargon's Tablet Fragment
      Legendary: Shard of the Book of Nod
    Fiction role: "Legendary artifacts with unique power"
    Mechanical role: "Any-stat boost for Tremere, Malkavian, Ventrue who have relic slot"
    Slot mapping: relic (Tremere, Malkavian, Ventrue)

  ITEM CATEGORY: Consumables
    Source signal: "Thin-blood alchemy and rituals produce temporary boons"
    Proposed items:
      Common: Minor Blood Draught (+ATK)
      Uncommon: Warding Incense (+DEF), Nightshade Extract (+SPD)
      Rare: Thaumaturgic Elixir (+ATK, +DEF), Malkavian Insight (+LCK)
      Epic: Elder's Vitae (+all stats)
    Fiction role: "Alchemical preparations and ritual blessings"
    Mechanical role: "Expedition buffs via idle auto-apply model"
    Slot mapping: null (consumables go to buff_stockpile)

    NOTE: item-blood-elixir, item-shadow-tincture, item-vitae-concentrate, item-elders-draught
          from BUILDFORGE recipe outputs map to these consumables.

  ITEM CATEGORY: Materials
    Source signal: "Blood, bone, herbs, occult reagents"
    Proposed items:
      Common: Raw Kindred Vitae, Bone Dust, Wild Herbs
      Uncommon: Consecrated Ash, Distilled Shadows
      Rare: Tremere Vis, Ancient Ichor
    Fiction role: "Crafting reagents for the Apothecary and Workshop"
    Mechanical role: "Feed BUILDFORGE workflow chains — expedition drops → crafting inputs"
    Slot mapping: null (materials go to resource pool / inventory)

  SLOT COVERAGE:
    weapon:    4 hero classes → 8 items across 5 rarities — PASS ✓
    armor:     4 hero classes → 6 items across 4 rarities — PASS ✓
    accessory: 5 hero classes → 6 items across 4 rarities — PASS ✓
    relic:     3 hero classes → 3 items across 3 rarities (Rare, Epic, Legendary) — PASS ✓
      NOTE: No Common/Uncommon relics. Relics are inherently rare. Flagging as design intent.

  RECIPE OUTPUT MATCHING:
    item-blood-elixir:      → matched to "Minor Blood Draught" (will use BUILDFORGE's ID)
    item-shadow-tincture:   → matched to "Nightshade Extract"
    item-vitae-concentrate: → matched to "Thaumaturgic Elixir"
    item-elders-draught:    → matched to "Elder's Vitae"
    Unmatched: 0 — PASS ✓

  SALVAGE COVERAGE:
    Equipment items: 23 total, 23 with salvage_profile — PASS ✓
    Salvage workflows: 1 (workflow-workshop-salvage)
    Material IDs: resource-vessels, resource-territory (from WORLDFORGE) — all used ✓

  LOOT TABLE AUDIT:
    ACTFORGE references:
      loot-act1-patrol, loot-act1-investigation, loot-act1-boss
      loot-act2-raid, loot-act2-infiltration, loot-act2-boss
    ITEMFORGE generates: all 6 matched — PASS ✓

  TRANSLATION FLAGS:
    //TRANSLATE_FLAG [SEVERITY: MEDIUM]
    TENSION: "In VtM, relics are unique narrative artifacts with names and histories"
    CONFLICT: "Engine treats relics as generic stat items with rarity tiers"
    OPTIONS:
      A) Give each relic a unique name and one-sentence backstory in description field
      B) Treat relics as generic stat items like other equipment
      C) Use unique names but keep stats generic — fiction is flavor, not mechanics
    DEFAULT APPLIED: Option C — unique names, generic stats
    DESIGNER DECISION REQUIRED: No

    //TRANSLATE_FLAG [SEVERITY: LOW]
    TENSION: "VtM Kindred don't eat food or drink potions — they drink blood"
    CONFLICT: "Consumable items are labeled with generic potion/elixir terminology"
    OPTIONS:
      A) Rename all consumables to blood-themed terminology (Blood Draught, Vitae Infusion)
      B) Keep generic terminology for clarity
    DEFAULT APPLIED: Option A — blood-themed consumable names
    DESIGNER DECISION REQUIRED: No

✓ Step 2 — Calibration

  RARITY DISTRIBUTION: balanced curve, 50 items
    Common:    50 × 0.35 = 17.5 → 18 items (36%)  ✓
    Uncommon:  50 × 0.30 = 15.0 → 15 items (30%)  ✓
    Rare:      50 × 0.20 = 10.0 → 10 items (20%)  ✓
    Epic:      50 × 0.12 =  6.0 →  6 items (12%)  ✓
    Legendary: 50 × 0.03 =  1.5 →  1 item  (2%)   ✓
    Total: 50 ✓

  STAT PROGRESSION:
    Act 1 weapon ATK:  Common +6, Uncommon +9, Rare +14, Epic +20             ✓ (range 5-12+)
    Act 1 armor DEF:   Common +5, Uncommon +8, Rare +12                       ✓ (range 4-10+)
    Act 2 weapon ATK:  Common +14, Uncommon +18, Rare +28, Epic +38           ✓ (range 13-25+)
    Act 2 armor DEF:   Common +12, Uncommon +16, Rare +24, Epic +32           ✓ (range 11-20+)
    Monotonic: Act 2 Common (14) > Act 1 Rare (14) — borderline. Acceptable.  ✓

  SALVAGE AUDIT (sample):
    item-worn-knife (Common weapon, craft cost equiv: 100 resources):
      Salvage: 3× resource-vessels (chance: 1.0) = ~90 resource value
      Return: 90% — within Common bounds (80-100%) ✓

    item-silver-edged-blade (Uncommon weapon, craft cost equiv: 200 resources):
      Salvage: 4× resource-vessels (1.0) + 1× resource-territory (0.05)
      Return: ~70% base, ~72% with bonus — within Uncommon bounds (60-80%) ✓

  CONSUMABLE AUDIT (sample):
    item-blood-elixir (Common consumable):
      buff: apply_scope: party, duration_type: expedition_count, duration_value: 1
      effect: { stat: "attack", operation: "add", value: 8 }
      stack_behavior: refresh, buff_slot_cost: 1
      Within Common bounds (add +5-10, duration 1) ✓

    item-vitae-concentrate (Rare consumable):
      buff: apply_scope: party, duration_type: expedition_success, duration_value: 3
      effect: { stat: "attack", operation: "add", value: 25 }
      stack_behavior: extend, buff_slot_cost: 1
      Within Rare bounds (add +20-35, duration 2-3) ✓

  DROP RATE AUDIT (sample):
    loot-act1-patrol:
      Entries: 4 items, total weight: 100
      Common: 55/100 = 55% (target 60% ±15%) ✓
      Uncommon: 30/100 = 30% (target 30%) ✓
      Rare: 15/100 = 15% (target 10% ±15%) ✓
      Epic: 0% ✓
      Legendary: 0% ✓

✓ Step 3 — Generating nodes...

  ITEMS: 50 total
    Equipment: 23
      Weapons:     8 (2C, 2U, 2R, 1E, 1L)
      Armor:       6 (2C, 2U, 1R, 1E)
      Accessories: 6 (2C, 2U, 1R, 1E)
      Relics:      3 (0C, 0U, 1R, 1E, 1L)
    Consumables: 12
      Stat buffs:  8
      Status clear: 2
      Expedition modifiers: 2
    Materials: 15
      Common:  8
      Rare:    5
      Unique:  2

  LOOT TABLES: 6
    Standard: 3 (act1-patrol, act1-investigation, act2-raid)
    Boss:     2 (act1-boss, act2-boss)
    Fail:     1 (reused across acts)

✓ Step 4 — Schema compliance verified
✓ Step 5 — Validation

  Structural:       21/21 checks passed ✓
  Balance:          10/11 — WARNING: Relic slot has no Common/Uncommon items (by design, flagged)
  Pipeline:         9/9 checks passed ✓
  Recipe matching:  4/4 BUILDFORGE items resolved ✓
  Loot table audit: 6/6 ACTFORGE references resolved ✓

✓ Step 6 — item-flags.md written (2 flags: 0 HIGH, 1 MEDIUM, 1 LOW)
✓ Step 7 — item-ecosystem.json written (682 lines)
✓ Step 8 — CHANGELOG.md updated

┌─────────────────────────────────────────────────────────────────────────┐
│  ItemForge Complete                                                     │
├─────────────────────────────────────────────────────────────────────────┤
│  Kindred Dark Ages                                                      │
│  Complexity: standard · Rarity: balanced · Focus: balanced             │
├─────────────────────────────────────────────────────────────────────────┤
│  Items:  50 total                                                       │
│    • Equipment:     23   (8 weapons, 6 armor, 6 accessories, 3 relics) │
│    • Consumables:   12   (8 buffs, 2 clears, 2 modifiers)              │
│    • Materials:     15   (8 common, 5 rare, 2 unique)                  │
├─────────────────────────────────────────────────────────────────────────┤
│  Rarity Distribution:                                                   │
│    Common: 18 (36%) · Uncommon: 15 (30%) · Rare: 10 (20%)             │
│    Epic: 6 (12%) · Legendary: 1 (2%)                                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Loot Tables:  6 total (3 standard, 2 boss, 1 fail)                   │
│  Slot Coverage:     PASS — all 4 HEROFORGE slots covered               │
│  Salvage Coverage:  23/23 equipment items have salvage_profile          │
│  Recipe Matching:   4/4 BUILDFORGE recipe items resolved                │
│  Loot Table Audit:  6/6 ACTFORGE references resolved                   │
├─────────────────────────────────────────────────────────────────────────┤
│  Stat Progression:  PASS — monotonic across acts                        │
│  Rarity Tolerance:  PASS — within ±10% of balanced curve               │
│  Salvage Bounds:    PASS — no returns > 100% of craft cost              │
│  Consumable Bounds: PASS — within calibrated ranges                     │
├─────────────────────────────────────────────────────────────────────────┤
│  Output: guild-engine/generated/item-ecosystem.json                    │
│  Flags:  2 design tensions (see item-flags.md)                         │
└─────────────────────────────────────────────────────────────────────────┘

Downstream forge contracts written:
  UPGRADEFORGE — equipment stat baselines for 2 acts, rarity ceiling: legendary
  ASSEMBLER    — 50 item IDs, 6 loot table IDs for cross-reference

Next step: Run UPGRADEFORGE
  > Follow guild-engine/generator/UPGRADEFORGE.md exactly.
  > INPUT: guild-engine/generated/world-economy.json
         + guild-engine/generated/hero-roster.json
         + guild-engine/generated/building-system.json
         + guild-engine/generated/item-ecosystem.json
```

---

## CRITICAL RULES

1. **NEVER create new node types.** ITEMFORGE generates exactly two node types: `item` and
   `loot_table`. No custom types. No extensions.

2. **ALWAYS respect HEROFORGE's slot definitions.** Do not generate items for slots that no hero
   class uses. If HEROFORGE defines only weapon, armor, accessory — do not generate relic items.

3. **ALWAYS match BUILDFORGE's recipe output items.** Every `recipe_output_items` entry from
   BUILDFORGE must resolve to a real item node. An unmatched recipe output is a dangling reference
   that the compiler will reject.

4. **ALWAYS resolve ACTFORGE's loot table references.** Every `loot_table_id` from ACTFORGE
   expeditions must have a matching loot_table node. An unmatched loot reference means expeditions
   drop nothing.

5. **ALWAYS output valid schema v1.2.0 JSON.** Every node must validate against
   `project.schema.json`. No custom fields. No ad-hoc extensions.

6. **NEVER create equipment without `stat_modifiers`.** Equipment without stats is a cosmetic
   item — the Guild Engine schema does not support purely cosmetic equipment.

7. **NEVER create consumables without `consumable_config`.** A consumable without `consumable_config`
   is invisible to the buff system. The engine cannot apply it.

8. **NEVER set salvage returns higher than 100% of equivalent craft cost.** Salvage returns above
   100% create infinite resource loops (craft → salvage → craft → profit). This breaks the economy.

9. **ALWAYS include `salvage_profile` on equipment items.** An equipment item without a salvage
   profile is permanently stuck in inventory once obsolete. Every piece of obsolete gear must have a
   path to value recovery.

10. **ALWAYS position items in Column 1 (x: -300 to -100), loot tables in Column 2
    (x: 1000–1200).** Mixed columns create canvas confusion in the editor.

11. **ALWAYS show your calibration math.** Rarity distribution percentages, stat progression values,
    salvage return rates, consumable effect magnitudes, and drop rate weights must all have their
    calculations documented in the terminal output. No unexplained numbers.

12. **ALWAYS use schema-correct `subtype` values.** The `subtype` field enum is
    `"equipment" | "material"` only. Consumables and materials both use `subtype: "material"`.
    The `item_type` field provides the finer distinction. Do not use "consumable", "weapon",
    "armor", or "accessory" as `subtype` values — those are not in the schema enum.

13. **ALWAYS include at least one material item in every loot table.** Expeditions must always feed
    the crafting economy, even when the player is hunting for equipment upgrades.

---

## KNOWN LIMITATIONS (v1.0)

ITEMFORGE v1.0 does **not** handle:

- **Unique/named artifacts** — All items are generic templates with rarity tiers. Named artifacts
  with individual backstories and unique mechanics (Excalibur, the Book of Nod) require manual
  designer work or a future UNIQUEFORGE extension.

- **Item sets or set bonuses** — No equipment synergy mechanics ("wearing 3 pieces of the Tremere
  Set grants +15% spell power"). The schema could support this via a `set_id` field, but it is not
  yet defined. PENDING in CHANGELOG.

- **Faction-specific items** — Items gated by faction reputation require faction nodes that may not
  yet be generated. For v1.0, use act-based or building-level unlock_conditions only.

- **Prestige-tier items** — Legendary is the maximum rarity. Items beyond Legendary (Mythic,
  Prestige) require UPGRADEFORGE integration and are not part of the base item ecosystem.

- **Item upgrade paths** — Items are static once generated. Upgrading a Common Sword to an Uncommon
  Sword requires crafting the Uncommon version (via BUILDFORGE recipes), not upgrading in place.

- **Socketed/gem items** — Item subtypes are flat. No nested item systems (gem slots, enchantment
  slots, rune sockets). The schema does not define sub-item composition.

- **Modify_item workflow integration** — The `modify_item` behavior in building_workflow (enchanting)
  is defined in the schema but BUILDFORGE v1.0 does not generate modifier workflows. Enchantment
  items that work with `modify_item` require a future BUILDFORGE + ITEMFORGE co-generation update.

- **Cross-system validation** — ITEMFORGE validates its own output against the schema and upstream
  contracts. Full cross-system validation (do all loot_table item_ids exist? do all recipe
  output_items match?) is handled by ASSEMBLER.

---

## PIPELINE INTEGRATION

### Reads

| File | Source | What ITEMFORGE uses |
|---|---|---|
| `world-economy.json` | WORLDFORGE | Material IDs for salvage targets, primary resource for value calc, income curves |
| `hero-roster.json` | HEROFORGE | Slot definitions, hero class count, stat baselines for equipment sizing |
| `building-system.json` | BUILDFORGE | Recipe output items (must match), salvage workflows (must supply profiles) |
| `act-*.blueprint.json` | ACTFORGE | Loot table IDs (must match), act count for tier progression |
| `source-analysis.json` | EXTRACTPASS0 | Item themes, named artifacts, material vocabulary |
| `world-template.json` | TRANSLATEPASS | Mapped item terms, equipment naming conventions |
| `schema/project.schema.json` | Repository | Node type fields, constraints, enums |
| `docs/WIKI.md` | Repository | Section 1 (node types), Section 4 (Consumable Buff System), Section 9 (Loot System) |
| `docs/DAY2-DEEPDIVE.md` | Repository | Consumable idle model, auto-apply, formula evaluator |
| `generator/CHANGELOG.md` | Repository | Pending item systems (item sets, unique artifacts) |

### Writes

| File | Contents |
|---|---|
| `generated/item-ecosystem.json` | Item + loot_table nodes + item_calibration + downstream_contracts + flags |
| `generator/item-flags.md` | Human-readable flag review document (only if flags exist) |
| `generator/CHANGELOG.md` | Appended ITEMFORGE run entry |

### Feeds

| Forge | What It Reads from ITEMFORGE |
|---|---|
| UPGRADEFORGE | `equipment_stat_baselines` — sizes upgrade effects relative to equipment power |
| UPGRADEFORGE | `rarity_ceiling`, `max_item_stat` — prevents upgrades from making items irrelevant |
| ASSEMBLER | `all_item_ids[]` — validates every item_id in loot tables and recipes |
| ASSEMBLER | `all_loot_table_ids[]` — validates every loot_table_id in expeditions |
| ASSEMBLER | `recipe_output_items_resolved` — confirms BUILDFORGE→ITEMFORGE contract |
| ASSEMBLER | `actforge_loot_tables_resolved` — confirms ACTFORGE→ITEMFORGE contract |

---

## RELATED FILES

| File | Relationship |
|---|---|
| `guild-engine/generator/WORLDFORGE.md` | Upstream forge — produces economy constraints and material IDs |
| `guild-engine/generator/HEROFORGE.md` | Upstream forge — produces hero slot definitions and stat baselines |
| `guild-engine/generator/BUILDFORGE.md` | Upstream forge — produces recipe output items and salvage workflows |
| `guild-engine/generator/ACTFORGE.md` | Upstream forge — produces loot table references from expeditions |
| `guild-engine/generator/UPGRADEFORGE.md` | Downstream (future) — reads equipment stat baselines |
| `guild-engine/generator/ASSEMBLER.md` | Integration (future) — reads all item and loot table IDs |
| `guild-engine/generator/EXTRACTPASS0.md` | Pre-pipeline — produces source-analysis.json for item themes |
| `guild-engine/generator/TRANSLATEPASS.md` | Pre-pipeline — produces world-template.json with mapped terms |
| `guild-engine/schema/project.schema.json` | Schema authority — all nodes must validate against v1.2.0 |
| `guild-engine/docs/WIKI.md` | Section 1: node types. Section 4: Consumable Buff System. Section 9: Loot System |
| `guild-engine/docs/DAY2-DEEPDIVE.md` | Architecture: consumable idle model, auto-apply, formula evaluator |
| `guild-engine/docs/DAY2-EXTENDED-DEEPDIVE.md` | Forge Suite architecture, ITEMFORGE's role in pipeline |
| `guild-engine/generator/CHANGELOG.md` | Pending systems: item sets, unique artifacts, enchantment items |
