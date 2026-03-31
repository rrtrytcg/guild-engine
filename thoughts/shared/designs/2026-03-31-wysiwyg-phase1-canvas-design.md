# WYSIWYG Phase 1 — Canvas Renderer

date: 2026-03-31
topic: "WYSIWYG Screen Builder Phase 1: Canvas Renderer"
status: validated

## Problem Statement

The current ScreenBuilder uses a small, centered preview panel that doesn't reflect the actual runtime appearance. Users can't visualize what their screen will look like in-game. The canvas needs to become the **primary editing surface** — large, scrollable, zoomable — not a secondary preview.

**Key insight:** `renderScreenToHTML()` already produces the exact DOM the engine uses. We don't need to rebuild rendering — we need to make the output the primary editing surface.

## Constraints

- Keep existing `*.screen.json` format unchanged
- Keep `renderScreenToHTML()` pipeline intact — no modifications to `layoutEngine.js`
- Replace only the authoring UX layout (tree-first → canvas-first)
- Tree becomes a secondary outline view (still useful for structure navigation)
- All existing functionality must continue working (load/save, screen tabs, validation, properties)
- No new dependencies — inline styles only (consistent with existing codebase)
- Zustand store already has all CRUD operations — minimal state additions only

## Approach

**Canvas-first layout with CSS transform zoom.** We're expanding the preview into a full canvas area with scroll/zoom, keeping the rendering pipeline identical.

**Why this approach:**
- Minimal changes to existing code — we're rearranging layout, not rebuilding
- Preserves all current functionality — no breaking changes
- Phased rollout — Phase 1 sets infrastructure, subsequent phases add interactivity
- Uses proven patterns — VS Code form designer model (canvas + panels)

**Rejected alternatives:**
- **iframe isolation:** Harder to bridge events for Phase 2+ (selection overlay, drag-drop)
- **React component rendering:** Would diverge from engine DOM, defeating WYSIWYG purpose
- **Canvas API rendering:** Too complex, loses HTML/CSS fidelity, unnecessary complexity

## Architecture

### New Layout Structure

```
┌──────────┬──────────────────────────────┬─────────────┐
│ Palette  │       CANVAS AREA            │ Properties  │
│ (180px)  │   (fills remaining space)    │  (320px)    │
│          │                              │             │
├──────────┤                              │             │
│ Tree     │                              │             │
│ (180px)  │                              │             │
└──────────┴──────────────────────────────┴─────────────┘
```

### Component Hierarchy

```
ScreenBuilder (layout shell)
├── WidgetPalette (left-top, NEW)
│   └── Draggable widget types (Phase 3 prep)
├── CanvasArea (center, REPLACES ScreenPreview)
│   ├── CanvasToolbar (zoom controls, NEW)
│   ├── CanvasViewport (scrollable container, NEW)
│   │   └── CanvasSurface (scaled div with renderScreenToHTML output)
│   └── SelectionOverlay (Phase 2, placeholder for now)
├── WidgetTree (left-bottom, REPOSITIONED)
│   └── Outline view (existing, secondary)
└── WidgetProperties (right, UNCHANGED)
```

## Components

### CanvasArea.jsx (NEW)

**Purpose:** Main canvas viewport with zoom/pan controls

**Props:**
- `onAction` — callback for button actions (existing)

**State:**
- `zoom` (number, default 1.0) — current zoom level
- `fitMode` ('auto' | 'manual') — whether zoom is auto-calculated or user-set

**Behavior:**
- Renders `renderScreenToHTML()` output in a scaled container
- Applies `transform: scale(zoom)` with `transform-origin: top left`
- Scrollable viewport with `overflow: auto`
- Shows empty state when no screen loaded
- Zoom slider (50% - 200%) with step 0.1
- Zoom in/out buttons (+10%, -10%)
- "Fit to screen" button (auto-calculates zoom to fit viewport)
- Grid background via CSS radial-gradient

### CanvasToolbar.jsx (NEW)

**Purpose:** Floating toolbar with zoom controls

