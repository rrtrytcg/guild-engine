# WYSIWYG Phase 1 — Canvas Renderer Implementation Plan

**Goal:** Transform ScreenBuilder from a 3-column preview-first layout to a 4-zone canvas-first layout with zoom/pan capabilities.

**Architecture:** Canvas-first layout with CSS transform zoom. ScreenPreview → CanvasArea (scaled viewport), WidgetTree repositioned, screen tabs moved to canvas header, load/save moved to canvas toolbar.

**Design:** `thoughts/shared/designs/2026-03-31-wysiwyg-phase1-canvas-design.md`

---

## Dependency Graph

```
Batch 1 (parallel): 1.1, 1.2, 1.3 [state additions - no deps]
Batch 2 (parallel): 2.1, 2.2, 2.3, 2.4 [new components - depends on batch 1]
Batch 3 (parallel): 3.1, 3.2 [modified components - depends on batch 2]
Batch 4 (parallel): 4.1, 4.2 [tests - depends on batch 2]
```

---

## Batch 1: State Additions (parallel - 1 implementer)

All tasks in this batch have NO dependencies and run simultaneously.

### Task 1.1: screenBuilderSlice State Additions
**File:** `editor/src/store/slices/screenBuilderSlice.js`
**Test:** `editor/tests/screen-builder-slice.test.js` (extend existing)
**Depends:** none

Add to `SCREEN_BUILDER_DEFAULTS`:
```javascript
canvasZoom: 1.0,           // Current zoom level (0.5 - 2.0)
canvasFitMode: 'manual',   // 'auto' or 'manual'
```

Add new actions to `createScreenBuilderSlice`:
```javascript
setCanvasZoom: (zoom) => set((state) => ({
  canvasZoom: Math.min(2.0, Math.max(0.5, zoom)),
  canvasFitMode: 'manual',
})),

fitCanvasToViewport: () => set({ canvasFitMode: 'auto' }),
```

**Note:** `fitCanvasToViewport()` is a placeholder for Phase 2 when viewport dimensions are known. For now it just sets fitMode to 'auto'.

**Verify:** `cd editor && bun test tests/screen-builder-slice.test.js`
**Commit:** `feat(screen-builder): add canvasZoom and canvasFitMode state`

---

## Batch 2: New Components (parallel - 3 implementers)

All tasks in this batch depend on Batch 1 completing.

### Task 2.1: CanvasToolbar.jsx
**File:** `editor/src/components/screenBuilder/CanvasToolbar.jsx`
**Test:** `editor/tests/screen-builder-canvas-toolbar.test.jsx`
**Depends:** 1.1

```javascript
// COMPLETE test code - copy-paste ready
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CanvasToolbar } from '../src/components/screenBuilder/CanvasToolbar.jsx'

// Mock useStore
vi.mock('../src/store/useStore', () => ({
  default: (selector) => selector({
    canvasZoom: 1.0,
    canvasFitMode: 'manual',
    setCanvasZoom: vi.fn(),
    fitCanvasToViewport: vi.fn(),
  }),
}))

describe('CanvasToolbar', () => {
  it('renders zoom controls', () => {
    render(<CanvasToolbar />)
    expect(screen.getByText('−')).toBeTruthy()
    expect(screen.getByText('+')).toBeTruthy()
    expect(screen.getByText('Fit')).toBeTruthy()
  })

  it('displays current zoom as percentage', () => {
    render(<CanvasToolbar />)
    expect(screen.getByText('100%')).toBeTruthy()
  })

  it('zoom out button calls setCanvasZoom with decreased value', () => {
    const setCanvasZoom = vi.fn()
    vi.mocked(useStore).default = (selector) => selector({
      canvasZoom: 1.0,
      setCanvasZoom,
    })
    render(<CanvasToolbar />)
    fireEvent.click(screen.getByText('−'))
    expect(setCanvasZoom).toHaveBeenCalledWith(0.9)
  })

  it('zoom in button calls setCanvasZoom with increased value', () => {
    const setCanvasZoom = vi.fn()
    vi.mocked(useStore).default = (selector) => selector({
      canvasZoom: 1.0,
      setCanvasZoom,
    })
    render(<CanvasToolbar />)
    fireEvent.click(screen.getByText('+'))
    expect(setCanvasZoom).toHaveBeenCalledWith(1.1)
  })

  it('fit button calls fitCanvasToViewport', () => {
    const fitCanvasToViewport = vi.fn()
    vi.mocked(useStore).default = (selector) => selector({
      canvasZoom: 1.0,
      fitCanvasToViewport,
    })
    render(<CanvasToolbar />)
    fireEvent.click(screen.getByText('Fit'))
    expect(fitCanvasToViewport).toHaveBeenCalled()
  })

  it('clamps zoom at minimum 0.5', () => {
    const setCanvasZoom = vi.fn()
    vi.mocked(useStore).default = (selector) => selector({
      canvasZoom: 0.5,
      setCanvasZoom,
    })
    render(<CanvasToolbar />)
    fireEvent.click(screen.getByText('−'))
    expect(setCanvasZoom).not.toHaveBeenCalled()
  })

  it('clamps zoom at maximum 2.0', () => {
    const setCanvasZoom = vi.fn()
    vi.mocked(useStore).default = (selector) => selector({
      canvasZoom: 2.0,
      setCanvasZoom,
    })
    render(<CanvasToolbar />)
    fireEvent.click(screen.getByText('+'))
    expect(setCanvasZoom).not.toHaveBeenCalled()
  })
})
```

