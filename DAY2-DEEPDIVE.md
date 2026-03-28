# Guild Engine — Day 2 Deep Dive
### March 29, 2026
### Building Systems, Tuning Utility, Blueprint Ecosystem

---

## What this session set out to do

Day 1 ended with a working editor, engine, compiler, and generator pipeline — 14 node types, 12 implemented game systems, one fully playable test game. The validated gap list was explicit: hero inventory/equipment UI, expedition screen animations, Pass 3 expansion, prestige, faction rep, crafting recipe generation.

Day 2 ignored the gap list entirely. The right call.

Instead of filling in the Shadowbound Guild's missing screens, we designed the **building system** — the subsystem that makes every non-combat location in a game feel alive. Forge, Apothecary, Library. Three complete blueprints. A tuning utility. A community sharing ecosystem. A single generic schema node type that handles all of them.

This was the correct sequencing. The building system touches every other system — items, heroes, resources, world effects, acts. Designing it now, before implementing equipment UI or expedition animations, means every future screen knows what it's rendering.

---

## The architecture decision that made everything else easy

The single most important decision of the day happened in the first ten minutes: **one node type for all buildings.**

The temptation was to create `forge_node`, `apothecary_node`, `library_node` — one per building type. This is the obvious wrong answer. It produces three schema sections that are 80% identical, three engine processors that are 80% identical, and a maintenance burden that compounds with every new building.

The correct answer: `building_workflow`. One node type. The `behavior` enum (consume_item, consume_resource, produce_resource, modify_item, recruit_hero) covers every building action we can conceive. The `workflow_mode` field (queued vs passive) covers the timing model. The `output_rules` array with five `output_type` values covers every output the game can produce.

The proof is in the generalization table. After speccing three completely different buildings:

| Building | behavior | workflow_mode | output_type | Special mechanic |
|---|---|---|---|---|
| Forge | consume_item | queued | resource + item | batch_config |
| Apothecary | consume_resource | queued | consumable | streak_bonus |
| Library | consume_resource | passive + queued | world_effect | momentum_config |
| Mine | produce_resource | passive | resource | — |
| Barracks | consume_resource | queued | hero_instance | passive_events |

All five run through `processBuildingTick`. The engine doesn't know what "melt" means. It reads the config and executes it.

This is the Guild Engine's core philosophy: **the engine is a formula evaluator, not a game.** The designer decides what the formulas say.

---

## The output type taxonomy — final

Five output types, fully specced. Two scoped for future buildings.

| output_type | Where it goes | Example |
|---|---|---|
| resource | Resource pool | Iron ingots from smelting |
| item | Hero/guild inventory | Iron sword from crafting |
| consumable | Buff stockpile | Warriors Draught from brewing |
| world_effect | World state (direct) | Expedition zone unlocked by research |
| hero_instance | Recruitable hero pool | Footsoldier from Barracks |
| item_modifier* | Existing item in-place | Enchantment added to sword |
| hero_modifier* | Hero stat block | Permanent stat from Stables |

*Scoped for Enchanter and Stables buildings. Not in v1 schema.

The `world_effect` type is the most important addition. It's what makes the Library feel different from the Forge — outputs that don't go into an inventory but directly flip world state. `unlock_node`, `apply_modifier`, `trigger_event`. These three effect types handle everything the Library needs and anything the act system might need to emit from a building.

The insight that this output type existed was forced by the Library design question: "if the output isn't an item, where does it go?" The answer — it goes to the world state, not any inventory — is what crystallized the need for `world_effect`.

---

## Special mechanics as building-level configuration

Each building type has a signature mechanic that makes it feel distinct from the others. Critically, these mechanics are **schema-configured, not engine-hardcoded**.

**Batch efficiency (Forge):** `batch_config.max_size` + the duration formula `base_duration * (1 + (batch_size - 1) * 0.3)`. The engine reads the formula. The designer writes the formula. The 0.3 efficiency coefficient is a tunable value, visible in the Formula Lab panel.

