# Guild Engine — Day 2 Evening Deep Dive
### March 29, 2026
### The Forge Suite: Six Domain Experts, One Pipeline

---

## What this session set out to do

The Day 2 Extended Deep Dive ended with a reframe: Guild Engine is a creative translation pipeline,
not a game engine with a generator bolted on. The pipeline is the primary design tool. The editor is
the finishing layer. The schema is the contract.

The evening session had one goal: make that pipeline real.

By the end of the day, six forge prompt files existed. The complete specification for generating any
incremental RPG from any source material — fiction, philosophy, sourcebook, or free-text pitch — is
now written. ASSEMBLER remains. Everything else runs.

---

## The architecture decision that held throughout

Every forge in the suite follows the same structural discipline:

1. **Read upstream before writing anything** — mandatory file list, abort conditions, read status printout
2. **Analyze before calculating** — narrative analysis step produces written reasoning before any number is committed
3. **Show the math** — every calibration value has its formula and calculation documented in terminal output
4. **Contract-chain** — writes a `downstream_contracts` object that the next forge reads exactly
5. **Flag tensions** — the `//TRANSLATE_FLAG` system surfaces design contradictions rather than silently resolving them

This pattern was established in WORLDFORGE and held through all five subsequent forges. The consistency
is not accidental — it means a designer can read any forge's output and understand not just what was
generated, but why. The reasoning is part of the artifact.

The most important structural decision: every forge validates against its upstream contracts before
it generates a single node. HEROFORGE aborts if `world-economy.json` is missing. BUILDFORGE aborts
if both `world-economy.json` and `hero-roster.json` are missing. UPGRADEFORGE aborts if all four
upstream outputs are missing. The pipeline has hard dependencies, and they're enforced at runtime,
not at documentation time.

---

## WORLDFORGE — the constraint-setter

WORLDFORGE's defining contribution is not the resource nodes it generates. It's the
`downstream_contracts` object it writes.

Before WORLDFORGE, every forge would have to reason independently about what resources exist, what
income rates look like, what materials are in the economy. Every forge making those assumptions
independently is a recipe for internal inconsistency — HEROFORGE pricing recruitment in a resource
WORLDFORGE never defined, BUILDFORGE designing workflows around materials that don't exist.

The downstream_contracts pattern solves this by making WORLDFORGE's decisions explicit and
binding. The `recruit_cost_range` field tells HEROFORGE exactly what range is defensible. The
`material_ids` field tells BUILDFORGE exactly which materials its workflows can consume. The
`expedition_reward_bands` field tells ACTFORGE exactly what resource ranges each expedition tier
should reward. No downstream forge invents constraints. It reads them.

The calibration discipline in WORLDFORGE — particularly the income-to-cost ratio audit, which must
be documented in the terminal output and must pass before any output is written — is the pattern
that prevents the most common idle game design failure: an economy where the player can either afford
everything too fast or can't afford anything for too long.

The Table B ratio formulas are worth preserving:
```
First upgrade affordability: cost / (base_income × 240) ≤ 5.0 minutes
First recruit timing:         cost / (base_income × 240) ∈ [8, 15] minutes
```

These are not arbitrary targets. They come from playtesting data on what creates the right early-game
pressure without frustrating the player. WORLDFORGE enforcing them in every run means every game the
suite generates starts from a defensible economic foundation.

---

## HEROFORGE — the strategic dilemma generator

HEROFORGE's defining contribution is the strategic dilemma framing. Not: "generate hero classes with
different stats." But: "what does the player give up by choosing this class?"

The Purpose section's formulation is precise: "A roster where every hero is ATK-primary with some
SPD is not a roster. It is a lineup with different icons." This is the failure mode HEROFORGE
exists to prevent. The no-two-classes-same-primary-stat rule, the unique_passive with
engine-evaluable conditions, the archetype coverage requirements — all of these enforce that every
class creates a real decision.

The artisan class section is where HEROFORGE does its most important pipeline work. Artisan classes
— Forgemaster, Alchemist, Scholar and their analogs — connect the hero system to the building system.
A Forgemaster with specialization `weaponsmith` who matches a Forge workflow's `action_type` is not
just a hero assigned to a building. They are the mechanical linkage that makes the Forge feel
staffed rather than merely occupied. HEROFORGE defines this linkage. BUILDFORGE reads it.

