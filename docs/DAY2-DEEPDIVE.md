# Guild Engine — Day 2 Deep Dive
### March 29, 2026
### Technical and design retrospective

---

## What this session set out to do

Day 1 ended with a working editor, engine, compiler, and generator pipeline — 14 node types, 12 implemented game systems, one fully playable test game. The validated gap list was explicit: hero inventory, expedition screen animations, prestige, faction rep, crafting recipe generation.

Day 2 ignored the gap list entirely. The right call.

Instead of filling in the Shadowbound Guild's missing screens, we designed the **building system** — the subsystem that makes every non-combat location in a game feel alive. Three complete blueprints. A tuning utility. A canvas group system. A blueprint sharing ecosystem. A single generic schema node type that handles all of them. Then we playtested until the full craft loop worked.

This was the correct sequencing. The building system touches every other system. Designing it before implementing expedition animations means every future screen knows what it's rendering.

---

## The architecture decision that made everything else easy

The single most important decision of Day 2 happened in the first ten minutes: **one node type for all buildings.**

The temptation was `forge_node`, `apothecary_node`, `library_node`. This is the obvious wrong answer — three schema sections that are 80% identical, three engine processors that are 80% identical, maintenance burden that compounds with every new building.

The correct answer: `building_workflow`. One node type. The `behavior` enum (`consume_item`, `consume_resource`, `produce_resource`, `modify_item`, `recruit_hero`) covers every building action. The `workflow_mode` field (`queued` vs `passive`) covers the timing model. The `output_rules` array with five `output_type` values covers every output the game can produce.

The proof: after speccing three completely different buildings:

| Building | behavior | workflow_mode | output_type | Special mechanic |
|---|---|---|---|---|
| Forge | consume_item | queued | item | batch_config |
| Apothecary | consume_resource | queued | consumable | streak_bonus |
| Library | consume_resource | passive | world_effect | momentum_config |
| Mine | produce_resource | passive | resource | — |
| Barracks | consume_resource | queued | hero_instance | passive_events |

All five run through `processBuildingTick`. The engine doesn't know what "melt" means. It reads the config and executes it.

This is the Guild Engine's core philosophy: **the engine is a formula evaluator, not a game.** The designer decides what the formulas say.

---

## The blueprint system — lessons from the field

The blueprint system was designed cleanly on paper and messy in practice. The main lessons:

**Resource IDs are a project concern, not a blueprint concern.** The first three preset blueprints included resource nodes with IDs like `gold`, `iron_ore`, `iron_ingot`. These collided with project resources (`resource-gold`, `resource-iron_ore`) and created duplicate nodes, dangling references, and compiler errors. The fix was radical: **strip all resource nodes from blueprints entirely.** Blueprints are craft system templates — workflows, upgrades, artisan classes, items, recipes. The designer wires their project's resources into the blueprint's input slots themselves. One connection, done. This saved more time than the auto-remap system ever could.

**Semantic ID collision detection works but has limits.** The import remap that checks `humanize(missingId) === existingNode.label` (case-insensitive) correctly identifies that blueprint `gold` maps to project `resource-gold`. But it can't detect type mismatches — if the blueprint expects `gold` to be a resource but the project has `gold` as an item, the remap succeeds but the types are wrong. The compiler catches it, but the UX is still confusing. The right long-term fix is the auto-rig system that uses explicit edge connections to declare intent.

**Cross-reference remap must be a two-pass operation.** The first pass remaps node IDs. The second pass updates all fields that reference those IDs (`building_id`, `workflow_id`, `output_item_id`, `input_rules[].item_id`, etc.). The original implementation only did the first pass, causing all workflow nodes to have `building_id: null` after import. Adding the second pass fixed the Forge tab immediately.

**Auto-create missing dependencies is the right UX.** When a blueprint references `iron_ingot` and the project has no such resource, creating it automatically (with a "4 nodes auto-created" notification) is far better than failing with an error. The designer can wire or delete the auto-created nodes in seconds. The alternative — requiring the designer to pre-create all dependencies before importing — violates the "just works" principle.

---

## The formula evaluator — a subtle but critical decision

The Day 2 schema added a `formula_variable_registry` — a complete dictionary of every variable available inside any formula string. Variables like `worker_skill`, `building_level`, `batch_size`, `momentum`, `streak_count`.

