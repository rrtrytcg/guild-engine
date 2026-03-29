# Guild Engine — Repository Map

**Schema Version:** 1.2.0  
**Last Updated:** March 29, 2026  
**Description:** A game authoring tool for incremental RPGs — editor, engine, compiler, and generator pipeline

---

## Repository Structure

```
guild-engine/
├── .gitignore
├── DAY2-DEEPDIVE.md           # Day 2 design session documentation
├── schema-additions-day2.json # Day 2 schema additions (~600 lines)
├── .git/
├── docs/                      # Design documentation
│   ├── DAY1-BRIEF.md
│   ├── DAY1-DEEPDIVE.md
│   ├── DAY2-BRIEF.md
│   ├── DAY2-DEEPDIVE.md       # Building systems, tuning utility, blueprint ecosystem
│   ├── WIKI.md
│   └── illustrations/
│       └── simple forge setup.png
├── editor/                    # React-based visual editor (Vite + React 19)
│   ├── .gitignore
│   ├── eslint.config.js
│   ├── index.html
│   ├── package.json           # Dependencies: react, reactflow, zod, zustand, radix-ui
│   ├── package-lock.json
│   ├── README.md
│   ├── vite.config.js
│   ├── dist/                  # Build output
│   ├── node_modules/
│   ├── public/
│   │   ├── favicon.svg
│   │   └── icons.svg
│   └── src/
│       ├── App.css
│       ├── App.jsx            # Main application component
│       ├── index.css
│       ├── main.jsx           # Entry point
│       ├── assets/
│       │   ├── hero.png
│       │   ├── react.svg
│       │   └── vite.svg
│       ├── blueprints/        # Pre-wired subgraph presets
│       │   ├── mine-standard.blueprint.json
│       │   ├── basic/         # Starter blueprints
│       │   │   ├── brew.blueprint.json
│       │   │   ├── research.blueprint.json
│       │   │   └── smelt.blueprint.json
│       │   ├── medium/        # Intermediate chains
│       │   │   ├── apothecary-chain.blueprint.json
│       │   │   ├── forge-chain.blueprint.json
│       │   │   └── library-chain.blueprint.json
│       │   └── complex/       # Advanced systems
│       │       ├── apothecary-system.blueprint.json
│       │       ├── forge-system.blueprint.json
│       │       └── library-system.blueprint.json
│       ├── canvas/            # Node canvas components
│       │   ├── Canvas.jsx
│       │   ├── GroupCanvas.jsx
│       │   ├── Palette.jsx
│       │   └── inferRelation.js
│       ├── compiler/          # Validation compiler
│       │   ├── compiler.js    # 5-phase, 12 validation rules
│       │   └── rules.js       # Compiler rule definitions
│       ├── components/        # UI components
│       │   ├── Toolbar.jsx
│       │   ├── BlueprintLibraryModal.jsx
│       │   ├── CompileModal.jsx
│       │   └── TuningModal.jsx
│       ├── inspector/         # Node property inspectors (20 types)
│       │   ├── Inspector.jsx
│       │   ├── AbilityInspector.jsx
│       │   ├── ActInspector.jsx
│       │   ├── BlueprintInspector.jsx
│       │   ├── BossExpeditionInspector.jsx
│       │   ├── BuildingInspector.jsx
│       │   ├── BuildingUpgradeInspector.jsx
│       │   ├── BuildingWorkflowInspector.jsx
│       │   ├── CraftingRecipeInspector.jsx
│       │   ├── EventInspector.jsx
│       │   ├── ExpeditionInspector.jsx
│       │   ├── FactionInspector.jsx
│       │   ├── FormPrimitives.jsx
│       │   ├── HeroClassInspector.jsx
│       │   ├── ItemInspector.jsx
│       │   ├── LootTableInspector.jsx
│       │   ├── PrestigeInspector.jsx
│       │   ├── RecipeInspector.jsx
│       │   ├── ResourceInspector.jsx
│       │   └── UpgradeInspector.jsx
│       ├── nodes/             # Node rendering components
│       │   ├── GuildNode.jsx
│       │   └── nodeConfig.js
│       └── store/
│           └── useStore.js    # Zustand state management
├── engine/                    # Runtime engine (vanilla JS)
│   ├── .tmp-runtime-extract.cjs
│   ├── .tmp-runtime-harness.cjs
│   ├── engine.js              # Core runtime: processBuildingTick, expedition logic
│   ├── index.html
│   └── docs/
│       └── WIKI.md
│   └── systems/               # Game systems (12 implemented)
│       ├── bootstrap.js       # Game initialization
│       ├── buildings.js       # Building workflow processor
│       ├── expeditions.js     # Expedition runs, events, boss fights
│       ├── loot.js            # Loot table resolution
│       └── resources.js       # Resource pool management
├── generator/                 # Procedural content generator
│   ├── CHANGELOG.md
│   ├── CHANGELOG-day2-additions.md
│   ├── expansion-prompt.txt
│   ├── EXTRACTPASS0.md
│   ├── f4.json
│   ├── GENERATORPASS1.md
│   ├── GENERATORPASS2.md
│   ├── GENERATORPASS3.md
│   ├── howto.md
│   ├── my-guild-game-forge-bp-test.json
│   ├── my-guild-game.json
│   ├── pitch.txt
│   ├── TRANSLATEPASS.md
│   ├── world-template.json
│   └── howto.md
├── schema/
│   └── project.schema.json    # JSON Schema v1.2.0 (3163 lines, 18 node types)
└── specs/
    └── expedition-spec-v2.1.md
```