The `downstream_contracts.buildforge.specialization_map` is the critical seam:

```json
"specialization_map": {
  "artisan-forgemaster": {
    "specializations": ["weaponsmith", "armorsmith", "smelter"],
    "building_affinity": ["building-forge"]
  }
}
```

BUILDFORGE reads this and verifies that every workflow in the Forge has at least one action_type
that matches a Forgemaster specialization. An artisan with no matching building is a dead artisan.
The pipeline catches it before a single node reaches the editor.

---

## BUILDFORGE — the most complex forge

BUILDFORGE generates four node types in a single run. This was the right call — `building`,
`building_workflow`, `building_upgrade`, and `crafting_recipe` form one coherent production unit.
Splitting them across multiple forges would create a cross-reference nightmare where each forge
would need to know about the others' output to do its job.

The architectural insight that drove Day 2's building system — one `building_workflow` node type
handles all crafting, accumulation, and recruitment — is what makes BUILDFORGE tractable. If there
were separate forge types, apothecary types, and library types, BUILDFORGE would need different
generation logic for each. Because `building_workflow` is generic with behavior/mode configuration,
BUILDFORGE generates one node template structure that adapts to all of them.

The consume_item salvage pattern — one "Melt" workflow with `use_item_salvage_profile: true`,
reading output rules from the item's `salvage_profile` rather than the workflow itself — is
elegant and faithful to how the engine actually works. BUILDFORGE specifies it correctly because
it reads the DAY2-DEEPDIVE.md before generating, where this decision is documented.

The `output_item` placeholder format (`item-{slug}`) is the critical seam between BUILDFORGE and
ITEMFORGE. BUILDFORGE defines what gets made — recipe exists, workflow exists, inputs exist. ITEMFORGE
defines what it is — stats, rarity, slot, salvage profile. The contract:

```
downstream_contracts.itemforge.recipe_output_items: ["item-iron-sword", "item-iron-armor", ...]
```

ITEMFORGE reads this list and generates item nodes with exactly these IDs. ASSEMBLER then validates
that every `output_item` field in every `crafting_recipe` node resolves to a real item node.

The intended connections documentation in Step 3G — BUILDFORGE listing which edges the auto-rig
system should draw, without generating edges in the output JSON — is the right solution to a real
problem. The editor's auto-rig reads these documented connections and wires everything. The designer
opens a canvas with all the nodes and all the edges already drawn, rather than a canvas full of
disconnected nodes they have to wire manually.

---

## ITEMFORGE — the reward architect

ITEMFORGE's Purpose section contains the most precise formulation of what a loot table is:
"a probability machine with a budget. The budget is the designer's attention — if every item in the
table feels like a real upgrade or a meaningful crafting input, the table is correctly designed."

This framing drives every calibration decision ITEMFORGE makes. The rarity distribution tables are
not arbitrary percentages — they're calibrated to ensure that at any given point in the game, the
player's chance of getting something they can use is high enough to feel rewarding without being so
high that rarity becomes meaningless.

The consumable_config integration is where ITEMFORGE closes the Apothecary loop. The Apothecary
produces consumables via building workflows. The consumables apply to heroes as pre-expedition buffs.
The buff system uses `buff_config` with `apply_scope`, `duration_type`, `duration_value`, and
`effect`. ITEMFORGE generates the consumable item node with `consumable_config: $ref buff_config`
correctly populated so the engine's buff stockpile system can apply it. Without ITEMFORGE, the
Apothecary produces consumables that have no mechanical effect — the IDs exist but the items don't.

The salvage_profile integration closes the other end of the item lifecycle. Equipment drops from
expeditions. Equipment is equippable. Equipment can be salvaged through the Forge's `consume_item`
workflow, returning materials to the pool. ITEMFORGE generates `salvage_profile.outputs[]` as
`output_rule` objects — the same schema definition used by building_workflow output_rules — so the
engine's building system can read them identically. One schema definition, two consumers.

---

