# Guild Engine — Generator Changelog
# This file is maintained automatically by Claude Code.
# Every time a new system, node type, or field is added to the game,
# Claude Code must append an entry here AND update the relevant generator prompts.
# NEVER skip this file when modifying the schema or adding features.

---

## WORLDFORGE Runs

### WORLDFORGE Run — 2026-03-30
- VERSION: v1.0.0
- TYPE: SYSTEM
- SCOPE: WORLDFORGE
- STATUS: IMPLEMENTED
- INPUT: pitch.txt + world-template.json (Shadowbound Guild dark fantasy)
- OUTPUT: guild-engine/generated/world-economy.json
- RESOURCES: 3 total (1 primary, 0 secondary, 2 materials)
- PACING: medium
- ECONOMY_TYPE: hybrid
- FLAGS: 2 design tensions (0 high, 2 low)
- DOWNSTREAM: world-economy.json ready for HEROFORGE, BUILDFORGE, ACTFORGE, ITEMFORGE, UPGRADEFORGE

### HEROFORGE Run — 2026-03-30
- VERSION: v1.0.0
- TYPE: SYSTEM
- SCOPE: HEROFORGE
- STATUS: IMPLEMENTED
- INPUT: world-economy.json + pitch.txt + world-template.json (Shadowbound Guild dark fantasy)
- OUTPUT: guild-engine/generated/hero-roster.json
- CLASSES: 8 total (5 combat, 3 artisan)
- ARCHETYPES: Tank (Shieldbearer), Damage (Shadow Hunter), Support (Warden), Bruiser (Plague Veteran), Speed (Outrunner)
- FLAGS: 2 design tensions (0 high, 2 low)
- DOWNSTREAM: hero-roster.json ready for BUILDFORGE, ACTFORGE, ITEMFORGE, UPGRADEFORGE

### BUILDFORGE Run — 2026-03-30
- VERSION: v1.0.0
- TYPE: SYSTEM
- SCOPE: BUILDFORGE
- STATUS: IMPLEMENTED
- INPUT: world-economy.json + hero-roster.json + pitch.txt + world-template.json (Shadowbound Guild)
- OUTPUT: guild-engine/generated/building-system.json
- BUILDINGS: 3 total (1 producer, 1 transformer, 1 creator)
- WORKFLOWS: 6 total (5 queued, 1 passive)
- UPGRADES: 6 total
- RECIPES: 4 total
- FLAGS: 0 design tensions flagged
- DOWNSTREAM: building-system.json ready for ACTFORGE, ITEMFORGE, UPGRADEFORGE

### ACTFORGE Run — 2026-03-30
- VERSION: v1.0.0
- TYPE: SYSTEM
- SCOPE: ACTFORGE
- STATUS: IMPLEMENTED
- INPUT: world-economy.json + hero-roster.json + building-system.json + pitch.txt + world-template.json
- OUTPUT: guild-engine/generated/acts.json
- ACTS: 2 total
- EXPEDITIONS: 6 standard, 2 boss
- EVENTS: 8 total
- LOOT TABLES: 8 total
- FLAGS: 0 design tensions flagged
- DOWNSTREAM: acts.json ready for ITEMFORGE, UPGRADEFORGE

### ITEMFORGE Run — 2026-03-30
- VERSION: v1.0.0
- TYPE: SYSTEM
- SCOPE: ITEMFORGE
- STATUS: IMPLEMENTED
- INPUT: world-economy.json + hero-roster.json + building-system.json + acts.json + pitch.txt + world-template.json
- OUTPUT: guild-engine/generated/item-ecosystem.json
- ITEMS: 50 total (24 equipment, 8 consumables, 18 materials)
- RARITY: 16 common, 14 uncommon, 9 rare, 5 epic, 1 legendary
- LOOT TABLES: 8 total (8 matched to ACTFORGE references)
- SALVAGE PROFILES: 24/24 equipment items with salvage defined
- FLAGS: 0 design tensions flagged
- DOWNSTREAM: item-ecosystem.json ready for UPGRADEFORGE, ASSEMBLER

### UPGRADEFORGE Run — 2026-03-30
- VERSION: v1.0.0
- TYPE: SYSTEM
- SCOPE: UPGRADEFORGE
- STATUS: IMPLEMENTED
- INPUT: world-economy.json + hero-roster.json + building-system.json + item-ecosystem.json + acts.json + pitch.txt + world-template.json
- OUTPUT: guild-engine/generated/upgrade-ecosystem.json
- UPGRADES: 10 total (3 economy, 3 hero, 2 building, 2 expedition)
- PRESTIGE: disabled
- FACTIONS: 2 total (Merchant Consortium, Shadow Hunters — 5 rep tiers each)
- FLAGS: 0 design tensions flagged
- DOWNSTREAM: upgrade-ecosystem.json ready for ASSEMBLER

### ASSEMBLER Run — 2026-03-30
- VERSION: v1.0.0
- TYPE: SYSTEM
- SCOPE: ASSEMBLER
- STATUS: PASS_WITH_WARNINGS
- INPUT: world-economy.json + hero-roster.json + building-system.json + acts.json + item-ecosystem.json + upgrade-ecosystem.json
- OUTPUT: guild-engine/generated/project.json
- NODES MERGED: 116 total (resources: 3, hero_class: 8, building: 3, building_workflow: 6, building_upgrade: 6, crafting_recipe: 4, act: 2, expedition: 6, boss_expedition: 2, event: 8, loot_table: 8, item: 50, upgrade: 10, faction: 2, prestige: 0)
- CROSS-REFERENCE ERRORS: 0
- CALIBRATION WARNINGS: 3 (Act 1 fast completion, iron ore deficit, level-1 party low power)
- CANVAS DOCTOR: skipped
- NEXT: Import project.json into editor → run auto-rig → Compile → playtest

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