---

## Core Components

### 1. Editor (`editor/`)
**Tech Stack:** React 19, Vite, React Flow, Zustand, Zod, Radix UI

**Purpose:** Visual node-based editor for designing game systems

**Key Features:**
- Canvas-based node graph editor with 14+ node types
- 20 specialized property inspectors per node type
- Blueprint library with import/export
- Integrated compiler with 12 validation rules
- Tuning utility for formula balancing

**Scripts:**
```bash
npm run dev    # Start dev server
npm run build  # Production build
npm run lint   # ESLint
npm run preview # Preview production build
```

---

### 2. Engine (`engine/`)
**Tech Stack:** Vanilla JavaScript

**Purpose:** Runtime engine that executes game logic defined in project.json

**Systems (12 implemented):**
| System | File | Description |
|--------|------|-------------|
| Bootstrap | `bootstrap.js` | Game initialization, state setup |
| Buildings | `buildings.js` | `processBuildingTick`, workflow execution |
| Expeditions | `expeditions.js` | Hero parties, dungeon runs, boss fights |
| Loot | `loot.js` | Weighted loot table resolution |
| Resources | `resources.js` | Resource pool tracking, income ticks |

**Core Function:** `processBuildingTick()` — executes building workflows using schema-configured behavior

---

### 3. Compiler (`editor/src/compiler/`)
**Purpose:** Validates project.json against schema and connection rules

**5 Phases:**
1. Schema validation
2. ID uniqueness
3. Connection validity
4. Cross-reference integrity
5. Logic validation

**12 Validation Rules:**
- `cross_building_prerequisite_exists`
- `cross_building_max_level_sufficient`
- `no_circular_building_prerequisites`
- `output_rule_resource_exists`
- `output_rule_item_exists`
- `hero_class_artisan_assignment_valid`
- `blueprint_schema_version_compatible`
- *(5 rules from Day 1)*

---

### 4. Generator (`generator/`)
**Purpose:** Procedural content generation pipeline

**3-Pass Pipeline:**
- **Pass 1:** Base game structure
- **Pass 2:** Theme adaptation, blueprint customization
- **Pass 3:** Expansion content

**Output:** Complete `project.json` files ready for editor/engine

---

### 5. Schema (`schema/project.schema.json`)
**Version:** 1.2.0  
**Size:** 3163 lines

**18 Node Types:**

| Node Type | Description |
|-----------|-------------|
| `resource` | Tracked economy resource (gold, wood, mana) |
| `building` | Production location (Forge, Apothecary, Library) |
| `building_workflow` | Individual workflow within a building |
| `building_upgrade` | Upgrade tier for buildings |
| `hero_class` | Hero archetype (Warrior, Scholar, Forgemaster) |
| `ability` | Hero skill or spell |
| `item` | Equipment or consumable |
| `loot_table` | Weighted item drop pool |
| `expedition` | Dungeon/adventure definition |
| `act` | Story progression chapter |
| `event` | Random encounter definition |
| `faction` | Reputation group |
| `prestige` | Rebirth system node |
| `crafting_recipe` | Crafting formula (redesigned v1.2.0) |
| `hero_status` | Hero state modifier |
| `blueprint` | Pre-wired subgraph preset |
| *(Day 2 additions in bold)* |

**14 Shared Definitions:**
- `output_rule` — 5 output types (resource, item, consumable, world_effect, hero_instance)
- `success_table` — RNG resolution (failure → crit → success)
- `momentum_config` — Library-style continuous operation bonus
- `streak_bonus` — Apothecary-style repetition bonus
- `buff_config` — Consumable buff definition
- `passive_event` — Time-based event emitter
- `blueprint_meta` — Blueprint metadata for sharing
- `formula_variable_registry` — Formula variable definitions
- *(6 more)*