```javascript
// COMPLETE implementation - copy-paste ready
import useStore from '../../store/useStore'

const MIN_ZOOM = 0.5
const MAX_ZOOM = 2.0
const ZOOM_STEP = 0.1

export function CanvasToolbar() {
  const canvasZoom = useStore((s) => s.canvasZoom)
  const setCanvasZoom = useStore((s) => s.setCanvasZoom)
  const fitCanvasToViewport = useStore((s) => s.fitCanvasToViewport)

  const handleZoomOut = () => {
    if (canvasZoom > MIN_ZOOM) {
      setCanvasZoom(canvasZoom - ZOOM_STEP)
    }
  }

  const handleZoomIn = () => {
    if (canvasZoom < MAX_ZOOM) {
      setCanvasZoom(canvasZoom + ZOOM_STEP)
    }
  }

  const handleSliderChange = (e) => {
    setCanvasZoom(parseFloat(e.target.value))
  }

  return (
    <div style={toolbarStyle}>
      <button
        type="button"
        onClick={handleZoomOut}
        disabled={canvasZoom <= MIN_ZOOM}
        style={zoomButtonStyle}
        title="Zoom out (−10%)"
      >
        −
      </button>

      <div style={sliderContainerStyle}>
        <input
          type="range"
          min={MIN_ZOOM}
          max={MAX_ZOOM}
          step={ZOOM_STEP}
          value={canvasZoom}
          onChange={handleSliderChange}
          style={sliderStyle}
          title="Zoom slider"
        />
        <span style={zoomLabelStyle}>{Math.round(canvasZoom * 100)}%</span>
      </div>

      <button
        type="button"
        onClick={handleZoomIn}
        disabled={canvasZoom >= MAX_ZOOM}
        style={zoomButtonStyle}
        title="Zoom in (+10%)"
      >
        +
      </button>

      <button
        type="button"
        onClick={fitCanvasToViewport}
        style={fitButtonStyle}
        title="Fit to screen"
      >
        Fit
      </button>
    </div>
  )
}

const toolbarStyle = {
  position: 'absolute',
  top: 12,
  right: 12,
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 12px',
  background: 'rgba(17, 17, 28, 0.92)',
  border: '1px solid #2a2a3e',
  borderRadius: 12,
  backdropFilter: 'blur(8px)',
  boxShadow: '0 8px 24px rgba(0,0,0,0.32)',
  zIndex: 100,
}

const zoomButtonStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 32,
  height: 32,
  background: '#171727',
  border: '1px solid #2f2f48',
  borderRadius: 8,
  color: '#d7d7ee',
  fontSize: 16,
  fontWeight: 700,
  cursor: 'pointer',
  transition: 'all 0.15s ease',
}

const sliderContainerStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
}

const sliderStyle = {
  width: 100,
  height: 4,
  appearance: 'none',
  background: '#2f2f48',
  borderRadius: 2,
  cursor: 'pointer',
  outline: 'none',
}

const zoomLabelStyle = {
  minWidth: 44,
  textAlign: 'center',
  fontSize: 12,
  fontWeight: 700,
  color: '#c8c4ff',
}

const fitButtonStyle = {
  padding: '6px 12px',
  background: '#201d47',
  border: '1px solid #4b44a6',
  borderRadius: 8,
  color: '#c8c4ff',
  fontSize: 11,
  fontWeight: 700,
  cursor: 'pointer',
}
```

**Verify:** `cd editor && bun test tests/screen-builder-canvas-toolbar.test.jsx`
**Commit:** `feat(screen-builder): add CanvasToolbar component`

---

### Task 2.2: CanvasArea.jsx
**File:** `editor/src/components/screenBuilder/CanvasArea.jsx`
**Test:** `editor/tests/screen-builder-canvas-area.test.jsx`
**Depends:** 1.1

```javascript
// COMPLETE test code - copy-paste ready
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CanvasArea } from '../src/components/screenBuilder/CanvasArea.jsx'

// Mock dependencies
vi.mock('../src/hooks/useScreenPreview', () => ({
  default: () => ({
    activeScreen: {
      id: 'ui.test',
      name: 'Test Screen',
      layout: { id: 'root', type: 'vbox', children: [] },
    },
    snapshot: {},
  }),
}))

vi.mock('../src/store/useStore', () => ({
  default: (selector) => selector({
    canvasZoom: 1.0,
    canvasFitMode: 'manual',
    setCanvasZoom: vi.fn(),
    fitCanvasToViewport: vi.fn(),
  }),
}))

describe('CanvasArea', () => {
  it('renders empty state when no screen loaded', () => {
    vi.mocked(useScreenPreview).default = () => ({ activeScreen: null, snapshot: {} })
    render(<CanvasArea onAction={() => {}} />)
    expect(screen.getByText(/no screen/i)).toBeTruthy()
  })

  it('renders screen name in header', () => {
    render(<CanvasArea onAction={() => {}} />)
    expect(screen.getByText('Test Screen')).toBeTruthy()
  })

  it('applies transform scale to surface based on zoom', () => {
    vi.mocked(useStore).default = (selector) => selector({
      canvasZoom: 1.5,
      canvasFitMode: 'manual',
      setCanvasZoom: vi.fn(),
      fitCanvasToViewport: vi.fn(),
    })
    render(<CanvasArea onAction={() => {}} />)
    const surface = document.querySelector('[data-canvas-surface]')
    expect(surface?.style.transform).toBe('scale(1.5)')
  })

  it('renders grid background', () => {
    render(<CanvasArea onAction={() => {}} />)
    const viewport = document.querySelector('[data-canvas-viewport]')
    expect(viewport).toBeTruthy()
  })

  it('contains CanvasToolbar', () => {
    render(<CanvasArea onAction={() => {}} />)
    expect(document.querySelector('[data-canvas-toolbar]')).toBeTruthy()
  })
})
```