The engine's `evaluateFormula(formulaString, variables)` implementation uses the `Function` constructor with a variable whitelist. This is deliberately not `eval()`. The whitelist means a formula like `base_duration_ticks * (1 - worker_skill / 200)` works, but `fetch('http://evil.com')` does not. Designers can write real mathematical expressions without being able to execute arbitrary code.

The Formula Lab in the tuning utility exposes this evaluator directly — type a formula, drag variable sliders, see the live result. This makes formula authoring tangible and testable without running the engine. The danger zone thresholds (failure rate > 30% → red warning) come directly from `x-tuning-config` in the schema, so they update automatically if the thresholds change.

---

## The consumable system — idle model wins

The first Apothecary spec had consumables as action-use items: player uses a health potion mid-expedition. This was rejected in favor of the idle model: **buffs apply to the next N expeditions, consumed automatically on departure.**

This decision is architecturally significant. Action-use items require the expedition screen to be interactive — the player makes decisions during a run. The idle model keeps expeditions as delegated tasks: prepare, commit, watch the event log. The preparation phase (buff application before launch) becomes the strategic layer. No click-heavy mid-run decisions, no pause mechanics needed.

The pre-expedition buff auto-apply was implemented in the engine — if consumables are in the buff stockpile and heroes are eligible, they apply before departure without player action. The pre-expedition preparation screen (where the player actively chooses which buffs to apply) is designed but not yet built — it's in the PENDING list for Day 2 extended objectives.

---

## The engine UI restructure — from 3 panels to 4 columns

The original 3-panel layout (left sidebar / center screen / right sidebar) hit a scaling wall. Heroes crammed in a 260px sidebar, screen switching via `display:none` toggling, event log buried at bottom right. At 5 heroes it worked. At 15 heroes it collapsed.

The 4-column restructure solved this cleanly:

- **Left column (180px)** — resources, nav, acts. Always visible. Never changes.
- **World column (260px)** — buildings and upgrades. Always visible. Clicking a building opens compact detail inline.
- **Detail column (flex:1)** — tab bar at top (Recruits / Inventory / Expedition / Forge), event log pinned at bottom. The tab bar is always one click from any screen. The event log never disappears.
- **No right panel** — heroes moved to Recruits tab. No more sidebar.

The key insight: the event log must always be visible. It's the heartbeat of the game — crafts completing, heroes leveling, expeditions returning. Hiding it behind a screen switch means the player misses the feedback that makes idle games satisfying.

The old `setScreen('world')` / `setScreen('expedition')` / `setScreen('forge')` pattern was replaced with tab state on the detail column. The World column doesn't hide anymore — it's always there, giving the player spatial awareness of their buildings regardless of which tab is active.

---

## The canvas group system — two layers, one canvas

At 32 nodes the Shadowbound Guild canvas is manageable. At 100 nodes it would be chaos. The group system solves this with a two-layer view:

**Node layer** (default) — every node visible, full detail, drag and connect. Current behavior, unchanged.

**Group layer** — colored boxes only. "Forge System", "Heroes", "Act 1 — The Outskirts". Click a box to zoom into its nodes. Pan at the group level to understand the whole game's structure at a glance.

Groups are created by selecting nodes and clicking "Group selected." Blueprint imports auto-create a group for all imported nodes. Groups persist in the exported `project.json` as editor metadata — they don't affect compilation or the runtime, just the designer's working view.

The group layer is implemented as a CSS grid of positioned divs, not a second ReactFlow instance. This was deliberate — ReactFlow for the group layer would add complexity and layout overhead for what is essentially a dashboard view. Simple divs render faster, are easier to style, and don't fight with ReactFlow's coordinate system.

---

## The auto-wire + auto-rig system — why edges are the right interface

The original plan for auto-rig used canvas position to infer connections — closest item to closest workflow, etc. This was replaced with the correct answer: **the designer draws cables, auto-rig reads them.**

This shift happened because of a designer observation: "why not use the cable connections between nodes to indicate the workflow rather than distance?" This is exactly right. Edges in a node graph ARE declarations of intent. The designer who draws a cable from Iron Ore to Smelt Ore is saying "this resource feeds this workflow." Auto-rig just executes that declaration.

The relation type on each edge is inferred from source and target node types using the connection rules table from `x-connection-rules` in the schema. A cable from `resource` to `building_workflow` gets relation `consumes`. A cable from `building_workflow` to `resource` gets relation `produces`. The color encodes the relation type — teal for produces/drops, amber for consumes/used_by, purple for unlocks/gates.

