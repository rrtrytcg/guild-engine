# Screen Builder Implementation Plan

**Date:** 2026-03-30
**Status:** ready-for-batches

---

## Overview

The Screen Builder is a third view mode (`screens`) in the editor, alongside `nodes` and `groups`. It consists of three panels: **Widget Tree** (left), **Preview** (center), and **Properties** (right).

**Estimated components:** 8 new React components, 3 Zustand slices, 4 hooks, ~10 test files
**Depends on:** screen layout system already implemented (`engine/layoutEngine.js`, `bootstrapState`, `engine/index.html`)

---

## Batch 1: Editor Infrastructure for Screen View Mode

**Goal:** Add the store slice, toolbar toggle, and view routing so the editor can switch to `screens` mode and show an empty Screen Builder shell.

### Files

| File | Change |
|------|--------|
| `editor/src/store/slices/screenBuilderSlice.js` | New — `screenBuilderSlice` with: `screens[]`, `activeScreenId`, `selectedWidgetId`, `previewDataSource ('live'|'mock'|'snapshot')`, `mockData` |
| `editor/src/store/useStore.js` | Add `screenBuilder` slice; add `viewMode` state (`'nodes'|'groups'|'screens'`) and `setViewMode` |
| `editor/src/components/Toolbar.jsx` | Add `Screens` button to view toggle `[Nodes] [Groups] [Screens]` |
| `editor/src/App.jsx` | Route `viewMode === 'screens'` → render `ScreenBuilder` (lazy) instead of canvas/inspector |
| `editor/src/components/ScreenBuilder.jsx` | New — top-level component, renders WidgetTree + Preview + Properties |
| `editor/src/components/ScreenBuilder/ScreenBuilder.css` | New — CSS grid layout for 3-panel arrangement |

### State Shape

```javascript
// screenBuilderSlice
{
  screens: [],               // [{ id, name, filePath }] — loaded from project.json
  activeScreenId: null,      // currently open screen id
  selectedWidgetId: null,    // selected widget in the tree
  previewDataSource: 'live', // 'live' | 'mock' | 'snapshot'
  mockData: {},              // mock binding values
  isDirty: false,            // unsaved changes flag
}

// useStore
{
  viewMode: 'nodes',         // 'nodes' | 'groups' | 'screens'
  // ...existing state...
  // screenBuilder: { ...from slice... }
}
```

### Tests
- `screenBuilderSlice.test.js` — initial state, setActiveScreen, setSelectedWidget, setPreviewDataSource

---

## Batch 2: Widget Tree Panel

**Goal:** Render the widget tree from the active screen's `rootWidget`, with right-click context menu for add/duplicate/delete/wrap.

### Files

| File | Change |
|------|--------|
| `editor/src/components/ScreenBuilder/WidgetTree.jsx` | New — tree container, listens for `screenFileLoaded` events |
| `editor/src/components/ScreenBuilder/WidgetTreeItem.jsx` | New — single tree node with expand/collapse, selection highlight, drag source |
| `editor/src/components/ScreenBuilder/AddWidgetMenu.jsx` | New — the "Add Child ►" submenu for picking widget type |
| `editor/src/components/ScreenBuilder/ContextMenu.jsx` | New — right-click menu with Add/Duplicate/Cut/Paste/Wrap/Delete |
| `editor/src/hooks/useWidgetTree.js` | New — `addWidget(parentId, type)`, `deleteWidget(id)`, `moveWidget(id, newParentId, index)`, `duplicateWidget(id)`, `wrapWidget(id, containerType)` |
| `editor/src/store/slices/screenBuilderSlice.js` | Add `activeScreen` (full screen def), `setActiveScreen(screenDef)`, `updateWidget(id, patch)`, `addWidget(parentId, widget)`, `deleteWidget(id)` |
| `editor/src/utils/screenSchema.js` | New — pure functions: `createWidget(type, id?)`, `validateWidget(widget)`, `generateWidgetId(type, existingIds)` |

### Context Menu Items

