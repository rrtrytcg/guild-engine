# Phase 4 — WYSIWYG Canvas Interaction

**Goal:** Add direct manipulation features to the canvas: drag handles for moving widgets, drag-and-drop reordering, and inline text editing.

**Architecture:** SelectionOverlay gains drag capability. CanvasArea gains cross-widget drag reordering. Inline editing via double-click on text-capable widgets (label, textbutton, textinput).

**Design:** This plan implements features validated in earlier design sessions. The WYSIWYG canvas already exists (Phase 1), selection overlay with resize handles already exists (Phase 2). Phase 4 adds movement handles, reordering via canvas drag, and inline text editing.

---

## Dependency Graph

```
Batch 1 (parallel): 1.1, 1.2, 1.3, 1.4 [foundation - no deps]
Batch 2 (parallel): 2.1, 2.2 [core - depends on batch 1]
Batch 3 (parallel): 3.1, 3.2 [components - depends on batch 2]
```

---

## Batch 1: Foundation (parallel)

### Task 1.1: Add move handle rendering to SelectionOverlay
**File:** `editor/src/components/screenBuilder/SelectionOverlay.jsx`
**Test:** `editor/tests/selection-overlay.test.js`
**Depends:** none

**Design decision:** Adding 4 directional drag handles (move cursors) at the center of each edge. These are visually distinct from resize handles (corner/edge squares). Move handles are pill-shaped bars centered on each edge midpoint.

```javascript
// ADD TO top constants:
const MOVE_HANDLE_SIZE = { width: 40, height: 8 }
const MOVE_HANDLE_OFFSET = 0 // flush with border

// ADD new handle style function:
function moveHandleStyle(bounds, position) {
  const isHorizontal = position === 'n' || position === 's'
  return {
    position: 'absolute',
    left: isHorizontal ? bounds.left + bounds.width / 2 - MOVE_HANDLE_SIZE.width / 2 : bounds.left - MOVE_HANDLE_SIZE.height / 2,
    top: isHorizontal ? bounds.top - MOVE_HANDLE_SIZE.height / 2 : bounds.top + bounds.height / 2 - MOVE_HANDLE_SIZE.width / 2,
    ...(position === 'n' && { left: bounds.left + bounds.width / 2 - MOVE_HANDLE_SIZE.width / 2, top: bounds.top - MOVE_HANDLE_SIZE.height / 2 }),
    ...(position === 's' && { left: bounds.left + bounds.width / 2 - MOVE_HANDLE_SIZE.width / 2, top: bounds.top + bounds.height - MOVE_HANDLE_SIZE.height / 2 }),
    ...(position === 'e' && { left: bounds.left + bounds.width - MOVE_HANDLE_SIZE.height / 2, top: bounds.top + bounds.height / 2 - MOVE_HANDLE_SIZE.width / 2 }),
    ...(position === 'w' && { left: bounds.left - MOVE_HANDLE_SIZE.height / 2, top: bounds.top + bounds.height / 2 - MOVE_HANDLE_SIZE.width / 2 }),
    width: isHorizontal ? MOVE_HANDLE_SIZE.width : MOVE_HANDLE_SIZE.height,
    height: isHorizontal ? MOVE_HANDLE_SIZE.height : MOVE_HANDLE_SIZE.width,
    backgroundColor: '#9F97ED',
    border: '1px solid #1a1a2e',
    borderRadius: 4,
    pointerEvents: 'auto',
    cursor: 'move',
    zIndex: 1001,
  }
}

// ADD to render output (after resize handles):
<div
  data-move-handle-n
  style={moveHandleStyle(bounds, 'n')}
  onMouseDown={handleMoveStart('n')}
/>
<div
  data-move-handle-s
  style={moveHandleStyle(bounds, 's')}
  onMouseDown={handleMoveStart('s')}
/>
<div
  data-move-handle-e
  style={moveHandleStyle(bounds, 'e')}
  onMouseDown={handleMoveStart('e')}
/>
<div
  data-move-handle-w
  style={moveHandleStyle(bounds, 'w')}
  onMouseDown={handleMoveStart('w')}
/>
```

