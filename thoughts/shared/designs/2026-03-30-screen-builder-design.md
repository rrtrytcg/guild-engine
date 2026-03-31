# Screen Builder Design

**Date:** 2026-03-30
**Topic:** Visual Screen Layout Builder
**Status:** final

> Decisions captured via Q&A session on 2026-03-30.

---

## 1. Problem Statement

Authors currently create game UI screens by writing `.screen.json` files by hand. This requires knowing the full widget schema, binding syntax, and action handler names. The Screen Builder is a third view in the editor (alongside Nodes and Groups) that lets authors design screens visually — drag/drop widgets, configure properties, see a live preview — and outputs clean `.screen.json` files.

---

## 2. Constraints & Preferences

- **Pure functions** for all search/ranking/utility logic (no Zustand `set`/`get`)
- **ESM**: `__dirname` not available — use `import.meta.url` + `fileURLToPath`
- **innerHTML + event delegation** for the layout engine (no DOM manipulation library)
- All extracted functions must be **pure for testability**
- Screens stored as **separate `.screen.json` files** — one per screen module
- `project.json.screens[]` holds only **{ id, name }** for navigation listing

---

## 3. Approach

We add a **third view mode** — `screens` — to the existing `nodes | groups` view toggle in the Toolbar and central canvas area. The editor gets two new panels (Widget Tree + Properties) flanking the existing inspector, and a Preview panel that renders the screen using the layout engine.

**Key principle: the editor reads and writes real `.screen.json` files.** There's no separate "internal format" — what you design is exactly what the engine loads at runtime.

### 3.1 Decisions Summary

| # | Question | Answer |
|---|----------|--------|
| Q1 | Screen storage | Separate `.screen.json` files |
| Q2 | Adding widgets | Right-click context menu |
| Q3 | Reordering/reparenting | Native HTML5 drag-and-drop |
| Q4 | Preview data source | Toggle: Live / Mock / Snapshot |
| Q5 | Preview actions | Disabled with toast feedback |
| Q6 | Binding entry | Plain text field + `{{}}` button |
| Q7 | Screen discovery | Naming convention (`*.screen.json`) |
| Q8 | Toolbar buttons | All config in `.screen.json` `nav` section |
| Q9 | Screen deletion | Confirmation dialog, then remove from `project.json.screens[]` + delete file |
| Q10 | DnD library | Native HTML5 drag-and-drop API |
| Q11 | Screen transitions | Single engine-defined transition |
| Q12 | View integration | Third toggle in toolbar (`[Nodes] [Groups] [Screens]`) |

---

## 4. Architecture

### 4.1 View Modes

The Toolbar's view toggle adds a third option:

```
[Nodes] [Groups] [Screens]
```

When `viewMode === 'screens'`:
- Central canvas becomes the **Preview panel** (`renderScreenToHTML`)
- Left sidebar becomes the **Widget Tree panel**
- Right sidebar becomes the **Properties panel** (repurposed Inspector)

### 4.2 Panels

| Panel | Location | Purpose |
|-------|----------|---------|
| **Widget Tree** | Left sidebar (replaces canvas) | Hierarchical list of widgets; add/reorder/delete |
| **Preview** | Center (replaces node canvas) | Live rendered output using layout engine |
| **Properties** | Right sidebar (repurposed Inspector) | Edit selected widget's properties |

### 4.3 Screen File Format

`mymodule/screen.inventory.json`:

```json
{
  "version": 1,
  "id": "mymodule.inventory",
  "name": "Inventory",
  "rootWidget": {
    "type": "vbox",
    "id": "root",
    "props": { "spacing": 8 },
    "children": [
      {
        "type": "label",
        "id": "title",
        "props": {
          "text": "Inventory",
          "style": "title"
        }
      },
      {
        "type": "textbutton",
        "id": "close-btn",
        "props": {
          "label": "Close",
          "onclick": "close_inventory"
        }
      }
    ]
  },
  "nav": {
    "toolbar": true,
    "hotkey": "I"
  }
}
```

### 4.4 project.json Integration

```json
{
  "screens": [
    { "id": "mymodule.inventory", "name": "Inventory" },
    { "id": "mymodule.equipment", "name": "Equipment" }
  ]
}
```

The `screens[]` array is loaded by `bootstrapState` to register all screens in the engine's `screenRegistry`. Each entry references a `.screen.json` file discovered by naming convention (`*.screen.json` alongside `project.json`) or explicit `screenFiles[]` in `project.json`.

---

## 5. Widget Tree Panel

### 5.1 Tree Structure

Each widget rendered as:

```
▼ [vbox] root
    ├─ [label] title
    └─ [textbutton] close-btn
```

- **▶/▼ toggle**: collapse/expand container widgets
- **Click**: select widget (highlights in tree + updates Properties panel)
- **Double-click**: rename widget's `id` inline

### 5.2 Adding Widgets

**Right-click context menu** on any container widget:

```
Add Child ►
  ├─ Display ►
  │    label, image, progressbar, spacer
  ├─ Container ►
  │    vbox, hbox, grid, stack
  └─ Interactive ►
       textbutton, iconbutton, textinput
────────────
Duplicate
Cut
Paste
────────────
Wrap in ►
  vbox, hbox, grid, stack
────────────
Delete
```

Selecting an item appends a new widget with a generated `id` (e.g., `label_1`, `textbutton_2`).

### 5.3 Reordering & Reparenting

**Native HTML5 drag-and-drop API** — no library. Drag a widget onto a container to reparent; drag above/below a sibling to reorder within the same parent.

### 5.4 Deleting

- **Delete key** or **right-click → Delete**: Shows confirmation dialog:
  > "Delete screen 'Inventory'? This will delete `mymodule/screen.inventory.json`"
  > [Cancel] [Delete]
- If confirmed: removes from `project.json.screens[]` and deletes the `.screen.json` file

---

## 6. Preview Panel

### 6.1 Rendering

The Preview panel renders using the layout engine's `renderScreenToHTML()` function, mounted to a `div` in the panel. Bindings are resolved against the **current game snapshot** (same as the runtime engine).

```
┌─────────────────────────────────┐
│  [Preview: Inventory]            │
│                                 │
│  Inventory                      │
│  ┌─────────────────────────┐   │
│  │  Gold: 1,250             │   │
│  │  ┌─────┬─────┬─────┐     │   │
│  │  │ 🎒 │ ⚔️ │ 🛡️ │     │   │
│  │  └─────┴─────┴─────┘     │   │
│  │                           │   │
│  │  [Close]                  │   │
│  └─────────────────────────┘   │
│                                 │
│  Binding data: ● Connected     │
└─────────────────────────────────┘
```

### 6.2 Binding Resolution in Preview

`renderScreenToHTML` calls `resolveBindings(text, snapshot)` for each `{{path}}` binding.

**Preview data source toggle** (toolbar in Preview panel):

| Mode | Source | Indicator |
|------|--------|-----------|
| **Live** | Current game state from running engine | 🟢 Live |
| **Mock** | Fixed mock values defined per-screen | 🟡 Mock |
| **Snapshot** | Last captured state snapshot | 🟡 Snapshot |

**Missing bindings**: If the binding path is undefined, `resolveBindings` returns `"{{path}}"` styled distinctly (italic gray text).

### 6.3 Preview Controls

- **Data source toggle**: Live / Mock / Snapshot switcher
- **Refresh button**: Re-renders the screen from current `.screen.json`
- **Device size**: Dropdown to preview at different sizes (e.g., 800×600, 1280×720, 1920×1080)
- **Action toast**: When clicking a button, shows a toast notification `Action: close_inventory` — action is NOT fired (disabled in preview)

---

## 7. Properties Panel

### 7.1 Per-Widget-Type Editable Properties

**All widgets:**
| Property | Type | Notes |
|----------|------|-------|
| `id` | string | Widget identifier; must be unique within screen |

**Container widgets** (`vbox`, `hbox`, `grid`, `stack`):
| Property | Type | Notes |
|----------|------|-------|
| `spacing` | number | Pixels between children |
| `padding` | number | Inner padding |
| `alignment` | string | `"start"`, `"center"`, `"end"` |
| `fill` | string | `"none"`, `"width"`, `"height"`, `"both"` |

**Display widgets:**
| Widget | Property | Type | Notes |
|--------|----------|------|-------|
| `label` | `text` | string | Display text; can include `{{bindings}}` |
| `label` | `style` | string | `"title"`, `"heading"`, `"body"`, `"caption"` |
| `image` | `src` | string | Image path or asset reference |
| `image` | `size` | string | `"contain"`, `"cover"`, `"stretch"` |
| `progressbar` | `value` | number | 0–100; or binding `{{path}}` |
| `spacer` | `size` | number | Pixel width/height |

**Interactive widgets:**
| Widget | Property | Type | Notes |
|--------|----------|------|-------|
| `textbutton` | `label` | string | Button label text |
| `textbutton` | `onclick` | string | Action name (e.g., `"close_inventory"`) |
| `iconbutton` | `icon` | string | Icon identifier |
| `iconbutton` | `onclick` | string | Action name |
| `textinput` | `placeholder` | string | Placeholder text |
| `textinput` | `onchange` | string | Action name |
| `textinput` | `maxLength` | number | Character limit |

### 7.2 Binding Input

Any string property can include `{{path}}` bindings. The Properties panel uses a **plain text field with a `{{}}` button**:

```
Label text:
┌────────────────────────────────────────┐
│ Inventory {{player.name}}'s Items    {}│
└────────────────────────────────────────┘
```

- Clicking `{{}}` opens a **binding picker** showing available paths from the game schema
- Bindings are rendered as styled chips within the field (e.g., `{{player.name}}` highlighted in blue)
- Below the field: **resolved preview** — "Inventory Aldric's Items"

### 7.3 Validation

- `id`: alphanumeric + underscores, must be unique within screen
- `onclick` / `onchange`: alphanumeric + underscores (action name format)
- `src` (image): must reference a valid asset path
- `value` (progressbar): 0–100 numeric range
- `maxLength`: positive integer