---

## Node Types Summary

### Day 1 (14 nodes)
resource, building, upgrade, hero_class, ability, item, loot_table, expedition, act, event, faction, prestige, crafting_recipe (original), hero_status

### Day 2 Additions (4 nodes)
- **`building_workflow`** — Generic workflow node for all buildings
- **`building_upgrade`** — Upgrade tier with cross-building prerequisites
- **`crafting_recipe`** — Redesigned to use building_workflow
- **`blueprint`** — Pre-wired subgraph with metadata

### Day 2 Extensions (3 nodes extended)
- **`hero_class`** +hero_type, +combat_eligible, +artisan fields
- **`item`** +item_type, +consumable_config, +salvage_profile
- **`building`** +has_workflows, +artisan_slots, +buff_slots

---

## Building System Architecture

### Output Type Taxonomy (5 types + 2 scoped)

| output_type | Destination | Example |
|-------------|-------------|---------|
| `resource` | Resource pool | Iron ingots from smelting |
| `item` | Hero/guild inventory | Iron sword from crafting |
| `consumable` | Buff stockpile | Warriors Draught |
| `world_effect` | World state (direct) | Expedition zone unlocked |
| `hero_instance` | Recruitable hero pool | Footsoldier from Barracks |
| `item_modifier`* | Existing item in-place | Enchantment (scoped) |
| `hero_modifier`* | Hero stat block | Permanent stat (scoped) |

### Success Table Roll Order
```
1. failure_chance check → FAIL
2. crit_chance check    → CRIT
3. remainder            → SUCCESS
```

### Failure Behaviors (3 types)
- `consume_inputs_no_output` — Forge default (harsh)
- `partial_refund` — Apothecary default (50% return)
- `reset_progress_refund_inputs` — Library default (most forgiving)

### Crit Behaviors (5 types)
- `double_output` — quantity × crit_multiplier
- `quality_upgrade` — output becomes masterwork variant
- `rarity_upgrade` — hero rarity bumped one tier
- `breakthrough` — fires bonus world_effect
- `extend_duration` — consumable buff duration × multiplier

---

## Blueprint System

**File Format:** `.blueprint.json`

**Structure:**
- `blueprint_meta` — Metadata block
- `nodes` — Pre-wired node array
- `edges` — Connection data
- `viewport` — Canvas layout

**Complexity Tiers:**
- `starter` — Basic single-workflow blueprints
- `intermediate` — Multi-workflow chains
- `advanced` — Full system blueprints
- `expert` — Cross-building dependency trees

**Sharing Tiers:**
1. **File share (v1)** — `.blueprint.json` posted anywhere
2. **Community registry (future)** — Hosted index
3. **Generator-to-community (Day 100)** — Auto-generated, refined, uploaded

---

## Tuning Utility

**Four Panels:**

### 1. Formula Lab
- Formula registry with inline editor
- Variable autocomplete
- Slider bank for referenced variables
- Live curve graph (single curve or heatmap)
- Danger zone overlays

### 2. XP Curves
- Visual curve editor (linear, polynomial, exponential, s-curve)
- 2–3 shape parameters per curve
- Milestone table auto-generated
- Time-to-level projection

### 3. Economy Balance
- Resource flow diagram
- Time simulation (0–10 hours)
- Automatic flags: deadlock, bottleneck, sink needed

### 4. Upgrade Trees
- Tech tree view independent of canvas
- Left-to-right tier layout
- Cross-building dependency arcs

---

## Artisan Hero System

**Three Artisan Classes:**

| Class | Specializations | Building Affinity |
|-------|-----------------|-------------------|
| Forgemaster | smelter, weaponsmith, armorsmith | forge |
| Alchemist | brewer, potionmaster, toxicologist | apothecary |
| Scholar | researcher, cartographer, academic | library |

**Key Fields:**
- `hero_type: "artisan"`
- `combat_eligible: false`
- `assignment_target: "building"`
- `building_affinity: [...]`
- `unique_passive` — Synergy effects

---

## Consumable System

**Duration Types:**
- `expedition_count` — Lasts N runs
- `expedition_success` — Only consumed on success
- `permanent_until_death` — One-time heroic dose

**Stack Behaviors:**
- `refresh` — Resets duration
- `extend` — Adds to remaining duration
- `intensify` — Stacks effect value (dangerous/endgame)

**Buff Slots:** Heroes have 2–5 slots. Constraint enables meaningful choices.

