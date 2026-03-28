# Guild Engine — Day 1 Deep Dive
### March 28, 2026
### A technical and design retrospective

---

## Origin

The session began with a simple observation: you had just finished your first Ren'Py game using the rpg2renpy skill — a Claude Code prompt that converts adventure text into visual novel scripts. The question was whether the same pattern could work for other genres.

The answer evolved rapidly. What started as "generate an idle game from a prompt" became something more ambitious: not a generator, but a **tool**. Like Ren'Py itself — not a script that produces one game, but an authoring environment that produces any game of a particular kind.

The pivot happened at exactly the right moment. The dungeon guild demo was impressive but it was a dead end — one generated artifact. The editor is a living tool.

---

## Architecture decisions and why they matter

### The three-layer separation

The most important structural decision of the day was keeping the editor, the schema, and the engine completely separate:

- The editor writes `project.json`
- The schema defines what valid `project.json` looks like
- The engine reads `project.json` and plays it

This mirrors exactly how Ren'Py works — scripts are separate from the engine. It means a designer can author in the editor, version control their `project.json`, and the engine can be updated independently without breaking their game. It also means the generator pipeline produces the same artifact as the editor — there is no "generator format" vs "editor format." There is only `project.json`.

### ReactFlow for the canvas

The choice of ReactFlow over a custom drag canvas was deliberate. Building a node editor from scratch would have consumed two days minimum and produced an inferior result. ReactFlow gave us pan, zoom, edge connections, minimap, snap-to-grid, and keyboard deletion for free. The investment was in the node content and inspector, which is where the design value actually lives.

### Zustand for state

A single flat Zustand store holds all nodes, edges, selected node, and the update/import/export actions. Every inspector form calls `updateNodeData(id, patch)` — one function, one store, zero prop drilling. The ReactFlow handlers (`onNodesChange`, `onEdgesChange`, `onConnect`) are wired directly from the store. The canvas and inspector are completely decoupled — they share state but have no direct relationship.

### The compiler as a separate system

The compiler (`compiler.js` + `rules.js`) runs in five sequential phases: required field validation, duplicate ID detection, edge connection rule enforcement, cross-reference resolution, and heuristic warnings. It is entirely separate from the editor UI and the engine runtime. This means it can be run from the command line, tested in isolation, and updated without touching either the editor or the engine.

The `x-connection-rules` object in the schema defines which node types can connect to which other types via which relations. The compiler enforces this. When a designer tries to connect a loot_table to a hero_class with a "produces" relation, the compiler catches it.

### The engine game loop

The runtime engine runs at 250ms ticks (4 per second). Each tick calls three systems in sequence: resource income, expedition countdown, crafting queue progress. The tick interval is the minimum meaningful resolution — any action takes at least 275ms to complete, which gives visual feedback time to render before the result appears.

The snapshot pattern was a key decision: every tick the engine produces an immutable snapshot of the game state and passes it to the renderer. The renderer is a pure function — given a snapshot, produce HTML. This prevents the render and the game state from getting out of sync and makes it trivial to add a "replay" feature later.

---

## The schema — 14 node types as a game design language

The `project.schema.json` at 676 lines is the most important artifact of the day. It defines not just field types but the *semantic relationships* between systems:

**Economy layer:** `resource` → `building` (produces) → `upgrade` (multiplies). The resource loop is three node types and their connections.

**Hero layer:** `hero_class` → `ability` (has) → `item` (equips). The hero system is three node types.

**World layer:** `building` → `act` (gates) → `event` (triggers). The narrative progression is three node types.

**Expedition layer:** `expedition` → `loot_table` → `item`. The reward loop is three node types.

**Meta layer:** `faction` (reputation) → `prestige` (rebirth). The endgame is two node types.

Every node type has a `connections[]` array and the schema defines which connections are valid. This is what makes the compiler possible — it has ground truth about what relationships are legal.

The shared definitions (`cost`, `unlock_condition`, `stat_block`, `loot_entry`, `expedition_event`, `boss_phase`) are reused across node types. `unlock_condition` alone appears on seven different node types. This gives the system its coherence — the same condition type works everywhere.

---

## The expedition resolver — design by specification

The expedition system went through three full design iterations in one day:

**v1 (implicit):** `base_success_chance` — a flat probability roll. Mechanically trivial, no player agency, no stat relevance.

**v2.0 (designed):** Party power score, difficulty rating, five outcome tiers (WIPE/FAIL/NARROW/CLEAN/DOMINANT), hero status system, XP/leveling, death on wipe, curse system, exhaustion tracking. Ambitious but had mathematical flaws.

**v2.1 (red-teamed and patched):** The spec went through a full red team analysis that caught seven real problems:
- HP floor check was missing from the readiness indicator (it showed green when wipe risk was present)
- Exhaustion reset fired on expedition start not completion (trivially bypassable)
- `base_xp = 0` was ambiguous (designer intent vs auto-calculate)
- Act completion required 100% of expeditions (soft-lock risk)
- Death triggered on any injured expedition (too punishing for early roster)
- Status multipliers were undefined as additive or multiplicative
- Dropdowns needed search functionality for large projects

Every patch was deliberate and documented. The changelog captures exactly what changed and why.

The power formula is worth examining in detail:

```
party_power = Σ(hero_base_power × status_multiplier)
hero_base_power = ATK×1.0 + DEF×0.8 + SPD×0.5 + HP×0.3 + LCK×0.2
power_ratio = party_power / (expedition.level × 10)
```

The stat weights encode a design philosophy: ATK is what wins fights, DEF is what prevents casualties, SPD is a risk/reward trade (faster runs = harder DPS check), HP is the survival floor, LCK only affects loot. A well-geared party punches above their level. A lopsided party fails in interesting ways.