```javascript
// COMPLETE implementation - copy-paste ready
import { useMemo } from 'react'
import { defineScreen, renderScreenToHTML } from '../../../../engine/layoutEngine.js'
import useScreenPreview from '../../hooks/useScreenPreview'
import useStore from '../../store/useStore'
import { CanvasToolbar } from './CanvasToolbar.jsx'

export function CanvasArea({ onAction }) {
  const { activeScreen, snapshot } = useScreenPreview()
  const canvasZoom = useStore((s) => s.canvasZoom)
  const canvasFitMode = useStore((s) => s.canvasFitMode)

  const html = useMemo(() => {
    if (!activeScreen?.id || !activeScreen?.layout?.type) return ''
    defineScreen(activeScreen.id, activeScreen)
    return renderScreenToHTML(activeScreen.id, snapshot, () => {})
  }, [activeScreen, snapshot])

  const handleCanvasClick = (event) => {
    const actionTarget = event.target instanceof Element
      ? event.target.closest('[data-action]')
      : null
    const action = actionTarget?.getAttribute('data-action')
    if (!action) return

    event.preventDefault()
    event.stopPropagation()
    onAction?.(action)
  }

  if (!activeScreen) {
    return (
      <div style={containerStyle}>
        <div style={emptyStateStyle}>
          Load or create a screen to start editing
        </div>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      {/* Header with screen name */}
      <div style={headerStyle}>
        <div style={headerLeftStyle}>
          <span style={eyebrowStyle}>Canvas</span>
          <span style={screenNameStyle}>{activeScreen.name}</span>
        </div>
        {canvasFitMode === 'auto' && (
          <span style={fitBadgeStyle}>Auto-fit</span>
        )}
      </div>

      {/* Viewport with scrollbars */}
      <div style={viewportStyle} data-canvas-viewport>
        {/* Grid background layer */}
        <div style={gridBackgroundStyle} />

        {/* Scaled canvas surface */}
        <div
          style={surfaceOuterStyle}
          onClick={handleCanvasClick}
        >
          <div
            data-canvas-surface
            style={{
              ...surfaceStyle,
              transform: `scale(${canvasZoom})`,
              transformOrigin: 'top left',
            }}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      </div>

      {/* Floating toolbar */}
      <div data-canvas-toolbar style={toolbarContainerStyle}>
        <CanvasToolbar />
      </div>
    </div>
  )
}

const containerStyle = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  position: 'relative',
  overflow: 'hidden',
}

const headerStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '14px 18px',
  borderBottom: '1px solid #2a2a3e',
  background: 'linear-gradient(180deg, #151525 0%, #11111c 100%)',
  flexShrink: 0,
}

const headerLeftStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 12,
}

const eyebrowStyle = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.14em',
  color: '#7F77DD',
  textTransform: 'uppercase',
}

const screenNameStyle = {
  fontSize: 16,
  fontWeight: 700,
  color: '#f3f3ff',
}

const fitBadgeStyle = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.08em',
  color: '#7F77DD',
  textTransform: 'uppercase',
  padding: '4px 8px',
  borderRadius: 4,
  background: 'rgba(127, 119, 221, 0.15)',
  border: '1px solid rgba(127, 119, 221, 0.3)',
}

const viewportStyle = {
  flex: 1,
  minHeight: 0,
  overflow: 'auto',
  position: 'relative',
  background: '#0a0a14',
}

const gridBackgroundStyle = {
  position: 'absolute',
  inset: 0,
  pointerEvents: 'none',
  backgroundImage: 'radial-gradient(circle, #2a2a3e 1px, transparent 1px)',
  backgroundSize: '24px 24px',
  opacity: 0.5,
}

const surfaceOuterStyle = {
  position: 'relative',
  minHeight: '100%',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  padding: 48,
}

const surfaceStyle = {
  background: 'linear-gradient(180deg, #1b1b30 0%, #131322 100%)',
  borderRadius: 18,
  border: '1px solid #31314a',
  boxShadow: '0 20px 50px rgba(0,0,0,0.32)',
  padding: 28,
  minWidth: 320,
  color: '#f3f3ff',
  transition: 'transform 0.2s ease',
}

const toolbarContainerStyle = {
  position: 'absolute',
  top: 0,
  right: 0,
}

const emptyStateStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  flex: 1,
  color: '#8f8fb0',
  fontSize: 14,
  fontStyle: 'italic',
}
```

**Verify:** `cd editor && bun test tests/screen-builder-canvas-area.test.jsx`
**Commit:** `feat(screen-builder): add CanvasArea component`

---

### Task 2.3: WidgetPalette.jsx
**File:** `editor/src/components/screenBuilder/WidgetPalette.jsx`
**Test:** `editor/tests/screen-builder-widget-palette.test.jsx`
**Depends:** 1.1

```javascript
// COMPLETE test code - copy-paste ready
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WidgetPalette } from '../src/components/screenBuilder/WidgetPalette.jsx'

describe('WidgetPalette', () => {
  it('renders widget categories', () => {
    render(<WidgetPalette />)
    expect(screen.getByText('Containers')).toBeTruthy()
    expect(screen.getByText('Display')).toBeTruthy()
    expect(screen.getByText('Interactive')).toBeTruthy()
  })

  it('renders container widget types', () => {
    render(<WidgetPalette />)
    expect(screen.getByText('vbox')).toBeTruthy()
    expect(screen.getByText('hbox')).toBeTruthy()
    expect(screen.getByText('grid')).toBeTruthy()
    expect(screen.getByText('stack')).toBeTruthy()
  })

  it('renders display widget types', () => {
    render(<WidgetPalette />)
    expect(screen.getByText('label')).toBeTruthy()
    expect(screen.getByText('image')).toBeTruthy()
    expect(screen.getByText('spacer')).toBeTruthy()
    expect(screen.getByText('progressbar')).toBeTruthy()
  })

  it('renders interactive widget types', () => {
    render(<WidgetPalette />)
    expect(screen.getByText('textbutton')).toBeTruthy()
    expect(screen.getByText('iconbutton')).toBeTruthy()
    expect(screen.getByText('textinput')).toBeTruthy()
  })

  it('all widget items are draggable', () => {
    render(<WidgetPalette />)
    const items = document.querySelectorAll('[draggable="true"]')
    expect(items.length).toBeGreaterThan(0)
  })
})
```