**Concentration streak (Apothecary):** `streak_bonus` block. `threshold`, `duration_reduction`, `crit_bonus`. The engine checks `streak_count` against `threshold` each tick. If the designer sets threshold to 3 instead of 5, the system adjusts. The mechanic's feel changes without touching engine code.

**Research momentum (Library):** `momentum_config` block. `gain_per_job`, `decay_per_idle_tick`, `thresholds[]`. The decay rate is the most sensitive tuning parameter — too fast and the mechanic is punishing, too slow and it's irrelevant. The Formula Lab's curve visualizer exists specifically to tune this.

**Walk-in recruits (Tavern/Barracks):** `passive_events` array on the building node. `hero_available` event type with `interval_formula`, `available_for_ticks`, and `rarity_table`. The engine fires the event on a timer. No new node type needed — just a new event type in the existing event system.

The pattern: **one schema field for each mechanic, read by one engine branch.** The alternative — special-case code per building — would have made the engine brittle and the designer's authoring experience opaque.

---

## The success table — one probability model for everything

The most carefully designed shared definition is `success_table`. It encodes a probability model that works for every building:

```
Roll order:
1. failure_chance check → FAIL (inputs consumed or refunded per failure_behavior)
2. crit_chance check    → CRIT (fires crit_behavior)  
3. remainder            → SUCCESS (normal output)
```

The roll order is deliberate. Crits only fire on non-failures — a crit cannot be "wasted" on a failed job. This prevents a specific frustration: rolling both failure and crit simultaneously and having to decide which wins.

`failure_behavior` has three values tuned to three building types:
- `consume_inputs_no_output` — Forge default. Harsh, appropriate for physical crafting.
- `partial_refund` — Apothecary default. 50% return, appropriate for alchemical processes where learning salvages something.
- `reset_progress_refund_inputs` — Library default. Most forgiving. Research failure doesn't destroy knowledge — it just means starting over. The Scholar keeps XP.

`crit_behavior` has five values:
- `double_output` — quantity ×crit_multiplier. Default for resource/consumable outputs.
- `quality_upgrade` — output item becomes `crit_output_item` (the masterwork variant). Correct for equipment — you can't equip two swords.
- `rarity_upgrade` — hero_instance rarity bumped one tier. Correct for recruitment.
- `breakthrough` — fires `breakthrough_table` bonus world_effect in addition to normal output. Library-specific. Makes crits genuinely surprising.
- `extend_duration` — consumable buff duration ×crit_multiplier. Alternative for apothecary.

The `xp_on_complete` + `failure_xp_multiplier` pair encodes a design philosophy that came up three times during the session: **failure should not feel like pure punishment.** The Forgemaster who fails a craft learns from it. Half XP, not zero XP. This is implemented in the schema default (`failure_grants_xp: true`, `failure_xp_multiplier: 0.5`) and overridable per workflow.

---

## The consumable system redesign — idle model vs action model

The first Apothecary spec had consumables as action-use items: player drinks a health potion mid-expedition. This was rejected in favor of the idle model: **buffs apply to the next N expeditions, consumed on departure.**

This decision is architecturally significant, not just aesthetically. Action-use items require the expedition screen to be interactive — the player makes decisions during a run. The idle model keeps expeditions as delegated tasks: you prepare, you commit, you watch the event log. The preparation phase (buff application before launch) becomes the strategic layer.

The endgame vision crystallized from this: an Apothecary running 6 Alchemists in `intensify` stack mode, maintaining a rotating library of 8 consumable types, auto-applying to 12 heroes before each expedition wave. This is a production planning puzzle, not an action game. The idle model enables it; the action model prevents it.

**`duration_type` enum:**
- `expedition_count` — basic. Lasts N runs.
- `expedition_success` — advanced. Doesn't consume on failed expeditions. Rewards good preparation.
- `permanent_until_death` — endgame. A one-time heroic dose that persists until the hero dies.