---

## The generator pipeline — a desiring machine

The generator pipeline is the most conceptually interesting artifact of the day. It is not a generator — it is a **pipeline** of reasoning steps, each with a specific epistemic role:

**Extract Pass 0** answers: *what is in the source?* Pure extraction, no design decisions.

**Translate Pass** answers: *how does the source map to the game schema?* Design decisions, flags ambiguities, stays faithful to source names and spirit while inventing mechanics.

**Pass 1** answers: *what game does this pitch imply?* Covers the same ground as Extract+Translate but for original concepts.

**Pass 2** answers: *what are the exact numbers?* Calibration tables, ID wiring, cross-reference resolution, canvas layout.

**Pass 3** answers: *what would make this world richer?* Additive expansion, never modification.

The insight that these are separate epistemic operations — not one big generation — is what makes the pipeline robust. Each pass can fail independently, be reviewed independently, and be retried independently. The designer has a checkpoint between every pass where they can inspect and correct.

The `world-template.json` is the crucial interface between passes. Pass 2 and Pass 3 are completely agnostic about whether their input came from a creative pitch, a VtM sourcebook, or a Deleuze text. This is what makes the system universal.

The CHANGELOG.md as a living maintenance document is the mechanism that keeps the pipeline current as the game grows. Every new system appends an entry. Pass 2 reads the changelog and auto-expands its output for any PENDING items that have since been implemented. The pipeline grows with the game.

---

## The IP adaptation insight

The most intellectually interesting moment of the day was the realization that the pipeline could handle existing creative works. The 8 universal translation questions work because they ask about *narrative structure*, not genre:

1. What does the protagonist accumulate? → resources
2. What drives them to act? → expedition motivation
3. Who are the power factions? → factions
4. What roles exist? → hero classes
5. What dangerous places exist? → zones
6. What objects matter? → items
7. What powers define them? → abilities
8. What does progression look like? → XP/leveling

These questions work on Vampire the Masquerade (Blood Pool, Clans, Disciplines, Districts, the Masquerade). They work on Dune (Spice, Houses, Mentats/Bene Gesserit/Fremen, the Desert, Holtzman shields). They work on a cooking show (reputation, cuisines, techniques, competition rounds, rare ingredients). They even work on Gilles Deleuze — which produced the most interesting translation flags of the day, including the observation that the standard incremental game resource loop (accumulate because you lack) directly contradicts Deleuzian desire theory (desire is productive, not lacking).

The Deleuzian idle game — **Thousand Plateaus: An Incremental** — remains theoretical. But the pipeline could produce it.

---

## What was validated today

By end of day, with the Shadowbound Guild test:

✓ The editor imports and displays a 32-node graph correctly
✓ Searchable dropdowns populate from the node graph
✓ The compiler catches errors and warnings accurately  
✓ The engine loads `project.json` and runs the game loop
✓ Resources accumulate with correct income and caps
✓ Buildings build and produce resources
✓ Heroes recruit with correct costs
✓ Hero XP accumulates and level up fires
✓ Hero status (exhausted, inspired, injured) applies correctly
✓ Expeditions group by act in the UI
✓ Readiness bar shows correct tier based on power ratio and HP floor
✓ Runs complete with correct loot drops and event log entries
✓ The Shadow Hound boss unlocks Act 2 on defeat
✓ Save/load persists across sessions
✓ Pass 1 + Pass 2 generate a valid, import-ready `project.json` from a pitch
✓ The generated project passes compiler validation with zero errors

What wasn't validated:
- Hero inventory/equipment UI (built next)
- M6 expedition screen animations
- Pass 3 expansion
- IP adaptation pipeline (no live test yet)
- Prestige, faction rep, crafting recipe generation

---

## Numbers

| Artifact | Lines / Size |
|----------|-------------|
| project.schema.json | 676 lines |
| editor/src/ (all files) | ~2,400 lines |
| engine/ (all files) | ~1,432 lines |
| Generator prompts (all passes) | ~1,800 lines |
| expedition-spec-v2.1.md | ~400 lines |
| WIKI.md | ~300 lines |
| Total authored today | **~7,000 lines** |

Node types designed and implemented: **14**
Game systems implemented: **12** (resources, buildings, crafting, heroes, equipment, XP/leveling, status effects, expeditions, boss fights, acts, loot, upgrades)
Systems specified but not yet implemented: **3** (factions, prestige, mid-run events UI)

---

## The meta-observation

We built a tool for making games. The tool itself was made using a tool (Claude Code). The generator pipeline that populates the tool was made using a reasoning tool (this conversation). The spec documents that guide the generator were produced collaboratively between human design intent and AI elaboration.

At every level there is a human making decisions — which genre, which systems, which balance values, which source material to adapt. The tools amplify those decisions but never replace them. The designer who produced Shadowbound Guild in 20 minutes still made every meaningful creative choice: the plague-ravaged empire, the three hero archetypes, the tight economy, the fast XP curve. The pipeline found the numbers. The human found the soul.

That's the thing worth preserving about this project. It is not an AI that makes games. It is a tool that makes game-making faster, cheaper, and more accessible — while keeping the designer in control of every decision that matters.

---

## Day 100

If day 1 produced a working editor, runtime engine, compiler, generator pipeline, IP adaptation system, and a fully playable test game —

Day 100 might produce a publishing platform. A library of generated worlds. A community of designers sharing `project.json` files the way Ren'Py creators share `.rpy` scripts. A tool that has adapted a hundred IPs and invented a thousand original worlds. A Deleuzian idle game that is somehow both philosophically rigorous and genuinely fun.

Or it might produce something none of us imagined today.

That's the point.

---

*End of Day 1. — March 28, 2026*