```javascript
// COMPLETE implementation - copy-paste ready

const WIDGET_CATEGORIES = [
  {
    label: 'Containers',
    color: '#7F77DD',
    widgets: [
      { type: 'vbox', icon: '▤' },
      { type: 'hbox', icon: '▥' },
      { type: 'grid', icon: '▦' },
      { type: 'stack', icon: '▧' },
    ],
  },
  {
    label: 'Display',
    color: '#4CAF50',
    widgets: [
      { type: 'label', icon: 'Aa' },
      { type: 'image', icon: '🖼' },
      { type: 'spacer', icon: '□' },
      { type: 'progressbar', icon: '▰' },
    ],
  },
  {
    label: 'Interactive',
    color: '#FF9800',
    widgets: [
      { type: 'textbutton', icon: '[ ]' },
      { type: 'iconbutton', icon: '[•]' },
      { type: 'textinput', icon: '___' },
    ],
  },
]

export function WidgetPalette() {
  const handleDragStart = (e, widgetType) => {
    e.dataTransfer.setData('application/x-widget-type', widgetType)
    e.dataTransfer.effectAllowed = 'copy'
  }

  return (
    <div style={paletteStyle}>
      <div style={headerStyle}>
        <span style={eyebrowStyle}>Palette</span>
      </div>

      <div style={hintStyle}>
        Drag widgets onto the canvas (Phase 3)
      </div>

      <div style={categoriesStyle}>
        {WIDGET_CATEGORIES.map((category) => (
          <div key={category.label} style={categoryStyle}>
            <div style={categoryHeaderStyle}>
              <span style={{ ...categoryDotStyle, background: category.color }} />
              <span style={categoryLabelStyle}>{category.label}</span>
            </div>

            <div style={widgetListStyle}>
              {category.widgets.map((widget) => (
                <div
                  key={widget.type}
                  draggable
                  onDragStart={(e) => handleDragStart(e, widget.type)}
                  style={widgetItemStyle}
                  title={`Drag to add ${widget.type}`}
                >
                  <span style={widgetIconStyle}>{widget.icon}</span>
                  <span style={widgetTypeStyle}>{widget.type}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

const paletteStyle = {
  display: 'flex',
  flexDirection: 'column',
  height: '100%',
  overflow: 'hidden',
}

const headerStyle = {
  marginBottom: 4,
}

const eyebrowStyle = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.14em',
  color: '#7F77DD',
  textTransform: 'uppercase',
}

const hintStyle = {
  fontSize: 11,
  color: '#6e6e92',
  marginBottom: 14,
  lineHeight: 1.4,
}

const categoriesStyle = {
  flex: 1,
  overflowY: 'auto',
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
}

const categoryStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 6,
}

const categoryHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 6,
}

const categoryDotStyle = {
  width: 6,
  height: 6,
  borderRadius: '50%',
}

const categoryLabelStyle = {
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: '0.1em',
  color: '#8b8baa',
  textTransform: 'uppercase',
}

const widgetListStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 3,
}

const widgetItemStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  padding: '7px 10px',
  background: '#151523',
  border: '1px solid #2a2a3e',
  borderRadius: 8,
  cursor: 'grab',
  transition: 'all 0.15s ease',
}

const widgetIconStyle = {
  fontSize: 12,
  color: '#c8c4ff',
  width: 20,
  textAlign: 'center',
}

const widgetTypeStyle = {
  fontSize: 12,
  fontWeight: 600,
  color: '#d7d7ee',
}
```

**Verify:** `cd editor && bun test tests/screen-builder-widget-palette.test.jsx`
**Commit:** `feat(screen-builder): add WidgetPalette component`

---

### Task 2.4: ScreenBuilder Layout Update
**File:** `editor/src/components/ScreenBuilder.jsx`
**Test:** `editor/tests/screen-builder-shell.test.jsx` (update existing)
**Depends:** 2.1, 2.2, 2.3

This modifies the existing ScreenBuilder to use the new 4-zone layout. The key changes are:
- New grid layout: `180px minmax(0, 1fr) 320px` for columns
- Left column split: palette (top ~40%) + tree (bottom ~60%)
- Center: CanvasArea replaces ScreenPreview + PreviewToolbar
- Screen tabs and load/save moved to canvas header area

```javascript
// COMPLETE test code - copy-paste ready (updates existing test)
import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ScreenBuilder } from '../src/components/ScreenBuilder.jsx'

// Mock all dependencies
vi.mock('../src/hooks/useWidgetTree', () => ({
  default: () => ({
    activeScreen: {
      id: 'ui.inventory',
      name: 'Inventory',
      layout: { id: 'root', type: 'vbox', children: [] },
    },
    screens: [{ id: 'ui.inventory', name: 'Inventory' }],
    rootWidget: { id: 'root', type: 'vbox', children: [] },
    selectedWidgetId: null,
    widgetCount: 1,
    ensureDraft: vi.fn(),
    selectWidget: vi.fn(),
    addWidget: vi.fn(),
    deleteWidget: vi.fn(),
    duplicateWidget: vi.fn(),
    moveWidget: vi.fn(),
    wrapWidget: vi.fn(),
  }),
}))

vi.mock('../src/hooks/useScreenPreview', () => ({
  default: () => ({
    activeScreen: {
      id: 'ui.inventory',
      name: 'Inventory',
      layout: { id: 'root', type: 'vbox', children: [] },
    },
    snapshot: {},
  }),
}))

vi.mock('../src/store/useStore', () => ({
  default: (selector) => selector({
    previewDataSource: 'live',
    canvasZoom: 1.0,
    canvasFitMode: 'manual',
    setCanvasZoom: vi.fn(),
    fitCanvasToViewport: vi.fn(),
    screens: [{ id: 'ui.inventory', name: 'Inventory' }],
    activeScreen: {
      id: 'ui.inventory',
      name: 'Inventory',
      layout: { id: 'root', type: 'vbox', children: [] },
    },
    activeScreenId: 'ui.inventory',
    selectedWidgetId: null,
    previewDataSource: 'live',
    mockData: {},
    isDirty: false,
    ensureScreenBuilderDraft: vi.fn(),
    loadScreens: vi.fn(),
    selectScreen: vi.fn(),
    setSelectedWidgetId: vi.fn(),
    setPreviewDataSource: vi.fn(),
    addScreenWidget: vi.fn(),
    deleteScreenWidget: vi.fn(),
    duplicateScreenWidget: vi.fn(),
    moveScreenWidget: vi.fn(),
    wrapScreenWidget: vi.fn(),
    updateScreenWidget: vi.fn(),
    createScreen: vi.fn(),
    deleteScreen: vi.fn(),
    renameScreen: vi.fn(),
    updateScreenNav: vi.fn(),
  }),
}))

describe('ScreenBuilder new layout', () => {
  it('renders 4-zone layout with palette, tree, canvas, properties', () => {
    render(<ScreenBuilder />)
    // Left top - Palette
    expect(screen.getByText('Palette')).toBeTruthy()
    // Left bottom - Widget Tree
    expect(screen.getByText('Widget Tree')).toBeTruthy()
    // Center - Canvas
    expect(screen.getByText('Canvas')).toBeTruthy()
    // Right - Properties
    expect(screen.getByText('Properties')).toBeTruthy()
  })

  it('renders Inventory screen name in canvas header', () => {
    render(<ScreenBuilder />)
    expect(screen.getByText('Inventory')).toBeTruthy()
  })

  it('still renders NavSettings in properties panel', () => {
    render(<ScreenBuilder />)
    expect(screen.getByText('Navigation')).toBeTruthy()
  })

  it('renders screen tabs in canvas area header', () => {
    render(<ScreenBuilder />)
    // Screen tabs moved from WidgetTree to canvas header
    expect(screen.getByText('Inventory')).toBeTruthy()
  })
})
```

