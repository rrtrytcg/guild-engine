
### v1.4.0 — Day 2 building system (building_workflow, artisan classes, consumables)
- DATE: 2026-03-29
- TYPE: SYSTEM
- SCOPE: PASS2
- STATUS: IMPLEMENTED
- SUMMARY: 4 new node types (building_workflow, building_upgrade, crafting_recipe redesign, blueprint). 3 extended node types (hero_class +hero_type/combat_eligible/artisan fields, item +consumable_config/stack_max, building +has_workflows/artisan_slots/passive_events). 8 new shared definitions. Formula evaluator. processBuildingTick runtime. Artisan hero classes (non-combat, workflow-produced). Consumable buff stockpile. world_effect output type. 7 new compiler rules.
- GENERATOR IMPACT: GENERATORPASS2.md updated with — new ID manifest fields (building_workflow_ids, building_upgrade_ids), Step 2B (workflow generation), artisan class generation, building_upgrade generation, Day 2 hero_class fields, Day 2 item fields, Day 2 building fields, new canvas columns (x=1760, x=2000), new validation rules, schema_version bumped to 1.2.0 in output meta.
- WIKI SECTION: To be added under "Buildings", "Crafting System", "Artisan Heroes"

### PENDING: BuildingWorkflowInspector (editor UI)
- TYPE: SYSTEM
- SCOPE: NONE (runtime implemented — editor UI only)
- STATUS: PENDING
- SUMMARY: Inspector panel for building_workflow nodes. Fields: behavior, workflow_mode, action_type, base_duration_ticks, input_rules, output_rules, success_table, streak_bonus, momentum_config.
- GENERATOR IMPACT: None — generator already produces correct nodes.
- WIKI SECTION: "Buildings" → "Workflow Inspector"

### PENDING: BuildingUpgradeInspector (editor UI)
- TYPE: SYSTEM
- SCOPE: NONE
- STATUS: PENDING
- SUMMARY: Inspector panel for building_upgrade nodes. Fields: building_id dropdown, required_building_level, cost, unlocks_workflow_ids, artisan_slot_increase.
- GENERATOR IMPACT: None.
- WIKI SECTION: "Buildings" → "Upgrade Inspector"

### PENDING: Blueprint system UI
- TYPE: SYSTEM
- SCOPE: NONE
- STATUS: PENDING
- SUMMARY: Blueprint import/export in editor toolbar. Three preset blueprints (Forge, Apothecary, Library) as .blueprint.json files. BlueprintInspector.jsx.
- GENERATOR IMPACT: Pass 3 can accept "add [blueprint name] blueprint" as an expansion prompt. Needs Pass 3 update when UI is implemented.
- WIKI SECTION: "Blueprints"

### PENDING: Tuning utility tab (Formula Lab + XP curves)
- TYPE: SYSTEM
- SCOPE: NONE
- STATUS: PENDING
- SUMMARY: Editor tab with Formula Lab (live formula evaluation with variable sliders, danger zone highlighting) and XP curve visualizer (4 curve shapes, per-class configuration).
- GENERATOR IMPACT: None — tuning is post-generation.
- WIKI SECTION: "Tuning Utility"

### PENDING: Artisan assignment + workflow queue UI
- TYPE: SYSTEM
- SCOPE: NONE
- STATUS: PENDING
- SUMMARY: In-game UI for assigning artisan heroes to buildings and queuing workflow jobs. recruitPool display for hero_instance workflow outputs.
- GENERATOR IMPACT: None.
- WIKI SECTION: "Buildings" → "Artisan Management"

### PENDING: Pre-expedition preparation screen
- TYPE: SYSTEM
- SCOPE: NONE
- STATUS: PENDING
- SUMMARY: Screen shown before sending a party — apply consumable buffs from stockpile, review party stats with buff preview.
- GENERATOR IMPACT: None.
- WIKI SECTION: "Expeditions" → "Preparation"

### PENDING: item_modifier output type (Enchanter building)
- TYPE: SYSTEM
- SCOPE: PASS2
- STATUS: PENDING
- SUMMARY: Modifies an existing equipped item in-place. Requires Enchanter building blueprint.
- GENERATOR IMPACT: Pass 2 Step 2B needs item_modifier calibration when implemented.
- WIKI SECTION: "Buildings" → "Enchanter"

### PENDING: hero_modifier output type (Stables building)
- TYPE: SYSTEM
- SCOPE: PASS2
- STATUS: PENDING
- SUMMARY: Permanent stat modification on a hero instance. Requires Stables building blueprint.
- GENERATOR IMPACT: Pass 2 Step 2B needs hero_modifier calibration when implemented.
- WIKI SECTION: "Buildings" → "Stables"