**Layout:**
```
[ − ] [ 100% ●── ] [ + ] [ Fit ]
```

**Controls:**
- Zoom out button (−10%, min 50%)
- Zoom slider (50% - 200%, step 0.1)
- Zoom in button (+10%, max 200%)
- Fit to screen button

**Positioning:** Floating at top-right of canvas area

### WidgetPalette.jsx (NEW)

**Purpose:** Draggable widget types (Phase 3 prep)

**Phase 1 scope:** Simple list of widget types with drag support prepared

**Widget types:**
- **Containers:** vbox, hbox, grid, stack
- **Display:** label, image, spacer, progressbar
- **Interactive:** textbutton, iconbutton, textinput

**Behavior:**
- Each widget type is draggable (HTML5 drag API prepared)
- Visual distinction between container/display/interactive
- Hover effects on drag (Phase 3+)

### Modified Components

**ScreenBuilder.jsx:**
- New 4-zone grid layout: `180px minmax(0, 1fr) 320px`
- Left column split: palette (top) + tree (bottom)
- Center: CanvasArea replaces ScreenPreview
- Right: WidgetProperties unchanged

**WidgetTree.jsx:**
- Move to bottom-left panel
- Remove screen tabs (move to canvas area)
- Remove load/save buttons (move to canvas toolbar)
- Keep tree rendering, context menu, drag-drop logic
- Make collapsible (Phase 2+)

## Data Flow

### Zoom System

```
User interacts with CanvasToolbar
    ↓
Updates zoom state in CanvasArea
    ↓
Applies transform: scale(zoom) to CanvasSurface
    ↓
Surface scales, viewport scrollbars adjust
```

### Screen Rendering

```
activeScreen changes (tab switch, load, create)
    ↓
CanvasArea calls renderScreenToHTML(activeScreen.id, snapshot, handler)
    ↓
HTML output rendered in CanvasSurface via dangerouslySetInnerHTML
    ↓
Surface displays exact engine DOM
```

## State Changes

### screenBuilderSlice Additions

```javascript
// Add to SCREEN_BUILDER_DEFAULTS:
canvasZoom: 1.0,              // Current zoom level (0.5 - 2.0)
canvasFitMode: 'manual',      // 'auto' or 'manual'
```

### New Actions

```javascript
setCanvasZoom(zoom)           // Set zoom level directly
fitCanvasToViewport()         // Auto-calculate zoom to fit
```

## Error Handling

- **No screen loaded:** Show empty state with "Load or create a screen" message
- **Invalid screen:** Show validation errors (existing ScreenErrors component)
- **Zoom out of bounds:** Clamp to 0.5 - 2.0 range
- **Fit calculation:** Default to 100% if dimensions can't be determined

## Testing Strategy

### Unit Tests
- CanvasArea renders with correct zoom levels
- Zoom slider updates surface scale correctly
- "Fit to screen" calculates appropriate zoom
- Screen tabs switch canvas content
- Empty state displays when no screen loaded

### Integration Tests
- Layout is responsive at different window sizes
- Zoom doesn't break existing functionality
- Properties panel still updates canvas in real-time
- Load/save still works with new layout

### Manual Testing
- Visual comparison with engine output
- Zoom behavior feels natural
- Pan/scroll works at all zoom levels
- Grid background looks clean

## Open Questions

1. **Grid background style:** Dot-grid vs line-grid? → **Decision:** Start with subtle CSS radial-gradient dots (zero overhead, clean look)
2. **Canvas sizing:** Fixed size vs content-sized? → **Decision:** Content-sized with scrollbars (VS Code form designer model)
3. **Tree position:** Bottom-left vs collapsible sidebar? → **Decision:** Bottom-left for Phase 1, collapsible later
4. **Auto-fit on screen switch:** Should we auto-fit when switching screens? → **Decision:** Only if fitMode is 'auto', otherwise preserve user zoom
5. **Zoom persistence:** Should zoom level persist across sessions? → **Decision:** No, reset to 100% on load (simple, predictable)