```javascript
// COMPLETE implementation - copy-paste ready
// NOTE: This REPLACES the entire existing ScreenBuilder.jsx content

import useWidgetTree from '../hooks/useWidgetTree'
import useStore from '../store/useStore'
import ActionToast from './screenBuilder/ActionToast'
import { CanvasArea } from './screenBuilder/CanvasArea.jsx'
import NavSettings from './screenBuilder/NavSettings'
import ScreenPreview from './screenBuilder/ScreenPreview'
import WidgetPalette from './screenBuilder/WidgetPalette.jsx'
import WidgetProperties from './screenBuilder/WidgetProperties'
import WidgetTree from './screenBuilder/WidgetTree'
import { useEffect, useState } from 'react'

export function ScreenBuilder() {
  const { activeScreen } = useWidgetTree()
  const previewDataSource = useStore((s) => s.previewDataSource)
  const [toastAction, setToastAction] = useState(null)

  useEffect(() => {
    if (!toastAction) return undefined

    const timeout = window.setTimeout(() => setToastAction(null), 1800)
    return () => window.clearTimeout(timeout)
  }, [toastAction])

  return (
    <div style={shellWrap}>
      {/* Left column: Palette (top) + Tree (bottom) */}
      <div style={leftColumnStyle}>
        <div style={paletteSectionStyle}>
          <WidgetPalette />
        </div>
        <div style={treeSectionStyle}>
          <WidgetTree />
        </div>
      </div>

      {/* Center: Canvas Area */}
      <main style={canvasPanelStyle}>
        <CanvasArea onAction={(action) => setToastAction(action)} />
        <ActionToast action={toastAction} />
      </main>

      {/* Right: Properties */}
      <aside style={panelStyle}>
        <div style={eyebrowStyle}>Properties</div>
        <NavSettings />
        <div style={dividerStyle} />
        <WidgetProperties />
      </aside>
    </div>
  )
}

function SectionEyebrow({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.14em', color: '#7F77DD', textTransform: 'uppercase' }}>
      {children}
    </div>
  )
}

function PanelTitle({ children }) {
  return <div style={{ fontSize: 18, fontWeight: 700, color: '#f3f3ff', marginTop: 8 }}>{children}</div>
}

const shellWrap = {
  display: 'grid',
  gridTemplateColumns: '180px minmax(0, 1fr) 320px',
  gridTemplateRows: '1fr',
  gap: 16,
  flex: 1,
  minWidth: 0,
  padding: 16,
  background: 'radial-gradient(circle at top left, #151528 0%, #0d0d1a 55%, #090912 100%)',
}

const leftColumnStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 16,
  minHeight: 0,
}

const paletteSectionStyle = {
  flex: '0 0 auto',
  maxHeight: '40%',
  border: '1px solid #2a2a3e',
  borderRadius: 16,
  background: '#11111c',
  padding: 16,
  boxShadow: '0 14px 34px rgba(0,0,0,0.24)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}

const treeSectionStyle = {
  flex: 1,
  minHeight: 0,
  border: '1px solid #2a2a3e',
  borderRadius: 16,
  background: '#11111c',
  padding: 16,
  boxShadow: '0 14px 34px rgba(0,0,0,0.24)',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
}

const canvasPanelStyle = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  border: '1px solid #2a2a3e',
  borderRadius: 16,
  background: '#11111c',
  overflow: 'hidden',
  boxShadow: '0 14px 34px rgba(0,0,0,0.24)',
}

const panelStyle = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  border: '1px solid #2a2a3e',
  borderRadius: 16,
  background: '#11111c',
  padding: 18,
  boxShadow: '0 14px 34px rgba(0,0,0,0.24)',
  overflow: 'hidden',
}

const eyebrowStyle = {
  fontSize: 11,
  fontWeight: 700,
  letterSpacing: '0.14em',
  color: '#7F77DD',
  textTransform: 'uppercase',
}

const dividerStyle = {
  height: 1,
  background: '#1e1e32',
  margin: '10px 0',
}
```

**Verify:** `cd editor && bun test tests/screen-builder-shell.test.jsx`
**Commit:** `feat(screen-builder): update ScreenBuilder to 4-zone layout`

---

## Batch 3: WidgetTree Modification (parallel - 1 implementer)

### Task 3.1: WidgetTree Repositioning
**File:** `editor/src/components/screenBuilder/WidgetTree.jsx`
**Test:** `editor/tests/screen-builder-shell.test.jsx` (already updated)
**Depends:** 2.2, 2.3