---

## Compiler Rules (12 total)

### Day 1 Rules (5)
- ID uniqueness
- Schema field validation
- Connection type matching
- Required field presence
- Enum value validation

### Day 2 Rules (7)
1. `cross_building_prerequisite_exists`
2. `cross_building_max_level_sufficient`
3. `no_circular_building_prerequisites`
4. `output_rule_resource_exists`
5. `output_rule_item_exists`
6. `hero_class_artisan_assignment_valid`
7. `blueprint_schema_version_compatible`

---

## Connection Rules (6 new)

| From | To | Description |
|------|-----|-------------|
| `building_workflow` | `building` | Workflow belongs to building |
| `building_upgrade` | `building` | Upgrade applies to building |
| `building_upgrade` | `building_workflow` | Upgrade unlocks workflow |
| `crafting_recipe` | `building_workflow` | Recipe uses workflow |
| `hero_class[artisan]` | `building` | Artisan assigned to building |
| `building_upgrade` | `building[cross]` | Cross-building prerequisite |

---

## Numbers

| Metric | Value |
|--------|-------|
| Total Node Types | 18 |
| Shared Definitions | 14 |
| Compiler Rules | 12 |
| Connection Rules | 6 |
| Building Blueprints Specced | 3 (Forge, Apothecary, Library) |
| Output Types | 5 (+ 2 scoped) |
| Artisan Classes | 3 |
| Schema Lines | 3163 |
| Day 2 Design Doc | ~8,000 words |

---

## Development Status

### Implemented
- ✅ 14 node types (Day 1)
- ✅ 4 node types (Day 2 spec, pending implementation)
- ✅ 12 game systems
- ✅ Compiler with 12 rules
- ✅ Editor with React Flow canvas
- ✅ 20 property inspectors
- ✅ Blueprint system architecture
- ✅ Building workflow schema

### Pending Implementation
- ⏳ `processBuildingTick` in engine.js
- ⏳ Tuning Utility tab (Formula Lab, XP Curves)
- ⏳ Blueprint library UI
- ⏳ Hero equipment UI
- ⏳ Buff stockpile UI
- ⏳ Pre-expedition preparation screen
- ⏳ Enchanter building (`item_modifier` output)
- ⏳ Stables building (`hero_modifier` output)
- ⏳ Community blueprint registry

---

## Key Design Decisions

### 1. One Node Type for All Buildings
**Decision:** Single `building_workflow` node type with `behavior` and `workflow_mode` enums  
**Rationale:** Avoids schema duplication, engine brittleness, maintenance burden

### 2. Idle Model for Consumables
**Decision:** Buffs apply before expeditions, consumed on departure  
**Rationale:** Enables production planning puzzle over action game

### 3. Failure Should Not Feel Like Punishment
**Decision:** `failure_grants_xp: true`, `failure_xp_multiplier: 0.5`  
**Rationale:** Learning from mistakes is narratively coherent

### 4. Engine as Formula Evaluator
**Decision:** Engine reads config, doesn't hardcode behavior  
**Rationale:** Designer decides what formulas say; engine executes

### 5. Blueprint as Starting Point
**Decision:** Blueprints are importable saved states, not constraints  
**Rationale:** Full customization after placement

---

## File Relationships

```
project.json (authored in editor)
    │
    ├── validated by → compiler.js/rules.js
    ├── conforms to → schema/project.schema.json
    ├── executed by → engine/engine.js
    └── generated by → generator/ pipeline

*.blueprint.json
    │
    ├── imported into → editor canvas
    ├── validated by → blueprint_schema_version_compatible rule
    └── produced by → generator Pass 2 theme adaptation
```

---

## Getting Started

### Editor Development
```bash
cd editor
npm install
npm run dev    # http://localhost:5173
```

### Engine Testing
```bash
# Open engine/index.html in browser
# Load a project.json file
```

### Schema Validation
```bash
# Use any JSON Schema validator against schema/project.schema.json
```

---

## Documentation Files

| File | Description |
|------|-------------|
| `DAY1-BRIEF.md` | Day 1 project brief |
| `DAY1-DEEPDIVE.md` | Day 1 implementation details |
| `DAY2-BRIEF.md` | Day 2 project brief |
| `DAY2-DEEPDIVE.md` | Day 2 architecture decisions |
| `docs/WIKI.md` | Engine wiki |
| `engine/docs/WIKI.md` | Runtime documentation |
| `specs/expedition-spec-v2.1.md` | Expedition system spec |

---

*Generated March 29, 2026 — Guild Engine v1.2.0*