**`stack_behavior` enum:**
- `refresh` — safe. Resets counter.
- `extend` — rewards stockpiling. Adds to remaining.
- `intensify` — dangerous and fun. Stacks effect value up to `stack_cap`. Three doses of Warriors Draught at intensify gives 3× ATK bonus. Managing the supply to maintain 3 stacks is the endgame crafting challenge.

**Buff slot system:** Heroes have 2–5 buff slots. The constraint is what makes it a game. Without a slot limit, every hero runs with every buff all the time — the system becomes pure accounting. With slots, the player makes meaningful choices: SPD tincture or ATK draught for this particular dungeon?

---

## The tuning utility — why it's a separate tab

The side panel works for identity fields (name, ID, label) and simple toggles. It breaks for:
- Formulas referencing 4+ variables
- Batch efficiency curves across 10 upgrade tiers
- XP progression from level 1 to 20
- Cross-building dependency trees

The tuning utility is a **dedicated full-screen mode accessible via tab in the main editor layout**. Four panels:

**Formula Lab:** Formula registry (every formula in the project), inline editor with variable autocomplete, slider bank for each referenced variable, live curve graph (single curve or heatmap), danger zone overlays. The designer can see in real time what `max(0, 0.10 - (forge_level * 0.02) - (worker_skill * 0.0008))` looks like across the full parameter space.

**XP Curves:** Visual curve editor for every leveling entity. Four shapes (linear, polynomial, exponential, s-curve), 2–3 shape parameters each. Milestone table auto-generated from the curve — shows level, XP required, cumulative XP, time-to-level at a target XP/minute rate. The designer sets the target pace in plain English ("Forgemaster level 10 in 2 hours") and the table validates whether the curve hits it.

**Economy Balance:** Resource flow diagram (node graph collapsed to just resources and buildings). Time simulation slider from 0 to 10 hours of play — drag it and watch the economy change. Three automatic flags: deadlock (resource at zero with no income when critical upgrade needs it), bottleneck (resource accumulating 10× faster than spend rate), sink needed (resource with no spending path after an act). This simulation is explicitly approximate — linear projections, not the full tick engine. The UI says so.

**Upgrade Trees:** Tech tree view of all `building_upgrade` nodes, independent of the node canvas. Left-to-right tier layout, branching paths, inline edit forms (no side panel needed from here). Cross-building dependencies shown as colored arcs between trees. This view reveals what the canvas cannot: the full upgrade dependency landscape across all buildings simultaneously.

---

## The blueprint system — Factorio presets for Guild Engine

A blueprint is a pre-wired subgraph: nodes + edges + canvas layout, saved as a `.blueprint.json` file. It is the correct abstraction for several reasons:

**Authoring:** The designer places a blueprint on the canvas and gets 14 connected nodes instead of building from scratch. The blueprint is not a template that generates — it's a literal saved state of real nodes, importable verbatim. IDs are namespaced on import to prevent collisions, enabling two forge instances in one project.

**Customization:** After placing, the designer edits nodes normally. The blueprint is a starting point, not a constraint. `customization_hints` in the metadata guide the designer toward the most common modifications.

**Generation:** The generator pipeline produces blueprints, not raw nodes. Pass 2 loads the relevant standard blueprint, runs theme adaptation (rename resources, adjust formulas, scale numbers to the world economy), and outputs a customized variant. The Shadowbound Guild gets `forge_shadowbound.blueprint.json`, not generic `forge_standard.blueprint.json`. The canvas arrives pre-connected, pre-balanced, pre-themed.

**Sharing:** Three tiers of sharing in the design:
- File share (v1): `.blueprint.json` posted anywhere, imported from disk. Zero infrastructure.
- Community registry (future): Hosted index, browsable from editor, queryable by generator.
- Generator-to-community pipeline (Day 100): Generator produces a blueprint, designer refines it, uploads it. Community uses it as a starting point. The ecosystem becomes self-populating.

**Blueprint metadata** is the key to making sharing viable. `requires_schema_version` enables migration tooling. `generator_origin` records provenance. `flavor_tags` and `system_tags` enable filtering. `complexity` helps designers choose appropriate starting points. `customization_hints` preserve institutional knowledge about how to adapt the blueprint.