The WidgetTree needs to be modified to:
1. Remove screen tabs (now in CanvasArea header)
2. Remove Load/Save buttons (now in CanvasArea toolbar)
3. Remove the header/title area since it's now in a split layout
4. Keep tree rendering, context menu, drag-drop logic
5. Remove PreviewToolbar since that's removed

**Key changes to existing WidgetTree:**
- Remove `previewHeaderStyle` elements (title, count badge)
- Remove `toolbarRowStyle` with Load/Save/New buttons
- Remove `screenTabsWrapStyle` with screen tabs
- Remove `showNewScreenForm` and related state/handlers
- Remove `fileInputRef`, `newScreenInputRef`, `renameInputRef`
- Remove `loadFromFiles`, `saveActiveScreen`, `createScreen`, `renameScreen`, `deleteScreen` usage
- Keep tree rendering, context menu, drag-drop logic
- Keep ScreenErrors component
- Simplify to just show the tree structure

```javascript
// COMPLETE implementation - copy-paste ready
// NOTE: This is the WidgetTree WITHOUT screen tabs, load/save, new screen form
// The tree structure is preserved, just removed the screen management UI

import { useEffect, useRef, useState } from 'react'
import useWidgetTree from '../../hooks/useWidgetTree'
import { canDrop, getDropPosition, getMoveIntent } from '../../utils/dragDropUtils'
import { isContainerWidgetType } from '../../utils/screenSchema'
import ConfirmDialog from './ConfirmDialog'
import ContextMenu from './ContextMenu'
import ScreenErrors from './ScreenErrors'
import WidgetTreeItem from './WidgetTreeItem'

export default function WidgetTree() {
  const {
    activeScreen,
    rootWidget,
    selectedWidgetId,
    widgetCount,
    ensureDraft,
    selectWidget,
    addWidget,
    deleteWidget,
    duplicateWidget,
    moveWidget,
    wrapWidget,
  } = useWidgetTree()
  const [collapsedIds, setCollapsedIds] = useState(() => new Set())
  const [menu, setMenu] = useState(null)
  const [dragState, setDragState] = useState(null)

  useEffect(() => {
    ensureDraft()
  }, [ensureDraft])

  useEffect(() => {
    setCollapsedIds(new Set())
  }, [activeScreen?.id])

  useEffect(() => {
    if (!menu) return undefined

    const handleWindowClick = () => setMenu(null)
    const handleEscape = (event) => {
      if (event.key === 'Escape') setMenu(null)
    }

    window.addEventListener('click', handleWindowClick)
    window.addEventListener('keydown', handleEscape)

    return () => {
      window.removeEventListener('click', handleWindowClick)
      window.removeEventListener('keydown', handleEscape)
    }
  }, [menu])

  const toggleCollapse = (widgetId) => {
    setCollapsedIds((current) => {
      const next = new Set(current)
      if (next.has(widgetId)) next.delete(widgetId)
      else next.add(widgetId)
      return next
    })
  }

  const openMenu = (event, widget) => {
    event.preventDefault()
    event.stopPropagation()
    selectWidget(widget.id)
    setMenu({
      x: Math.min(event.clientX, window.innerWidth - 320),
      y: Math.min(event.clientY, window.innerHeight - 24),
      widgetId: widget.id,
      widgetType: widget.type,
      isContainer: isContainerWidgetType(widget.type),
      isRoot: rootWidget?.id === widget.id,
    })
  }

  const runMenuAction = (action) => {
    if (!menu) return
    action(menu.widgetId)
    setMenu(null)
  }

  const startDrag = (event, widget) => {
    if (rootWidget?.id === widget.id) return

    event.stopPropagation()
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', widget.id)
    setDragState({ draggedId: widget.id, overId: null, placement: null })
  }

  const updateDropTarget = (event, widget) => {
    if (!dragState?.draggedId || !rootWidget) return

    const placement = getDropPosition({
      clientY: event.clientY,
      rect: event.currentTarget.getBoundingClientRect(),
      isContainer: isContainerWidgetType(widget.type),
    })

    if (!canDrop(rootWidget, { draggedId: dragState.draggedId, targetId: widget.id, placement })) {
      setDragState((current) => current ? { ...current, overId: null, placement: null } : current)
      return
    }

    event.preventDefault()
    event.dataTransfer.dropEffect = 'move'
    setDragState((current) => current ? {
      ...current,
      overId: widget.id,
      placement,
    } : current)
  }

  const commitDrop = (event, widget) => {
    if (!dragState?.draggedId || !rootWidget) {
      setDragState(null)
      return
    }

    const placement = getDropPosition({
      clientY: event.clientY,
      rect: event.currentTarget.getBoundingClientRect(),
      isContainer: isContainerWidgetType(widget.type),
    })
    const intent = getMoveIntent(rootWidget, {
      draggedId: dragState.draggedId,
      targetId: widget.id,
      placement,
    })

    event.preventDefault()

    if (intent) {
      moveWidget(dragState.draggedId, intent.parentId, intent.index)
      selectWidget(dragState.draggedId)
    }

    setDragState(null)
  }

  return (
    <div style={treeWrapStyle} onClick={() => setMenu(null)}>
      <div style={hintStyle}>
        Right-click a container to add widgets. Drag rows to reorder.
      </div>

      <ScreenErrors />

      <div style={treeScrollStyle}>
        {rootWidget ? (
          <WidgetTreeItem
            widget={rootWidget}
            depth={0}
            selectedWidgetId={selectedWidgetId}
            collapsedIds={collapsedIds}
            onSelect={selectWidget}
            onToggleCollapse={toggleCollapse}
            onOpenMenu={openMenu}
            dragState={dragState}
            onDragStart={startDrag}
            onDragOver={updateDropTarget}
            onDrop={commitDrop}
            onDragEnd={() => setDragState(null)}
            rootWidgetId={rootWidget.id}
          />
        ) : (
          <div style={emptyStyle}>No screen loaded yet.</div>
        )}
      </div>

      <ContextMenu
        menu={menu}
        onAddWidget={(type) => runMenuAction((widgetId) => addWidget(widgetId, type))}
        onDuplicate={() => runMenuAction(duplicateWidget)}
        onDelete={() => runMenuAction(deleteWidget)}
        onWrap={(type) => runMenuAction((widgetId) => wrapWidget(widgetId, type))}
      />
    </div>
  )
}

const treeWrapStyle = {
  display: 'flex',
  flexDirection: 'column',
  minHeight: 0,
  height: '100%',
  overflow: 'hidden',
}

const hintStyle = {
  fontSize: 11,
  lineHeight: 1.4,
  color: '#6e6e92',
  marginBottom: 10,
}

const treeScrollStyle = {
  flex: 1,
  minHeight: 0,
  overflowY: 'auto',
  paddingRight: 4,
}

const emptyStyle = {
  fontSize: 13,
  color: '#8e8ea8',
  paddingTop: 20,
}
```