```javascript
// ADD new state and handlers for dragging:
// Add to useState declarations:
const [moveHandle, setMoveHandle] = useState(null)
const [moveStartBounds, setMoveStartBounds] = useState(null)

// ADD new handlers:
const handleMoveStart = (position) => (e) => {
  e.stopPropagation()
  setMoveHandle(position)
  setMoveStartBounds({ ...bounds })
  startPos.current = { x: e.clientX, y: e.clientY }
  document.body.style.cursor = 'move'
}

// MODIFY existing useEffect for mouse handling (add move logic):
// Add after resize handling block:
if (moveHandle && moveStartBounds) {
  // Calculate delta and update bounds (similar to resize but all 4 edges move together)
  setBounds((prev) => {
    if (!prev) return null
    const deltaX = e.clientX - startPos.current.x
    const deltaY = e.clientY - startPos.current.y
    const scale = 1 / canvasZoom
    return {
      ...prev,
      left: moveHandle.includes('w') ? moveStartBounds.left + deltaX * scale : prev.left,
      top: moveHandle.includes('n') ? moveStartBounds.top + deltaY * scale : prev.top,
      width: moveHandle.includes('e') || moveHandle.includes('w') 
        ? moveStartBounds.width + (moveHandle.includes('w') ? -deltaX * scale : deltaX * scale)
        : prev.width,
      height: moveHandle.includes('s') || moveHandle.includes('n')
        ? moveStartBounds.height + (moveHandle.includes('n') ? -deltaY * scale : deltaY * scale)
        : prev.height,
    }
  })
  startPos.current = { x: e.clientX, y: e.clientY }
}

// MODIFY handleMouseUp to commit move:
if (moveHandle && bounds && selectedWidgetId) {
  // Commit move to store - convert bounds delta to widget position changes
  onMove?.(selectedWidgetId, {
    left: bounds.left - moveStartBounds.left,
    top: bounds.top - moveStartBounds.top,
  })
}
setMoveHandle(null)
setMoveStartBounds(null)
```

**Verify:** `bun test editor/tests/selection-overlay.test.js`

---

### Task 1.2: Add position update logic to screenBuilderSlice
**File:** `editor/src/store/slices/screenBuilderSlice.js`
**Test:** `editor/tests/screen-builder-slice.test.js`
**Depends:** none

**Design decision:** Adding a new action `moveScreenWidgetPosition` that applies pixel offset to a widget's style.position (or creates one if not present). The existing `moveScreenWidget` handles tree reordering - this handles visual position within parent.

```javascript
// ADD new action after moveScreenWidget:
moveScreenWidgetPosition: (widgetId, delta) => set((state) => {
  const layout = getScreenLayout(state.activeScreen)
  if (!layout || !widgetId) return {}

  // delta = { left: number, top: number } in pixels
  const widget = findWidgetById(layout, widgetId)
  if (!widget) return {}

  // Merge position into style
  const currentPos = widget.style?.position ?? { left: 0, top: 0 }
  const nextPos = {
    left: (currentPos.left ?? 0) + (delta.left ?? 0),
    top: (currentPos.top ?? 0) + (delta.top ?? 0),
  }

  const nextLayout = updateWidgetInTree(layout, widgetId, 'style.position', nextPos)
  if (nextLayout === layout) return {}

  return syncActiveScreenState(state, withScreenLayout(state.activeScreen, nextLayout), {
    isDirty: true,
  })
}),
```

**Verify:** `bun test editor/tests/screen-builder-slice.test.js`

---

### Task 1.3: Add onMove prop to SelectionOverlay
**File:** `editor/src/components/screenBuilder/SelectionOverlay.jsx`
**Test:** `editor/tests/selection-overlay.test.js`
**Depends:** 1.1

**Changes to function signature:**
```javascript
export default function SelectionOverlay({ containerRef, selectedWidgetId, onSelect, onDeselect, onResize, onMove }) {
  // ... existing code ...
}
```