## UPGRADEFORGE — the integration forge

UPGRADEFORGE is different from the other five forges in a fundamental way. It is not primarily a
content generator — it is a calibration engine. By the time it runs, every content system is
specified. Its job is to size effects relative to all of them simultaneously.

The upgrade effect sizing audit in Step 1D is the most analytically demanding section in any forge:

```
vs WORLDFORGE income curve: upgrade X% income → time savings on next purchase: N → M minutes
vs HEROFORGE stat growth: +N ATK upgrade = X% of level-5 ATK (target: 10–20%)
vs BUILDFORGE workflow timing: +N% craft speed → Y ticks saved per job
vs ITEMFORGE equipment stats: +N ATK upgrade = X% of median weapon power (target: <50%)
vs ACTFORGE difficulty: success bonus → tier shift (target: at most one tier)
```

Every upgrade is measured against every system. An upgrade that is correctly sized relative to
income might be incorrectly sized relative to equipment stats. UPGRADEFORGE checks both.

The prestige design section is notable for what it explicitly protects against. The soft-lock
analysis — confirming that the player can always reach content after a prestige reset — is the most
common failure mode in prestige system design. A reset that removes all expeditions and all resources
and all buildings leaves the player with no path forward. UPGRADEFORGE's checklist catches this:
`resets[]` must NOT include both "expeditions" and all progression systems simultaneously.

The faction system design includes a schema note that deserves attention: the `faction` node type
in v1.2.0 has NO `relations[]` field. Cross-faction reputation effects — Camarilla rep reducing
Anarch rep — are not expressible in the schema. UPGRADEFORGE documents this honestly in the
calibration object as design-only annotations rather than inventing a field the compiler would
reject. The correct handling of "what the schema cannot express" is not to add the field. It is to
flag it and annotate it, and let a future schema version add the field when it's ready.

---

## The Forge Suite as a whole

### Line count and scope

| Forge | Lines | Node types generated | Key output |
|---|---|---|---|
| WORLDFORGE | 883 | resource | world-economy.json |
| HEROFORGE | 1,253 | hero_class | hero-roster.json |
| BUILDFORGE | 1,621 | building, building_workflow, building_upgrade, crafting_recipe | building-system.json |
| ACTFORGE | ~767 | expedition, boss_expedition, act, event, loot_table | act-*.blueprint.json |
| ITEMFORGE | 1,647 | item, loot_table | item-ecosystem.json |
| UPGRADEFORGE | 1,927 | upgrade, prestige, faction | upgrade-ecosystem.json |
| **Total** | **~8,098** | **14 of 18 node types** | **6 JSON outputs** |

### What the suite covers

Of the schema's 18 node types:

- **Covered by Forge Suite:** resource, hero_class, building, building_workflow, building_upgrade,
  crafting_recipe, expedition, boss_expedition, act, event, loot_table, item, upgrade, prestige,
  faction — 15 of 18
- **Not generated by any forge:** ability, hero_status, blueprint — these are either runtime-only
  (hero_status), editor-only (blueprint), or deferred to a future ABILITYFORGE

### The contract chain integrity

Every forge in the suite writes contracts that the next forge reads. The chain was maintained
consistently across all six forges. This means running the full suite on any source material
produces internally consistent output — HEROFORGE's recruit costs are within WORLDFORGE's
validated range, BUILDFORGE's workflows consume only materials WORLDFORGE defined, ITEMFORGE's
items match every ID BUILDFORGE's recipes reference, UPGRADEFORGE's effects are sized against
all five upstream systems.

The consistency is not guaranteed by the forges themselves — it's enforced by ASSEMBLER, which
reads all six outputs and cross-references every ID. But the contract pattern means that by the
time ASSEMBLER runs, most errors have already been flagged and corrected at the forge level.

### Different AIs, different games

The observation that motivated the evening session: different AI models produce different output from
the same prompt, and that's not a problem — it's the tool working as intended. WORLDFORGE run on a
VtM sourcebook by GPT-4o produces a different economy than the same prompt run by Gemini or Claude.
Different designers make different calls. The flagging system surfaces the decisions that were made.
The editor handles the 10% the pipeline couldn't know. The compiler validates the result. The runtime
proves it's playable.