When the designer selects a stack of connected nodes and clicks "⚡ Rig", auto-rig reads all internal edges and fills in every ID cross-reference field: `building_id`, `workflow_id`, `output_item_id`, `output_rules[].target`, `input_rules[].item_id`, `loot_table_id`, `on_success_unlock[]`, and more. One click replaces what previously required manually copying IDs between inspector panels.

---

## What the generator pipeline gained

GENERATORPASS2.md was updated for schema v1.2.0 with:
- New ID manifest fields (building_workflow_ids, building_upgrade_ids)
- Step 2B — workflow generation with calibration tables (forge/apothecary/library behavior types)
- Artisan hero class generation (non-combat, workflow-produced, free recruit)
- Building upgrade generation (per level after L1)
- Day 2 fields on hero_class, item, building nodes
- New canvas layout columns (x=1760 workflows, x=2000 upgrades)
- 7 new validation checklist items
- Schema version bumped to 1.2.0 in output meta

The CHANGELOG.md self-maintenance mechanism continues to work as designed — Pass 2 reads CHANGELOG, finds PENDING items that are now IMPLEMENTED in the schema, and auto-includes them. The blueprint system generation is PENDING until the preset blueprints are stable enough to generate programmatically.

---

## What to build next — Day 2 extended objectives

**Immediate (auto-rig finishing):**
- Already-edged blueprints — preset blueprints ship with edges drawn between their nodes so the designer sees the wiring visually on import
- Canvas doctor Claude Code prompt — reads project.json, finds all incomplete nodes and dangling references, generates a fix list

**Soon:**
- M6 expedition screen — animated countdown, boss phase flash, abort button, live event log
- Pre-expedition preparation screen — active buff selection before departure
- Mid-run events UI — player choice rendering during expedition countdown
- Hero slot subtype system (sword/staff/bow) — class-specific weapon filtering

**Later:**
- Faction system generation in Pass 2
- Prestige layer generation in Pass 2
- Enchanter building (item_modifier output type)
- Community blueprint registry

---

## Numbers

| Metric | Day 1 | Day 2 |
|---|---|---|
| Schema version | 0.1.0 | 1.2.0 |
| Node types | 14 | 18 |
| Shared definitions | 6 | 14 |
| Compiler rules | 5 | 12 |
| Connection rules | 14 | 20 |
| Engine systems | 12 | 17 |
| Preset blueprints | 0 | 3 |
| Editor inspector panels | 14 | 19 |
| Generator passes | 5 | 5 (updated) |
| Lines of code (approx) | 7,000 | 14,000+ |

---

## The meta-observation for Day 2

Day 1 produced a tool. Day 2 produced a **language**.

The `building_workflow` node type is not a feature — it's a vocabulary word. Every crafting building in every future game designed with Guild Engine will be expressed in terms of this word. The Mine is a building_workflow with `produce_resource` behavior and passive mode. The Barracks is a building_workflow with `recruit_hero` behavior and queued mode. A sci-fi Research Lab is a building_workflow with `consume_resource` behavior and `world_effect` outputs. The word is the same. The meaning changes with configuration.

The auto-rig system extends this language with a grammar. Edges are not decoration — they are syntactic connectors that declare relationships. When a designer draws a cable from Iron Ore to Smelt Ore and clicks Rig, they are writing a sentence in the Guild Engine language: "this resource feeds this workflow." The IDE (the editor) understands the grammar and fills in the punctuation (the ID fields).

This is what a game authoring tool should produce: not a collection of features, but a vocabulary and grammar for expressing game designs. The designer who learns `building_workflow`, `building_upgrade`, and `crafting_recipe` can describe any crafting economy they can imagine. The auto-rig system means they can describe it visually, without memorizing ID formats.

The vocabulary is not complete. `item_modifier` and `hero_modifier` are missing words. The prestige and faction systems need generation. The expedition screen needs its M6 upgrade. The canvas doctor needs writing.

But the grammar is holding. Two days in, schema version 1.2.0, and everything added in Day 2 is consistent with everything from Day 1. That's the hardest thing to maintain as a system grows, and so far it's holding.

---

*End of Day 2 core retrospective.*
*Day 2 extended objectives session follows.*