---

## The Forgemaster — why non-combat heroes matter

The Forgemaster is not a convenience feature. It's a structural decision that changes how the player thinks about their roster.

Before the Forgemaster: heroes are expedition resources. More heroes = more expeditions per cycle. The player's roster management question is "how many heroes can I send out simultaneously?"

After the Forgemaster: heroes are specialized resources. A Forgemaster assigned to the Forge is not available for expeditions — and vice versa. The player's question becomes "what's the right balance between my fighting force and my crafting infrastructure?" This is a genuinely interesting resource allocation problem.

The `hero_type: "artisan"` extension to `hero_class` enables this with three fields: `combat_eligible: false`, `assignment_target: "building"`, `building_affinity: ["forge"]`. The compiler validates that artisan heroes are not added to expedition party slots. The engine checks assignment when processing building ticks.

The Forgemaster's three specializations (smelter, weaponsmith, armorsmith) add flavor without complexity. `worker_specialization_match` is 1 or 0 in the formula context — the formula bonus fires or it doesn't. The designer writes the bonus into the formula; the system evaluates it automatically.

The `unique_passive` field on `hero_class` — first used for the Scholar's `academic_network` synergy (+10% effective skill when two Scholars share a building) — opens a design space for artisan interaction effects. This field was added for the Scholar but is generic. A future Alchemist with a synergy passive that fires when assigned alongside an Explorer-class hero (who brings rare ingredients back from expeditions) is entirely expressible in the schema.

---

## Compiler additions — seven new validation rules

Seven new rules added to the compiler's five-phase system:

1. `cross_building_prerequisite_exists` — Referenced buildings in `requires.cross_building` must exist in the graph.
2. `cross_building_max_level_sufficient` — The referenced building must have upgrade tiers reaching the required level.
3. `no_circular_building_prerequisites` — Forge L2 requires Mine L2, Mine L2 requires Forge L2 = deadlock. Compiler catches it.
4. `output_rule_resource_exists` — Every resource-type output rule references a real resource node.
5. `output_rule_item_exists` — Every item/consumable-type output rule references a real item node.
6. `hero_class_artisan_assignment_valid` — Artisan hero_class must have `combat_eligible: false`.
7. `blueprint_schema_version_compatible` — On import, blueprint's `requires_schema_version` must be <= current schema version.

Rules 1–3 are the most important. Cross-building dependency errors are the hardest to debug manually — a designer who creates a deadlock between Mine and Forge requirements will not find it by reading the canvas. The compiler finds it in phase 4.

---

## The Library — why it's the most important blueprint

The Forge proved the schema works for item production. The Apothecary proved it works for consumable production. The Library was the stress test: does it work for **no item output at all**?

The answer required one new concept: `world_effect`. An output that mutates world state directly — `unlock_node`, `apply_modifier`, `trigger_event`. These three effect types handle everything from "unlock Act 2" to "+15% XP for all Scholars" to "the Ancient Map event fires."

The insight is that world effects were already in the schema — the act system and event system use them. The Library just becomes a *building-level source* of world effects, produced by `building_workflow` nodes instead of hardcoded into act transitions.

This unification is valuable. A world effect produced by completing 10 Library research jobs is mechanically identical to a world effect produced by defeating the Act 1 boss. Both flip the same flag. The engine handles both with the same state mutation code. The designer connects them differently on the canvas, but the effect is the same.

The Library's `breakthrough` crit behavior is the most interesting crit type in the schema. Instead of better quantity or better quality, a breakthrough fires an unplanned discovery from the `breakthrough_table` — a bonus world effect that the player didn't expect. A Cartographer Scholar researching dungeon maps might breakthrough into unlocking a secret expedition variant. This makes the Library feel like research should feel: occasionally producing a discovery that changes the game.

