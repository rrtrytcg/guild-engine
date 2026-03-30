import React from 'react'
import { describe, expect, it, vi } from 'vitest'
import { renderToString } from 'react-dom/server'

const useStoreMock = vi.fn((selector) => selector({
  screens: [{
    id: 'ui.inventory',
    name: 'Inventory',
    nav: { toolbar: true, hotkey: 'I', group: 'main' },
    sourceName: 'inventory.screen.json',
    layout: {
      id: 'root',
      type: 'vbox',
      children: [
        { id: 'title_label', type: 'label', text: 'Inventory' },
      ],
    },
  }],
  activeScreen: {
    id: 'ui.inventory',
    name: 'Inventory',
    nav: { toolbar: true, hotkey: 'I', group: 'main' },
    layout: {
      id: 'root',
      type: 'vbox',
      children: [
        { id: 'title_label', type: 'label', text: 'Inventory' },
      ],
    },
  },
  activeScreenId: null,
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
}))

vi.mock('../src/store/useStore', () => ({
  default: (selector) => useStoreMock(selector),
}))

describe('ScreenBuilder shell', () => {
  it('renders the initial shell panels', async () => {
    const { default: ScreenBuilder } = await import('../src/components/ScreenBuilder.jsx')
    const markup = renderToString(React.createElement(ScreenBuilder))

    expect(markup).toContain('Widget Tree')
    expect(markup).toContain('Inventory')
    expect(markup).toContain('title_label')
    expect(markup).toContain('Preview data')
    expect(markup).toContain('Load')
    expect(markup).toContain('Navigation')
    expect(markup).toContain('ui.inventory')
  })
})