### v1.9.4 — UPGRADEFORGE Implementation
- DATE: 2026-03-29
- TYPE: SYSTEM
- SCOPE: UPGRADEFORGE (new forge)
- STATUS: IMPLEMENTED
- SUMMARY: Sixth forge in the Forge Suite. Progression architect, not an upgrade stamper. Reads all five upstream forge outputs: WORLDFORGE (world-economy.json) for resource IDs, income curves, and cost anchors; HEROFORGE (hero-roster.json) for stat growth baselines; BUILDFORGE (building-system.json) for building IDs and workflow durations; ACTFORGE (act-*.blueprint.json) for act structure and expedition IDs; ITEMFORGE (item-ecosystem.json) for equipment stat baselines and rarity ceiling. Generates three node types: upgrade nodes (with cost $ref cost array, max_tier, and effect object supporting resource_cap_multiplier/resource_income_multiplier/hero_stat_modifier as $ref stat_block, plus expedition_success_bonus/craft_speed_multiplier/loot_bonus_pct as numbers, plus unlock_node_ids as string array), prestige nodes (with trigger_conditions $ref unlock_condition array, currency_id referencing a resource, optional currency_formula JS expression with vars gold/act/hero_count, optional resets enum array of resources/buildings/heroes/upgrades/expeditions/factions, and bonuses array with id/label/cost as number/effect as $ref stat_block/optional max_tier), and faction nodes (with rep_tiers array of threshold/label/optional unlock_node_ids/optional discount_pct, plus optional starting_rep and connections to event/building/upgrade). Applies five-step narrative analysis (upgrade theme discovery, prestige loop design, faction landscape mapping, effect sizing audit, translation flags), runs mandatory calibration across eight tables (upgrade count by density, cost curve with tier-anchored math, effect sizing vs all upstream baselines, prestige currency formula validation, prestige reset soft-lock analysis, prestige bonus design, faction rep tier pacing, faction relation annotations as design-only). Schema-correct: faction nodes have NO relations[] field (cross-faction dynamics documented in calibration only); prestige currency_formula and resets are OPTIONAL; prestige bonus cost is a simple number not a cost array; prestige bonus effect is $ref stat_block (flat key-value map); upgrade effect allows multiple properties but design rule enforces one per node. Outputs upgrade-ecosystem.json with all upgrade/prestige/faction nodes plus upgrade_calibration (cost curve, effect sizing, stacking analysis), prestige_calibration (formula validation, reset impact, bonus audit), faction_calibration (pacing, intended relations as design annotations), flags, and downstream_contracts for ASSEMBLER (all upgrade IDs, all faction IDs, prestige ID + currency ID, all cost resource IDs, all faction/upgrade unlock_node_ids for cross-reference validation). Flags design tensions to upgrade-flags.md.
- GENERATOR IMPACT: New UPGRADEFORGE.md prompt. Outputs guild-engine/generated/upgrade-ecosystem.json. ASSEMBLER reads all_upgrade_ids for upgrade_owned unlock condition validation, all_faction_ids for faction_rep_gte validation, prestige_currency_id to verify resource exists, all cost resource_ids to verify WORLDFORGE resources exist, all faction/upgrade unlock_node_ids to verify targets exist in upstream forges. Last domain forge before ASSEMBLER.
- WIKI SECTION: To be added under "Forge Suite — UPGRADEFORGE"

### v1.9.5 — ASSEMBLER Implementation
- DATE: 2026-03-30
- TYPE: SYSTEM
- SCOPE: ASSEMBLER (new forge — final stage)
- STATUS: IMPLEMENTED
- SUMMARY: Seventh and final forge in the Forge Suite. Integration specialist, not a content
  generator. Merges all 6 upstream forge outputs, runs 23 cross-reference checks (with
  type-branched logic for prestige trigger_conditions and artisan specialization matching),
  performs 7-category cross-system calibration audit (income timing, material flow with surplus
  detection, hero power curve, equipment vs upgrade power, prestige soft-lock, faction pacing,
  workflow duration bounds), merges node sets with type-conflict detection, documents intended
  edges for auto-rig, invokes CANVASDOCTOR as black-box validator on merged output, writes
  project.json + assembler-report.md. Includes pre-run schema verification to catch field name
  drift between forge versions. Known discrepancies documented: rules.js crafting_recipe
  REQUIRED_FIELDS uses legacy field names (output_item_id, workflow_id) while schema uses
  output_item and required_workflow; CANVASDOCTOR uses building_id and input_rules[].resource_id
  where schema uses host_building and inputs[].resource. ASSEMBLER resolves all discrepancies at
  runtime via pre-run schema verification.
- GENERATOR IMPACT: New ASSEMBLER.md prompt. Outputs guild-engine/generated/project.json (merged
  nodes + editor_metadata.intended_edges) and guild-engine/generator/assembler-report.md
  (cross-reference errors, calibration warnings, CANVASDOCTOR summary, intended edges for auto-rig,
  upstream forge flags). The Forge Suite pipeline is now complete: WORLDFORGE → HEROFORGE →
  BUILDFORGE → ACTFORGE → ITEMFORGE → UPGRADEFORGE → ASSEMBLER → project.json → editor.
- WIKI SECTION: To be added under "Forge Suite — ASSEMBLER"