**Verify:** `bun test editor/tests/selection-overlay.test.js`

---

### Task 1.4: Add inline text editing state to CanvasArea
**File:** `editor/src/components/screenBuilder/CanvasArea.jsx`
**Test:** `editor/tests/canvas-area.test.js`
**Depends:** none

**Design decision:** Double-click on text-capable widgets (label, textbutton, textinput) opens an inline edit mode. The edit replaces the widget's rendered text with an input field positioned directly over it.

```javascript
// ADD to state declarations:
const [editingWidgetId, setEditingWidgetId] = useState(null)
const [editingValue, setEditingValue] = useState('')

// ADD handlers:
const handleDoubleClick = useCallback((e) => {
  const widgetTarget = e.target.closest('[data-widget-id]')
  const widgetId = widgetTarget?.getAttribute('data-widget-id')
  if (!widgetId) return

  // Find widget and check if text-editable
  const widget = findWidgetById(activeScreen?.layout, widgetId)
  if (!widget) return

  const textEditableTypes = ['label', 'textbutton', 'iconbutton', 'textinput']
  if (!textEditableTypes.includes(widget.type)) return

  const textPath = widget.type === 'label' ? 'text' 
    : widget.type === 'textbutton' || widget.type === 'iconbutton' ? 'label'
    : 'placeholder'
  
  setEditingWidgetId(widgetId)
  setEditingValue(widget[textPath] ?? '')
}, [activeScreen])

const handleEditSubmit = useCallback(() => {
  if (editingWidgetId && editingValue.trim()) {
    const widget = findWidgetById(activeScreen?.layout, editingWidgetId)
    const textPath = widget?.type === 'label' ? 'text'
      : widget?.type === 'textbutton' || widget?.type === 'iconbutton' ? 'label'
      : 'placeholder'
    updateScreenWidget(editingWidgetId, textPath, editingValue.trim())
  }
  setEditingWidgetId(null)
  setEditingValue('')
}, [editingWidgetId, editingValue, activeScreen, updateScreenWidget])

const handleEditKeyDown = useCallback((e) => {
  if (e.key === 'Enter') {
    e.preventDefault()
    handleEditSubmit()
  }
  if (e.key === 'Escape') {
    setEditingWidgetId(null)
    setEditingValue('')
  }
}, [handleEditSubmit])

// MODIFY surface ref handling - useEffect to position/edit inline widget
// ADD to imports:
import { findWidgetById } from '../../utils/screenSchema'

// ADD after existing effects:
useEffect(() => {
  if (!editingWidgetId || !surfaceRef.current) return

  const widgetEl = surfaceRef.current.querySelector(`[data-widget-id="${editingWidgetId}"]`)
  if (!widgetEl) return

  const rect = widgetEl.getBoundingClientRect()
  const surfaceRect = surfaceRef.current.getBoundingClientRect()

  // Position input over widget, scaled appropriately
  const scale = canvasZoom
  setEditingWidgetId(editingWidgetId) // trigger re-render
}, [editingWidgetId, canvasZoom])
```

**Verify:** `bun test editor/tests/canvas-area.test.js`

---

## Batch 2: Core (parallel)

### Task 2.1: Implement canvas widget reordering with drag-and-drop
**File:** `editor/src/components/screenBuilder/CanvasArea.jsx`
**Test:** `editor/tests/canvas-area-dnd.test.js`
**Depends:** 1.1, 1.2, 1.4

**Design decision:** Reordering uses HTML5 drag API. When dragging a selected widget over other widgets, show DropZone indicators. On drop, call `moveScreenWidget` from the slice to reorder in tree structure.