The forge suite doesn't enforce one game. It enforces a defensible game. The design space within
"defensible" is enormous. Different AIs will explore different regions of it.

---

## What ASSEMBLER needs to do

ASSEMBLER is the final forge and the most different from the others. It generates nothing new. Its
job is cross-reference resolution, calibration validation, and CANVASDOCTOR invocation.

Specifically:

1. **ID resolution** — every `resource_id` in every cost array exists in world-economy.json; every
   `item_id` in every loot table exists in item-ecosystem.json; every `hero_class_id` referenced in
   building artisan slots exists in hero-roster.json; every `loot_table_id` in every expedition
   exists in item-ecosystem.json
2. **Contract validation** — HEROFORGE's recruit costs are within WORLDFORGE's range; BUILDFORGE's
   material inputs are in WORLDFORGE's material list; ITEMFORGE's recipe items match BUILDFORGE's
   recipe_output_items list
3. **Calibration cross-check** — the systemic checks no individual forge could do: is expedition
   reward income sufficient to fund building construction at the intended pacing? Does the item power
   curve outpace hero stat growth at any point, making equipment irrelevant?
4. **CANVASDOCTOR invocation** — runs the existing CANVASDOCTOR.md on the assembled project.json
   before writing the final output, so the designer opens a validated canvas
5. **Final project.json assembly** — merges all six forge outputs into one valid project.json

ASSEMBLER is Day 3's primary target. With it, the pipeline is complete.

---

## The corrected build state

A mid-session audit revealed that the repository was six commits ahead of its documentation. The
corrected picture:

**Fully running:**
- Runtime engine with 5 systems including `processBuildingTick` (buildings, expeditions, loot,
  resources, bootstrap)
- Editor with 18 node types, 20 inspectors, canvas tools, auto-rig
- Tuning Utility with Formula Lab, XP Curves, Economy Sim (Upgrade Trees panel unbuilt)
- Blueprint Library with 9 presets across Basic/Medium/Complex + Yours tab with ACTFORGE blueprints
- Forge screen with live queue, progress bar, artisan slot assignment
- All building workflow mechanics: consume_item/resource, produce_resource, recruit_hero,
  success_table resolution, streak bonus, momentum, artisan XP, consumable stockpile,
  hero_instance recruit pool

**Confirmed by smoke test:**
- Apothecary → buff stockpile: ✅ wired
- hero_instance → recruit pool: ✅ wired
- Hero equipment slots: ✅ interactive
- Upgrade Trees panel: ❌ not built

**Generator pipeline — 11 prompt files total:**

| File | Status |
|---|---|
| GENERATORPASS1.md | ✅ |
| GENERATORPASS2.md | ✅ |
| GENERATORPASS3.md | ✅ |
| EXTRACTPASS0.md | ✅ |
| TRANSLATEPASS.md | ✅ |
| ACTFORGE.md | ✅ |
| CANVASDOCTOR.md | ✅ |
| WORLDFORGE.md | ✅ written today |
| HEROFORGE.md | ✅ written today |
| BUILDFORGE.md | ✅ written today |
| ITEMFORGE.md | ✅ written today |
| UPGRADEFORGE.md | ✅ written today |
| ASSEMBLER.md | ❌ Day 3 |

---

## The meta-observation for Day 2 Evening

Day 1 produced a tool. Day 2 morning produced a language. Day 2 evening taught that language to six
domain experts.

The forge suite is the realization of the pipeline-first architecture. A designer who feeds a VtM
sourcebook into EXTRACTPASS0 → TRANSLATEPASS → WORLDFORGE → HEROFORGE → BUILDFORGE → ACTFORGE →
ITEMFORGE → UPGRADEFORGE → ASSEMBLER gets a complete, calibrated, validated `project.json` with
zero compiler errors and a Yours tab full of act blueprints. The editor handles the 10% the pipeline
couldn't anticipate. The runtime proves it plays.

That was the vision stated in the Day 2 Extended Deep Dive. It is now specced in full. ASSEMBLER
closes it.

---

*End of Day 2 Evening. — March 29, 2026*
