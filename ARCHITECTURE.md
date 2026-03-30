# Guild Engine — Architecture

## Overview
- Guild Engine is a browser-based **graph editor** + **runtime** for building incremental RPG projects. The editor produces `project.json`; the runtime loads it and simulates the game loop.

## Tech Stack
- **Editor:** React 19 + Vite + Zustand + ReactFlow (`editor/`)
- **Runtime:** Vanilla JavaScript modules + static HTML/CSS (`engine/`)
- **Schema:** JSON Schema for project nodes (`schema/project.schema.json`)
- **Tests:** Vitest (`editor/tests/`)

## Directory Structure
```
guild-engine/
├── editor/                 # React/Vite editor UI
│   ├── src/                 # App, canvas, nodes, store, compiler
│   ├── tests/               # Vitest tests (.test.js)
│   ├── index.html           # Editor bootstrap
│   ├── vite.config.js       # Vite config
│   └── eslint.config.js     # ESLint flat config
├── engine/                  # Runtime web app
│   ├── index.html           # Runtime UI + wiring
│   ├── engine.js            # Engine loop + actions + snapshot
│   └── systems/             # Game systems (resources, buildings, expeditions, ...)
├── schema/                  # project.schema.json + docs
├── specs/                   # Additional specs (domain docs)
├── generator/               # Schema/content generation tooling
├── generated/               # Generated artifacts (if any)
└── docs/                    # Repo docs and deep dives
```

## Core Components

### Editor (graph authoring)
- **App bootstrap:** `editor/index.html`, `editor/src/main.jsx`, `editor/src/App.jsx`
- **Graph state:** `editor/src/store/useStore.js` (Zustand)
  - Nodes/edges/groups + selection
  - Import/export project and blueprint JSON
- **Canvas & nodes:** `editor/src/canvas/Canvas.jsx`, `editor/src/canvas/GroupCanvas.jsx`, `editor/src/nodes/GuildNode.jsx`
  - ReactFlow canvas for graph editing
- **Compiler:** `editor/src/compiler/compiler.js`
  - Validates nodes/edges and compiles to `project.json`
  - Rule sets in `editor/src/compiler/rules.js`
- **Utilities:**
  - `editor/src/utils/blueprintUtils.js` (blueprint remap/inject)
  - `editor/src/utils/groupUtils.js` (group sizing/normalization)
  - `editor/src/utils/ids.js` (ID generator)

### Runtime (simulation)
- **Bootstrap + loop:** `engine/engine.js`
  - `initEngine(project, onRender)` bootstraps state, starts tick loop
  - `actions` exposes UI-callable commands
  - `getSnapshot()` builds render view model for UI
- **Systems:** `engine/systems/*.js`
  - `bootstrap.js` builds runtime state from `project.json`
  - `resources.js` handles resource income/caps/spend
  - `expeditions.js` handles party runs/outcomes/events
  - `buildings.js` handles crafting, heroes, upgrades, save/load

### Schema
- **Project schema:** `schema/project.schema.json`
  - Defines node types and fields consumed by runtime and compiler

## Data Flow

### Editor → Runtime
1. **User edits graph** in editor (`editor/src/canvas/Canvas.jsx` + `useStore`).
2. **Compile** (`editor/src/compiler/compiler.js`) validates nodes/edges and builds `project.json`.
3. **Runtime loads** `project.json` in `engine/index.html`, then calls `initEngine(project, cb)`.
4. **Engine loop** updates state via `tickResources`, `tickExpeditions`, `tickCrafting` and renders snapshots.

### Runtime Loop (simplified)
`engine/engine.js` tick loop:
- `bootstrapState(project)` → state
- `tickResources(state, dt)`
- `tickExpeditions(state, dt)`
- `tickCrafting(state, dt)`
- `processBuildingTick(state, dt)`
- `renderCallback(getSnapshot())`

## External Integrations
- None (local browser only). Runtime uses DOM + `localStorage` for saves.

## Configuration
- **Editor:** `editor/vite.config.js` (Vite + publicDir), `editor/eslint.config.js` (ESLint)
- **Tests:** `editor/vitest.config.js`
- No global `.env` configuration observed.

## Build & Deploy
- **Editor dev:** `npm run dev` in `editor/`
- **Editor build:** `npm run build` in `editor/`
- **Tests:** `npm run test` in `editor/`
- **Runtime:** open `engine/index.html` via a local server (not `file://`) — see `engine/index.html` message.

## Notes
- Existing docs: `docs/` and `engine/docs/WIKI.md`.