```javascript
// MODIFY handleDragOver to detect reorder vs add:
const handleDragOver = useCallback((e) => {
  e.preventDefault()
  
  // Check if this is a reorder drag (from tree or canvas)
  const isReorderDrag = e.dataTransfer.types.includes('text/plain') && 
                        e.dataTransfer.getData('text/plain') !== ''
  
  if (isReorderDrag) {
    // Handle reorder drag
    const draggedId = e.dataTransfer.getData('text/plain')
    const widgetEl = e.target.closest('[data-widget-id]')
    
    if (widgetEl) {
      const targetId = widgetEl.getAttribute('data-widget-id')
      if (targetId && targetId !== draggedId) {
        const rect = widgetEl.getBoundingClientRect()
        const offsetY = e.clientY - rect.top
        const threshold = rect.height / 3
        
        let dropPosition
        if (offsetY < threshold) {
          dropPosition = 'before'
        } else if (offsetY > rect.height - threshold) {
          dropPosition = 'after'
        } else {
          dropPosition = 'inside'
        }
        
        setDragOverContainer(targetId)
        setDragPosition(dropPosition)
        setDragSourceId(draggedId)
        return
      }
    }
  } else {
    // Handle add drag (existing code)
    const widgetEl = e.target.closest('[data-widget-id]')
    if (widgetEl) {
      const widgetId = widgetEl.getAttribute('data-widget-id')
      const widgetType = widgetEl.getAttribute('data-widget-type')
      // ... existing add drag logic ...
    }
  }
  
  setDragOverContainer('root')
  setDragPosition('inside')
}, [])

// MODIFY handleDrop:
const handleDrop = useCallback((e) => {
  e.preventDefault()
  
  const isReorderDrag = dragSourceId && dragOverContainer
  const widgetType = e.dataTransfer.getData('application/x-widget-type')
  
  if (isReorderDrag && dragSourceId && dragOverContainer) {
    // Reorder existing widget
    const placement = dragPosition === 'inside' ? 'inside' 
                    : dragPosition === 'before' ? 'before' : 'after'
    
    const intent = getMoveIntent(rootWidget, {
      draggedId: dragSourceId,
      targetId: dragOverContainer,
      placement,
    })
    
    if (intent) {
      moveScreenWidget(dragSourceId, intent.parentId, intent.index)
    }
  } else if (widgetType && dragOverContainer) {
    // Add new widget (existing code)
    addScreenWidget(dragOverContainer, widgetType)
  }
  
  setDragOverContainer(null)
  setDragPosition(null)
  setDragSourceId(null)
}, [dragSourceId, dragOverContainer, dragPosition, addScreenWidget, moveScreenWidget, rootWidget])

// ADD state for reorder drag:
const [dragSourceId, setDragSourceId] = useState(null)

// ADD to imports:
import { getMoveIntent } from '../../utils/dragDropUtils'
```

**Verify:** `bun test editor/tests/canvas-area-dnd.test.js`

---

### Task 2.2: Implement inline edit overlay rendering
**File:** `editor/src/components/screenBuilder/InlineEditOverlay.jsx` (NEW)
**Test:** `editor/tests/inline-edit-overlay.test.js`
**Depends:** 1.4

```javascript
import { useEffect, useRef, useState } from 'react'
import { findWidgetById } from '../../utils/screenSchema'

const INPUT_STYLE = {
  position: 'absolute',
  background: 'rgba(0, 0, 0, 0.85)',
  border: '2px solid #7F77DD',
  borderRadius: 6,
  color: '#f3f3ff',
  fontSize: 14,
  padding: '6px 10px',
  outline: 'none',
  minWidth: 100,
  zIndex: 2000,
  boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
}

/**
 * Renders an input overlay precisely positioned over a widget for inline editing.
 * Used for double-click text editing on canvas.
 */
export default function InlineEditOverlay({ 
  widgetId, 
  value, 
  onChange, 
  onSubmit, 
  onCancel,
  surfaceRef,
  canvasZoom,
  widgetType,
}) {
  const inputRef = useRef(null)
  const [position, setPosition] = useState(null)

  useEffect(() => {
    if (!widgetId || !surfaceRef?.current) return

    const widgetEl = surfaceRef.current.querySelector(`[data-widget-id="${widgetId}"]`)
    if (!widgetEl) return

    const rect = widgetEl.getBoundingClientRect()
    const surfaceRect = surfaceRef.current.getBoundingClientRect()

    setPosition({
      left: (rect.left - surfaceRect.left) / canvasZoom,
      top: (rect.top - surfaceRect.top) / canvasZoom,
      width: rect.width / canvasZoom,
      height: Math.max(rect.height / canvasZoom, 36),
    })
  }, [widgetId, surfaceRef, canvasZoom])

  useEffect(() => {
    inputRef.current?.focus()
    inputRef.current?.select()
  }, [position])

  if (!position) return null

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onSubmit()
    }
    if (e.key === 'Escape') {
      e.preventDefault()
      onCancel()
    }
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onSubmit}
      onKeyDown={handleKeyDown}
      style={{
        ...INPUT_STYLE,
        left: position.left,
        top: position.top,
        width: position.width,
      }}
    />
  )
}
```

