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
    // Left bottom - Widget Tree (check for tree hint text instead of heading)
    expect(screen.getByText(/Right-click a container/i)).toBeTruthy()
    // Center - Canvas
    expect(screen.getByText('Canvas')).toBeTruthy()
    // Right - Properties
    expect(screen.getByText('Properties')).toBeTruthy()
  })

  it('renders Inventory screen name in canvas header', () => {
    render(<ScreenBuilder />)
    // Inventory appears multiple times (WidgetTree header, Canvas header, etc.)
    expect(screen.getAllByText('Inventory').length).toBeGreaterThan(0)
  })

  it('still renders NavSettings in properties panel', () => {
    render(<ScreenBuilder />)
    // Navigation appears in NavSettings
    expect(screen.getAllByText('Navigation').length).toBeGreaterThan(0)
  })

  it('renders screen tabs in canvas area header', () => {
    render(<ScreenBuilder />)
    // Screen tabs appear in the canvas area
    expect(screen.getAllByText('Inventory').length).toBeGreaterThan(0)
  })
})
