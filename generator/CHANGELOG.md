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

### v1.9.0 — WORLDFORGE (Forge Suite — Forge 1 of 7)
- DATE: 2026-03-29
- TYPE: SYSTEM
- SCOPE: WORLDFORGE (new forge — pre-pipeline, replaces PASS1 economy section for Forge Suite runs)
- STATUS: IMPLEMENTED
- SUMMARY: First forge in the Forge Suite. Economy theorist, not a field-filler. Reads source-analysis.json or world-template.json (or free-text pitch), applies five-step analysis (resource themes, scarcity intentions, economic loops, pacing signals, translation flags), runs mandatory calibration (income-to-cost ratios, income curves, scarcity classification, expedition reward bands), and generates resource nodes + economy_calibration object + downstream_contracts for all five downstream forges. Outputs world-economy.json to generated/ directory. Flags source material contradictions to economy-flags.md. PASS1/2/3 unchanged — Forge Suite is an additive pipeline running in parallel to, not replacing, the existing generator.
- GENERATOR IMPACT: New WORLDFORGE.md prompt. Outputs guild-engine/generated/world-economy.json. HEROFORGE, BUILDFORGE, ACTFORGE (existing), ITEMFORGE, UPGRADEFORGE, and ASSEMBLER (all future) read downstream_contracts from this file. ACTFORGE must be updated when run as part of Forge Suite to read expedition_reward_bands from world-economy.json rather than its own internal calibration tables.
- WIKI SECTION: To be added under "Forge Suite — WORLDFORGE"

### v1.9.1 — HEROFORGE Implementation
- DATE: 2026-03-29
- TYPE: SYSTEM
- SCOPE: HEROFORGE (new forge)
- STATUS: IMPLEMENTED
- SUMMARY: Second forge in the Forge Suite. Character design theorist, not a stat-block filler. Reads WORLDFORGE output (world-economy.json) for economy constraints and source material for archetype mapping. Generates hero roster and artisan classes: stat blocks with documented growth curves, unique passives with engine-evaluable conditions, recruitment costs calibrated to WORLDFORGE contracts, artisan specializations mapped to building_workflow action_types. Outputs hero-roster.json with hero_class nodes, roster_calibration object, party_recommendations, and downstream_contracts for BUILDFORGE (artisan staffing), ACTFORGE (hero power curves), ITEMFORGE (slot definitions), and UPGRADEFORGE (stat growth curves). Flags design tensions (shared primary stats, archetype gaps, source material contradictions) to hero-flags.md.
- GENERATOR IMPACT: New HEROFORGE.md prompt. Outputs guild-engine/generated/hero-roster.json. BUILDFORGE reads artisan_class_ids and specialization_map. ACTFORGE reads combat_class_ids and power_curve. ITEMFORGE reads slot_definitions. UPGRADEFORGE reads stat_growth_curves. ASSEMBLER reads all contracts for cross-reference validation.
- WIKI SECTION: To be added under "Forge Suite — HEROFORGE"