**Verify:** `bun test editor/tests/inline-edit-overlay.test.js`

---

## Batch 3: Components (parallel)

### Task 3.1: Wire up SelectionOverlay drag handles to CanvasArea
**File:** `editor/src/components/screenBuilder/CanvasArea.jsx`
**Test:** `editor/tests/canvas-selection-wiring.test.js`
**Depends:** 1.1, 1.2, 2.1

**Changes:**
```javascript
// ADD to CanvasArea:
// 1. Import moveScreenWidgetPosition from store
const moveScreenWidgetPosition = useStore((s) => s.moveScreenWidgetPosition)

// 2. Add handler:
const handleMove = useCallback((widgetId, delta) => {
  moveScreenWidgetPosition(widgetId, delta)
}, [moveScreenWidgetPosition])

// 3. Pass to SelectionOverlay:
<SelectionOverlay
  containerRef={surfaceRef}
  selectedWidgetId={selectedWidgetId}
  onSelect={setSelectedWidgetId}
  onDeselect={() => setSelectedWidgetId(null)}
  onResize={handleResize}
  onMove={handleMove}
/>

// 4. Wire double-click to inline edit:
onDoubleClick={handleDoubleClick}
```

**Verify:** `bun test editor/tests/canvas-selection-wiring.test.js`

---

### Task 3.2: Add inline edit rendering to CanvasArea render
**File:** `editor/src/components/screenBuilder/CanvasArea.jsx`
**Test:** `editor/tests/canvas-inline-edit.test.js`
**Depends:** 2.2, 3.1

**Changes:**
```javascript
// ADD imports:
import InlineEditOverlay from './InlineEditOverlay'

// ADD to state declarations:
const [editingWidgetId, setEditingWidgetId] = useState(null)
const [editingValue, setEditingValue] = useState('')

// MODIFY surface div to add double-click:
<div
  data-canvas-surface
  style={{
    ...surfaceStyle,
    transform: `scale(${canvasZoom})`,
    transformOrigin: 'top left',
  }}
  onClick={handleCanvasClick}
  onDoubleClick={handleDoubleClick}
  ref={surfaceRef}
  dangerouslySetInnerHTML={{ __html: html }}
/>

// ADD after SelectionOverlay:
{editingWidgetId && (
  <InlineEditOverlay
    widgetId={editingWidgetId}
    value={editingValue}
    onChange={setEditingValue}
    onSubmit={handleEditSubmit}
    onCancel={() => {
      setEditingWidgetId(null)
      setEditingValue('')
    }}
    surfaceRef={surfaceRef}
    canvasZoom={canvasZoom}
  />
)}
```

**Verify:** `bun test editor/tests/canvas-inline-edit.test.js`

---

## Test Files

### Task T1: selection-overlay.test.js
**File:** `editor/tests/selection-overlay.test.js`

