# Guild Engine — Day 1 Brief
### March 28, 2026

---

## What we built

Guild Engine is a **visual authoring tool for incremental RPG games** — think RPG Maker, but for the idle/management/guild genre. A designer opens the editor, drags nodes onto a canvas, connects them, hits compile, and gets a playable game. No code required.

It consists of three distinct pieces:

**The Editor** — a Vite + React web app with a ReactFlow node canvas. Fourteen node types cover every system a guild-management game needs: resources, hero classes, abilities, buildings, items, loot tables, recipes, expeditions, boss expeditions, acts, events, factions, upgrades, and prestige layers. Each node has a full inspector panel with form fields. A compiler validates the graph and exports a `project.json`.

**The Runtime Engine** — a zero-dependency vanilla JS game engine that reads any valid `project.json` and runs the full game loop at 250ms ticks. Three screens: World (buildings, recruiting, upgrades), Expedition (act-grouped runs with readiness bars and hero status), Forge (crafting queues). Save/load via localStorage. No build step — drop `project.json` next to `index.html` and open in a browser.

**The Generator Pipeline** — a suite of Claude Code prompt files that convert creative input into a complete, balanced, immediately playable `project.json`. Two entry points: a free-text pitch for original concepts, or an IP adaptation pipeline that reads existing creative works (novels, sourcebooks, wikis) and translates them into the game schema. The pipeline is iterative — Pass 3 expands any existing world without touching what's already balanced.

---

## What it can do today

- Author a complete game world visually in the editor
- Generate a full playable world from a paragraph of text in two Claude Code runs
- Adapt any text-format creative work (Vampire the Masquerade, Dune, a philosophy book) into a playable incremental game
- Run the generated game immediately in a browser
- Expand the world iteratively with Pass 3 — add acts, zones, heroes, events on demand
- Validate the graph with 20+ compiler checks before export
- Save and restore game state across sessions

---

## The test game

**Shadowbound Guild** — a dark fantasy guild management game set in a plague-ravaged empire. Generated from a one-paragraph pitch. 32 nodes, 2 acts, 3 hero classes (Warrior, Shadow Hunter, Warden), 3 buildings, 7 expeditions including 2 boss fights, 4 loot tables, 6 items, 4 upgrades. Fully playable in the engine. Heroes level up, exhaust, get injured and cursed, die on wipes. The Shadow Hound gates Act 2. The Pale Archivist waits at the bottom of the Undercity.

---

## What's next

Hero inventory UI (equip items to 4 slots), M6 expedition screen upgrade (animated countdown, boss phase flash), then Pass 3 expansion of Shadowbound Guild with mid-run events and a third act. The IP adaptation pipeline gets its first real test with a VtM sourcebook. Somewhere in the distance: a Deleuzian incremental game about rhizomatic deterritorialization.

---

*Built in one day. Imagine 100.*
