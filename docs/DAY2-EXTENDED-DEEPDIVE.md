# Guild Engine — Day 2 Extended Deep Dive
### March 29, 2026 (Evening Session)
### The Pipeline Reframe — What Guild Engine Actually Is

---

## The reframe that happened at the end of Day 2

The Day 2 deep dive documented the building system. This document documents something bigger: a mental model shift that happened in the final hour of the session that changes how every future decision gets made.

It is not a feature. It is a re-understanding of what the tool is.

**The old model:**

```
Editor (primary) → Runtime (proves it) → Generator (optional shortcut)
```

**The new model:**

```
Pipeline (primary) → Editor (refinement) → Runtime (proof)
```

In the old model, the editor is the design environment and the generator is a convenience — a way to skip the blank-canvas problem. In the new model, the pipeline IS the design environment. The editor is the last-mile polish layer. The runtime is the compiler output: proof that the design is valid and playable.

This is not a downgrade of the editor. It's a clarification of its role. The editor becomes the IDE; the pipeline becomes the language. The schema is the contract that makes them composable.

---

## Why this reframe is correct

The evidence is already in the project.

ACTFORGE exists. CANVASDOCTOR exists. GENERATORPASS1, 2, and 3 exist. EXTRACTPASS0 and TRANSLATEPASS exist. These are not convenience tools layered on top of the editor — they are where the creative reasoning actually happens. ACTFORGE doesn't just fill in expedition node fields; it reasons about narrative structure, boss pacing, and encounter difficulty curve. CANVASDOCTOR doesn't just validate connections; it diagnoses why a canvas is broken and prescribes corrections.

The pipeline tools are already doing domain-expert reasoning. The editor is already the refinement layer. We built the right thing before we understood what we were building.

What the reframe does is make this explicit — and forces a question that the old model never asked: **if the pipeline is the primary creative tool, what does a complete pipeline look like?**

The answer is the forge suite.

---

## The forge suite — domain experts, not generators

A generator fills in fields. A domain expert makes design decisions.

The distinction matters because filling in fields is easy. What's hard is knowing which fields to fill, what values are defensible, and how each field's value propagates through every system that depends on it. A resource node's `base_income` isn't a number you pick — it's a number constrained by how many ticks it takes to afford the first building upgrade, how that rate competes with expedition loot, and how the whole resource loop feels at minute five versus hour two.

The forge suite is seven tools, each owning one system deeply enough to make these decisions. Each one reads what came before and writes what comes after. Together they produce a complete, cross-calibrated `project.json` that the editor refines and the runtime validates.

---

### The seven forges

**WORLDFORGE — economy theory, resource loop design, pacing**

The first forge in any pipeline run. WORLDFORGE reads the source material (via EXTRACTPASS0 output) and generates the economy skeleton: what resources exist, how they relate to each other, what the income curve looks like, and how resource scarcity drives expedition urgency. It doesn't generate hero classes or building schemas — it generates the constraints that every other forge must work within.

WORLDFORGE reasons about: income-to-cost ratios, resource bottleneck intentionality (which scarcities are features, which are bugs), the number of distinct economic loops the game needs to avoid stagnation, and the pacing curve from hour one to endgame. A WORLDFORGE that reads a VtM sourcebook knows the economy isn't gold-and-wood — it's Blood, Influence, and Secrecy. It knows Influence is scarce early (before your coterie has domain) and abundant late (after you control the Primogen). The income curve should reflect that.

WORLDFORGE output feeds every other forge. HEROFORGE can't spec stat growth without knowing what resources heroes consume. BUILDFORGE can't design workflow chains without knowing what resources are in the game. WORLDFORGE sets the bounds.

---

**HEROFORGE — character design, stat balancing, fantasy archetypes**

HEROFORGE reads the source material and WORLDFORGE output. It generates the hero class roster — not just stat blocks, but the full hero_class node for each class: `primary_stat`, `xp_source`, `combat_eligible`, `specializations`, `building_affinity`, `unique_passive`, `recruitment` config.