Invalid values show an inline error below the field (red text).

---

## 8. Navigation Integration

### 8.1 Screen Registration

At engine startup, `bootstrapState` scans the project directory for `*.screen.json` files (naming convention). Each discovered file is loaded and registered via `engine.defineScreen(id, screenDef)`. The engine maintains a `screenRegistry` map of `id → screenDef`.

### 8.2 Nav Button Configuration

All navigation config lives in the `.screen.json` file's `nav` section:

```json
{
  "id": "mymodule.inventory",
  "name": "Inventory",
  "rootWidget": { ... },
  "nav": {
    "toolbar": true,      // Show in game's toolbar
    "hotkey": "I",         // Keyboard shortcut
    "group": "main"        // Toolbar group name
  }
}
```

When `nav.toolbar === true`, the engine's game UI automatically shows a button for this screen in the game's toolbar. The `hotkey` registers a global keyboard listener when that screen is active.

### 8.3 Screen Deletion

Deleting a screen shows a confirmation dialog:
> "Delete screen 'Inventory'? This will delete `mymodule/screen.inventory.json`"
> [Cancel] [Delete]

On confirm: removes from `project.screens[]` and deletes the `.screen.json` file.

### 8.4 Screen Navigation Actions

Interactive widgets dispatch named actions. The engine's `ACTION_HANDLERS` maps action names to functions:

```javascript
window.ACTION_HANDLERS = {
  open_inventory: () => engine.showScreen('mymodule.inventory'),
  close_inventory: () => engine.hideCurrentScreen(),
  open_equipment: () => engine.showScreen('mymodule.equipment'),
};
```

The Screen Builder's Properties panel shows a **dropdown of available actions** for the `onclick` field, populated from the engine's `ACTION_HANDLERS` keys.

---

## 9. Data Flow

```
project.json
    └─ screens[] ──────────────────────────────► bootstrapState()
                                                    │
                                    ┌───────────────┴───────────────┐
                                    │  engine.screenRegistry          │
                                    │  engine.defineScreen(id, def)   │
                                    └─────────────────┬───────────────┘
                                                      │
                                          ┌───────────┴───────────┐
                                          │  renderScreenToHTML   │
                                          │  (layout engine)      │
                                          └───────────────────────┘
                                                       │
                              ┌────────────────────────┼────────────────────────┐
                              │                        │                        │
                        Widget Tree              Properties Panel           Preview Panel
                        (add/reorder)             (edit props)            (render output)
                              │                        │                        │
                              └────────────────────────┴────────────────────────┘
                                                       │
                                          ┌────────────┴────────────┐
                                          │  .screen.json files     │
                                          │  (written on save)      │
                                          └─────────────────────────┘
```

---

## 10. Component Inventory

| Component | Location | Responsibility |
|-----------|----------|----------------|
| `ScreenBuilder.jsx` | `components/` | Top-level view; assembles WidgetTree + Preview + Properties |
| `WidgetTree.jsx` | `components/screenBuilder/` | Hierarchical widget list with drag/drop |
| `WidgetTreeItem.jsx` | `components/screenBuilder/` | Single tree node with expand/collapse |
| `AddWidgetPopup.jsx` | `components/screenBuilder/` | Popup menu for adding widgets |
| `ScreenPreview.jsx` | `components/screenBuilder/` | `div` mounting `renderScreenToHTML` |
| `ScreenProperties.jsx` | `components/screenBuilder/` | Properties form for selected widget |
| `BindingField.jsx` | `components/screenBuilder/` | Input with `{{}}` binding support |
| `screenBuilderSlice.js` | `store/slices/` | Zustand slice for screen builder state |
| `useScreenBuilder.js` | `hooks/` | Main hook for screen builder logic |
| `useWidgetTree.js` | `hooks/` | Widget tree operations (add, delete, move) |
| `useScreenFile.js` | `hooks/` | Load/save `.screen.json` files |
| `screenBuilderRegistry.js` | `editor/src/inspector/` | Reuses inspector registry pattern for widget property editors |

---

## 11. Testing Strategy

| Test | Scope |
|------|-------|
| `screenBuilderSlice.test.js` | Adding, deleting, moving, selecting widgets in the slice |
| `useWidgetTree.test.js` | `addWidget`, `deleteWidget`, `moveWidget`, `reparentWidget` |
| `useScreenFile.test.js` | Loading, parsing, saving `.screen.json` files |
| `renderScreenToHTML` integration | Preview renders widget tree correctly |
| `BindingField` | Resolves `{{path}}` in preview mode |
| `WidgetTree` drag/drop | Reordering and reparenting via drag |

---

## 12. Open Questions

1. **Multi-screen preview**: Should the Preview panel show a dropdown to switch between screens without leaving the builder?
2. **Validation of `.screen.json`**: Should we use JSON Schema validation when loading screen files in the builder?
3. **Mock data editor**: Who defines the mock values for the Mock preview mode — is there a UI for it, or a JSON file?
4. **Screen renaming**: If you rename a screen's `id`, should the `.screen.json` filename be renamed too?

