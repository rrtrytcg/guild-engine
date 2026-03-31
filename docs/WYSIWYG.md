# Screen Builder — WYSIWYG Redesign

## Problem

The current tree-first screen editor is a pro tool that works, but:

- You can't look at a tree of widgets and picture what the screen will actually look like
- The preview is small, disconnected, and doesn't reflect what you'll get at runtime
- It takes significant time investment to learn even basic operations
- It feels like editing JSON with extra steps

The screen builder is the odd-one-out in an otherwise intuitive node/graph editor.

## Vision

A **Visual Studio form designer** or **Flutter layout inspector** for game UI. Direct manipulation, zero learning curve. You see the screen, you edit the screen.

**The canvas IS the editor.** Not a preview — the actual live, interactive editing surface at real scale.

## Design Principles

1. **WYSIWYG always** — what you see on the canvas IS the final result
2. **Canvas-first** — the screen canvas is the primary editing surface
3. **Tree is secondary** — a thin outline, not the main interaction
4. **Drag from palette** — widget palette on the side, drag onto canvas
5. **Resize handles** — drag edges/corners just like a real form designer
6. **Click to select, drag to move** — native feeling direct manipulation
7. **Live property panel** — edit selected widget properties in real time

## Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  [Toolbar: Load | Save | Undo | Redo | Zoom]    [Screens ▾]     │
├──────────┬──────────────────────────────────────┬───────────────┤
│ WIDGET   │                                      │ PROPERTIES    │
│ PALETTE  │         CANVAS (WYSIWYG)             │               │
│          │                                      │  type: hbox    │
│ ┌──────┐ │   ┌────────────────────────────┐    │  gap: 8        │
│ │ vbox │ │   │  Header                    │    │  align: start  │
│ └──────┘ │   │  ───────────────────────  │    │               │
│ ┌──────┐ │   │  ┌──────┐ ┌──────┐ ┌────┐│    │  ─────────    │
│ │ hbox │ │   │  │ 🗡️ x5 │ │ 🛡️ x1 │ │ + ││    │  Style        │
│ └──────┘ │   │  └──────┘ └──────┘ └────┘│    │  color: #fff  │
│ ┌──────┐ │   │                            │    │               │
│ │ label │ │   │  ┌──────────────────────┐ │    │               │
│ └──────┘ │   │  │ Gold: 1,234          │ │    │               │
│ ┌──────┐ │   │  └──────────────────────┘ │    │               │
│ │button │ │   │                            │    │               │
│ └──────┘ │   └────────────────────────────┘    │               │
│   ...    │                                      │               │
├──────────┼──────────────────────────────────────┤               │
│ WIDGET   │  ← Click a widget to select it      │               │
│ TREE     │  ← Drag to move                     │               │
│          │  ← Drag edges to resize              │               │
│ ▼ root   │  ← Double-click text to edit        │               │
│   ▼ hbox │                                      │               │
│     label│                                      │               │
│     hbox │                                      │               │
└──────────┴──────────────────────────────────────┴───────────────┘
```

## Interactions

### Adding Widgets
- Drag a widget type from the **palette** onto the canvas
- Drop it inside a container to add as child
- Drop it between widgets to insert at that position
- A **drop indicator** (blue line) shows where it will land

### Selecting
- **Click** any widget to select it
- Selected widget shows **resize handles** (corners + edges)
- Selected widget shows a **blue border** in the canvas
- The **tree** highlights the selected node
- The **properties panel** updates to show that widget's fields

### Moving
- **Drag** any widget to reposition it within its parent
- Horizontal drag in an `hbox`, vertical in a `vbox`
- Drag to a different parent container to reparent
- **Drop indicator** shows valid drop positions

### Resizing
- **Drag corner handles** to resize (proportional)
- **Drag edge handles** to resize in one axis
- Containers (vbox/hbox) can't be resized smaller than their minimum child size
- Resize updates the widget's `width`/`height` style overrides

### Editing Text
- **Double-click** a label or button to edit its text inline
- Text cursor appears, type to edit
- **Click outside** to confirm

### Reordering
- **Drag** a widget above/below another to reorder
- Blue insertion line shows where it will land
- Can't reorder the root widget

### Deleting
- **Select** a widget, press `Delete`
- Or right-click → Delete
- Or drag it to a **trash zone** at the bottom of the palette

### Context Menu (Right-Click)
- Delete
- Duplicate
- Wrap in → [vbox, hbox, grid, stack]
- Cut / Copy / Paste
- Bring to Front / Send to Back (for stacks)

## Canvas Features

### Zoom
- **Scroll wheel** to zoom in/out
- **Zoom slider** in toolbar (50% – 200%)
- **Fit to screen** button
- Zoom affects the canvas only, not the actual rendered output

### Pan
- **Middle-mouse drag** to pan
- **Space + drag** to pan
- Canvas background shows a subtle grid for alignment

### Grid Snapping (optional)
- Toggle in toolbar: **Snap to grid**
- When on, widget positions snap to 4px increments
- Helps with pixel-perfect alignment

## Properties Panel (Right)

Updates instantly when a widget is selected. All fields are live — typing updates the canvas immediately.

For **hbox/vbox**:
- `gap` — number input
- `align` — dropdown (start / center / end)
- `wrap` — toggle (for hbox)

For **label**:
- `text` — text input (or edit inline on canvas)

For **textbutton**:
- `label` — text input
- `action` — text input (e.g. `open:inventory`)

For **iconbutton**:
- `icon` — text input (emoji or short string)
- `action` — text input

For **progressbar**:
- `value` — text/number input
- `max` — number input
- `color` — color picker
- `height` — number input

For **image**:
- `src` — text input (URL)
- `width` / `height` — number inputs

For **spacer**:
- `width` / `height` — number inputs

For **all widgets**:
- `style` section — key/value pairs (color, background, etc.)
- `+ Add style` button

## Widget Tree (Left, Bottom)

A thin hierarchical outline — useful for:
- Seeing the full structure at a glance
- Navigating when zoomed out
- Right-click operations
- Selecting deeply nested widgets quickly

Not the primary editing surface — just a reference.

## Screen Tabs

When multiple screens exist:
- **Tabs** at the top of the canvas (like browser tabs)
- Click a tab to switch editing context
- `+` button to create a new screen
- `×` on tabs to delete (with confirmation)
- Double-click tab to rename

## Toolbar

```
[ Load ] [ Save ] │ [ Undo ] [ Redo ] │ [ 🔍 ] [ ──●── ] [ Fit ] │ [ Snap □ ] │ [ Screens ▾ ]
```

- **Load/Save** — same as today (file picker)
- **Undo/Redo** — full edit history
- **Zoom controls** — magnifier, slider, fit button
- **Snap to grid** toggle
- **Screen selector** dropdown (or tabs)

## Validation

Same as today — real-time errors/warnings below toolbar. Click an issue to select the problematic widget.

## Preview Toggle

Instead of a separate preview, the canvas itself IS the preview. But we could have a **simulate mode** toggle:
- **Edit mode** — full direct manipulation
- **Simulate mode** — read-only, renders as the game engine would, with mock data

## Implementation Approach

### Phase 1: Canvas Renderer
Use the existing `renderScreenToHTML()` — it already produces the exact DOM the engine uses. Render it to a large `<div>` that fills the canvas area. Make it scrollable/zoomable.

### Phase 2: Selection Overlay
Overlay transparent `<div>` elements on top of each widget region in the rendered canvas. These handle click/drag events. Show resize handles on selected widget.

### Phase 3: Drag-and-Drop from Palette
Implement HTML5 drag from the palette sidebar. Track the drop position over the canvas. Insert widget at the right index.

### Phase 4: Move and Reorder
Implement drag on selected widgets. Track hover position to determine insertion point. Update the widget tree on drop.

### Phase 5: Resize Handles
Add corner/edge resize handles to selected widget overlay. Compute new size and update widget properties.

### Phase 6: Inline Text Editing
Double-click label/button → show text input at that position → update widget on blur.

### Phase 7: Property Panel → Live Binding
Connect property panel inputs directly to widget state. No "Apply" button — everything is live.

### Phase 8: Undo/Redo
Stack-based undo/redo over all widget tree mutations.

## Why Not Keep the Tree?

The tree is genuinely useful for:
- Understanding structure
- Deep selection
- Bulk operations

But it shouldn't be the **primary** interface. A tree-first UI for layout is like editing HTML by reading the DOM tree — possible, but unnatural.

The new approach:
- Tree = outline / reference (left side, collapsible)
- Canvas = primary editing surface (center, large)
- Properties = inspector (right side)

Exactly like every mainstream IDE and design tool.

## Open Questions

1. Should the canvas render in a full `<iframe>` to perfectly isolate styles? (More accurate, but harder to bridge events)
2. Do we need a "component library" concept — reusable widget templates?
3. Should we support CSS flexbox gap/align directly, or keep the current simplified model?
4. How do we handle the game data binding layer? (e.g. a progress bar that shows `player.health` — does the editor show real data or mock data?)
5. Do we need component states? (hover, active, disabled styles for buttons)