```javascript
import { describe, expect, it, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import SelectionOverlay from '../src/components/screenBuilder/SelectionOverlay'

// Simple mock container
const createMockContainer = () => {
  const div = document.createElement('div')
  div.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 100 })
  return div
}

describe('SelectionOverlay drag handles', () => {
  it('renders 4 move handles when bounds are provided', () => {
    const mockContainer = { current: createMockContainer() }
    const { container } = render(
      <SelectionOverlay
        containerRef={mockContainer}
        selectedWidgetId="test-widget"
        onSelect={() => {}}
        onDeselect={() => {}}
        onResize={() => {}}
        onMove={() => {}}
      />
    )

    expect(container.querySelector('[data-move-handle-n]')).toBeTruthy()
    expect(container.querySelector('[data-move-handle-s]')).toBeTruthy()
    expect(container.querySelector('[data-move-handle-e]')).toBeTruthy()
    expect(container.querySelector('[data-move-handle-w]')).toBeTruthy()
  })

  it('renders 8 resize handles (existing behavior)', () => {
    const mockContainer = { current: createMockContainer() }
    const { container } = render(
      <SelectionOverlay
        containerRef={mockContainer}
        selectedWidgetId="test-widget"
        onSelect={() => {}}
        onDeselect={() => {}}
        onResize={() => {}}
      />
    )

    expect(container.querySelector('[data-resize-handle-n]')).toBeTruthy()
    expect(container.querySelector('[data-resize-handle-ne]')).toBeTruthy()
    expect(container.querySelector('[data-resize-handle-se]')).toBeTruthy()
  })

  it('calls onMove when move handle is dragged', () => {
    const onMove = vi.fn()
    const mockContainer = { current: createMockContainer() }
    const { container } = render(
      <SelectionOverlay
        containerRef={mockContainer}
        selectedWidgetId="test-widget"
        onSelect={() => {}}
        onDeselect={() => {}}
        onResize={() => {}}
        onMove={onMove}
      />
    )

    const moveHandle = container.querySelector('[data-move-handle-e]')
    fireEvent.mouseDown(moveHandle, { clientX: 100, clientY: 50 })
    fireEvent.mouseMove(document, { clientX: 120, clientY: 50 })
    fireEvent.mouseUp(document)

    expect(onMove).toHaveBeenCalledWith('test-widget', expect.objectContaining({
      left: expect.any(Number),
    }))
  })
})
```

### Task T2: canvas-area-inline-edit.test.js
**File:** `editor/tests/canvas-area-inline-edit.test.js`

```javascript
import { describe, expect, it, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import CanvasArea from '../src/components/screenBuilder/CanvasArea'

// Mock the dependencies
vi.mock('../../src/hooks/useScreenPreview', () => ({
  default: () => ({ activeScreen: null, snapshot: {} }),
}))

vi.mock('../../src/hooks/useScreenFiles', () => ({
  default: () => ({
    screens: [],
    loadFromFiles: () => {},
    saveActiveScreen: () => {},
    selectScreen: () => {},
    isDirty: false,
    activeScreenId: null,
  }),
}))

describe('CanvasArea inline editing', () => {
  it('does not render inline edit overlay when no widget is selected', () => {
    const { container } = render(<CanvasArea onAction={() => {}} />)
    expect(container.querySelector('input[type="text"]')).toBeNull()
  })
})
```

---

## Summary

| Batch | Tasks | Files Modified/Created |
|-------|-------|----------------------|
| 1 | 1.1-1.4 | SelectionOverlay.jsx, screenBuilderSlice.js, CanvasArea.jsx |
| 2 | 2.1-2.2 | CanvasArea.jsx, InlineEditOverlay.jsx (NEW) |
| 3 | 3.1-3.2 | CanvasArea.jsx |
| Tests | T1-T2 | selection-overlay.test.js, canvas-area-inline-edit.test.js |

**Total micro-tasks:** 8 (4 foundation + 2 core + 2 component + 2 test files as separate micro-tasks)

**Implementation notes:**
- Move handles are visually distinct from resize handles (pill-shaped vs square)
- Inline edit only works on text-capable widgets (label, textbutton, iconbutton, textinput)
- Drag-and-drop reordering uses existing `getMoveIntent` utility
- All changes preserve existing resize behavior