`reset_progress_refund_inputs` as the failure behavior is correct for the Library's theme. Research failure means starting over, not losing materials. The Scholar keeps half XP ("learned what doesn't work"). This is more forgiving than the Forge's `consume_inputs_no_output` and more narratively coherent — burning your ore is gone, but knowledge of what doesn't work is not nothing.

---

## What the schema now contains

### Day 1: 14 node types
resource, building, upgrade, hero_class, ability, item, loot_table, expedition, act, event, faction, prestige, crafting_recipe (original), hero_status

### Day 2 additions: +4 node types
building_workflow, building_upgrade, crafting_recipe (redesigned, replaces original), blueprint

### Day 2 extensions: 3 existing node types
hero_class: +hero_type, +combat_eligible, +primary_stat, +xp_source, +specializations, +assignment_target, +building_affinity, +unique_passive, +recruitment
item: +item_type, +salvage_profile, +consumable_config, +stack_max
building: +has_workflows, +artisan_slots, +buff_slots, +passive_events

### New shared definitions: 8
output_rule, success_table, formula_variable_registry, momentum_config, streak_bonus, passive_event, buff_config, blueprint_meta

### New compiler rules: 7
(listed in compiler section above)

### New connection rules: 6
building_workflow→building, building_upgrade→building, building_upgrade→building_workflow, crafting_recipe→building_workflow, hero_class[artisan]→building, building_upgrade→building[cross]

---

## Numbers

| Artifact | Lines / Size |
|---|---|
| schema-additions-day2.json | ~600 lines |
| Day 2 design specs (this session) | ~8,000 words |
| Node types total (Day 1 + Day 2) | 18 |
| Shared definitions total | 14 |
| Building blueprints specced | 3 (Forge, Apothecary, Library) |
| Output types defined | 5 (+ 2 scoped) |
| Artisan classes defined | 3 (Forgemaster, Alchemist, Scholar) |
| Compiler rules total | 12 (5 from Day 1 + 7 new) |

---

## What to build next

**Immediate (unblocked by this spec):**
- Implement `processBuildingTick` in engine.js using the building_workflow schema
- Build the Tuning Utility tab in the editor (Formula Lab first, then XP Curves)
- Build the Blueprint library UI and import/export system
- Implement the three preset blueprints as actual .blueprint.json files

**Soon (depends on building system being in engine):**
- Hero equipment UI (now knows what items look like post-Forge)
- Buff stockpile UI (now knows what consumables look like post-Apothecary)
- Pre-expedition preparation screen (buff application phase)
- Building management UI per building type

**Later:**
- Enchanter building (item_modifier output type)
- Stables building (hero_modifier output type)
- Community blueprint registry (backend infrastructure)
- Pass 3 generator expansion for building blueprints

---

## The meta-observation for Day 2

Day 1 produced a tool. Day 2 produced a **language**.

The `building_workflow` node type is not a feature — it's a vocabulary word. Every crafting building in every future game designed with Guild Engine will be expressed in terms of this word. The Mine is a building_workflow with produce_resource behavior and passive mode. The Barracks is a building_workflow with recruit_hero behavior and queued mode. A sci-fi Research Lab is a building_workflow with consume_resource behavior and passive mode and world_effect outputs. The word is the same. The meaning changes with configuration.

This is what a game authoring tool should produce: not a collection of features, but a vocabulary for expressing game designs. The designer who learns `building_workflow` can describe any crafting building they can imagine. The engine that runs `building_workflow` can run any game a designer can describe.

Ren'Py's `say`, `menu`, and `scene` commands are not features. They are a vocabulary for visual novel authorship. Guild Engine's `building_workflow`, `expedition`, and `hero_class` nodes are the same thing for incremental RPGs.

The vocabulary is not complete. `item_modifier` and `hero_modifier` are missing words. The prestige and faction systems from Day 1 are still unimplemented. Pass 3 of the generator is unwritten.

But the vocabulary is coherent. Every word defined so far is consistent with every other word. The schema version is 1.2.0 and the grammar is holding.

---

*End of Day 2. — March 29, 2026*