### v1.9.2 — BUILDFORGE Implementation
- DATE: 2026-03-29
- TYPE: SYSTEM
- SCOPE: BUILDFORGE (new forge)
- STATUS: IMPLEMENTED
- SUMMARY: Third forge in the Forge Suite. Production chain architect, not a building template stamper. Reads WORLDFORGE output (world-economy.json) for economy constraints (primary resource, material IDs, cost anchor, income curves) and HEROFORGE output (hero-roster.json) for artisan staffing data (artisan class IDs, specialization map, building affinities). Generates four node types: building nodes with leveled cost/production/slot progression, building_workflow nodes with behavior-specific configurations (consume_item, consume_resource, produce_resource, modify_item, recruit_hero), building_upgrade nodes with effects (slot expansion, batch scaling, workflow unlocks, auto-repeat unlocks, stat modifiers) and UI discovery settings, and crafting_recipe nodes with input/output balance and crit_output definitions. Applies five-step analysis (building archetypes, material flow mapping, workflow chain discovery, artisan staffing plan, translation flags), runs mandatory calibration (build costs vs WORLDFORGE contract, workflow duration with artisan skill impact, success table balance, upgrade cost scaling, recipe input/output ratios). Outputs building-system.json with all four node types plus building_calibration object (cost audit, duration audit, success rate audit, material flow map, artisan coverage, chain definitions) and downstream_contracts for ACTFORGE (material consumption rates), ITEMFORGE (recipe output items, salvage workflows), and UPGRADEFORGE (building upgrade IDs, max levels, cost curves). Flags design tensions to building-flags.md.
- GENERATOR IMPACT: New BUILDFORGE.md prompt. Outputs guild-engine/generated/building-system.json. ACTFORGE reads material_consumption_rates to calibrate expedition drop rates above building consumption. ITEMFORGE reads recipe_output_items to generate item nodes matching recipe output_item IDs, and salvage_workflows to generate items with salvage_profiles. UPGRADEFORGE reads building_upgrade_ids, max_building_levels, and upgrade_cost_curve to size global upgrades that complement per-building upgrades. ASSEMBLER reads full building-system.json for cross-reference validation of all building, workflow, upgrade, and recipe IDs.
- WIKI SECTION: To be added under "Forge Suite — BUILDFORGE"

### v1.9.3 — ITEMFORGE Implementation
- DATE: 2026-03-29
- TYPE: SYSTEM
- SCOPE: ITEMFORGE (new forge)
- STATUS: IMPLEMENTED
- SUMMARY: Fifth forge in the Forge Suite. Reward architect, not an item stamper. Reads WORLDFORGE output (world-economy.json) for material IDs and economy constraints, HEROFORGE output (hero-roster.json) for slot definitions and stat baselines, BUILDFORGE output (building-system.json) for recipe output items and salvage workflows, and optionally ACTFORGE output (act-*.blueprint.json) for loot table references. Generates two node types: item nodes (equipment with slot/stat_modifiers/salvage_profile, consumables with consumable_config using buff_config $ref, materials with stack_max) and loot_table nodes (with weighted loot_entry arrays, rolls, and guaranteed drops). Applies six-step narrative analysis (item theme discovery, slot coverage, recipe output matching, salvage profile mapping, loot table audit, translation flags), runs mandatory calibration across eight tables (item count by complexity, rarity distribution by curve, stat progression by act, loot table entry count, salvage profile calibration using output_rule $ref, consumable buff calibration using buff_config schema, material-to-item value ratio, drop rate calibration). Schema-correct: subtype enum is "equipment"|"material" only; item_type provides finer granularity (equipment/material/consumable/quest/key); salvage_profile uses outputs[] array of output_rule; consumable_config is $ref buff_config with required apply_scope/duration_type/duration_value/effect. Outputs item-ecosystem.json with all item and loot_table nodes plus item_calibration object (rarity distribution, stat progression, slot coverage, salvage audit, recipe matching, loot table audit, consumable balance, drop rate audit) and downstream_contracts for UPGRADEFORGE (equipment stat baselines, rarity ceiling, max item stat) and ASSEMBLER (all item IDs, all loot table IDs, recipe and loot resolution status). Flags design tensions to item-flags.md.
- GENERATOR IMPACT: New ITEMFORGE.md prompt. Outputs guild-engine/generated/item-ecosystem.json. UPGRADEFORGE reads equipment_stat_baselines to size upgrade effects relative to equipment power, rarity_ceiling and max_item_stat to prevent upgrades from making items irrelevant. ASSEMBLER reads all_item_ids and all_loot_table_ids for cross-reference validation of every item_id in loot tables and recipes and every loot_table_id in expeditions.
- WIKI SECTION: To be added under "Forge Suite — ITEMFORGE"