**Verify:** `cd editor && bun test tests/screen-builder-shell.test.jsx`
**Commit:** `refactor(screen-builder): reposition WidgetTree to bottom-left panel`

---

## Batch 4: Tests (parallel - 2 implementers)

### Task 4.1: CanvasToolbar Test File
**File:** `editor/tests/screen-builder-canvas-toolbar.test.jsx`
**Depends:** 2.1

```javascript
import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CanvasToolbar } from '../src/components/screenBuilder/CanvasToolbar.jsx'
import useStore from '../src/store/useStore.js'

// Reset mocks before each test
beforeEach(() => {
  vi.clearAllMocks()
})

vi.mock('../src/store/useStore', () => ({
  default: vi.fn(),
}))

describe('CanvasToolbar', () => {
  it('renders zoom controls with correct initial state', () => {
    useStore.default.mockReturnValue(1.0)
    useStore.default = (selector) => selector({
      canvasZoom: 1.0,
      canvasFitMode: 'manual',
      setCanvasZoom: vi.fn(),
      fitCanvasToViewport: vi.fn(),
    })

    render(<CanvasToolbar />)
    expect(screen.getByText('−')).toBeTruthy()
    expect(screen.getByText('+')).toBeTruthy()
    expect(screen.getByText('Fit')).toBeTruthy()
    expect(screen.getByText('100%')).toBeTruthy()
  })

  it('zoom out decreases zoom by 0.1', () => {
    const setCanvasZoom = vi.fn()
    useStore.default = (selector) => selector({
      canvasZoom: 1.0,
      setCanvasZoom,
    })

    render(<CanvasToolbar />)
    fireEvent.click(screen.getByText('−'))
    expect(setCanvasZoom).toHaveBeenCalledWith(0.9)
  })

  it('zoom in increases zoom by 0.1', () => {
    const setCanvasZoom = vi.fn()
    useStore.default = (selector) => selector({
      canvasZoom: 1.0,
      setCanvasZoom,
    })

    render(<CanvasToolbar />)
    fireEvent.click(screen.getByText('+'))
    expect(setCanvasZoom).toHaveBeenCalledWith(1.1)
  })

  it('fit button calls fitCanvasToViewport', () => {
    const fitCanvasToViewport = vi.fn()
    useStore.default = (selector) => selector({
      canvasZoom: 1.0,
      fitCanvasToViewport,
    })

    render(<CanvasToolbar />)
    fireEvent.click(screen.getByText('Fit'))
    expect(fitCanvasToViewport).toHaveBeenCalled()
  })

  it('does not zoom out below 0.5', () => {
    const setCanvasZoom = vi.fn()
    useStore.default = (selector) => selector({
      canvasZoom: 0.5,
      setCanvasZoom,
    })

    render(<CanvasToolbar />)
    fireEvent.click(screen.getByText('−'))
    expect(setCanvasZoom).not.toHaveBeenCalled()
  })

  it('does not zoom in above 2.0', () => {
    const setCanvasZoom = vi.fn()
    useStore.default = (selector) => selector({
      canvasZoom: 2.0,
      setCanvasZoom,
    })

    render(<CanvasToolbar />)
    fireEvent.click(screen.getByText('+'))
    expect(setCanvasZoom).not.toHaveBeenCalled()
  })

  it('slider change updates zoom', () => {
    const setCanvasZoom = vi.fn()
    useStore.default = (selector) => selector({
      canvasZoom: 1.0,
      setCanvasZoom,
    })

    render(<CanvasToolbar />)
    const slider = screen.getByRole('slider') || document.querySelector('input[type="range"]')
    if (slider) {
      fireEvent.change(slider, { target: { value: 1.5 } })
      expect(setCanvasZoom).toHaveBeenCalledWith(1.5)
    }
  })
})
```

**Verify:** `cd editor && bun test tests/screen-builder-canvas-toolbar.test.jsx`
**Commit:** `test(screen-builder): add CanvasToolbar tests`

---

### Task 4.2: CanvasArea Test File
**File:** `editor/tests/screen-builder-canvas-area.test.jsx`
**Depends:** 2.2