It reasons about: archetype balance (every roster needs speed, tank, support, and damage; does the source material have equivalents?), the mechanical expression of narrative identity (the Brujah's political rage becomes high ATK + a passive that doubles damage on WIPE-risk expeditions), stat growth curves relative to WORLDFORGE's expedition difficulty ladder, and the unique passive design space (what is the one mechanic that makes this class feel irreplaceable?).

HEROFORGE knows that a hero class without a distinct mechanical identity is a hero class with a different number. It doesn't generate five hero classes that are all "ATK-primary + some SPD." It generates classes that create different strategic dilemmas — a party of Scholars who maximize research momentum but die in boss fights is a design, not a lineup.

---

**BUILDFORGE — crafting economy, workflow chains, artisan systems**

BUILDFORGE reads WORLDFORGE and HEROFORGE output. It generates the building system: which `building_workflow` nodes exist, what their input/output chains look like, which artisan classes staff which buildings, and how building progression ties to the act structure.

It reasons about: resource sink design (buildings should create meaningful places to spend resources, not arbitrary drains), workflow chain depth (a chain of Ore → Ingot → Weapon → Enchanted Weapon is four linked `building_workflow` nodes; is that the right depth for this game?), artisan synergy (the Forgemaster's `batch_config` bonus should interact with the Forge's workflow in a way that makes staffing decisions meaningful), and building unlock pacing (a Forge that unlocks in Act 1 vs Act 2 changes the entire mid-game economy).

BUILDFORGE is the most constrained of the forges — it's hemmed in on all sides by WORLDFORGE's economy and HEROFORGE's artisan class definitions. This is correct. Buildings are the connective tissue between resources and heroes. BUILDFORGE tightens the joint.

---

**ACTFORGE — narrative structure, encounter design, boss pacing** *(exists)*

ACTFORGE is already built. It generates complete act structures from text descriptions: expedition nodes, boss_expedition nodes, loot_tables, events, unlock conditions. It maps narrative terms to schema node types and reasons about pacing — how many expeditions per act, how difficulty curves within an act, what the boss fight should feel like as a culmination.

In the full forge suite, ACTFORGE reads WORLDFORGE (for resource rewards), HEROFORGE (for appropriate challenge relative to hero power levels), and BUILDFORGE (for what items might drop from expedition loot_tables). It is no longer standalone — it becomes the narrative layer that the economic and character layers feed into.

---

**ITEMFORGE — loot theory, rarity curves, equipment progression**

ITEMFORGE generates the item ecosystem: weapons, armor, accessories, consumables. It reasons about rarity distribution across the game's loot_tables, equipment progression pacing (what ATK value is appropriate at Act 1 vs Act 3), the relationship between crafted items (Forge output) and dropped items (expedition loot), and salvage profiles (what does disassembling a Rare item yield?).

ITEMFORGE knows that a loot table is a probability machine with a budget. The budget is the designer's attention — if every item in the table feels like a real upgrade, the table is correctly designed. If half the drops are vendor trash, the table needs redesign. ITEMFORGE doesn't just generate items; it generates loot tables that feel rewarding.

The item tier ladder — Common, Uncommon, Rare, Epic, Legendary — is not just a rarity tag. ITEMFORGE designs the mechanical distance between tiers and the frequency at which players bridge them. In a twenty-hour game, a player should see their first Epic at hour six and their first Legendary at hour fifteen. ITEMFORGE's rarity table is calibrated to that curve.

---

**UPGRADEFORGE — progression design, upgrade trees, prestige hooks**

UPGRADEFORGE generates the upgrade ecosystem: building upgrades, hero stat upgrades, prestige unlocks, faction reputation tiers. It reads every previous forge output and designs the progression that stitches them together.

It reasons about: upgrade cost curves (building upgrades should feel achievable in the current act and expensive relative to the next), upgrade effect sizing (a 10% batch efficiency bonus vs. 25% vs. 50% — which is the number that actually changes behavior?), prestige loop design (what does a prestige run keep and what does it reset?), and faction rep as an alternative upgrade currency.

UPGRADEFORGE is the last domain forge to run because it needs to know everything that can be upgraded before it can design the upgrade trees. It is the forge that integrates — by the time it runs, the economy, heroes, buildings, acts, and items are specified. UPGRADEFORGE draws the progression lines between them.

---

**ASSEMBLER — system integration, cross-reference resolution, final calibration**

ASSEMBLER is not a content generator. It is the integration forge that runs last.

It reads all previous forge outputs and performs three operations:

1. **Cross-reference resolution** — Confirms that every `item_id` referenced in a loot_table exists in the item set ITEMFORGE generated. Every `hero_class_id` referenced in building artisan slots exists in the hero roster HEROFORGE generated. Every `resource_id` referenced in building workflows exists in the economy WORLDFORGE generated. This is the compiler's job at runtime; ASSEMBLER does it at generation time to catch mismatches before the editor sees the canvas.

2. **Cross-system calibration** — Checks for systemic imbalances the individual forges couldn't catch in isolation. WORLDFORGE set iron ore income to 5/tick. BUILDFORGE specced a sword recipe costing 100 iron ore. ACTFORGE set Act 1's recommended clear time to 30 minutes. ASSEMBLER flags that at 5/tick, 100 iron ore takes ~8 minutes to accumulate — which means sword crafting is Act 1 viable, but only barely. Is that correct? It writes a calibration note. The designer decides.

3. **CANVASDOCTOR invocation** — ASSEMBLER produces the final `project.json` and runs CANVASDOCTOR validation before the output ever reaches the editor. The designer opens a canvas with zero existing errors. The 10% remaining work is refinement, not debugging.

ASSEMBLER doesn't make creative decisions. It makes every creative decision the individual forges made coherent with every other.

---

## The pipeline as a designed workflow

A full forge suite run follows a strict sequencing:

```
Source material or pitch
         ↓
    EXTRACTPASS0         (extract universal design signals from source)
         ↓
    TRANSLATEPASS        (map source terms to schema vocabulary)
         ↓
    WORLDFORGE           (economy skeleton, resource loops)
         ↓
    HEROFORGE            (hero roster, stat blocks, artisan classes)
         ↓
    BUILDFORGE           (building system, workflow chains)
         ↓
    ACTFORGE             (narrative structure, expeditions, bosses)
         ↓
    ITEMFORGE            (item ecosystem, loot tables, rarity curves)
         ↓
    UPGRADEFORGE         (upgrade trees, prestige, faction tiers)
         ↓
    ASSEMBLER            (cross-reference + calibration + CANVASDOCTOR)
         ↓
    project.json → Editor (the 10%)
```

This is not a waterfall where each step is independent. Each forge reads all previous forge outputs. HEROFORGE reads WORLDFORGE. BUILDFORGE reads HEROFORGE. The context window is cumulative. By the time ASSEMBLER runs, it has a complete picture of every system in the game.

This is also why the pipeline uses Claude Code prompt files rather than an API-based generator. Each forge prompt is a full-context reasoning document — it tells Claude Code exactly what domain expertise to apply, what inputs to read, what decisions to make, and what output format to produce. The prompt file IS the domain expert.

---

## The editor's role, precisely stated

After the forge suite runs, the editor has one job: **express designer intent that no prompt can anticipate.**

The forge suite is calibrated to the source material. It knows that a VtM game should have Blood as the primary resource, that the Brujah class should be ATK-primary, that a Rack is the correct productivity building analog for Elysium. What it cannot know:

- That this designer wants the Brujah's unique passive to double damage specifically on WIPE-risk expeditions, not just high-danger ones
- That this designer wants iron ore to cost 3 instead of 2 for the Iron Sword recipe because they want early crafting to feel more considered
- That this designer wants to add a fourth building not in the source material — a Scriptorium — with a unique research chain not specced by any forge

The editor handles these decisions. Node-level precision. Inspector panels. Direct schema manipulation. The designer who knows what they want can find it and change it in under thirty seconds.

The editor also handles the completely custom designer — someone who doesn't use the forge suite at all and builds every node from scratch. The forge suite is a workflow choice, not a requirement. The schema is the same either way.

---

## The schema as the contract — and why this matters

Every forge outputs valid schema nodes. The editor inspects valid schema nodes. The compiler validates valid schema nodes. The runtime plays valid schema nodes.

This is not an implementation detail. It's the architectural property that makes the whole system composable. A game designed entirely through the forge suite and a game designed entirely in the editor produce the same artifact: `project.json`. The compiler doesn't know or care which workflow produced it. The runtime doesn't know or care. The community blueprint library doesn't know or care.

This is the same insight that makes Ren'Py powerful. A script written by hand and a script generated by rpg2renpy are both valid `.rpy` files. The Ren'Py engine plays both identically. The tool that produces the script is not part of the contract — the format is.

Guild Engine's contract is `project.json`. The schema version is 1.2.0. The grammar is holding.

---

## The flagging system — surfacing creative tensions

One specific feature of the forge suite deserves its own section: the flagging system from TRANSLATEPASS, extended to apply to every forge.

When a forge makes a decision that might contradict the source material's intent — or when two forges produce outputs that are mechanically valid but thematically incoherent — it writes a `//TRANSLATE_FLAG` comment directly in the generated JSON.

The VtM example is instructive. Standard resource loop design calls for a "primary resource" that accumulates passively and a "secondary resource" that requires active decisions to generate. Translating Blood as primary + Influence as secondary is mechanically clean. But Deleuze's desire theory — a potential source material — explicitly frames desire as non-lacking, always-productive, never scarce. Translating that philosophy into a resource that drains on use and requires grinding to replenish isn't a translation. It's a contradiction.

The flag surfaces this. The designer sees it. They decide: "I want the tension — scarcity drama is fun even in a Deleuzian game" or "this flag is correct, let me redesign Blood as something that flows rather than depletes." The forge doesn't decide. It surfaces the decision that needs to be made.

Every forge will produce flags. HEROFORGE will flag when a hero class from the source material has no mechanical equivalent in the schema. ACTFORGE will flag when the source material's narrative doesn't fit the two-to-four act structure. ITEMFORGE will flag when a loot table's rarity distribution creates a dead zone in the mid-game. ASSEMBLER will flag calibration anomalies that individual forges missed.

The flags are not errors. They are invitations. The designer who reads them is doing design work. The designer who ignores them ships a game with known tensions that they chose to accept.

---

## The blueprint layer — forge output as shareable design

The forge suite doesn't have to run on a complete game. It can run on a system.

ACTFORGE already produces `.blueprint.json` files — complete act structures that can be imported into any project via the Blueprint Library. The same pattern applies to every forge. HEROFORGE can produce a `.blueprint.json` containing a six-class hero roster calibrated to a dark-fantasy theme. BUILDFORGE can produce a `.blueprint.json` containing a complete Enchanting system — two buildings, three workflows, one artisan class. ITEMFORGE can produce a `.blueprint.json` containing a forty-item weapon progression ladder.

These blueprints are composable. A designer building a new game can import the dark-fantasy hero roster, layer in a custom building system they designed manually, and add the weapon ladder from ITEMFORGE. The schema is the contract. Blueprints that share the same schema version are compatible.

This is the community layer. In v1, blueprints are file-share artifacts — drop the `.blueprint.json` into Discord, someone imports it. In a future community registry, blueprints are searchable, rated, tagged by genre and system type, and forkable. The designer who builds the best vampire-genre hero roster publishes it. Everyone else starts from there.

The forge suite is not just a design tool for one game. It's a factory for reusable design vocabulary.

---

## What this means for Day 3

Day 3 has two possible shapes depending on where the energy is.

**If the priority is implementation:**

The forge suite as specced here is the Day 3 design target, but implementation requires one forge at a time. WORLDFORGE is the right first forge because every other forge depends on it. The Day 3 sprint builds WORLDFORGE as a Claude Code prompt file, runs it on one source material (Shadowbound Guild or a VtM test doc), validates the output through ASSEMBLER's cross-reference checks, and opens the canvas in the editor with a clean foundation.

**If the priority is design:**

Day 3 becomes a full forge suite spec session — designing each forge's prompt file structure, defining its input contract (what previous forge outputs it reads), its output contract (what schema nodes it produces), and its domain expertise list (what design decisions it makes). The spec document becomes the roadmap for implementation across Day 3, 4, and 5.

Either path is correct. The sequencing question is whether to spec everything before building anything (safer, slower) or to build WORLDFORGE now and let the later forges' specs emerge from what WORLDFORGE actually produces (faster, higher variance).

The building system was specced before implementing. The expedition system was specced and red-teamed before implementing. The pattern has worked. The forge suite warrants the same discipline.

---

## The honest picture of where things stand

**What exists and runs:**
- Editor: Vite + React + ReactFlow, 18 node types, full inspector panels
- Compiler: Five-phase validation, 12 rules, CompileModal UI
- Runtime: 250ms tick loop, three screens, full building/expedition/hero/resource/boss systems
- Generator pipeline: GENERATORPASS1/2/3, EXTRACTPASS0, TRANSLATEPASS, ACTFORGE, CANVASDOCTOR
- Test game: Shadowbound Guild, 32 nodes, 2 acts, zero compiler errors

**What is designed but not yet built:**
- Tuning Utility tab (Formula Lab, XP Curves, Economy Balance, Upgrade Trees panels)
- Blueprint Library UI and import/export system
- Building engine implementation (`processBuildingTick`)
- Pre-expedition buff application screen
- Enchanter building (item_modifier output type)

**What is now specced and in the Day 3 queue:**
- WORLDFORGE, HEROFORGE, BUILDFORGE, ITEMFORGE, UPGRADEFORGE, ASSEMBLER — the six new forge prompt files
- ACTFORGE integration with the full suite (currently standalone)
- Blueprint composability across forge outputs

**The schema:** version 1.2.0, 18 node types, 14 shared definitions, 12 compiler rules, stable.

The pipeline is the game design tool. The editor is the finishing layer. The schema is the contract. The runtime is the proof.

Day 2 produced a language. Day 3 will teach that language to seven domain experts.

---

*End of Day 2 Extended Session. — March 29, 2026*