```
Add Child ►
  ├─ Display ►   (label, image, progressbar, spacer)
  ├─ Container ► (vbox, hbox, grid, stack)
  └─ Interactive ► (textbutton, iconbutton, textinput)
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

### Tests
- `useWidgetTree.test.js` — all operations return new state (pure)
- `screenSchema.test.js` — `createWidget`, `validateWidget`, `generateWidgetId`

---

## Batch 3: Drag-and-Drop Reordering

**Goal:** Implement native HTML5 drag-and-drop for the Widget Tree to reorder and reparent widgets.

### Files

| File | Change |
|------|--------|
| `editor/src/components/ScreenBuilder/WidgetTreeItem.jsx` | Add `draggable="true"`, `onDragStart`, `onDragOver`, `onDrop`, `onDragEnd` handlers |
| `editor/src/components/ScreenBuilder/WidgetTree.jsx` | Handle drag-over on container nodes, show drop indicator |
| `editor/src/hooks/useWidgetTree.js` | Add `moveWidget(id, targetParentId, targetIndex)` operation |
| `editor/src/utils/dragDropUtils.js` | New — pure helpers: `canDrop(widget, target)`, `getDropPosition(draggedWidget, targetWidget, dropIndex)` |

### DnD Behavior
- Dragging a widget shows a **drop indicator** (blue line) between siblings or on a container
- Dropping on a container **reparents** the widget
- Dropping between siblings **reorders** within the same parent
- Dragging over a collapsed container shows a **drop into** indicator

### Tests
- `dragDropUtils.test.js` — `canDrop`, `getDropPosition`

---

## Batch 4: Screen File Loading & Saving

**Goal:** Load `.screen.json` files into the editor and save changes back.

### Files

| File | Change |
|------|--------|
| `editor/src/hooks/useScreenFile.js` | New — `loadScreen(id)`, `loadAllScreens()`, `saveScreen(id, screenDef)`, `deleteScreen(id)` |
| `editor/src/components/ScreenBuilder/ScreenList.jsx` | New — dropdown/list showing all available screens to open |
| `editor/src/components/ScreenBuilder/ScreenBuilder.jsx` | Wire up `loadAllScreens()` on mount; show screen list + "New Screen" button |
| `editor/src/store/slices/screenBuilderSlice.js` | Add `createScreen(id, name)`, `deleteScreen(id)` actions |
| `editor/src/utils/screenFileUtils.js` | New — pure: `parseScreenFile(content)`, `serializeScreenFile(screenDef)`, `discoverScreenFiles()` |

### File Operations (via IPC to main process)
```javascript
// Discovery
ipcRenderer.invoke('discover-screen-files', projectPath) → ['mymodule/screen.inventory.json', ...]

// Load
ipcRenderer.invoke('read-screen-file', filePath) → content

// Save
ipcRenderer.invoke('write-screen-file', filePath, content)