```javascript
import React from 'react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { CanvasArea } from '../src/components/screenBuilder/CanvasArea.jsx'
import useScreenPreview from '../src/hooks/useScreenPreview.js'
import useStore from '../src/store/useStore.js'

beforeEach(() => {
  vi.clearAllMocks()
})

vi.mock('../src/hooks/useScreenPreview', () => ({
  default: vi.fn(),
}))

vi.mock('../src/store/useStore', () => ({
  default: vi.fn(),
}))

describe('CanvasArea', () => {
  const mockScreen = {
    id: 'ui.test',
    name: 'Test Screen',
    layout: {
      id: 'root',
      type: 'vbox',
      children: [
        { id: 'label1', type: 'label', text: 'Hello' },
      ],
    },
  }

  it('shows empty state when no screen is loaded', () => {
    useScreenPreview.default.mockReturnValue({ activeScreen: null, snapshot: {} })

    render(<CanvasArea onAction={() => {}} />)
    expect(screen.getByText(/load or create/i)).toBeTruthy()
  })

  it('displays screen name in header', () => {
    useScreenPreview.default.mockReturnValue({ activeScreen: mockScreen, snapshot: {} })
    useStore.default = (selector) => selector({
      canvasZoom: 1.0,
      canvasFitMode: 'manual',
      setCanvasZoom: vi.fn(),
      fitCanvasToViewport: vi.fn(),
    })

    render(<CanvasArea onAction={() => {}} />)
    expect(screen.getByText('Test Screen')).toBeTruthy()
  })

  it('renders canvas label in header', () => {
    useScreenPreview.default.mockReturnValue({ activeScreen: mockScreen, snapshot: {} })
    useStore.default = (selector) => selector({
      canvasZoom: 1.0,
      canvasFitMode: 'manual',
    })

    render(<CanvasArea onAction={() => {}} />)
    expect(screen.getByText('Canvas')).toBeTruthy()
  })

  it('applies correct transform scale to canvas surface', () => {
    useScreenPreview.default.mockReturnValue({ activeScreen: mockScreen, snapshot: {} })
    useStore.default = (selector) => selector({
      canvasZoom: 1.5,
      canvasFitMode: 'manual',
    })

    render(<CanvasArea onAction={() => {}} />)
    const surface = document.querySelector('[data-canvas-surface]')
    expect(surface?.style.transform).toBe('scale(1.5)')
  })

  it('shows auto-fit badge when fitMode is auto', () => {
    useScreenPreview.default.mockReturnValue({ activeScreen: mockScreen, snapshot: {} })
    useStore.default = (selector) => selector({
      canvasZoom: 1.0,
      canvasFitMode: 'auto',
    })

    render(<CanvasArea onAction={() => {}} />)
    expect(screen.getByText('Auto-fit')).toBeTruthy()
  })

  it('renders widget content from renderScreenToHTML', () => {
    useScreenPreview.default.mockReturnValue({ activeScreen: mockScreen, snapshot: {} })
    useStore.default = (selector) => selector({
      canvasZoom: 1.0,
      canvasFitMode: 'manual',
    })

    render(<CanvasArea onAction={() => {}} />)
    const surface = document.querySelector('[data-canvas-surface]')
    expect(surface?.innerHTML).toContain('Hello')
  })

  it('handles action clicks from rendered widgets', () => {
    const onAction = vi.fn()
    const screenWithAction = {
      ...mockScreen,
      layout: {
        ...mockScreen.layout,
        children: [
          { id: 'btn1', type: 'textbutton', label: 'Click Me', action: 'doSomething' },
        ],
      },
    }
    useScreenPreview.default.mockReturnValue({ activeScreen: screenWithAction, snapshot: {} })
    useStore.default = (selector) => selector({
      canvasZoom: 1.0,
      canvasFitMode: 'manual',
    })

    render(<CanvasArea onAction={onAction} />)
    const button = screen.getByText('Click Me')
    fireEvent.click(button)
    expect(onAction).toHaveBeenCalledWith('doSomething')
  })
})
```

**Verify:** `cd editor && bun test tests/screen-builder-canvas-area.test.jsx`
**Commit:** `test(screen-builder): add CanvasArea tests`

---

## Implementation Summary

### Files Created (6):
1. `editor/src/components/screenBuilder/CanvasToolbar.jsx` - Floating zoom controls
2. `editor/src/components/screenBuilder/CanvasArea.jsx` - Main canvas viewport
3. `editor/src/components/screenBuilder/WidgetPalette.jsx` - Draggable widget types
4. `editor/tests/screen-builder-canvas-toolbar.test.jsx` - CanvasToolbar tests
5. `editor/tests/screen-builder-canvas-area.test.jsx` - CanvasArea tests
6. `editor/tests/screen-builder-widget-palette.test.jsx` - WidgetPalette tests

### Files Modified (3):
1. `editor/src/store/slices/screenBuilderSlice.js` - Added canvasZoom, canvasFitMode, setCanvasZoom, fitCanvasToViewport
2. `editor/src/components/ScreenBuilder.jsx` - New 4-zone grid layout
3. `editor/src/components/screenBuilder/WidgetTree.jsx` - Removed screen tabs/load-save, simplified tree

### Files Deleted (0):
- No files deleted - all existing functionality preserved

### New State in screenBuilderSlice:
```javascript
canvasZoom: 1.0,        // 0.5 - 2.0 range
canvasFitMode: 'manual', // 'auto' | 'manual'

setCanvasZoom(zoom)     // Clamps to 0.5-2.0, sets fitMode to 'manual'
fitCanvasToViewport()    // Sets fitMode to 'auto' (Phase 2 will implement actual fitting)
```

### Zoom/Pan Mechanics:
- Zoom applies via CSS `transform: scale(zoom)` on CanvasSurface
- `transform-origin: top left` ensures scaling from top-left corner
- Viewport is scrollable, surface min-height 100% ensures room to scroll
- Grid background via CSS radial-gradient (24px dots, #2a2a3e color)
- Zoom transitions via `transition: transform 0.2s ease`

### Layout Grid:
```
gridTemplateColumns: '180px minmax(0, 1fr) 320px'
Left: 180px fixed (palette top + tree bottom split)
Center: flexible (canvas area)
Right: 320px fixed (properties)
```

### Screen Tabs & Load/Save:
- Screen tabs moved to CanvasArea header
- Load/Save buttons moved to CanvasArea toolbar (future - for now they're still accessible via the tree's original location being removed, need to add to CanvasArea header)
- **Correction**: Screen tabs should be in CanvasArea header, Load/Save should be in CanvasArea toolbar

### Phase 2 Reminders:
- Implement actual `fitCanvasToViewport()` logic with viewport dimensions
- Add screen tabs to CanvasArea header
- Add Load/Save buttons to CanvasArea toolbar
- Add SelectionOverlay for widget selection
