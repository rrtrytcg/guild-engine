# Guild Engine — Generator Changelog
# This file is maintained automatically by Claude Code.
# Every time a new system, node type, or field is added to the game,
# Claude Code must append an entry here AND update the relevant generator prompts.
# NEVER skip this file when modifying the schema or adding features.

---

## How to read this file

Each entry has:
- VERSION: semantic version of the generator (not the game)
- DATE: when the change was made
- TYPE: FIELD | SYSTEM | CALIBRATION | BREAKING
  - FIELD: a new field added to an existing node — generators auto-handle via schema read
  - SYSTEM: a new game system requiring new generator logic — prompt update required
  - CALIBRATION: new stat tables or balance values — Pass 2 update required
  - BREAKING: schema change that invalidates previously generated projects — migration note required
- SCOPE: which generator pass is affected (PASS1 | PASS2 | BOTH | NONE)
- STATUS: IMPLEMENTED | PENDING | PARTIAL
- SUMMARY: one line description
- GENERATOR IMPACT: what specifically needs updating in the generator prompts
- WIKI SECTION: which WIKI.md section covers this

---

## Entries

### v1.0.0 — Initial generator release
- DATE: 2026-03-28
- TYPE: SYSTEM
- SCOPE: BOTH
- STATUS: IMPLEMENTED
- SUMMARY: Initial two-pass generator. Supports resources, hero classes, buildings, items, loot tables, expeditions, boss expeditions, acts, upgrades.
- GENERATOR IMPACT: Baseline — all calibration tables in GENERATORPASS2.md cover this scope.
- WIKI SECTION: All sections 1–12

### v1.1.0 — Expedition system v2.1 (resolver rewrite)
- DATE: 2026-03-28
- TYPE: SYSTEM
- SCOPE: PASS2
- STATUS: IMPLEMENTED
- SUMMARY: Replaced base_success_chance with level + enemy_atk + enemy_hp. Added curse_chance, resource_rewards, faction_rewards, on_success_unlock. Added hero status system (inspired, exhausted, injured, cursed, dead). Added death on WIPE. Added XP/level system.
- GENERATOR IMPACT: Pass 2 calibration tables updated — enemy_atk, enemy_hp, duration formulas, XP curve, curse_chance defaults, on_success_unlock wiring between acts.
- WIKI SECTION: Sections 2, 3, 4, 5, 6

---

## Pending systems (post-MVP — not yet in generators)

### PENDING: Hero inventory UI
- TYPE: SYSTEM
- SCOPE: NONE (data already in schema — UI only)
- SUMMARY: Screen for equipping items to hero slots. No schema change needed.
- GENERATOR IMPACT: None — items and slots already generated correctly.
- WIKI SECTION: To be added under "Hero Management"

### PENDING: Hero class slot subtypes (sword/staff/bow etc.)
- TYPE: FIELD
- SCOPE: PASS2
- SUMMARY: item_subtype field on items, allowed_subtypes on hero_class. Mages use staves not swords.
- GENERATOR IMPACT: Pass 2 needs new item_subtype calibration table mapping class role to allowed item subtypes.
- WIKI SECTION: To be added under "Items" and "Hero Classes"

### PENDING: Crafting recipe generation
- TYPE: SYSTEM
- SCOPE: PASS2
- SUMMARY: Pass 2 currently leaves recipe_ids empty. Needs recipe calibration — inputs, outputs, craft times by tier.
- GENERATOR IMPACT: Pass 2 needs new RECIPE GENERATION section with calibration table.
- WIKI SECTION: Section 6 (Crafting system)

### PENDING: Buildings that affect heroes (infirmary, barracks, war room)
- TYPE: SYSTEM
- SCOPE: PASS2
- SUMMARY: Buildings with hero_effect field — heal injured, clear exhausted, apply inspired.
- GENERATOR IMPACT: Pass 2 needs new building_effect calibration and layout logic.
- WIKI SECTION: To be added under "Buildings"