// Delete
ipcRenderer.invoke('delete-screen-file', filePath)
```

### Screen Deletion Flow
1. User right-clicks screen in list → "Delete"
2. Confirmation dialog: "Delete 'Inventory'? This will delete `mymodule/screen.inventory.json`"
3. On confirm: `useScreenFile.deleteScreen(id)` → calls IPC `delete-screen-file` → removes from `screens[]` in store

### Tests
- `useScreenFile.test.js` — mock IPC, test load/save/delete
- `screenFileUtils.test.js` — parse/serialize/discover

---

## Batch 5: Preview Panel

**Goal:** Render the active screen using `renderScreenToHTML`, with data source toggle and disabled-action toasts.

### Files

| File | Change |
|------|--------|
| `editor/src/components/ScreenBuilder/ScreenPreview.jsx` | New — mounts `renderScreenToHTML` to a `div`, refreshes on screen/widget changes |
| `editor/src/components/ScreenBuilder/PreviewToolbar.jsx` | New — data source toggle (Live/Mock/Snapshot), refresh button, device size dropdown |
| `editor/src/components/ScreenBuilder/ActionToast.jsx` | New — floating toast when action is triggered in preview |
| `editor/src/hooks/useScreenPreview.js` | New — `getPreviewSnapshot(dataSource)`, returns the binding data for current mode |
| `editor/src/components/ScreenBuilder/ScreenBuilder.jsx` | Wire PreviewToolbar + ScreenPreview + ActionToast |

### Preview Data Flow
```
activeScreen.rootWidget + previewSnapshot → renderScreenToHTML() → innerHTML of preview div
```

### Action Toast
When clicking an interactive widget in preview:
1. Read `data-action` attribute from clicked element
2. Show toast: `Action: close_inventory` for 2 seconds
3. Do NOT call the actual action handler

### Tests
- `ScreenPreview.test.jsx` — renders screen def, shows widget tree output
- `useScreenPreview.test.js` — data source switching

---

## Batch 6: Properties Panel (Widget Properties)

**Goal:** Edit the selected widget's properties. Reuses the existing Inspector infrastructure with a new `screenBuilderRegistry`.

### Files

| File | Change |
|------|--------|
| `editor/src/components/ScreenBuilder/ScreenProperties.jsx` | New — properties form for selected widget |
| `editor/src/components/ScreenBuilder/BindingField.jsx` | New — text input with `{{}}` button, binding chips, resolved preview |
| `editor/src/components/ScreenBuilder/BindingPicker.jsx` | New — modal showing available binding paths from game schema |
| `editor/src/inspector/screenBuilderRegistry.js` | New — maps widget `type` → property definitions (same pattern as `inspectorRegistry`) |
| `editor/src/inspector/widgets/screen/` | New — property editor components per widget type |
| `editor/src/store/slices/screenBuilderSlice.js` | Add `updateWidget(id, patch)` action |
| `editor/src/hooks/useBindingResolver.js` | New — `resolveBinding(path, snapshot)` → value, `getAvailablePaths()` → path list |

### Property Editors per Widget Type

| Widget Type | Editable Properties |
|-------------|---------------------|
| All | `id` |
| Container (vbox/hbox/grid/stack) | `spacing`, `padding`, `alignment`, `fill` |
| label | `text`, `style` |
| image | `src`, `size` |
| progressbar | `value` |
| spacer | `size` |
| textbutton | `label`, `onclick` |
| iconbutton | `icon`, `onclick` |
| textinput | `placeholder`, `onchange`, `maxLength` |

### BindingPicker
Shows a searchable tree of available binding paths:
```
{{resources.gold}}
{{player.name}}
{{player.health}}
{{ui.screens[0].name}}
```

### Tests
- `BindingField.test.jsx` — input, {{}} button, resolved preview
- `screenBuilderRegistry.test.js` — property definitions per type

---

## Batch 7: Toolbar & Navigation Integration

**Goal:** Connect screen nav config to the engine's toolbar and hotkey system.

### Files

| File | Change |
|------|--------|
| `editor/src/components/ScreenBuilder/ScreenProperties.jsx` | Add `nav` section editor (toolbar toggle, hotkey input, group input) |
| `editor/src/components/ScreenBuilder/NavConfig.jsx` | New — nav config form for `nav.toolbar`, `nav.hotkey`, `nav.group` |
| `editor/src/store/slices/screenBuilderSlice.js` | Add `updateNavConfig(id, navPatch)` action |
| `editor/src/components/ScreenBuilder/ScreenBuilder.jsx` | Add "New Screen" button → prompts for name → creates screen file |
| `editor/src/components/Toolbar.jsx` | Screens button shows screen list dropdown on click |
| `editor/src/hooks/useScreenFile.js` | Add `createScreen(name)` → creates new `.screen.json` with default root widget |

### New Screen Template
```json
{
  "version": 1,
  "id": "newmodule.myscreen",
  "name": "My Screen",
  "rootWidget": {
    "type": "vbox",
    "id": "root",
    "props": { "spacing": 8 },
    "children": []
  },
  "nav": {
    "toolbar": false,
    "hotkey": "",
    "group": "main"
  }
}
```

### "New Screen" Dialog
Simple input asking for screen name → generates `id` from name (lowercase, spaces→underscores) → creates file → opens it

---

## Batch 8: Validation & Error Handling

**Goal:** Robust error handling throughout — invalid widgets, missing files, parse errors.

### Files

| File | Change |
|------|--------|
| `editor/src/utils/screenSchema.js` | Add `validateScreen(screenDef)` → returns `[{ path, message }]` |
| `editor/src/hooks/useScreenFile.js` | Wrap file operations in try/catch; expose `error` state |
| `editor/src/components/ScreenBuilder/ScreenBuilder.jsx` | Show error banner if screen fails to load |
| `editor/src/components/ScreenBuilder/ScreenProperties.jsx` | Inline validation errors below each field |
| `editor/src/components/ScreenBuilder/WidgetTree.jsx` | Highlight invalid widgets with ⚠️ icon |

### Validation Rules
- `id`: alphanumeric + underscores, unique within screen
- `onclick`/`onchange`: alphanumeric + underscores
- `src` (image): must start with `assets/` or `http`
- `value` (progressbar): 0–100
- `maxLength`: positive integer
- Circular widget references: disallowed (widget cannot be its own descendant)
- Root widget must be a container type (vbox/hbox/grid/stack)

### Tests
- `screenSchema.test.js` — `validateScreen` with valid and invalid inputs

---

## Batch 9: Build Verification & Final Testing

**Goal:** `npm run build` succeeds, all new tests pass, no bundle warnings.

### Actions
- Run `npm --prefix editor test -- --run` — all tests pass
- Run `npm --prefix editor run build` — succeeds, 27+ chunks (new lazy components add chunks)
- Manual smoke test: open editor, switch to Screens view, create screen, add widgets, verify preview renders

---

## Dependency Graph

```
Batch 1 ─────────────────────────────────────────────┐
  └─ Batch 2 ───────────────────────────────────────┤
    └─ Batch 3 ─────────────────────────────────────┤
      └─ Batch 4 ───────────────────────────────────┤
        └─ Batch 5 ────────────────────────────────┤
          └─ Batch 6 ──────────────────────────────┤
            └─ Batch 7 ───────────────────────────┤
              └─ Batch 8 ─────────────────────────┤
                └─ Batch 9 ───────────────────────┘
```

Each batch depends on the previous one being fully implemented and tested.

---

## Commits

| Batch | Commit Message |
|-------|---------------|
| 1 | `feat(editor): add screenBuilderSlice, viewMode state, and Screens toolbar toggle` |
| 2 | `feat(editor): add WidgetTree panel with context menu for add/duplicate/delete` |
| 3 | `feat(editor): add drag-and-drop reordering to WidgetTree` |
| 4 | `feat(editor): add screen file loading and saving via IPC` |
| 5 | `feat(editor): add ScreenPreview panel with data source toggle and action toasts` |
| 6 | `feat(editor): add Properties panel with BindingField and screenBuilderRegistry` |
| 7 | `feat(editor): add toolbar integration and New Screen creation` |
| 8 | `feat(editor): add validation and error handling for screen files` |
| 9 | `chore(editor): build verification and final tests` |

