# Guild Engine — Day 2 Brief
### March 29, 2026

---

## What we set out to do

Day 1 ended with a working editor, engine, compiler, and generator pipeline. The validated gap list was explicit: hero inventory, expedition screen animations, prestige, faction rep, crafting recipe generation.

Day 2 ignored the gap list. The right call.

Instead we designed and implemented the **building system** — the subsystem that makes every non-combat location in a game feel alive. Then we built the UI to use it. Then we fixed everything that broke in the process. That's how real development works.

---

## What actually shipped

**Schema v1.2.0** — 4 new node types (building_workflow, building_upgrade, crafting_recipe redesign, blueprint), 3 extended node types (hero_class, item, building), 8 new shared definitions, formula variable registry, 7 new compiler rules, 6 new connection rules.

**Runtime engine** — `processBuildingTick` with safe formula evaluation, artisan XP, success/failure/crit resolution, 5 output types (resource, item, consumable, world_effect, hero_instance), consumable buff stockpile, pre-expedition auto-buffing, artisan assignment with save reconciliation.

**Editor** — BuildingWorkflowInspector, BuildingUpgradeInspector, CraftingRecipeInspector, BlueprintInspector, extended inspectors for hero_class/item/building, StatBlock UX improvements, nodeConfig entries for all new types.

**Blueprint library** — import/export system, 3 preset blueprints (Forge/Apothecary/Library), smart drop positioning, auto-create missing dependency nodes, semantic ID collision detection (label-match remap), cross-reference remap on import.

**Tuning utility** — Formula Lab with live evaluation and danger zone warnings, XP Curve visualizer (4 shapes, level 1-20 table), Economy Sim (10-minute passive simulation with deadlock/bottleneck flags).

**Canvas groups** — two-layer view (node/group), auto-group on blueprint import, colored group membership borders, right-click group menu, project persistence.

**Multi-select** — box select, shift+click, batch delete, floating selection toolbar.

**Engine UI restructure** — 4-column layout (resources/nav/acts · world · detail tabs · always-on event log), Recruits/Inventory/Expedition/Forge tabs, hero dismissal, recruit pool display, artisan assignment in Forge tab, compact world column building detail.

**Generator pipeline** — GENERATORPASS2.md updated for v1.2.0 with workflow calibration tables, artisan class generation, building_upgrade generation. CHANGELOG.md updated with all Day 2 systems and PENDING items.

---

## The acceptance test

End-of-day loop: **Iron Mine → smelt ore → forge ingots → craft Iron Sword → equip to Warrior → expedition readiness improves → run expedition**.

All steps passed. The full craft-equip-expedition chain works.

---

## The architecture insight

The single most important decision of the day: **one `building_workflow` node type for all buildings**. Forge, Apothecary, Library, Mine, Barracks — all run through `processBuildingTick`. The engine reads configuration, not building types. This is the Guild Engine's core philosophy: the engine is a formula evaluator, the designer decides what the formulas say.

---

## Numbers

| Artifact | Change |
|---|---|
| Schema version | 0.1.0 → 1.2.0 |
| Node types total | 14 → 18 |
| Shared definitions | 6 → 14 |
| Compiler rules | 5 → 12 |
| Preset blueprints | 0 → 3 |
| Engine systems | 12 → 17 |
| Generator passes | 5 → 5 (updated) |

---

## What's next

Auto-wire + auto-rig (in progress). Then: Day 2 extended objectives session — M6 expedition screen, pre-expedition preparation screen, mid-run events UI, "already-edged" blueprints, canvas doctor prompt.

---

*End of Day 2 core session. Extended objectives follow.*