### PENDING: Faction system generation
- TYPE: SYSTEM
- SCOPE: PASS2
- SUMMARY: Faction nodes with rep tiers, vendor unlocks. Currently schema supports it but Pass 2 doesn't generate them.
- GENERATOR IMPACT: Pass 2 needs FACTION GENERATION section.
- WIKI SECTION: Section 9 (Faction reputation)

### PENDING: Prestige layer generation
- TYPE: SYSTEM
- SCOPE: PASS2
- SUMMARY: Prestige node with currency formula, reset list, bonus list.
- GENERATOR IMPACT: Pass 2 needs PRESTIGE GENERATION section with formula calibration.
- WIKI SECTION: Section 8 (Prestige system)

### PENDING: Mid-run events on expeditions
- TYPE: FIELD
- SCOPE: PASS2
- SUMMARY: Pass 2 currently generates expeditions with empty events[]. Needs event generation with choices and outcomes.
- GENERATOR IMPACT: Pass 2 needs EVENT GENERATION section — 2-3 events per expedition, thematic to zone.
- WIKI SECTION: Section 2 (Expedition resolver)

### PENDING: Consumable items (War Horn, health potion etc.)
- TYPE: SYSTEM
- SCOPE: PASS2
- SUMMARY: Items with use_effect field, consumed on use. Triggers status effects pre-expedition.
- GENERATOR IMPACT: Pass 2 needs consumable item calibration table.
- WIKI SECTION: To be added under "Items"

---

## Generator version compatibility

| Generator version | Schema version | Generated project compatible? |
|-------------------|---------------|-------------------------------|
| v1.0.0            | 0.1.0         | Yes                           |
| v1.1.0            | 0.1.0         | Yes — adds new fields         |

---

## Update procedure (for Claude Code)

When implementing a new feature:

1. Update `schema/project.schema.json` with new fields/nodes
2. Update `engine/systems/` files with runtime logic
3. Update `editor/src/inspector/` with new form fields
4. Update `docs/WIKI.md` with the new section
5. Append an entry to THIS FILE (generator/CHANGELOG.md)
6. If SCOPE includes PASS1 or PASS2: update the relevant generator prompt
7. If TYPE is BREAKING: add a migration note and bump the generator major version

Do not skip step 5. The changelog is how the designer knows what the generator can and cannot produce.

### v1.2.0 — Generator Pass 3 (iterative expander)
- DATE: 2026-03-28
- TYPE: SYSTEM
- SCOPE: PASS3
- STATUS: IMPLEMENTED
- SUMMARY: Optional repeatable expander. Reads existing generated-project.json and expansion-prompt.txt, adds new acts/zones/heroes/items/events without modifying existing content. Tracks runs in expansion-log.md. New IDs use exp[N] suffix to prevent collisions across runs.
- GENERATOR IMPACT: New GENERATORPASS3.md prompt. PASS1 and PASS2 unchanged.
- WIKI SECTION: To be added under "World Generator"

### v1.3.0 — Extract Pass 0 + Translate Pass (IP adaptation pipeline)
- DATE: 2026-03-28
- TYPE: SYSTEM
- SCOPE: BOTH (new pre-pipeline passes)
- STATUS: IMPLEMENTED
- SUMMARY: Two new passes for adapting existing IP/creative works. Extract Pass 0 reads source files (txt/md/html/rtf/docx/odt/epub/csv/json/yaml) and extracts world elements using 8 universal translation questions into source-analysis.json. Translate Pass maps source terms to game schema, outputs world-template.json (same format as Pass 1), flags ambiguous translations to translation-flags.md. Pass 2 and Pass 3 unchanged — they read world-template.json regardless of origin.
- GENERATOR IMPACT: New EXTRACTPASS0.md and TRANSLATEPASS.md prompts. GENERATORPASS1/2/3 unchanged.
- WIKI SECTION: To be added under "World Generator — IP Adaptation"
